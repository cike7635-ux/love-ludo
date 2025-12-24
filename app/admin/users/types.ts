// /app/admin/users/types.ts - 完整修复版本（支持密钥历史记录）
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
  // 基本字段（驼峰命名）
  id: string
  email: string
  nickname: string | null
  fullName: string | null
  avatarUrl: string | null
  bio: string | null
  preferences: any
  accountExpiresAt: string | null
  lastLoginAt: string | null
  lastLoginSession: string | null
  accessKeyId: number | null
  createdAt: string
  updatedAt: string
  
  // 🔥 新增：密钥使用历史
  keyUsageHistory: KeyUsageHistory[]
  
  // 🔥 新增：当前使用的密钥
  currentAccessKey: AccessKey | null
  
  // 兼容性字段：所有密钥（从使用历史中提取）
  accessKeys: AccessKey[]
  
  // AI使用记录
  aiUsageRecords: AiUsageRecord[]
  
  // 游戏历史记录
  gameHistory: GameHistory[]
}

export interface KeyUsageHistory {
  id: number
  userId: string
  accessKeyId: number
  usedAt: string
  usageType: 'activate' | 'renew' | 'change' | 'system' | 'admin'
  previousKeyId: number | null
  nextKeyId: number | null
  operationBy: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  
  // 关联数据
  accessKey?: AccessKey | null
  operator?: { id: string; email: string; nickname: string } | null
}

