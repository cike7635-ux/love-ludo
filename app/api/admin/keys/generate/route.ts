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
      console.log('❌ 未授权访问')
      return NextResponse.json(
        { success: false, error: '未授权访问', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // 2. 验证环境变量
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ 环境变量缺失')
      return NextResponse.json(
        { success: false, error: '服务器配置不完整' },
        { status: 500 }
      )
    }

    // 3. 解析请求数据
    let body
    try {
      body = await request.json()
      console.log('📦 请求数据:', {
        keysCount: body.keys?.length || 0,
        duration_days: body.duration_days,
        absolute_expiry_days: body.absolute_expiry_days,
        max_uses: body.max_uses,
        description: body.description
      })
    } catch (error) {
      return NextResponse.json(
        { success: false, error: '请求格式错误' },
        { status: 400 }
      )
    }

    const { keys, duration_days, absolute_expiry_days, max_uses, description } = body

    // 4. 验证请求数据
    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json(
        { success: false, error: '请提供要生成的密钥列表' },
        { status: 400 }
      )
    }

    const validKeys = keys.filter(key => key && key.trim().length > 0)
    if (validKeys.length === 0) {
      return NextResponse.json(
        { success: false, error: '请提供有效的密钥代码' },
        { status: 400 }
      )
    }

    // 使用有效期（小时转换为天，向上取整）
    const durationDays = parseFloat(duration_days) || 30
    let accountValidForDays = Math.ceil(durationDays) // 向上取整
    const originalDurationHours = durationDays * 24   // 原始小时数
    
    if (accountValidForDays <= 0) {
      return NextResponse.json(
        { success: false, error: '使用有效期必须大于0' },
        { status: 400 }
      )
    }

    // 绝对有效期（默认365天）
    const absoluteExpiryDays = absolute_expiry_days ? parseInt(absolute_expiry_days) : 365
    if (absoluteExpiryDays <= 0) {
      return NextResponse.json(
        { success: false, error: '绝对有效期必须大于0天' },
        { status: 400 }
      )
    }

    // 使用次数限制
    const maxUses = max_uses ? parseInt(max_uses) : 1
    if (maxUses <= 0) {
      return NextResponse.json(
        { success: false, error: '使用次数限制必须大于0' },
        { status: 400 }
      )
    }

    // 5. 创建Supabase管理员客户端
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // 6. 计算过期时间
    const now = new Date()
    const absoluteExpiryDate = new Date(now.getTime() + absoluteExpiryDays * 24 * 60 * 60 * 1000)

    // 7. 准备要插入的数据
    const keysToInsert = validKeys.map((key_code: string) => {
      return {
        key_code: key_code.trim(),
        account_valid_for_days: accountValidForDays,      // 向上取整的整数天
        original_duration_hours: originalDurationHours,   // 原始小时数（新字段）
        key_expires_at: absoluteExpiryDate.toISOString(), // 绝对过期时间
        max_uses: maxUses,
        used_count: 0,
        is_active: true,
        user_id: null,
        used_at: null,
        description: description || null,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      }
    })

    console.log(`📝 准备插入 ${keysToInsert.length} 个密钥`)
    console.log(`   - 使用有效期: ${durationDays}天 (${originalDurationHours}小时)`)
    console.log(`   - 绝对有效期: ${absoluteExpiryDays}天`)
    console.log(`   - 使用次数限制: ${maxUses}次`)

    // 8. 批量插入数据库
    const { data, error } = await supabaseAdmin
      .from('access_keys')
      .insert(keysToInsert)
      .select()

    if (error) {
      console.error('❌ 插入密钥失败:', error)
      
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, error: '密钥代码已存在' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { success: false, error: '数据库插入失败: ' + error.message },
        { status: 500 }
      )
    }

    console.log(`✅ 成功生成 ${data.length} 个密钥`)

    // 9. 返回成功响应
    return NextResponse.json({
      success: true,
      data: {
        generated_count: data.length,
        keys: data.map(k => ({
          id: k.id,
          key_code: k.key_code,
          account_valid_for_days: k.account_valid_for_days,
          original_duration_hours: k.original_duration_hours,
          key_expires_at: k.key_expires_at,
          max_uses: k.max_uses,
          description: k.description
        })),
        summary: {
          duration: `${originalDurationHours}小时 (${accountValidForDays}天)`,
          absolute_expiry: absoluteExpiryDays + '天',
          max_uses: maxUses === null ? '无限次' : maxUses + '次'
        }
      },
      message: `成功创建了 ${data.length} 个密钥`
    })

  } catch (error: any) {
    console.error('💥 密钥生成API异常:', error)
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
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
