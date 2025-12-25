// /app/api/admin/keys/batch/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 接收到批量操作请求')
    
    // 验证管理员权限
    const authMethods = {
      cookie: request.cookies.get('admin_key_verified')?.value,
      referer: request.headers.get('referer'),
      userAgent: request.headers.get('user-agent')
    }

    const isAuthenticated = authMethods.cookie || 
      (authMethods.referer?.includes('/admin/') && authMethods.userAgent)

    if (!isAuthenticated) {
      return NextResponse.json({ success: false, error: '未授权访问' }, { status: 401 })
    }

    // 验证环境变量
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ success: false, error: '环境变量未配置' }, { status: 500 })
    }

    // 解析请求数据
    let body
    try {
      body = await request.json()
      console.log('📦 批量操作请求:', {
        action: body.action,
        keyIds: body.keyIds?.length || 0,
        reason: body.reason
      })
    } catch (error) {
      return NextResponse.json({ success: false, error: '请求格式错误' }, { status: 400 })
    }

    const { action, keyIds, reason } = body

    // 验证请求数据
    if (!action || !keyIds || !Array.isArray(keyIds) || keyIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '请提供操作类型和密钥ID列表' },
        { status: 400 }
      )
    }

    if (!['disable', 'enable', 'delete'].includes(action)) {
      return NextResponse.json(
        { success: false, error: '不支持的操作类型' },
        { status: 400 }
      )
    }

    // 创建Supabase管理员客户端
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    let result
    const now = new Date().toISOString()

    if (action === 'delete') {
      // 删除操作 - 先记录日志再删除
      const { data: keysToDelete } = await supabaseAdmin
        .from('access_keys')
        .select('key_code, user_id')
        .in('id', keyIds)

      // 记录删除日志
      if (keysToDelete && keysToDelete.length > 0) {
        const logs = keysToDelete.map(key => ({
          action: 'delete',
          key_code: key.key_code,
          user_id: key.user_id,
          reason: reason || '批量删除操作',
          created_at: now,
          created_by: 'admin_batch'
        }))
        
        await supabaseAdmin
          .from('admin_operation_logs')
          .insert(logs)
      }

      // 执行删除
      const { data, error } = await supabaseAdmin
        .from('access_keys')
        .delete()
        .in('id', keyIds)
        .select()

      if (error) {
        throw new Error('删除失败: ' + error.message)
      }

      result = { 
        affected_count: data?.length || 0,
        deleted_keys: data?.map(k => k.key_code) || []
      }
      
    } else {
      // 启用/禁用操作
      const isActive = action === 'enable'
      
      // 获取当前状态
      const { data: currentKeys } = await supabaseAdmin
        .from('access_keys')
        .select('id, key_code, is_active')
        .in('id', keyIds)

      // 记录状态变更日志
      if (currentKeys && currentKeys.length > 0) {
        const logs = currentKeys.map(key => ({
          action: isActive ? 'enable' : 'disable',
          key_code: key.key_code,
          previous_state: key.is_active,
          new_state: isActive,
          reason: reason || '批量状态变更',
          created_at: now,
          created_by: 'admin_batch'
        }))
        
        await supabaseAdmin
          .from('admin_operation_logs')
          .insert(logs)
      }

      // 更新状态
      const { data, error } = await supabaseAdmin
        .from('access_keys')
        .update({ 
          is_active: isActive,
          updated_at: now
        })
        .in('id', keyIds)
        .select()

      if (error) {
        throw new Error(`${isActive ? '启用' : '禁用'}失败: ` + error.message)
      }

      result = { 
        affected_count: data?.length || 0,
        is_active: isActive,
        updated_keys: data?.map(k => k.key_code) || []
      }
    }

    console.log(`✅ 批量${action}操作成功，影响 ${result.affected_count} 个密钥`)

    return NextResponse.json({
      success: true,
      data: result,
      message: `成功${action === 'delete' ? '删除' : action === 'enable' ? '启用' : '禁用'}了 ${result.affected_count} 个密钥`
    })

  } catch (error: any) {
    console.error('💥 批量操作异常:', error)
    return NextResponse.json(
      { success: false, error: error.message || '操作失败' },
      { status: 500 }
    )
  }
}

// 批量获取密钥详情
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const keyIds = searchParams.get('ids')
    
    if (!keyIds) {
      return NextResponse.json(
        { success: false, error: '请提供密钥ID列表' },
        { status: 400 }
      )
    }

    const ids = keyIds.split(',').map(id => parseInt(id)).filter(id => !isNaN(id))
    
    if (ids.length === 0) {
      return NextResponse.json(
        { success: false, error: '无效的密钥ID' },
        { status: 400 }
      )
    }

    // 验证管理员权限...
    const authMethods = {
      cookie: request.cookies.get('admin_key_verified')?.value,
      referer: request.headers.get('referer'),
      userAgent: request.headers.get('user-agent')
    }

    const isAuthenticated = authMethods.cookie || 
      (authMethods.referer?.includes('/admin/') && authMethods.userAgent)

    if (!isAuthenticated) {
      return NextResponse.json({ success: false, error: '未授权访问' }, { status: 401 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data, error } = await supabaseAdmin
      .from('access_keys')
      .select(`
        *,
        profiles:user_id (
          email,
          nickname
        )
      `)
      .in('id', ids)

    if (error) {
      throw new Error('查询失败: ' + error.message)
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    })

  } catch (error: any) {
    console.error('批量查询失败:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}