// /app/admin/users/types.ts - 完整修复版
export interface User {
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
  
  // 计算字段
  isActive?: boolean
  isPremium?: boolean
  daysRemaining?: number
  lastLogin?: string
  accountExpires?: string
  activeKey?: string | null
}

export interface UserDetail {
  // 基本字段（全部下划线）
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
  
  // 关联字段（全部下划线）
  access_keys: AccessKey[]
  ai_usage_records: AiUsageRecord[]
  game_history: GameHistory[]
  
  // 密钥使用历史
  key_usage_history?: KeyUsageHistory[]
  current_access_key?: AccessKey | null
}

export interface AccessKey {
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
}

export interface AiUsageRecord {
  id: number
  user_id: string
  feature: string
  created_at: string
  request_data: any
  response_data: any
  success: boolean
}

export interface GameHistory {
  id: string
  room_id: string | null
  session_id: string | null
  player1_id: string
  player2_id: string
  winner_id: string | null
  started_at: string | null
  ended_at: string | null
  task_results: any[]
}

export interface KeyUsageHistory {
  id: number
  user_id: string
  access_key_id: number
  used_at: string | null
  usage_type: string
  previous_key_id: number | null
  next_key_id: number | null
  operation_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
  access_key?: AccessKey
  operator?: {
    id: string
    email: string
    nickname: string | null
  }
}

// 🔥 核心修复：归一化函数 - 处理下划线命名
export function normalizeUserDetail(data: any): UserDetail {
  if (!data) {
    console.warn('❌ normalizeUserDetail: 输入数据为空')
    return {} as UserDetail
  }
  
  // 🔍 打印完整的原始数据结构
  console.log('🎯 完整原始数据结构分析:', {
    所有字段: Object.keys(data),
    access_keys字段存在: 'access_keys' in data,
    access_keys值: data.access_keys,
    access_keys是数组: Array.isArray(data.access_keys),
    access_keys长度: data.access_keys?.length || 0,
    ai_usage_records字段存在: 'ai_usage_records' in data,
    ai_usage_records值: data.ai_usage_records,
    ai_usage_records是数组: Array.isArray(data.ai_usage_records),
    ai_usage_records长度: data.ai_usage_records?.length || 0,
    current_access_key字段存在: 'current_access_key' in data,
    current_access_key值: data.current_access_key
  })
  
  // 直接使用下划线字段名
  const accessKeysData = data.access_keys || []
  const aiUsageRecordsData = data.ai_usage_records || []
  const currentAccessKeyData = data.current_access_key || null
  
  console.log('🔧 数据提取结果:', {
    access_keys数据: accessKeysData,
    access_keys长度: accessKeysData.length,
    ai_usage_records数据: aiUsageRecordsData,
    ai_usage_records长度: aiUsageRecordsData.length,
    current_access_key数据: currentAccessKeyData
  })
  
  // 如果access_keys为空但current_access_key有数据，合并显示
  let finalAccessKeys = accessKeysData
  if (accessKeysData.length === 0 && currentAccessKeyData) {
    console.log('🔄 使用current_access_key构建密钥数组')
    finalAccessKeys = [currentAccessKeyData]
  }
  
  const result: UserDetail = {
    // 基本字段（下划线命名）
    id: data.id || '',
    email: data.email || '',
    nickname: data.nickname || null,
    full_name: data.full_name || null,
    avatar_url: data.avatar_url || null,
    bio: data.bio || null,
    preferences: data.preferences || {},
    account_expires_at: data.account_expires_at || null,
    last_login_at: data.last_login_at || null,
    last_login_session: data.last_login_session || null,
    access_key_id: data.access_key_id || null,
    created_at: data.created_at || '',
    updated_at: data.updated_at || '',
    
    // 🔥 直接使用提取的数据（下划线命名）
    access_keys: normalizeAccessKeys(finalAccessKeys),
    ai_usage_records: normalizeAiUsageRecords(aiUsageRecordsData),
    game_history: normalizeGameHistory(data.game_history || []),
    current_access_key: currentAccessKeyData ? normalizeAccessKey(currentAccessKeyData) : null,
    key_usage_history: normalizeKeyUsageHistory(data.key_usage_history || [])
  }
  
  console.log('✅ 归一化最终结果:', {
    密钥数量: result.access_keys.length,
    AI记录数量: result.ai_usage_records.length,
    游戏记录数量: result.game_history.length,
    当前密钥存在: !!result.current_access_key,
    第一条密钥: result.access_keys.length > 0 ? result.access_keys[0] : '无'
  })
  
  return result
}