export interface AccessKey {
  id: number
  keyCode: string
  isActive: boolean
  usedCount: number
  maxUses: number
  keyExpiresAt: string | null
  accountValidForDays: number
  userId: string | null
  usedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AiUsageRecord {
  id: number
  userId: string
  feature: string
  createdAt: string
  requestData: any
  responseData: any
  success: boolean
}

export interface GameHistory {
  id: string
  roomId: string | null
  sessionId: string | null
  player1Id: string
  player2Id: string
  winnerId: string | null
  startedAt: string | null
  endedAt: string | null
  taskResults: any[]
}

// 🔥 核心修复：增强的归一化函数
export function normalizeUserDetail(data: any): UserDetail {
  if (!data) {
    console.warn('❌ normalizeUserDetail: 输入数据为空')
    return {} as UserDetail
  }
  
  // 🔍 详细调试日志
  console.log('🔄 归一化输入数据 - 详细分析:', {
    所有字段: Object.keys(data),
    keyUsageHistory存在: 'keyUsageHistory' in data,
    keyUsageHistory长度: data.keyUsageHistory?.length || 0,
    currentAccessKey存在: 'currentAccessKey' in data,
    currentAccessKey值: data.currentAccessKey,
    accessKeys存在: 'accessKeys' in data,
    accessKeys长度: data.accessKeys?.length || 0,
    aiUsageRecords存在: 'aiUsageRecords' in data,
    aiUsageRecords长度: data.aiUsageRecords?.length || 0,
    gameHistory存在: 'gameHistory' in data,
    gameHistory长度: data.gameHistory?.length || 0
  })
  
  // 🔍 深度调试：查看具体内容
  if (data.keyUsageHistory && Array.isArray(data.keyUsageHistory)) {
    console.log('🗝️ 密钥使用历史详情:', {
      是数组: true,
      长度: data.keyUsageHistory.length,
      第一个元素: data.keyUsageHistory[0],
      第一个元素字段: data.keyUsageHistory[0] ? Object.keys(data.keyUsageHistory[0]) : []
    })
  }
  
  if (data.aiUsageRecords && Array.isArray(data.aiUsageRecords)) {
    console.log('🤖 AI记录详情:', {
      是数组: true,
      长度: data.aiUsageRecords.length,
      第一个元素: data.aiUsageRecords[0],
      第一个元素字段: data.aiUsageRecords[0] ? Object.keys(data.aiUsageRecords[0]) : []
    })
  }

  // 🎯 核心处理
  const result: UserDetail = {
    // 基本字段直接映射（支持驼峰和下划线）
    id: data.id || '',
    email: data.email || '',
    nickname: data.nickname || null,
    fullName: data.fullName || data.full_name || null,
    avatarUrl: data.avatarUrl || data.avatar_url || null,
    bio: data.bio || null,
    preferences: data.preferences || {},
    accountExpiresAt: data.accountExpiresAt || data.account_expires_at || null,
    lastLoginAt: data.lastLoginAt || data.last_login_at || null,
    lastLoginSession: data.lastLoginSession || data.last_login_session || null,
    accessKeyId: data.accessKeyId || data.access_key_id || null,
    createdAt: data.createdAt || data.created_at || '',
    updatedAt: data.updatedAt || data.updated_at || '',
    
    // 🔥 关键修复：处理所有数组字段
    keyUsageHistory: normalizeKeyUsageHistory(data.keyUsageHistory),
    currentAccessKey: data.currentAccessKey ? normalizeAccessKey(data.currentAccessKey) : null,
    accessKeys: normalizeAccessKeys(data.accessKeys),
    aiUsageRecords: normalizeAiUsageRecords(data.aiUsageRecords),
    gameHistory: normalizeGameHistory(data.gameHistory)
  }
  
  console.log('✅ 归一化完成结果:', {
    keyUsageHistory数量: result.keyUsageHistory.length,
    currentAccessKey存在: !!result.currentAccessKey,
    accessKeys数量: result.accessKeys.length,
    aiUsageRecords数量: result.aiUsageRecords.length,
    gameHistory数量: result.gameHistory.length,
    第一条密钥: result.accessKeys.length > 0 ? {
      id: result.accessKeys[0].id,
      keyCode: result.accessKeys[0].keyCode,
      isActive: result.accessKeys[0].isActive
    } : '无',
    第一条AI记录: result.aiUsageRecords.length > 0 ? {
      id: result.aiUsageRecords[0].id,
      feature: result.aiUsageRecords[0].feature,
      success: result.aiUsageRecords[0].success
    } : '无'
  })
  
  return result
}

// 🔥 密钥使用历史归一化
export function normalizeKeyUsageHistory(history: any): KeyUsageHistory[] {
  console.log('🔧 normalizeKeyUsageHistory 输入:', {
    输入类型: typeof history,
    是数组: Array.isArray(history),
    输入值: history
  })
  
  if (history === undefined || history === null) {
    console.log('📭 history 是 undefined 或 null，返回空数组')
    return []
  }
  
  if (!Array.isArray(history)) {
    console.warn('❌ history 不是数组:', typeof history, history)
    return []
  }
  
  if (history.length === 0) {
    console.log('📭 history 是空数组，返回空数组')
    return []
  }
  
  console.log('🔧 开始处理密钥使用历史，长度:', history.length)
  
  const result = history.map((item, index) => {
    console.log(`🔧 处理历史记录 ${index + 1}:`, {
      所有字段: Object.keys(item),
      usedAt: item.usedAt || item.used_at,
      accessKey存在: !!item.accessKey,
      operator存在: !!item.operator
    })
    
    // 智能字段名检测
    const usageType = item.usageType || item.usage_type || 'activate'
    
    return {
      id: item.id || 0,
      userId: item.userId || item.user_id || '',
      accessKeyId: item.accessKeyId || item.access_key_id || 0,
      usedAt: item.usedAt || item.used_at || '',
      usageType: usageType,
      previousKeyId: item.previousKeyId || item.previous_key_id || null,
      nextKeyId: item.nextKeyId || item.next_key_id || null,
      operationBy: item.operationBy || item.operation_by || null,
      notes: item.notes || null,
      createdAt: item.createdAt || item.created_at || '',
      updatedAt: item.updatedAt || item.updated_at || '',
      
      // 关联数据
      accessKey: item.accessKey ? normalizeAccessKey(item.accessKey) : null,
      operator: item.operator ? {
        id: item.operator.id || '',
        email: item.operator.email || '',
        nickname: item.operator.nickname || null
      } : null
    }
  })
  
  console.log('✅ normalizeKeyUsageHistory 输出:', {
    处理数量: result.length,
    第一个结果: result[0] || '无'
  })
  
  return result
}

// 🔥 单个密钥归一化
export function normalizeAccessKey(key: any): AccessKey {
  if (!key) {
    console.warn('❌ normalizeAccessKey: 输入为空')
    return {} as AccessKey
  }
  
  console.log('🔧 normalizeAccessKey 输入:', {
    所有字段: Object.keys(key),
    keyCode原始值: key.keyCode,
    key_code原始值: key.key_code
  })
  
  // 智能字段名检测
  const keyCode = key.keyCode || key.key_code || ''
  const isActive = key.isActive !== undefined 
    ? key.isActive 
    : (key.is_active !== undefined ? key.is_active : true)
  
  const result = {
    id: key.id || 0,
    keyCode: keyCode,
    isActive: isActive,
    usedCount: key.usedCount || key.used_count || 0,
    maxUses: key.maxUses || key.max_uses || 1,
    keyExpiresAt: key.keyExpiresAt || key.key_expires_at || null,
    accountValidForDays: key.accountValidForDays || key.account_valid_for_days || 30,
    userId: key.userId || key.user_id || null,
    usedAt: key.usedAt || key.used_at || null,
    createdAt: key.createdAt || key.created_at || '',
    updatedAt: key.updatedAt || key.updated_at || ''
  }
  
  console.log('✅ normalizeAccessKey 输出:', result)
  return result
}

// 🔥 密钥数组归一化（兼容性）
export function normalizeAccessKeys(keys: any): AccessKey[] {
  console.log('🔧 normalizeAccessKeys 输入:', {
    输入类型: typeof keys,
    是数组: Array.isArray(keys),
    输入值: keys
  })
  
  if (keys === undefined || keys === null) {
    console.log('📭 keys 是 undefined 或 null，返回空数组')
    return []
  }
  
  if (!Array.isArray(keys)) {
    console.warn('❌ keys 不是数组:', typeof keys, keys)
    return []
  }
  
  if (keys.length === 0) {
    console.log('📭 keys 是空数组，返回空数组')
    return []
  }
  
  console.log('🔧 开始处理密钥数组，长度:', keys.length)
  
  const result = keys.map((key, index) => {
    console.log(`🔧 处理密钥 ${index + 1}:`, {
      所有字段: Object.keys(key),
      keyCode字段值: key.keyCode,
      key_code字段值: key.key_code,
      isActive字段值: key.isActive,
      is_active字段值: key.is_active
    })
    
    return normalizeAccessKey(key)
  })
  
  console.log('✅ normalizeAccessKeys 输出:', {
    处理数量: result.length,
    第一个结果: result[0] || '无'
  })
  
  return result
}

// 🔥 AI记录归一化
export function normalizeAiUsageRecords(records: any): AiUsageRecord[] {
  console.log('🔧 normalizeAiUsageRecords 输入:', {
    输入类型: typeof records,
    是数组: Array.isArray(records),
    输入值: records
  })
  
  if (records === undefined || records === null) {
    console.log('📭 records 是 undefined 或 null，返回空数组')
    return []
  }
  
  if (!Array.isArray(records)) {
    console.warn('❌ records 不是数组:', typeof records, records)
    return []
  }
  
  if (records.length === 0) {
    console.log('📭 records 是空数组，返回空数组')
    return []
  }
  
  console.log('🔧 开始处理AI记录数组，长度:', records.length)
  
  const result = records.map((record, index) => {
    console.log(`🔧 处理AI记录 ${index + 1}:`, {
      所有字段: Object.keys(record),
      feature字段值: record.feature,
      success字段值: record.success
    })
    
    return {
      id: record.id || 0,
      userId: record.userId || record.user_id || '',
      feature: record.feature || 'unknown',
      createdAt: record.createdAt || record.created_at || '',
      requestData: record.requestData || record.request_data || {},
      responseData: record.responseData || record.response_data || {},
      success: record.success !== undefined ? record.success : true
    }
  })
  
  console.log('✅ normalizeAiUsageRecords 输出:', {
    处理数量: result.length,
    第一个结果: result[0] || '无'
  })
  
  return result
}

// 🔥 游戏记录归一化
export function normalizeGameHistory(games: any): GameHistory[] {
  console.log('🔧 normalizeGameHistory 输入:', {
    输入类型: typeof games,
    是数组: Array.isArray(games),
    输入值: games
  })
  
  if (games === undefined || games === null) {
    console.log('📭 games 是 undefined 或 null，返回空数组')
    return []
  }
  
  if (!Array.isArray(games)) {
    console.warn('❌ games 不是数组:', typeof games, games)
    return []
  }
  
  if (games.length === 0) {
    console.log('📭 games 是空数组，返回空数组')
    return []
  }
  
  console.log('🔧 开始处理游戏记录数组，长度:', games.length)
  
  const result = games.map(game => ({
    id: game.id || '',
    roomId: game.roomId || game.room_id || null,
    sessionId: game.sessionId || game.session_id || null,
    player1Id: game.player1Id || game.player1_id || '',
    player2Id: game.player2Id || game.player2_id || '',
    winnerId: game.winnerId || game.winner_id || null,
    startedAt: game.startedAt || game.started_at || null,
    endedAt: game.endedAt || game.ended_at || null,
    taskResults: game.taskResults || game.task_results || []
  }))
  
  console.log('✅ normalizeGameHistory 输出:', {
    处理数量: result.length,
    第一个结果: result[0] || '无'
  })
  
  return result
}
