// /app/api/admin/keys/[id]/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// 获取密钥详情
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const keyId = parseInt(context.params.id)
    if (!keyId || isNaN(keyId)) {
      return NextResponse.json({ success: false, error: '无效的密钥ID' }, { status: 400 })
    }

    console.log(`🔍 获取密钥详情 ID: ${keyId}`)
    
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

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // 获取密钥详情
    const { data: keyData, error: keyError } = await supabaseAdmin
      .from('access_keys')
      .select(`
        *,
        profiles:user_id (
          email,
          nickname
        )
      `)
      .eq('id', keyId)
      .single()

    if (keyError) {
      throw new Error('查询密钥失败: ' + keyError.message)
    }

    // 获取使用历史
    const { data: usageHistory, error: usageError } = await supabaseAdmin
      .from('key_usage_history')
      .select(`
        *,
        profiles:user_id (
          email,
          nickname
        )
      `)
      .eq('access_key_id', keyId)
      .order('used_at', { ascending: false })

    if (usageError) {
      throw new Error('查询使用历史失败: ' + usageError.message)
    }

    return NextResponse.json({
      success: true,
      data: {
        key_info: keyData,
        usage_history: usageHistory || [],
        statistics: {
          total_uses: usageHistory?.length || 0,
          unique_users: new Set(usageHistory?.map(u => u.user_id) || []).size,
          first_use: usageHistory && usageHistory.length > 0 
            ? usageHistory[usageHistory.length - 1].used_at 
            : null,
          last_use: usageHistory && usageHistory.length > 0 
            ? usageHistory[0].used_at 
            : null
        }
      }
    })

  } catch (error: any) {
    console.error('获取密钥详情失败:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// 更新密钥（禁用/启用/删除）
export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const keyId = parseInt(context.params.id)
    if (!keyId || isNaN(keyId)) {
      return NextResponse.json({ success: false, error: '无效的密钥ID' }, { status: 400 })
    }

    console.log(`🔧 操作密钥 ID: ${keyId}`)
    
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

    // 解析请求数据
    let body
    try {
      body = await request.json()
      console.log('📦 操作请求:', body)
    } catch (error) {
      return NextResponse.json({ success: false, error: '请求格式错误' }, { status: 400 })
    }

    const { action, reason } = body

    if (!action || !['disable', 'enable', 'delete'].includes(action)) {
      return NextResponse.json({ success: false, error: '不支持的操作类型' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const now = new Date().toISOString()
    let result

    // 先获取当前密钥信息（用于日志）
    const { data: currentKey } = await supabaseAdmin
      .from('access_keys')
      .select('key_code, is_active')
      .eq('id', keyId)
      .single()

    if (action === 'delete') {
      // 记录删除日志
      if (currentKey) {
        await supabaseAdmin
          .from('admin_operation_logs')
          .insert({
            action: 'delete',
            key_code: currentKey.key_code,
            reason: reason || '单个删除操作',
            created_at: now,
            created_by: 'admin_single'
          })
      }

      // 删除操作
      const { data, error } = await supabaseAdmin
        .from('access_keys')
        .delete()
        .eq('id', keyId)
        .select()
        .single()

      if (error) {
        throw new Error('删除失败: ' + error.message)
      }

      result = data
      
    } else {
      // 启用/禁用操作
      const isActive = action === 'enable'
      
      // 记录状态变更日志
      if (currentKey) {
        await supabaseAdmin
          .from('admin_operation_logs')
          .insert({
            action: isActive ? 'enable' : 'disable',
            key_code: currentKey.key_code,
            previous_state: currentKey.is_active,
            new_state: isActive,
            reason: reason || '状态变更操作',
            created_at: now,
            created_by: 'admin_single'
          })
      }

      const { data, error } = await supabaseAdmin
        .from('access_keys')
        .update({ 
          is_active: isActive,
          updated_at: now
        })
        .eq('id', keyId)
        .select()
        .single()

      if (error) {
        throw new Error(`${isActive ? '启用' : '禁用'}失败: ` + error.message)
      }

      result = data
    }

    console.log(`✅ 密钥 ${action} 操作成功`)

    return NextResponse.json({
      success: true,
      data: result,
      message: `密钥已${action === 'delete' ? '删除' : action === 'enable' ? '启用' : '禁用'}`
    })

  } catch (error: any) {
    console.error('密钥操作异常:', error)
    return NextResponse.json(
      { success: false, error: error.message || '操作失败' },
      { status: 500 }
    )
  }
}

// 更新密钥信息
export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const keyId = parseInt(context.params.id)
    if (!keyId || isNaN(keyId)) {
      return NextResponse.json({ success: false, error: '无效的密钥ID' }, { status: 400 })
    }

    // 验证管理员权限...
    const body = await request.json()
    const { description, max_uses, key_expires_at } = body

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const updates: any = { updated_at: new Date().toISOString() }
    if (description !== undefined) updates.description = description
    if (max_uses !== undefined) updates.max_uses = max_uses
    if (key_expires_at !== undefined) updates.key_expires_at = key_expires_at

    const { data, error } = await supabaseAdmin
      .from('access_keys')
      .update(updates)
      .eq('id', keyId)
      .select()
      .single()

    if (error) {
      throw new Error('更新失败: ' + error.message)
    }

    return NextResponse.json({
      success: true,
      data,
      message: '密钥信息已更新'
    })

  } catch (error: any) {
    console.error('更新密钥失败:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}