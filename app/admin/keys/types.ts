// /app/admin/keys/types.ts

// 密钥状态类型
export type KeyStatus = 'unused' | 'used' | 'expired' | 'disabled'

// 密钥基础类型
export interface AccessKey {
  id: number
  key_code: string
  description: string | null
  is_active: boolean
  used_count: number
  max_uses: number | null
  key_expires_at: string | null
  account_valid_for_days: number
  original_duration_hours: number | null
  duration_unit: string
  user_id: string | null
  used_at: string | null
  created_at: string
  updated_at: string
  
  // 计算字段
  status: KeyStatus
  usage_count: number
  last_used_at: string | null
  
  // 关联用户
  current_user: {
    email: string
    nickname: string | null
  } | null
}

// 使用历史记录
export interface KeyUsageHistory {
  id: number
  user_id: string
  access_key_id: number
  used_at: string
  usage_type: string
  previous_key_id: number | null
  next_key_id: number | null
  operation_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
  
  // 关联信息
  user?: {
    email: string
    nickname: string | null
  }
  operator?: {
    email: string
    nickname: string | null
  }
}

// 密钥详情
export interface KeyDetail {
  key_info: AccessKey
  current_usage: {
    user: {
      id: string
      email: string
      nickname: string | null
    }
    used_at: string
    notes: string | null
  } | null
  usage_history: KeyUsageHistory[]
  statistics: {
    total_uses: number
    unique_users: number
    average_duration_hours: number
    first_use: string | null
    last_use: string | null
    usage_by_type: Record<string, number>
  }
  related_keys: {
    previous_keys: number[]
    next_keys: number[]
  }
}

// 列表响应类型
export interface KeysListResponse {
  success: boolean
  data: {
    keys: AccessKey[]
    pagination: {
      page: number
      limit: number
      total: number
      total_pages: number
      has_next: boolean
      has_prev: boolean
      next_page: number | null
      prev_page: number | null
    }
    filters: {
      applied: any
      available_counts: {
        total: number
        unused: number
        used: number
        expired: number
        disabled: number
      }
    }
  }
  timestamp: string
}

// 筛选参数
export interface FilterParams {
  page?: number
  limit?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  status?: string
  user_email?: string
  key_code?: string
  created_at_start?: string
  created_at_end?: string
  duration_min?: number
  duration_max?: number
  is_active?: boolean
}

// 统计信息
export interface KeyStatistics {
  overview: {
    total_keys: number
    active_keys: number
    used_keys: number
    unused_keys: number
    expired_keys: number
    disabled_keys: number
    today_expiring: number
    near_expiring: number
  }
  growth: {
    today: number
    yesterday: number
    week: number
    month: number
    daily_growth: number
  }
  usage: {
    total_uses: number
    unique_users: number
    today: number
    yesterday: number
    week: number
    month: number
    avg_uses_per_key: number
    usage_rate: number
  }
  distribution: {
    duration: Record<string, number>
    usage_type: Record<string, number>
  }
  top_keys: Array<{
    key_id: string
    key_code: string | null
    usage_count: number
    last_used: string | null
  }>
  trends: {
    daily_usage: {
      today: number
      yesterday: number
      change: number
    }
    daily_new_keys: {
      today: number
      yesterday: number
      change: number
    }
  }
}

// 批量操作请求
export interface BatchOperationRequest {
  action: 'disable' | 'enable' | 'delete'
  keyIds: number[]
  reason?: string
}

// 导出选项
export interface ExportOptions {
  export_type: 'current_page' | 'filtered' | 'selected'
  filters?: FilterParams
  selected_ids?: number[]
  page?: number
  limit?: number
}

// 生成密钥请求
export interface GenerateKeysRequest {
  count: number
  prefix: string
  duration: number
  max_uses: number | null
  description?: string
  absolute_expiry_days?: number
}