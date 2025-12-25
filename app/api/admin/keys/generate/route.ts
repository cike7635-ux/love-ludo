// /app/api/admin/keys/generate/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🔑 接收到密钥生成请求')

    // 1. 验证管理员权限
    const authMethods = {
      cookie: request.cookies.get('admin_key_verified')?.value,
      referer: request.headers.get('referer'),
      userAgent: request.headers.get('user-agent')
    }

    const isAuthenticated = authMethods.cookie || 
      (authMethods.referer?.includes('/admin/') && authMethods.userAgent)

    if (!isAuthenticated) {
      return NextResponse.json(
        { 
          success: false, 
          error: '未授权访问',
          code: 'UNAUTHORIZED_ACCESS'
        },
        { status: 401 }
      )
    }

    // 2. 验证环境变量
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { 
          success: false, 
          error: '服务器配置不完整'
        },
        { status: 500 }
      )
    }

    // 3. 解析请求数据
    let body;
    try {
      body = await request.json()
      console.log('📦 请求数据:', {
        keysCount: body.keys?.length || 0,
        durationDays: body.duration_days,
        maxUses: body.max_uses,
        description: body.description
      })
    } catch (error) {
      return NextResponse.json(
        { 
          success: false, 
          error: '请求格式错误'
        },
        { status: 400 }
      )
    }

    const { keys, duration_days, max_uses, description } = body

    // 4. 验证请求数据
    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: '请提供要生成的密钥列表'
        },
        { status: 400 }
      )
    }

    // 过滤空密钥
    const validKeys = keys.filter(key => key && key.trim().length > 0)
    if (validKeys.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: '请提供有效的密钥代码'
        },
        { status: 400 }
      )
    }

    const durationDays = parseInt(duration_days) || 30
    const maxUses = max_uses ? parseInt(max_uses) : 1

    if (durationDays <= 0 || maxUses <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: '有效期和使用次数必须大于0'
        },
        { status: 400 }
      )
    }

    // 5. 创建Supabase管理员客户端
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // 6. 准备要插入的数据
    const now = new Date()
    const expiryDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000)

    const keysToInsert = validKeys.map((key_code: string) => {
      return {
        key_code: key_code.trim(),
        account_valid_for_days: durationDays,
        max_uses: maxUses,
        used_count: 0,
        key_expires_at: expiryDate.toISOString(),
        is_active: true,
        user_id: null,
        used_at: null,
        description: description || null, // 新增description字段
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      }
    })

    console.log(`📝 准备插入 ${keysToInsert.length} 个密钥`)

    // 7. 批量插入数据库
    const { data, error } = await supabaseAdmin
      .from('access_keys')
      .insert(keysToInsert)
      .select()

    if (error) {
      console.error('❌ 插入密钥失败:', error)
      
      if (error.code === '23505') {
        return NextResponse.json(
          { 
            success: false, 
            error: '密钥代码已存在'
          },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { 
          success: false, 
          error: '数据库插入失败: ' + error.message
        },
        { status: 500 }
      )
    }

    console.log(`✅ 成功生成 ${data.length} 个密钥`)

    // 8. 返回成功响应（包含description信息）
    return NextResponse.json({
      success: true,
      data: {
        generated_count: data.length,
        keys: data.map(k => ({
          id: k.id,
          key_code: k.key_code,
          expires_at: k.key_expires_at,
          max_uses: k.max_uses,
          duration_days: k.account_valid_for_days,
          description: k.description // 返回description
        })),
        expires_at: expiryDate.toISOString(),
        max_uses: maxUses,
        duration_days: durationDays,
        description: description,
        timestamp: now.toISOString()
      },
      message: `成功创建了 ${data.length} 个密钥`
    })

  } catch (error: any) {
    console.error('💥 密钥生成API异常:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '服务器内部错误'
      },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
