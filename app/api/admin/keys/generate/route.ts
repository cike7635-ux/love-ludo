// /app/api/admin/keys/generate/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

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
        count: body.count || 1,
        prefix: body.prefix,
        duration: body.duration,
        max_uses: body.max_uses,
        description: body.description,
        absolute_expiry_days: body.absolute_expiry_days
      })
    } catch (error) {
      return NextResponse.json(
        { success: false, error: '请求格式错误' },
        { status: 400 }
      )
    }

    const { 
      count = 1, 
      prefix = 'XY', 
      duration = 30, 
      max_uses = 1, 
      description,
      absolute_expiry_days = 365 
    } = body

    // 4. 验证请求数据
    if (!count || count < 1 || count > 100) {
      return NextResponse.json(
        { success: false, error: '生成数量必须在1-100之间' },
        { status: 400 }
      )
    }

    if (!prefix || prefix.length < 2 || prefix.length > 6) {
      return NextResponse.json(
        { success: false, error: '前缀必须是2-6个字符' },
        { status: 400 }
      )
    }

    if (duration <= 0) {
      return NextResponse.json(
        { success: false, error: '有效期必须大于0' },
        { status: 400 }
      )
    }

    if (max_uses !== null && max_uses <= 0) {
      return NextResponse.json(
        { success: false, error: '使用次数限制必须大于0' },
        { status: 400 }
      )
    }

    if (absolute_expiry_days <= 0) {
      return NextResponse.json(
        { success: false, error: '绝对有效期必须大于0天' },
        { status: 400 }
      )
    }

    // 5. 创建Supabase管理员客户端
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // 6. 计算日期
    const now = new Date()
    const absoluteExpiryDate = new Date(now.getTime() + absolute_expiry_days * 24 * 60 * 60 * 1000)

    // 7. 确定时长单位和原始小时数
    let durationUnit = 'days'
    let originalDurationHours: number | null = null
    let accountValidForDays: number

    if (duration < 1) {
      // 小时级别（小于1天）
      durationUnit = 'hours'
      originalDurationHours = duration * 24
      accountValidForDays = Math.ceil(duration) // 向上取整为天
    } else if (duration === 1) {
      // 1天
      durationUnit = 'days'
      originalDurationHours = 24
      accountValidForDays = 1
    } else if (duration <= 30) {
      // 天数
      durationUnit = 'days'
      originalDurationHours = duration * 24
      accountValidForDays = Math.ceil(duration)
    } else {
      // 月数或年数（按天计算）
      durationUnit = 'days'
      originalDurationHours = duration * 24
      accountValidForDays = Math.ceil(duration)
    }

    // 8. 生成密钥
    const keysToInsert = []
    const generatedKeys = []

    for (let i = 0; i < count; i++) {
      // 生成随机部分
      const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
      const randomPart = Array.from({ length: 8 }, () => 
        characters.charAt(Math.floor(Math.random() * characters.length))
      ).join('')

      // 生成时长代码
      let durationCode = ''
      if (originalDurationHours && originalDurationHours < 24) {
        // 小时级别
        durationCode = `${originalDurationHours}H`
      } else if (accountValidForDays < 30) {
        // 天数级别
        durationCode = `${accountValidForDays}D`
      } else if (accountValidForDays < 365) {
        // 月数级别
        const months = Math.round(accountValidForDays / 30)
        durationCode = `${months}M`
      } else {
        // 年数级别
        const years = Math.round(accountValidForDays / 365)
        durationCode = `${years}Y`
      }

      const keyCode = `${prefix}-${durationCode}-${randomPart}`

      keysToInsert.push({
        key_code: keyCode,
        is_active: true,
        used_count: 0,
        max_uses: max_uses,
        key_expires_at: absoluteExpiryDate.toISOString(),
        account_valid_for_days: accountValidForDays,
        original_duration_hours: originalDurationHours,
        duration_unit: durationUnit,
        user_id: null,
        used_at: null,
        description: description || null,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      })

      generatedKeys.push({
        key_code: keyCode,
        duration: duration,
        duration_unit: durationUnit,
        max_uses: max_uses
      })
    }

    console.log(`📝 准备插入 ${keysToInsert.length} 个密钥`)
    console.log(`   - 前缀: ${prefix}`)
    console.log(`   - 时长: ${duration} ${durationUnit} (${originalDurationHours}小时)`)
    console.log(`   - 绝对有效期: ${absolute_expiry_days}天`)
    console.log(`   - 使用次数限制: ${max_uses === null ? '无限次' : max_uses + '次'}`)

    // 9. 批量插入数据库
    const { data, error } = await supabaseAdmin
      .from('access_keys')
      .insert(keysToInsert)
      .select()

    if (error) {
      console.error('❌ 插入密钥失败:', error)
      
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, error: '密钥代码已存在，请重试' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { success: false, error: '数据库插入失败: ' + error.message },
        { status: 500 }
      )
    }

    console.log(`✅ 成功生成 ${data.length} 个密钥`)

    // 10. 返回成功响应
    return NextResponse.json({
      success: true,
      data: {
        generated_count: data.length,
        keys: data.map(k => ({
          id: k.id,
          key_code: k.key_code,
          account_valid_for_days: k.account_valid_for_days,
          original_duration_hours: k.original_duration_hours,
          duration_unit: k.duration_unit,
          key_expires_at: k.key_expires_at,
          max_uses: k.max_uses,
          description: k.description
        })),
        summary: {
          prefix: prefix,
          duration: `${duration} ${durationUnit}`,
          original_hours: originalDurationHours,
          absolute_expiry: absolute_expiry_days + '天',
          max_uses: max_uses === null ? '无限次' : max_uses + '次'
        }
      },
      message: `成功创建了 ${data.length} 个密钥`,
      download_url: `/api/admin/keys/export/batch?ids=${data.map(k => k.id).join(',')}`
    })

  } catch (error: any) {
    console.error('💥 密钥生成API异常:', error)
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    )
  }
}