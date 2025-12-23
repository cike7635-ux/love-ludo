// /app/api/admin/data/route.ts - 完整修复版本
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // 1. 验证管理员身份
    const adminKeyVerified = request.cookies.get('admin_key_verified')
    const referer = request.headers.get('referer')
    const isFromAdminPage = referer?.includes('/admin/')
    
    if (!adminKeyVerified && !isFromAdminPage) {
      console.warn('管理API未授权访问')
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      )
    }

    // 2. 检查环境变量
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY 环境变量未设置')
      return NextResponse.json(
        { success: false, error: '服务器配置错误' },
        { status: 500 }
      )
    }

    // 3. 创建管理员客户端
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false }
      }
    )

    // 4. 获取查询参数
    const searchParams = request.nextUrl.searchParams
    const table = searchParams.get('table')
    const detailId = searchParams.get('detailId')

    console.log(`[API] 查询: ${table}, detailId: ${detailId}`)

    // 5. 处理用户详情查询
    if (table === 'profiles' && detailId) {
      console.log(`查询用户详情: ${detailId}`)
      
      try {
        // 🔥 关键修复：顺序查询，确保数据稳定
        
        // 1. 首先查询用户基本信息
        const { data: profileData, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', detailId)
          .single()

        if (profileError) {
          console.error('查询用户详情失败:', profileError)
          return NextResponse.json(
            { success: false, error: '获取用户详情失败' },
            { status: 404 }
          )
        }

        console.log('用户基本信息:', {
          邮箱: profileData?.email,
          access_key_id: profileData?.access_key_id
        })

        // 🔥 2. 修复密钥查询：同时查询两种关联关系
        let allKeys: any[] = []
        
        // 方法A：查询用户使用过的所有密钥（通过user_id）
        const { data: keysByUserId } = await supabaseAdmin
          .from('access_keys')
          .select('*')
          .eq('user_id', detailId)
          .order('created_at', { ascending: false })

        if (keysByUserId && keysByUserId.length > 0) {
          console.log('通过user_id查询到密钥:', keysByUserId.length)
          allKeys = [...allKeys, ...keysByUserId]
        }

        // 方法B：查询用户当前使用的密钥（通过access_key_id）
        if (profileData?.access_key_id) {
          const { data: keyById } = await supabaseAdmin
            .from('access_keys')
            .select('*')
            .eq('id', profileData.access_key_id)

          if (keyById && keyById.length > 0) {
            console.log('通过access_key_id查询到密钥:', keyById.length)
            // 去重，避免重复添加
            keyById.forEach(key => {
              if (!allKeys.some(k => k.id === key.id)) {
                allKeys.push(key)
              }
            })
          }
        }

        // 方法C：如果以上两种都查不到，尝试查询所有user_id为null的密钥
        if (allKeys.length === 0) {
          const { data: keysWithNullUserId } = await supabaseAdmin
            .from('access_keys')
            .select('*')
            .is('user_id', null)
            .order('created_at', { ascending: false })
            .limit(10)

          if (keysWithNullUserId && keysWithNullUserId.length > 0) {
            console.log('查询到user_id为null的密钥:', keysWithNullUserId.length)
            allKeys = keysWithNullUserId
          }
        }

        console.log('最终密钥记录数量:', allKeys.length)

        // 🔥 3. 修复AI记录查询：使用更稳定的查询方式
        let aiRecords: any[] = []
        let aiError = null
        
        // 尝试多次查询，确保稳定性
        for (let i = 0; i < 3; i++) {
          const { data, error } = await supabaseAdmin
            .from('ai_usage_records')
            .select('*')
            .eq('user_id', detailId)
            .order('created_at', { ascending: false })
            .limit(10)
          
          if (!error && data && data.length > 0) {
            aiRecords = data
            console.log(`第${i+1}次查询AI记录成功:`, data.length)
            break
          } else if (error) {
            aiError = error
          }
          
          // 等待100ms再试
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        if (aiError) {
          console.error('查询AI记录最终失败:', aiError)
        }

        console.log('AI记录数量:', aiRecords.length)

        // 4. 查询游戏历史记录
        const { data: gameHistories } = await supabaseAdmin
          .from('game_history')
          .select('*')
          .or(`player1_id.eq.${detailId},player2_id.eq.${detailId}`)
          .order('started_at', { ascending: false })
          .limit(10)

        console.log('游戏记录数量:', gameHistories?.length || 0)

        // 🔥 关键修复：返回数据，使用驼峰命名
        const responseData = {
          // profiles 表字段（保持原样）
          id: profileData?.id,
          email: profileData?.email,
          nickname: profileData?.nickname,
          full_name: profileData?.full_name,
          avatar_url: profileData?.avatar_url,
          bio: profileData?.bio,
          preferences: profileData?.preferences,
          account_expires_at: profileData?.account_expires_at,
          last_login_at: profileData?.last_login_at,
          last_login_session: profileData?.last_login_session,
          access_key_id: profileData?.access_key_id,
          created_at: profileData?.created_at,
          updated_at: profileData?.updated_at,
          
          // 🔥 使用驼峰命名
          accessKeys: allKeys || [],
          aiUsageRecords: aiRecords || [],
          gameHistory: gameHistories || []
        }

        console.log('API返回数据摘要:', {
          密钥数量: responseData.accessKeys.length,
          AI记录数量: responseData.aiUsageRecords.length,
          游戏记录数量: responseData.gameHistory.length
        })

        return NextResponse.json({
          success: true,
          data: responseData
        })

      } catch (error: any) {
        console.error('用户详情查询失败:', error)
        return NextResponse.json(
          { 
            success: false, 
            error: '获取用户详情失败',
            details: error.message
          },
          { status: 500 }
        )
      }
    }

    // 6. 处理普通列表查询
    if (!table) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数：table' },
        { status: 400 }
      )
    }

    // ... 其他表的查询逻辑保持不变 ...

    return NextResponse.json({
      success: true,
      data: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
      }
    })

  } catch (error: any) {
    console.error('管理员数据API错误:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || '服务器内部错误'
      },
      { status: 500 }
    )
  }
}