// 简化的归一化函数
export function normalizeAccessKeys(keys: any): AccessKey[] {
  if (!Array.isArray(keys)) return []
  
  console.log('🔧 normalizeAccessKeys 处理:', {
    输入长度: keys.length,
    第一个元素: keys[0],
    第一个元素字段: keys[0] ? Object.keys(keys[0]) : []
  })
  
  return keys.map(key => ({
    id: key.id || 0,
    key_code: key.key_code || '',
    is_active: key.is_active !== undefined ? key.is_active : true,
    used_count: key.used_count || 0,
    max_uses: key.max_uses || 1,
    key_expires_at: key.key_expires_at || null,
    account_valid_for_days: key.account_valid_for_days || 30,
    user_id: key.user_id || null,
    used_at: key.used_at || null,
    created_at: key.created_at || '',
    updated_at: key.updated_at || ''
  }))
}

export function normalizeAccessKey(key: any): AccessKey {
  return {
    id: key.id || 0,
    key_code: key.key_code || '',
    is_active: key.is_active !== undefined ? key.is_active : true,
    used_count: key.used_count || 0,
    max_uses: key.max_uses || 1,
    key_expires_at: key.key_expires_at || null,
    account_valid_for_days: key.account_valid_for_days || 30,
    user_id: key.user_id || null,
    used_at: key.used_at || null,
    created_at: key.created_at || '',
    updated_at: key.updated_at || ''
  }
}

export function normalizeAiUsageRecords(records: any): AiUsageRecord[] {
  if (!Array.isArray(records)) return []
  
  console.log('🔧 normalizeAiUsageRecords 处理:', {
    输入长度: records.length,
    第一个元素: records[0],
    第一个元素字段: records[0] ? Object.keys(records[0]) : []
  })
  
  return records.map(record => ({
    id: record.id || 0,
    user_id: record.user_id || '',
    feature: record.feature || 'unknown',
    created_at: record.created_at || '',
    request_data: record.request_data || {},
    response_data: record.response_data || {},
    success: record.success !== undefined ? record.success : true
  }))
}

export function normalizeGameHistory(games: any): GameHistory[] {
  if (!Array.isArray(games)) return []
  
  return games.map(game => ({
    id: game.id || '',
    room_id: game.room_id || null,
    session_id: game.session_id || null,
    player1_id: game.player1_id || '',
    player2_id: game.player2_id || '',
    winner_id: game.winner_id || null,
    started_at: game.started_at || null,
    ended_at: game.ended_at || null,
    task_results: game.task_results || []
  }))
}

export function normalizeKeyUsageHistory(history: any): KeyUsageHistory[] {
  if (!Array.isArray(history)) return []
  
  return history.map(item => ({
    id: item.id || 0,
    user_id: item.user_id || '',
    access_key_id: item.access_key_id || 0,
    used_at: item.used_at || null,
    usage_type: item.usage_type || 'activate',
    previous_key_id: item.previous_key_id || null,
    next_key_id: item.next_key_id || null,
    operation_by: item.operation_by || null,
    notes: item.notes || null,
    created_at: item.created_at || '',
    updated_at: item.updated_at || '',
    access_key: item.access_key ? normalizeAccessKey(item.access_key) : undefined,
    operator: item.operator || undefined
  }))
}
