// /app/api/admin/keys/[id]/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

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

    // 解析请求数据
    let body
    try {
      body = await request.json()
      console.log('📦 操作请求:', body)
    } catch (error) {
      return NextResponse.json({ success: false, error: '请求格式错误' }, { status: 400 })
    }

    const { action } = body

    if (!action || !['disable', 'enable', 'delete'].includes(action)) {
      return NextResponse.json({ success: false, error: '不支持的操作类型' }, { status: 400 })
    }

    // 验证环境变量
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ success: false, error: '环境变量未配置' }, { status: 500 })
    }

    // 创建Supabase管理员客户端
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const now = new Date().toISOString()
    let result

    if (action === 'delete') {
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
    console.error('💥 密钥操作异常:', error)
    return NextResponse.json(
      { success: false, error: error.message || '操作失败' },
      { status: 500 }
    )
  }
}

// 处理OPTIONS请求（CORS）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
