// /app/api/admin/test-keys/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔑 测试密钥API调用...')
    
    // 验证管理员权限
    const authMethods = {
      cookie: request.cookies.get('admin_key_verified')?.value,
      referer: request.headers.get('referer'),
      userAgent: request.headers.get('user-agent')
    }

    const isAuthenticated = authMethods.cookie || 
      (authMethods.referer?.includes('/admin/') && authMethods.userAgent)

    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      )
    }

    // 验证环境变量
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { success: false, error: '环境变量未配置' },
        { status: 500 }
      )
    }

    // 创建管理员客户端
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    console.log('📊 查询access_keys表...')
    
    // 方法1：直接查询access_keys表
    const { data: keysData, error: keysError } = await supabaseAdmin
      .from('access_keys')
      .select('*')
      .order('created_at', { ascending: false })

    if (keysError) {
      console.error('❌ 查询失败:', keysError)
      return NextResponse.json(
        { 
          success: false, 
          error: '查询失败', 
          details: keysError.message 
        },
        { status: 500 }
      )
    }

    console.log(`✅ 查询成功，找到 ${keysData?.length || 0} 条记录`)
    
    // 方法2：尝试关联查询用户信息
    let enrichedData = []
    if (keysData && keysData.length > 0) {
      for (const key of keysData) {
        let userInfo = null
        
        if (key.user_id) {
          const { data: userData, error: userError } = await supabaseAdmin
            .from('profiles')
            .select('email, nickname')
            .eq('id', key.user_id)
            .single()
            
          if (!userError && userData) {
            userInfo = userData
          }
        }
        
        enrichedData.push({
          ...key,
          user: userInfo,
          // 确保字段存在
          max_uses: key.max_uses || 1,
          used_count: key.used_count || 0
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: enrichedData,
      count: enrichedData.length,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('💥 测试密钥API异常:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '服务器内部错误',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
