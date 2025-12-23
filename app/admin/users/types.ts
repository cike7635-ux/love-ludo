// /app/admin/users/types.ts
export interface User {
  id: string
  email: string
  nickname: string | null
  fullName: string | null
  avatarUrl: string | null
  bio: string | null
  preferences: any
  isAdmin: boolean
  isPremium: boolean
  lastLogin: string
  lastLoginRaw: string | null
  accountExpires: string | null
  createdAt: string
  createdAtRaw: string
  accessKeyId: number | null
  activeKey: string | null
  activeKeyUsedAt: string | null
  activeKeyExpires: string | null
  isActive: boolean
}

export interface UserDetail {
  // profiles 表字段
  id: string
  email: string
  nickname: string | null
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  preferences: any
  account_expires_at: string | null
  last_login_at: string | null
  last_login_session: string | null
  access_key_id: number | null
  created_at: string
  updated_at: string
  
  // 关联数据
  accessKeys: Array<{
    id: number
    key_code: string
    is_active: boolean
    used_count: number
    max_uses: number
    key_expires_at: string | null
    account_valid_for_days: number
    user_id: string | null
    used_at: string | null
    created_at: string
    updated_at: string
  }>
  
  aiUsageRecords: Array<{
    id: number
    user_id: string
    feature: string
    created_at: string
    request_data: any
    response_data: any
    success: boolean
    token_usage?: {
      input_tokens: number
      output_tokens: number
      cache_hit: boolean
    }
  }>
  
  gameHistory: Array<{
    id: number
    user_id: string
    room_id: string
    result: string
    score: number
    created_at: string
  }>
}