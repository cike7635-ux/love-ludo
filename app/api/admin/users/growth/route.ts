// /app/api/admin/users/growth/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const adminKeyVerified = request.cookies.get('admin_key_verified')
    if (!adminKeyVerified) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '7d'
    
    let days = 7
    if (range === '30d') days = 30
    if (range === '90d') days = 90

    // 创建Supabase客户端
    const supabaseAdmin = createRouteHandlerClient({ 
      cookies,
      options: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!
      }
    })

    // 计算开始日期
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days + 1)
    startDate.setHours(0, 0, 0, 0)

    // 查询每日新增用户
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    if (error) throw error

    // 处理数据
    const dailyData: Record<string, number> = {}
    
    // 初始化所有日期的数据为0
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      dailyData[dateStr] = 0
    }

    // 统计每日新增
    data?.forEach(profile => {
      if (profile.created_at) {
        const dateStr = profile.created_at.split('T')[0]
        if (dailyData[dateStr] !== undefined) {
          dailyData[dateStr]++
        }
      }
    })

    // 转换为前端需要的格式
    let cumulative = 0
    const result = Object.entries(dailyData).map(([date, count]) => {
      cumulative += count
      return {
        date: new Date(date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        count,
        cumulative
      }
    })

    return NextResponse.json({
      success: true,
      data: result,
      totalGrowth: cumulative
    })

  } catch (error: any) {
    console.error('获取增长数据失败:', error)
    return NextResponse.json(
      { success: false, error: '获取数据失败' },
      { status: 500 }
    )
  }
}
