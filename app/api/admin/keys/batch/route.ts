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
        keyIds: body.keyIds?.length || 0
      })
    } catch (error) {
      return NextResponse.json({ success: false, error: '请求格式错误' }, { status: 400 })
    }

    const { action, keyIds } = body

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
      // 删除操作
      const { data, error } = await supabaseAdmin
        .from('access_keys')
        .delete()
        .in('id', keyIds)
        .select()

      if (error) {
        throw new Error('删除失败: ' + error.message)
      }

      result = { affected_count: data?.length || 0 }
      
    } else {
      // 启用/禁用操作
      const isActive = action === 'enable'
      
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
        is_active: isActive 
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
