// /app/api/admin/keys/list/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// 请求参数类型
interface ListParams {
  page?: number
  limit?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  status?: string
  user_email?: string
  key_code?: string
  created_at_start?: string
  created_at_end?: string
  duration_min?: number
  duration_max?: number
  is_active?: boolean
}

// 密钥状态类型
type KeyStatus = 'unused' | 'used' | 'expired' | 'disabled'

export async function GET(request: NextRequest) {
  try {
    console.log('🔑 获取密钥列表（分页+筛选+排序）...')
    
    // 1. 验证管理员权限
    const authMethods = {
      cookie: request.cookies.get('admin_key_verified')?.value,
      referer: request.headers.get('referer'),
      userAgent: request.headers.get('user-agent')
    }

    const isAuthenticated = authMethods.cookie || 
      (authMethods.referer?.includes('/admin/') && authMethods.userAgent)

    if (!isAuthenticated) {
      console.log('❌ 未授权访问')
      return NextResponse.json({ 
        success: false, 
        error: '未授权访问' 
      }, { status: 401 })
    }

    // 2. 验证环境变量
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ 环境变量未配置')
      return NextResponse.json({ 
        success: false, 
        error: '服务器配置不完整' 
      }, { status: 500 })
    }

    // 3. 解析查询参数
    const { searchParams } = new URL(request.url)
    const params: ListParams = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      sort_by: searchParams.get('sort_by') || 'created_at',
      sort_order: (searchParams.get('sort_order') as 'asc' | 'desc') || 'desc',
      status: searchParams.get('status') || '',
      user_email: searchParams.get('user_email') || '',
      key_code: searchParams.get('key_code') || '',
      created_at_start: searchParams.get('created_at_start') || '',
      created_at_end: searchParams.get('created_at_end') || '',
      duration_min: searchParams.get('duration_min') ? parseInt(searchParams.get('duration_min')!) : undefined,
      duration_max: searchParams.get('duration_max') ? parseInt(searchParams.get('duration_max')!) : undefined,
      is_active: searchParams.get('is_active') === 'true' ? true : 
                searchParams.get('is_active') === 'false' ? false : undefined
    }

    console.log('📦 请求参数:', params)

    // 4. 创建Supabase管理员客户端
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    )

    // 5. 构建查询
    let query = supabaseAdmin
      .from('access_keys')
      .select(`
        *,
        profiles:user_id (
          id,
          email,
          nickname
        )
      `, { count: 'exact' })

    // 6. 应用筛选条件
    // 6.1 状态筛选
    if (params.status) {
      const statuses = params.status.split(',')
      
      if (statuses.includes('disabled')) {
        query = query.eq('is_active', false)
      }
      
      // 其他状态需要在查询后计算
    }

    // 6.2 用户邮箱筛选（模糊匹配）
    if (params.user_email) {
      // 先获取匹配的用户ID
      const { data: users } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .ilike('email', `%${params.user_email}%`)
      
      if (users && users.length > 0) {
        const userIds = users.map(u => u.id)
        query = query.in('user_id', userIds)
      } else {
        // 没有匹配的用户，返回空结果
        query = query.eq('user_id', '00000000-0000-0000-0000-000000000000')
      }
    }

    // 6.3 密钥代码筛选（前缀匹配）
    if (params.key_code) {
      query = query.ilike('key_code', `${params.key_code}%`)
    }

    // 6.4 创建时间范围筛选
    if (params.created_at_start) {
      query = query.gte('created_at', `${params.created_at_start}T00:00:00Z`)
    }
    if (params.created_at_end) {
      query = query.lte('created_at', `${params.created_at_end}T23:59:59Z`)
    }

    // 6.5 有效期范围筛选
    if (params.duration_min !== undefined) {
      query = query.gte('account_valid_for_days', params.duration_min)
    }
    if (params.duration_max !== undefined) {
      query = query.lte('account_valid_for_days', params.duration_max)
    }

    // 6.6 是否激活筛选
    if (params.is_active !== undefined) {
      query = query.eq('is_active', params.is_active)
    }

    // 7. 应用排序
    const sortMapping: Record<string, string> = {
      'created_at': 'created_at',
      'updated_at': 'updated_at',
      'key_code': 'key_code',
      'account_valid_for_days': 'account_valid_for_days',
      'last_used_at': 'used_at'  // 注意：这里使用used_at作为最后使用时间
    }

    const sortField = sortMapping[params.sort_by || 'created_at'] || 'created_at'
    query = query.order(sortField, { 
      ascending: params.sort_order === 'asc' 
    })

    // 8. 应用分页
    const start = (params.page! - 1) * params.limit!
    const end = start + params.limit! - 1
    query = query.range(start, end)

    // 9. 执行查询
    const { data: keys, error, count } = await query

    if (error) {
      console.error('❌ 查询密钥失败:', error)
      return NextResponse.json({
        success: false,
        error: `查询失败: ${error.message}`
      }, { status: 500 })
    }

    // 10. 获取使用统计信息
    const keyIds = keys?.map(k => k.id) || []
    let usageStats: Record<number, { count: number; last_used_at: string }> = {}

    if (keyIds.length > 0) {
      const { data: stats } = await supabaseAdmin
        .from('key_usage_history')
        .select('access_key_id, used_at')
        .in('access_key_id', keyIds)

      // 计算每个密钥的使用次数和最后使用时间
      usageStats = (stats || []).reduce((acc, record) => {
        const keyId = record.access_key_id
        if (!acc[keyId]) {
          acc[keyId] = { count: 0, last_used_at: record.used_at }
        }
        acc[keyId].count++
        if (new Date(record.used_at) > new Date(acc[keyId].last_used_at)) {
          acc[keyId].last_used_at = record.used_at
        }
        return acc
      }, {} as Record<number, { count: number; last_used_at: string }>)
    }

    // 11. 处理数据，计算状态
    const now = new Date()
    const processedKeys = keys?.map(key => {
      const stats = usageStats[key.id] || { count: 0, last_used_at: null }
      const isExpired = key.key_expires_at && new Date(key.key_expires_at) < now
      
      // 计算状态
      let status: KeyStatus = 'unused'
      if (!key.is_active) {
        status = 'disabled'
      } else if (isExpired) {
        status = 'expired'
      } else if (stats.count > 0 || key.used_at) {
        status = 'used'
      }

      // 获取当前用户信息
      const currentUser = key.profiles ? {
        email: key.profiles.email,
        nickname: key.profiles.nickname
      } : null

      return {
        // 基础信息
        id: key.id,
        key_code: key.key_code,
        description: key.description,
        
        // 时间信息
        account_valid_for_days: key.account_valid_for_days,
        original_duration_hours: key.original_duration_hours,
        key_expires_at: key.key_expires_at,
        created_at: key.created_at,
        updated_at: key.updated_at,
        used_at: key.used_at,
        
        // 状态信息
        is_active: key.is_active,
        status: status,
        
        // 使用信息
        usage_count: stats.count,
        last_used_at: stats.last_used_at,
        
        // 使用限制
        max_uses: key.max_uses,
        used_count: key.used_count || 0,
        
        // 用户信息
        user_id: key.user_id,
        current_user: currentUser,
        
        // 额外信息
        duration_unit: key.duration_unit
      }
    }) || []

    // 12. 应用状态筛选（查询后筛选）
    let filteredKeys = processedKeys
    if (params.status && params.status !== 'disabled') {
      const statusFilters = params.status.split(',')
      filteredKeys = processedKeys.filter(key => 
        statusFilters.includes(key.status)
      )
    }

    // 13. 计算分页信息
    const totalCount = count || 0
    const totalPages = Math.ceil(totalCount / params.limit!)

    console.log(`✅ 查询成功，共 ${totalCount} 条记录，返回 ${filteredKeys.length} 条`)

    // 14. 返回响应
    return NextResponse.json({
      success: true,
      data: {
        keys: filteredKeys,
        pagination: {
          page: params.page,
          limit: params.limit,
          total: totalCount,
          total_pages: totalPages,
          has_next: params.page! < totalPages,
          has_prev: params.page! > 1,
          next_page: params.page! < totalPages ? params.page! + 1 : null,
          prev_page: params.page! > 1 ? params.page! - 1 : null
        },
        filters: {
          applied: params,
          available_counts: {
            total: totalCount,
            unused: processedKeys.filter(k => k.status === 'unused').length,
            used: processedKeys.filter(k => k.status === 'used').length,
            expired: processedKeys.filter(k => k.status === 'expired').length,
            disabled: processedKeys.filter(k => k.status === 'disabled').length
          }
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('💥 获取密钥列表异常:', error)
    return NextResponse.json({
      success: false,
      error: '服务器内部错误'
    }, { status: 500 })
  }
}