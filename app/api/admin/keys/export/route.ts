// /app/api/admin/keys/export/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// 手动生成CSV函数（不需要第三方依赖）
function generateCSV(data: any[]): string {
  if (!data || data.length === 0) {
    return ''
  }

  // 获取表头
  const headers = Object.keys(data[0])
  const csvRows = []

  // 添加表头
  csvRows.push(headers.map(header => `"${header}"`).join(','))

  // 添加数据行
  for (const row of data) {
    const values = headers.map(header => {
      let value = row[header]
      
      // 处理特殊字符
      if (value === null || value === undefined) {
        value = ''
      } else if (typeof value === 'string') {
        // 转义引号和逗号
        if (value.includes('"') || value.includes(',') || value.includes('\n')) {
          value = `"${value.replace(/"/g, '""')}"`
        }
      }
      
      return value
    })
    
    csvRows.push(values.join(','))
  }

  return csvRows.join('\n')
}

export async function POST(request: NextRequest) {
  try {
    console.log('📤 接收到导出请求')
    
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
      console.log('📦 导出选项:', {
        format: body.format,
        selected_ids: body.selected_ids?.length || 0
      })
    } catch (error) {
      return NextResponse.json({ success: false, error: '请求格式错误' }, { status: 400 })
    }

    const { 
      format = 'csv', 
      selected_ids = [], 
      include_columns = [], 
      filters = {} 
    } = body

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // 构建查询
    let query = supabaseAdmin
      .from('access_keys')
      .select(`
        *,
        profiles:user_id (
          email,
          nickname
        )
      `)
      .order('created_at', { ascending: false })

    // 应用筛选条件
    if (selected_ids && selected_ids.length > 0) {
      query = query.in('id', selected_ids)
    } else if (filters) {
      if (filters.status) {
        const now = new Date()
        switch (filters.status) {
          case 'active':
            query = query.eq('is_active', true)
              .or(`key_expires_at.is.null,key_expires_at.gt.${now.toISOString()}`)
            break
          case 'unused':
            query = query.eq('is_active', true)
              .is('used_at', null)
              .is('user_id', null)
            break
          case 'used':
            query = query.or('used_at.not.is.null,user_id.not.is.null')
            break
          case 'expired':
            query = query.lt('key_expires_at', now.toISOString())
            break
          case 'inactive':
            query = query.eq('is_active', false)
            break
        }
      }
      
      if (filters.search) {
        query = query.ilike('key_code', `%${filters.search}%`)
      }
    }

    const { data: keys, error } = await query

    if (error) {
      throw new Error('查询失败: ' + error.message)
    }

    console.log(`📊 导出 ${keys?.length || 0} 条密钥记录`)

    let fileContent: string
    let contentType: string
    let filename: string

    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]

    if (format === 'json') {
      fileContent = JSON.stringify({
        success: true,
        data: keys || [],
        count: keys?.length || 0,
        exported_at: now.toISOString()
      }, null, 2)
      contentType = 'application/json'
      filename = `love-ludo-keys_${dateStr}.json`
      
    } else if (format === 'csv') {
      // 准备CSV数据
      const csvData = (keys || []).map(key => {
        const now = new Date()
        const isExpired = key.key_expires_at ? new Date(key.key_expires_at) < now : false
        const isUsed = !!key.used_at || !!key.user_id
        
        const durationDisplay = key.original_duration_hours 
          ? key.original_duration_hours < 24 
            ? `${key.original_duration_hours}小时`
            : `${Math.round(key.original_duration_hours / 24)}天`
          : `${key.account_valid_for_days}天`

        let status = '未使用'
        if (!key.is_active) status = '已禁用'
        else if (isExpired) status = '已过期'
        else if (isUsed) status = '已使用'

        return {
          '密钥ID': key.id,
          '密钥代码': key.key_code,
          '描述': key.description || '',
          '有效期': durationDisplay,
          '原始时长(小时)': key.original_duration_hours || '',
          '账户有效期(天)': key.account_valid_for_days,
          '状态': status,
          '最大使用次数': key.max_uses || '无限',
          '已使用次数': key.used_count || 0,
          '使用者邮箱': key.profiles?.email || '',
          '使用者昵称': key.profiles?.nickname || '',
          '使用时间': key.used_at ? new Date(key.used_at).toLocaleString('zh-CN') : '',
          '创建时间': new Date(key.created_at).toLocaleString('zh-CN'),
          '过期时间': key.key_expires_at ? new Date(key.key_expires_at).toLocaleString('zh-CN') : '',
          '最后更新时间': new Date(key.updated_at).toLocaleString('zh-CN')
        }
      })

      // 使用我们自己的generateCSV函数
      fileContent = generateCSV(csvData)
      
      // 添加BOM以支持Excel中文
      fileContent = '\uFEFF' + fileContent
      contentType = 'text/csv; charset=utf-8'
      filename = `love-ludo-keys_${dateStr}.csv`
      
    } else {
      // 文本格式
      const textLines = (keys || []).map((key, index) => {
        return `[${index + 1}] ${key.key_code} | ${key.description || '无描述'} | 状态: ${key.is_active ? '有效' : '无效'}`
      })
      
      fileContent = textLines.join('\n')
      contentType = 'text/plain; charset=utf-8'
      filename = `love-ludo-keys_${dateStr}.txt`
    }

    // 创建响应
    const response = new NextResponse(fileContent, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

    return response

  } catch (error: any) {
    console.error('💥 导出失败:', error)
    return NextResponse.json(
      { success: false, error: error.message || '导出失败' },
      { status: 500 }
    )
  }
}