// /app/api/admin/keys/statistics/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('📊 获取密钥统计信息')
    
    // 1. 验证管理员权限
    const authMethods = {
      cookie: request.cookies.get('admin_key_verified')?.value,
      referer: request.headers.get('referer'),
      userAgent: request.headers.get('user-agent')
    }

    const isAuthenticated = authMethods.cookie || 
      (authMethods.referer?.includes('/admin/') && authMethods.userAgent)

    if (!isAuthenticated) {
      return NextResponse.json({ 
        success: false, 
        error: '未授权访问' 
      }, { status: 401 })
    }

    // 2. 验证环境变量
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: '环境变量未配置' 
      }, { status: 500 })
    }

    // 3. 创建Supabase管理员客户端
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    )

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const thisWeek = new Date(today)
    thisWeek.setDate(thisWeek.getDate() - 7)
    
    const thisMonth = new Date(today)
    thisMonth.setMonth(thisMonth.getMonth() - 1)

    // 4. 查询所有密钥
    const { data: allKeys, error: keysError } = await supabaseAdmin
      .from('access_keys')
      .select('*')

    if (keysError) {
      throw new Error('查询密钥失败: ' + keysError.message)
    }

    // 5. 查询使用历史
    const { data: usageHistory, error: usageError } = await supabaseAdmin
      .from('key_usage_history')
      .select('*')

    if (usageError) {
      console.warn('查询使用历史失败，继续统计:', usageError.message)
    }

    // 6. 计算统计信息
    const keys = allKeys || []
    const history = usageHistory || []
    const nowTime = now.getTime()

    // 6.1 基础统计
    const totalKeys = keys.length
    const activeKeys = keys.filter(k => k.is_active).length
    const expiredKeys = keys.filter(k => 
      k.key_expires_at && new Date(k.key_expires_at).getTime() < nowTime
    ).length
    const disabledKeys = keys.filter(k => !k.is_active).length
    
    // 6.2 使用统计
    const usedKeys = keys.filter(k => k.used_at || history.some(h => h.access_key_id === k.id)).length
    const unusedKeys = keys.filter(k => !k.used_at && !history.some(h => h.access_key_id === k.id)).length
    
    // 6.3 使用次数统计
    const totalUses = history.length
    const uniqueUsers = new Set(history.map(h => h.user_id)).size
    
    // 6.4 时间统计
    const todayExpiring = keys.filter(k => {
      if (!k.key_expires_at) return false
      const expiry = new Date(k.key_expires_at)
      return expiry.toDateString() === today.toDateString()
    }).length

    const nearExpiring = keys.filter(k => {
      if (!k.key_expires_at) return false
      const expiry = new Date(k.key_expires_at)
      const sevenDaysLater = new Date(today)
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)
      return expiry > today && expiry <= sevenDaysLater
    }).length

    // 6.5 新增统计
    const todayNew = keys.filter(k => 
      new Date(k.created_at).toDateString() === today.toDateString()
    ).length

    const yesterdayNew = keys.filter(k => 
      new Date(k.created_at).toDateString() === yesterday.toDateString()
    ).length

    const weekNew = keys.filter(k => 
      new Date(k.created_at) >= thisWeek
    ).length

    const monthNew = keys.filter(k => 
      new Date(k.created_at) >= thisMonth
    ).length

    // 6.6 使用统计（时间维度）
    const todayUses = history.filter(h => 
      new Date(h.used_at).toDateString() === today.toDateString()
    ).length

    const yesterdayUses = history.filter(h => 
      new Date(h.used_at).toDateString() === yesterday.toDateString()
    ).length

    const weekUses = history.filter(h => 
      new Date(h.used_at) >= thisWeek
    ).length

    const monthUses = history.filter(h => 
      new Date(h.used_at) >= thisMonth
    ).length

    // 6.7 有效期分布
    const durationDistribution = {
      '1小时': keys.filter(k => k.original_duration_hours === 1).length,
      '2小时': keys.filter(k => k.original_duration_hours === 2).length,
      '4小时': keys.filter(k => k.original_duration_hours === 4).length,
      '12小时': keys.filter(k => k.original_duration_hours === 12).length,
      '1天': keys.filter(k => k.account_valid_for_days === 1).length,
      '7天': keys.filter(k => k.account_valid_for_days === 7).length,
      '30天': keys.filter(k => k.account_valid_for_days === 30).length,
      '90天': keys.filter(k => k.account_valid_for_days === 90).length,
      '180天': keys.filter(k => k.account_valid_for_days === 180).length,
      '365天': keys.filter(k => k.account_valid_for_days === 365).length,
      '其他': keys.filter(k => 
        !([1, 2, 4, 12].includes(k.original_duration_hours) || 
          [1, 7, 30, 90, 180, 365].includes(k.account_valid_for_days))
      ).length
    }

    // 6.8 使用类型分布
    const usageTypeDistribution = history.reduce((acc, record) => {
      acc[record.usage_type] = (acc[record.usage_type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // 6.9 热门密钥（使用次数最多的）
    const keyUsageCount = history.reduce((acc, record) => {
      acc[record.access_key_id] = (acc[record.access_key_id] || 0) + 1
      return acc
    }, {} as Record<number, number>)

    const topKeys = Object.entries(keyUsageCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([keyId, count]) => {
        const key = keys.find(k => k.id === parseInt(keyId))
        return {
          key_id: keyId,
          key_code: key?.key_code,
          usage_count: count,
          last_used: history
            .filter(h => h.access_key_id === parseInt(keyId))
            .sort((a, b) => new Date(b.used_at).getTime() - new Date(a.used_at).getTime())[0]?.used_at
        }
      })

    // 7. 构建响应
    const response = {
      overview: {
        total_keys: totalKeys,
        active_keys: activeKeys,
        used_keys: usedKeys,
        unused_keys: unusedKeys,
        expired_keys: expiredKeys,
        disabled_keys: disabledKeys,
        today_expiring: todayExpiring,
        near_expiring: nearExpiring
      },
      
      growth: {
        today: todayNew,
        yesterday: yesterdayNew,
        week: weekNew,
        month: monthNew,
        daily_growth: yesterdayNew > 0 ? 
          Math.round(((todayNew - yesterdayNew) / yesterdayNew) * 100) : 0
      },
      
      usage: {
        total_uses: totalUses,
        unique_users: uniqueUsers,
        today: todayUses,
        yesterday: yesterdayUses,
        week: weekUses,
        month: monthUses,
        avg_uses_per_key: totalKeys > 0 ? Math.round((totalUses / totalKeys) * 100) / 100 : 0,
        usage_rate: totalKeys > 0 ? Math.round((usedKeys / totalKeys) * 100) : 0
      },
      
      distribution: {
        duration: durationDistribution,
        usage_type: usageTypeDistribution
      },
      
      top_keys: topKeys,
      
      trends: {
        daily_usage: {
          today: todayUses,
          yesterday: yesterdayUses,
          change: yesterdayUses > 0 ? 
            Math.round(((todayUses - yesterdayUses) / yesterdayUses) * 100) : 0
        },
        daily_new_keys: {
          today: todayNew,
          yesterday: yesterdayNew,
          change: yesterdayNew > 0 ? 
            Math.round(((todayNew - yesterdayNew) / yesterdayNew) * 100) : 0
        }
      },
      
      timestamps: {
        generated_at: now.toISOString(),
        period: {
          today: today.toISOString(),
          yesterday: yesterday.toISOString(),
          week_start: thisWeek.toISOString(),
          month_start: thisMonth.toISOString()
        }
      }
    }

    console.log(`✅ 统计信息生成完成，共 ${totalKeys} 个密钥，${totalUses} 次使用`)

    return NextResponse.json({
      success: true,
      data: response,
      timestamp: now.toISOString()
    })

  } catch (error: any) {
    console.error('💥 统计信息异常:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '统计失败'
    }, { status: 500 })
  }
}