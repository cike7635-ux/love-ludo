// /app/api/admin/data/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // 1. 验证管理员身份（检查cookie）
    const adminKeyVerified = request.cookies.get('admin_key_verified')
    if (!adminKeyVerified) {
      return NextResponse.json(
        { success: false, error: '未授权访问：请先登录管理员账号' },
        { status: 401 }
      )
    }

    // 2. 检查Service Role Key环境变量
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY 环境变量未设置')
      return NextResponse.json(
        { success: false, error: '服务器配置错误' },
        { status: 500 }
      )
    }

    // 3. 使用Service Role Key创建管理员客户端（绕过RLS）
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    )

    // 4. 获取查询参数
    const searchParams = request.nextUrl.searchParams
    const table = searchParams.get('table')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit
    const search = searchParams.get('search')
    const filter = searchParams.get('filter')
    const detailId = searchParams.get('detailId')

    // 5. 参数验证
    if (!table) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数：table' },
        { status: 400 }
      )
    }

    // 6. 根据表名执行不同的查询
    let data: any
    let count: number | null

    switch (table) {
      case 'profiles':
        // 处理单个用户详情查询
        if (detailId) {
          const { data: profileData, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select(`
              *,
              access_keys(*),
              ai_usage_records(*),
              game_history(*)
            `)
            .eq('id', detailId)
            .single()

          if (profileError) {
            console.error('查询用户详情失败:', profileError)
            return NextResponse.json(
              { success: false, error: '获取用户详情失败' },
              { status: 404 }
            )
          }

          return NextResponse.json({
            success: true,
            data: profileData
          })
        }

        // 处理用户列表查询
        let profilesQuery = supabaseAdmin
          .from('profiles')
          .select(`
            *,
            access_keys!access_keys_id_fkey (
              key_code,
              used_at,
              key_expires_at,
              account_valid_for_days
            )
          `, { count: 'exact' })

        // 应用搜索条件
        if (search && search.trim()) {
          const searchTerm = `%${search.trim()}%`
          profilesQuery = profilesQuery.or(
            `email.ilike.${searchTerm},nickname.ilike.${searchTerm},full_name.ilike.${searchTerm}`
          )
        }

        // 应用筛选条件
        const now = new Date().toISOString()
        if (filter) {
          switch (filter) {
            case 'premium':
              profilesQuery = profilesQuery.gt('account_expires_at', now)
              break
            case 'free':
              profilesQuery = profilesQuery.or(
                `account_expires_at.lte.${now},account_expires_at.is.null`
              )
              break
            case 'active24h':
              const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
              profilesQuery = profilesQuery.gt('last_login_at', yesterday)
              break
            case 'expired':
              profilesQuery = profilesQuery.lt('account_expires_at', now)
              break
            // 'all' 和其他情况不做额外筛选
          }
        }

        // 执行分页查询
        const { data: profilesData, error: profilesError, count: profilesCount } = await profilesQuery
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (profilesError) {
          console.error('查询profiles表失败:', profilesError)
          throw profilesError
        }

        data = profilesData
        count = profilesCount
        break

      case 'access_keys':
        // 密钥表查询
        let keysQuery = supabaseAdmin
          .from('access_keys')
          .select(`
            *,
            profiles!access_keys_user_id_fkey (
              email,
              nickname
            )
          `, { count: 'exact' })

        // 应用搜索条件
        if (search && search.trim()) {
          const searchTerm = `%${search.trim()}%`
          keysQuery = keysQuery.or(
            `key_code.ilike.${searchTerm},profiles.email.ilike.${searchTerm},profiles.nickname.ilike.${searchTerm}`
          )
        }

        // 应用筛选条件
        if (filter) {
          switch (filter) {
            case 'used':
              keysQuery = keysQuery.not('used_at', 'is', null)
              break
            case 'unused':
              keysQuery = keysQuery.is('used_at', null)
              break
            case 'expired':
              keysQuery = keysQuery.lt('key_expires_at', now)
              break
          }
        }

        const { data: keysData, error: keysError, count: keysCount } = await keysQuery
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (keysError) {
          console.error('查询access_keys表失败:', keysError)
          throw keysError
        }

        data = keysData
        count = keysCount
        break

      case 'ai_usage_records':
        // AI使用记录查询
        let aiQuery = supabaseAdmin
          .from('ai_usage_records')
          .select(`
            *,
            profiles!ai_usage_records_user_id_fkey (
              email,
              nickname
            )
          `, { count: 'exact' })

        // 应用时间筛选
        if (filter) {
          const now = new Date()
          let startDate: Date
          
          switch (filter) {
            case 'today':
              startDate = new Date(now.setHours(0, 0, 0, 0))
              break
            case '7d':
              startDate = new Date(now.setDate(now.getDate() - 7))
              break
            case '30d':
              startDate = new Date(now.setDate(now.getDate() - 30))
              break
            default:
              startDate = new Date(0) // 所有时间
          }
          
          if (startDate.getTime() > 0) {
            aiQuery = aiQuery.gte('created_at', startDate.toISOString())
          }
        }

        // 应用功能类型筛选
        const featureFilter = searchParams.get('feature')
        if (featureFilter) {
          aiQuery = aiQuery.eq('feature', featureFilter)
        }

        const { data: aiData, error: aiError, count: aiCount } = await aiQuery
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (aiError) {
          console.error('查询ai_usage_records表失败:', aiError)
          throw aiError
        }

        data = aiData
        count = aiCount
        break

      case 'themes':
        // 主题表查询
        const { data: themesData, error: themesError, count: themesCount } = await supabaseAdmin
          .from('themes')
          .select(`
            *,
            profiles!themes_creator_id_fkey (
              email,
              nickname
            )
          `, { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (themesError) {
          console.error('查询themes表失败:', themesError)
          throw themesError
        }

        data = themesData
        count = themesCount
        break

      case 'game_history':
        // 游戏历史查询
        const { data: gameData, error: gameError, count: gameCount } = await supabaseAdmin
          .from('game_history')
          .select(`
            *,
            profiles!game_history_user_id_fkey (
              email,
              nickname
            )
          `, { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (gameError) {
          console.error('查询game_history表失败:', gameError)
          throw gameError
        }

        data = gameData
        count = gameCount
        break

      default:
        return NextResponse.json(
          { success: false, error: `不支持的表名: ${table}` },
          { status: 400 }
        )
    }

    // 7. 返回成功响应
    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error: any) {
    console.error('管理员数据API错误:', error)
    
    // 返回详细的错误信息
    return NextResponse.json(
      {
        success: false,
        error: error.message || '服务器内部错误',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

// 支持其他HTTP方法（如果需要）
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { success: false, error: '暂不支持POST方法' },
    { status: 405 }
  )
}

export async function PUT(request: NextRequest) {
  return NextResponse.json(
    { success: false, error: '暂不支持PUT方法' },
    { status: 405 }
  )
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json(
    { success: false, error: '暂不支持DELETE方法' },
    { status: 405 }
  )
}