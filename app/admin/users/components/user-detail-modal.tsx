// /app/admin/users/components/user-detail-modal.tsx - 完整修复版本
'use client'

import { X, Mail, User, Calendar, Key, Brain, Gamepad2, Copy, Check, Clock, Award, Users, History, BarChart3, ExternalLink } from 'lucide-react'
import { UserDetail } from '../types'
import { useState, useEffect } from 'react'

interface UserDetailModalProps {
  isOpen: boolean
  onClose: () => void
  userDetail: UserDetail | null
  loading: boolean
}

export default function UserDetailModal({ isOpen, onClose, userDetail, loading }: UserDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'keys' | 'ai' | 'games'>('info')
  const [copied, setCopied] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  // 🔥 关键修复：添加详细的调试信息
  useEffect(() => {
    if (userDetail) {
      const debugData = {
        '1. 数据结构': {
          '所有字段名': Object.keys(userDetail),
          '包含access的字段': Object.keys(userDetail).filter(k => k.includes('access') || k.includes('key')),
          '包含ai的字段': Object.keys(userDetail).filter(k => k.includes('ai') || k.includes('usage')),
          '包含game的字段': Object.keys(userDetail).filter(k => k.includes('game') || k.includes('history'))
        },
        '2. 密钥记录检查': {
          'accessKeys是否存在': 'accessKeys' in userDetail,
          'accessKeys类型': typeof userDetail.accessKeys,
          'accessKeys是数组': Array.isArray(userDetail.accessKeys),
          'accessKeys长度': userDetail.accessKeys?.length || 0,
          '前2条数据': userDetail.accessKeys?.slice(0, 2) || [],
          '所有密钥代码': userDetail.accessKeys?.map((k: any) => k?.key_code) || [],
          '备选字段检查': {
            'access_keys': (userDetail as any).access_keys,
            'accessKey': (userDetail as any).accessKey,
            'access_key': (userDetail as any).access_key,
            'keys': (userDetail as any).keys
          }
        },
        '3. AI记录检查': {
          'aiUsageRecords是否存在': 'aiUsageRecords' in userDetail,
          'aiUsageRecords类型': typeof userDetail.aiUsageRecords,
          'aiUsageRecords是数组': Array.isArray(userDetail.aiUsageRecords),
          'aiUsageRecords长度': userDetail.aiUsageRecords?.length || 0,
          '前2条数据': userDetail.aiUsageRecords?.slice(0, 2) || [],
          '所有功能': userDetail.aiUsageRecords?.map((r: any) => r?.feature) || [],
          '备选字段检查': {
            'ai_usage_records': (userDetail as any).ai_usage_records,
            'aiUsageRecord': (userDetail as any).aiUsageRecord,
            'ai_usage_record': (userDetail as any).ai_usage_record
          }
        },
        '4. 游戏记录检查': {
          'gameHistory是否存在': 'gameHistory' in userDetail,
          'gameHistory是数组': Array.isArray(userDetail.gameHistory),
          'gameHistory长度': userDetail.gameHistory?.length || 0
        },
        '5. 当前密钥ID': userDetail.access_key_id,
        '6. API返回原始数据': userDetail
      }

      console.log('🎯 用户详情数据调试:', debugData)
      setDebugInfo(debugData)

      // 🔥 特殊检查：如果有AI记录但不显示
      if (userDetail.aiUsageRecords && userDetail.aiUsageRecords.length > 0) {
        console.log('🔥 可显示的AI记录:')
        userDetail.aiUsageRecords.forEach((record: any, index: number) => {
          console.log(`  ${index + 1}.`, {
            id: record.id,
            feature: record.feature,
            created_at: record.created_at,
            success: record.success,
            has_request_data: !!record.request_data,
            has_response_data: !!record.response_data
          })
        })
      }
    }
  }, [userDetail])

  if (!isOpen) return null

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(text)
    setTimeout(() => setCopied(null), 2000)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '无'
    try {
      return new Date(dateString).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return '无效日期'
    }
  }

  const formatSimpleDate = (dateString: string | null) => {
    if (!dateString) return '无'
    try {
      return new Date(dateString).toLocaleDateString('zh-CN')
    } catch (error) {
      return '无效日期'
    }
  }

  const calculateDaysRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return 0
    try {
      const now = new Date()
      const expireDate = new Date(expiresAt)
      const diffTime = expireDate.getTime() - now.getTime()
      return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
    } catch (error) {
      return 0
    }
  }

  const calculateGameStats = () => {
    if (!userDetail?.gameHistory?.length) return null
    
    try {
      const games = userDetail.gameHistory
      const totalGames = games.length
      const wins = games.filter(g => g.winner_id === userDetail.id).length
      const losses = games.filter(g => g.winner_id && g.winner_id !== userDetail.id).length
      const draws = games.filter(g => !g.winner_id).length
      
      return {
        totalGames,
        wins,
        losses,
        draws,
        winRate: totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0
      }
    } catch (error) {
      return null
    }
  }

  const gameStats = calculateGameStats()

  // 🔥 智能获取数据：处理可能的字段名变化
  const getAccessKeys = () => {
    if (!userDetail) return []
    
    // 尝试多种可能的字段名
    const possibleFields = [
      'accessKeys',     // 驼峰复数
      'access_keys',    // 下划线复数
      'accessKey',      // 驼峰单数
      'access_key',     // 下划线单数
      'keys'            // 简写
    ]
    
    for (const field of possibleFields) {
      const data = (userDetail as any)[field]
      if (Array.isArray(data) && data.length > 0) {
        console.log(`✅ 使用密钥字段: ${field}, 数量: ${data.length}`)
        return data
      }
    }
    
    // 如果都是空数组，返回第一个找到的数组
    for (const field of possibleFields) {
      const data = (userDetail as any)[field]
      if (Array.isArray(data)) {
        console.log(`📭 密钥字段 ${field} 存在但为空数组`)
        return data
      }
    }
    
    return []
  }

  const getAiUsageRecords = () => {
    if (!userDetail) return []
    
    const possibleFields = [
      'aiUsageRecords',     // 驼峰复数
      'ai_usage_records',   // 下划线复数
      'aiUsageRecord',      // 驼峰单数
      'ai_usage_record',    // 下划线单数
      'aiRecords',          // 简写
      'ai_records'          // 简写下划线
    ]
    
    for (const field of possibleFields) {
      const data = (userDetail as any)[field]
      if (Array.isArray(data) && data.length > 0) {
        console.log(`✅ 使用AI字段: ${field}, 数量: ${data.length}`)
        return data
      }
    }
    
    // 如果都是空数组，返回第一个找到的数组
    for (const field of possibleFields) {
      const data = (userDetail as any)[field]
      if (Array.isArray(data)) {
        console.log(`📭 AI字段 ${field} 存在但为空数组`)
        return data
      }
    }
    
    return []
  }

  const getGameHistory = () => {
    if (!userDetail) return []
    
    const possibleFields = [
      'gameHistory',       // 驼峰
      'game_history',      // 下划线
      'gameHistoryRecords',// 驼峰复数
      'game_history_records', // 下划线复数
      'games'              // 简写
    ]
    
    for (const field of possibleFields) {
      const data = (userDetail as any)[field]
      if (Array.isArray(data)) {
        return data
      }
    }
    
    return []
  }

  // 使用智能获取函数
  const accessKeys = getAccessKeys()
  const aiUsageRecords = getAiUsageRecords()
  const gameHistory = getGameHistory()

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center">
              <User className="w-6 h-6 mr-2 text-blue-400" />
              用户详情
            </h2>
            {userDetail && (
              <p className="text-gray-400 mt-1 flex items-center">
                <Mail className="w-4 h-4 mr-1" />
                {userDetail.email}
                <span className="mx-2">•</span>
                <span className="text-sm">ID: {userDetail.id?.substring?.(0, 8) || 'N/A'}...</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-gray-400 mt-4">加载用户详情中...</p>
            </div>
          </div>
        ) : !userDetail ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <p className="text-gray-400">无法加载用户数据</p>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* 标签页导航 */}
            <div className="border-b border-gray-700/50">
              <div className="flex overflow-x-auto px-6">
                {[
                  { id: 'info', label: '基本信息', icon: User },
                  { 
                    id: 'keys', 
                    label: '密钥记录', 
                    icon: Key, 
                    badge: accessKeys.length,
                    title: `密钥记录 (${accessKeys.length})`
                  },
                  { 
                    id: 'ai', 
                    label: 'AI使用', 
                    icon: Brain, 
                    badge: aiUsageRecords.length,
                    title: `AI使用记录 (${aiUsageRecords.length})`
                  },
                  { 
                    id: 'games', 
                    label: '游戏记录', 
                    icon: Gamepad2, 
                    badge: gameHistory.length,
                    title: `游戏记录 (${gameHistory.length})`
                  }
                ].map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      className={`flex items-center px-4 py-3 border-b-2 text-sm font-medium whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-400'
                          : 'border-transparent text-gray-400 hover:text-gray-300'
                      }`}
                      onClick={() => setActiveTab(tab.id as any)}
                      title={tab.title}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {tab.label}
                      {tab.badge > 0 && (
                        <span className="ml-2 px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full min-w-[20px] flex items-center justify-center">
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* 基本信息标签页 */}
              {activeTab === 'info' && (
                <div className="space-y-6">
                  {/* 基础信息卡片 */}
                  <div className="bg-gray-900/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">基础信息</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-400">邮箱</p>
                        <div className="flex items-center mt-1">
                          <Mail className="w-4 h-4 text-gray-400 mr-2" />
                          <p className="text-white truncate">{userDetail.email}</p>
                          <button
                            onClick={() => copyToClipboard(userDetail.email)}
                            className="ml-2 p-1 hover:bg-gray-700 rounded"
                          >
                            <Copy className="w-3 h-3 text-gray-400" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">昵称</p>
                        <p className="text-white mt-1">{userDetail.nickname || '未设置'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">最后登录</p>
                        <div className="flex items-center mt-1">
                          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                          <p className="text-white">{formatDate(userDetail.last_login_at)}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">会员到期</p>
                        <p className="text-white mt-1">{formatDate(userDetail.account_expires_at)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">注册时间</p>
                        <div className="flex items-center mt-1">
                          <History className="w-4 h-4 text-gray-400 mr-2" />
                          <p className="text-white">{formatDate(userDetail.created_at)}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">最后更新</p>
                        <div className="flex items-center mt-1">
                          <Clock className="w-4 h-4 text-gray-400 mr-2" />
                          <p className="text-white">{formatDate(userDetail.updated_at)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 会员状态卡片 */}
                  <div className="bg-gray-900/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">会员状态</h3>
                    <div className="flex items-center justify-center">
                      {userDetail.account_expires_at && new Date(userDetail.account_expires_at) > new Date() ? (
                        <div className="text-center">
                          <span className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full text-lg">
                            <Award className="w-5 h-5 mr-2" />
                            会员中
                          </span>
                          <p className="text-gray-400 mt-2">
                            剩余 {calculateDaysRemaining(userDetail.account_expires_at)} 天
                          </p>
                          <p className="text-gray-500 text-sm mt-1">
                            到期时间: {formatSimpleDate(userDetail.account_expires_at)}
                          </p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <span className="inline-flex items-center px-4 py-2 bg-gray-700 text-gray-300 rounded-full text-lg">
                            <Users className="w-5 h-5 mr-2" />
                            免费用户
                          </span>
                          <p className="text-gray-400 mt-2">可购买会员享受更多功能</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 当前使用的密钥 */}
                  {userDetail.access_key_id && accessKeys.length > 0 && (
                    <div className="bg-gray-900/50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                        <Key className="w-5 h-5 mr-2 text-amber-400" />
                        当前使用的密钥
                      </h3>
                      {(() => {
                        const currentKey = accessKeys.find((k: any) => k.id === userDetail.access_key_id)
                        if (!currentKey) return null
                        
                        return (
                          <div className="bg-gradient-to-r from-amber-900/20 to-amber-800/10 rounded-lg p-4 border border-amber-700/30">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center">
                                <code className="text-lg bg-black/30 px-3 py-2 rounded font-mono">
                                  {currentKey.key_code}
                                </code>
                                <button
                                  onClick={() => copyToClipboard(currentKey.key_code)}
                                  className="ml-3 p-2 hover:bg-amber-900/30 rounded"
                                >
                                  {copied === currentKey.key_code ? (
                                    <Check className="w-4 h-4 text-green-400" />
                                  ) : (
                                    <Copy className="w-4 h-4 text-amber-400" />
                                  )}
                                </button>
                              </div>
                              <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm">
                                正在使用
                              </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <p className="text-xs text-gray-400">有效天数</p>
                                <p className="text-white">{currentKey.account_valid_for_days}天</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400">使用时间</p>
                                <p className="text-white text-sm">{formatSimpleDate(currentKey.used_at)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400">过期时间</p>
                                <p className="text-white text-sm">{formatSimpleDate(currentKey.key_expires_at)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400">使用次数</p>
                                <p className="text-white">{currentKey.used_count}/{currentKey.max_uses}</p>
                              </div>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* 密钥记录标签页 */}
              {activeTab === 'keys' && (
                <div className="space-y-6">
                  {/* 🔥 调试信息面板 */}
                  <div className="bg-gray-900/50 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">
                        密钥记录 ({accessKeys.length})
                      </h3>
                      <button
                        onClick={() => {
                          console.log('完整调试信息:', debugInfo)
                          alert('调试信息已打印到控制台')
                        }}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white"
                      >
                        查看调试信息
                      </button>
                    </div>
                    
                    {/* 数据状态指示器 */}
                    <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <p className="text-xs text-gray-400">API返回字段</p>
                        <p className="text-white font-mono text-sm">accessKeys</p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <p className="text-xs text-gray-400">检测到密钥数</p>
                        <p className={`text-lg font-bold ${accessKeys.length > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {accessKeys.length}
                        </p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <p className="text-xs text-gray-400">当前密钥ID</p>
                        <p className="text-white font-mono text-sm">{userDetail.access_key_id || '无'}</p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <p className="text-xs text-gray-400">测试用户ID</p>
                        <p className="text-white font-mono text-xs truncate">
                          {userDetail.id?.substring(0, 8)}...
                        </p>
                      </div>
                    </div>
                    
                    {accessKeys.length === 0 ? (
                      <div className="text-center py-8">
                        <Key className="w-16 h-16 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-400 text-lg">暂无密钥记录</p>
                        <p className="text-gray-500 text-sm mt-2">
                          该用户尚未使用或分配任何密钥
                        </p>
                        <div className="mt-4 p-3 bg-gray-800/30 rounded-lg">
                          <p className="text-xs text-gray-400">可能的原因：</p>
                          <ul className="text-xs text-gray-500 mt-1 space-y-1">
                            <li>1. 数据库中没有该用户的密钥记录</li>
                            <li>2. API查询条件不匹配（尝试修复API查询）</li>
                            <li>3. 密钥记录的user_id字段为空</li>
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-700/50">
                              <th className="text-left py-3 px-4 text-gray-400 font-medium">密钥代码</th>
                              <th className="text-left py-3 px-4 text-gray-400 font-medium">状态</th>
                              <th className="text-left py-3 px-4 text-gray-400 font-medium">使用情况</th>
                              <th className="text-left py-3 px-4 text-gray-400 font-medium">使用时间</th>
                              <th className="text-left py-3 px-4 text-gray-400 font-medium">过期时间</th>
                            </tr>
                          </thead>
                          <tbody>
                            {accessKeys.map((key: any, index: number) => {
                              const isCurrentKey = key.id === userDetail.access_key_id
                              const isExpired = key.key_expires_at && new Date(key.key_expires_at) < new Date()
                              const isUsed = key.used_at !== null
                              
                              return (
                                <tr 
                                  key={key.id || index} 
                                  className={`border-b border-gray-700/30 hover:bg-gray-800/30 transition-colors ${
                                    isCurrentKey ? 'bg-amber-900/10' : ''
                                  }`}
                                >
                                  <td className="py-3 px-4">
                                    <div className="flex items-center">
                                      <code className={`text-sm px-3 py-2 rounded font-mono ${
                                        isCurrentKey 
                                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                                          : 'bg-gray-900 text-gray-300 border border-gray-700'
                                      }`}>
                                        {key.key_code}
                                      </code>
                                      <button
                                        onClick={() => copyToClipboard(key.key_code)}
                                        className="ml-2 p-1.5 hover:bg-gray-700 rounded transition-colors"
                                        title="复制密钥"
                                      >
                                        {copied === key.key_code ? (
                                          <Check className="w-4 h-4 text-green-400" />
                                        ) : (
                                          <Copy className="w-4 h-4 text-gray-400" />
                                        )}
                                      </button>
                                      {isCurrentKey && (
                                        <span className="ml-2 px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                                          当前使用
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="flex flex-col gap-1.5">
                                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        key.is_active === false
                                          ? 'bg-red-500/20 text-red-400'
                                          : 'bg-green-500/20 text-green-400'
                                      }`}>
                                        {key.is_active === false ? '停用' : '激活'}
                                      </span>
                                      {isExpired && (
                                        <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-xs rounded">
                                          已过期
                                        </span>
                                      )}
                                      {!key.is_active && !isExpired && (
                                        <span className="px-2 py-0.5 bg-gray-500/10 text-gray-400 text-xs rounded">
                                          未激活
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="flex flex-col">
                                      <div className="flex items-center">
                                        <span className="text-white font-medium">
                                          {key.used_count || 0}/{key.max_uses || 1}
                                        </span>
                                        {isUsed && (
                                          <span className="ml-2 px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded">
                                            已使用
                                          </span>
                                        )}
                                      </div>
                                      {key.max_uses > 1 && (
                                        <div className="mt-1 w-full bg-gray-700 rounded-full h-1.5">
                                          <div 
                                            className="bg-blue-500 h-1.5 rounded-full" 
                                            style={{ 
                                              width: `${Math.min(100, ((key.used_count || 0) / key.max_uses) * 100)}%` 
                                            }}
                                          ></div>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="flex flex-col">
                                      <span className="text-gray-300 text-sm">
                                        {key.used_at ? formatSimpleDate(key.used_at) : '未使用'}
                                      </span>
                                      {key.used_at && (
                                        <span className="text-gray-500 text-xs">
                                          {calculateDaysRemaining(key.used_at)}天前
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="flex flex-col">
                                      <span className={`text-sm ${
                                        isExpired ? 'text-red-400' : 'text-gray-300'
                                      }`}>
                                        {key.key_expires_at ? formatSimpleDate(key.key_expires_at) : '无限制'}
                                      </span>
                                      {key.key_expires_at && (
                                        <span className="text-gray-500 text-xs">
                                          {isExpired ? '已过期' : '剩余' + calculateDaysRemaining(key.key_expires_at) + '天'}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  
                  {/* 密钥统计 */}
                  {accessKeys.length > 0 && (
                    <div className="bg-gray-900/50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">密钥统计</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-gray-800/30 rounded-lg p-4">
                          <p className="text-sm text-gray-400">总密钥数</p>
                          <p className="text-2xl font-bold text-white mt-2">
                            {accessKeys.length}
                          </p>
                        </div>
                        <div className="bg-gray-800/30 rounded-lg p-4">
                          <p className="text-sm text-gray-400">已使用</p>
                          <p className="text-2xl font-bold text-green-400 mt-2">
                            {accessKeys.filter((k: any) => k.used_at).length}
                          </p>
                        </div>
                        <div className="bg-gray-800/30 rounded-lg p-4">
                          <p className="text-sm text-gray-400">未使用</p>
                          <p className="text-2xl font-bold text-blue-400 mt-2">
                            {accessKeys.filter((k: any) => !k.used_at).length}
                          </p>
                        </div>
                        <div className="bg-gray-800/30 rounded-lg p-4">
                          <p className="text-sm text-gray-400">已过期</p>
                          <p className="text-2xl font-bold text-red-400 mt-2">
                            {accessKeys.filter((k: any) => k.key_expires_at && new Date(k.key_expires_at) < new Date()).length}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* AI使用标签页 */}
              {activeTab === 'ai' && (
                <div className="space-y-6">
                  <div className="bg-gray-900/50 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">
                        AI使用记录 ({aiUsageRecords.length})
                      </h3>
                      <button
                        onClick={() => {
                          // 直接测试API
                          fetch(`/api/admin/data?table=profiles&detailId=${userDetail.id}`)
                            .then(r => r.json())
                            .then(data => {
                              console.log('实时API测试结果:', data)
                              alert('API测试结果已打印到控制台')
                            })
                        }}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm text-white"
                      >
                        测试API
                      </button>
                    </div>
                    
                    {/* AI数据状态 */}
                    <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <p className="text-xs text-gray-400">API返回字段</p>
                        <p className="text-white font-mono text-sm">aiUsageRecords</p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <p className="text-xs text-gray-400">检测到记录数</p>
                        <p className={`text-lg font-bold ${aiUsageRecords.length > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {aiUsageRecords.length}
                        </p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <p className="text-xs text-gray-400">主要功能</p>
                        <p className="text-white text-sm truncate">
                          {aiUsageRecords[0]?.feature || '无'}
                        </p>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <p className="text-xs text-gray-400">最后使用</p>
                        <p className="text-white text-sm">
                          {aiUsageRecords[0]?.created_at ? formatSimpleDate(aiUsageRecords[0].created_at) : '无'}
                        </p>
                      </div>
                    </div>
                    
                    {aiUsageRecords.length === 0 ? (
                      <div className="text-center py-8">
                        <Brain className="w-16 h-16 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-400 text-lg">暂无AI使用记录</p>
                        <p className="text-gray-500 text-sm mt-2">
                          该用户尚未使用AI功能
                        </p>
                        <div className="mt-4 inline-block px-4 py-2 bg-gray-700 rounded-lg">
                          <p className="text-xs text-gray-400">测试用户ID: {userDetail.id?.substring(0, 8)}...</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {aiUsageRecords.map((record: any, index: number) => (
                          <div 
                            key={record.id || index} 
                            className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50 hover:border-gray-600/50 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center">
                                <Brain className="w-5 h-5 text-purple-400 mr-2" />
                                <span className="text-white font-medium">{record.feature}</span>
                                <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                                  record.success === false
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-green-500/20 text-green-400'
                                }`}>
                                  {record.success === false ? '失败' : '成功'}
                                </span>
                                <span className="ml-2 px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">
                                  #{record.id}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-gray-400 text-sm">
                                  {formatDate(record.created_at)}
                                </span>
                                <button
                                  onClick={() => copyToClipboard(JSON.stringify(record, null, 2))}
                                  className="p-1 hover:bg-gray-700 rounded"
                                  title="复制记录"
                                >
                                  <Copy className="w-3 h-3 text-gray-400" />
                                </button>
                              </div>
                            </div>
                            
                            {/* 请求和响应内容 */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-3">
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-sm text-gray-400">请求内容</p>
                                  <span className="text-xs text-gray-500">
                                    {record.request_data ? Object.keys(record.request_data).length : 0}个字段
                                  </span>
                                </div>
                                <div className="relative">
                                  <pre className="text-xs bg-gray-900 p-3 rounded overflow-x-auto max-h-48">
                                    {record.request_data ? JSON.stringify(record.request_data, null, 2) : '{}'}
                                  </pre>
                                  {record.request_data && (
                                    <button
                                      onClick={() => {
                                        const blob = new Blob([JSON.stringify(record.request_data, null, 2)], { type: 'application/json' })
                                        const url = URL.createObjectURL(blob)
                                        window.open(url, '_blank')
                                      }}
                                      className="absolute top-2 right-2 p-1 bg-gray-800 hover:bg-gray-700 rounded"
                                      title="在新窗口查看"
                                    >
                                      <ExternalLink className="w-3 h-3 text-gray-400" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-sm text-gray-400">响应内容</p>
                                  <span className="text-xs text-gray-500">
                                    {record.response_data ? Object.keys(record.response_data).length : 0}个字段
                                  </span>
                                </div>
                                <div className="relative">
                                  <pre className="text-xs bg-gray-900 p-3 rounded overflow-x-auto max-h-48">
                                    {record.response_data ? JSON.stringify(record.response_data, null, 2) : '{}'}
                                  </pre>
                                  {record.response_data && (
                                    <button
                                      onClick={() => {
                                        const blob = new Blob([JSON.stringify(record.response_data, null, 2)], { type: 'application/json' })
                                        const url = URL.createObjectURL(blob)
                                        window.open(url, '_blank')
                                      }}
                                      className="absolute top-2 right-2 p-1 bg-gray-800 hover:bg-gray-700 rounded"
                                      title="在新窗口查看"
                                    >
                                      <ExternalLink className="w-3 h-3 text-gray-400" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* 额外信息 */}
                            <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-700/50">
                              <span>记录ID: {record.id}</span>
                              <span>用户ID: {record.user_id?.substring(0, 8)}...</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 游戏记录标签页 */}
              {activeTab === 'games' && (
                <div className="space-y-6">
                  {/* 游戏统计 */}
                  {gameStats && (
                    <div className="bg-gray-900/50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                        <BarChart3 className="w-5 h-5 mr-2 text-blue-400" />
                        游戏统计
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <div className="bg-gray-800/30 rounded-lg p-4">
                          <p className="text-sm text-gray-400">总场次</p>
                          <p className="text-2xl font-bold text-white mt-2">{gameStats.totalGames}</p>
                        </div>
                        <div className="bg-gray-800/30 rounded-lg p-4">
                          <p className="text-sm text-gray-400">胜场</p>
                          <p className="text-2xl font-bold text-green-400 mt-2">{gameStats.wins}</p>
                        </div>
                        <div className="bg-gray-800/30 rounded-lg p-4">
                          <p className="text-sm text-gray-400">负场</p>
                          <p className="text-2xl font-bold text-red-400 mt-2">{gameStats.losses}</p>
                        </div>
                        <div className="bg-gray-800/30 rounded-lg p-4">
                          <p className="text-sm text-gray-400">胜率</p>
                          <p className="text-2xl font-bold text-blue-400 mt-2">{gameStats.winRate}%</p>
                        </div>
                        <div className="bg-gray-800/30 rounded-lg p-4">
                          <p className="text-sm text-gray-400">平局</p>
                          <p className="text-2xl font-bold text-gray-400 mt-2">{gameStats.draws}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 游戏历史记录 */}
                  <div className="bg-gray-900/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">游戏历史记录</h3>
                    
                    {gameHistory.length === 0 ? (
                      <div className="text-center py-8">
                        <Gamepad2 className="w-16 h-16 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-400 text-lg">暂无游戏记录</p>
                        <p className="text-gray-500 text-sm mt-2">
                          该用户尚未进行任何游戏
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-700/50">
                              <th className="text-left py-3 px-4 text-gray-400 font-medium">游戏时间</th>
                              <th className="text-left py-3 px-4 text-gray-400 font-medium">房间ID</th>
                              <th className="text-left py-3 px-4 text-gray-400 font-medium">对手</th>
                              <th className="text-left py-3 px-4 text-gray-400 font-medium">结果</th>
                              <th className="text-left py-3 px-4 text-gray-400 font-medium">时长</th>
                              <th className="text-left py-3 px-4 text-gray-400 font-medium">任务完成</th>
                            </tr>
                          </thead>
                          <tbody>
                            {gameHistory.map((game: any, index: number) => {
                              const isPlayer1 = game.player1_id === userDetail.id
                              const opponentId = isPlayer1 ? game.player2_id : game.player1_id
                              
                              // 计算游戏时长
                              let duration = '未知'
                              if (game.started_at && game.ended_at) {
                                try {
                                  const start = new Date(game.started_at)
                                  const end = new Date(game.ended_at)
                                  const minutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60))
                                  duration = minutes > 60 
                                    ? `${Math.floor(minutes / 60)}小时${minutes % 60}分钟` 
                                    : `${minutes}分钟`
                                } catch (error) {
                                  duration = '时长计算错误'
                                }
                              }
                              
                              // 计算任务完成情况
                              const taskResults = game.task_results || []
                              const completedTasks = taskResults.filter((task: any) => task.completed).length
                              const totalTasks = taskResults.length
                              
                              return (
                                <tr key={game.id || index} className="border-b border-gray-700/30 hover:bg-gray-800/30">
                                  <td className="py-3 px-4">
                                    <div className="flex flex-col">
                                      <span className="text-gray-300 text-sm">{formatDate(game.started_at)}</span>
                                      <span className="text-gray-500 text-xs">
                                        {game.room_id ? `房间: ${game.room_id.substring(0, 8)}...` : ''}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <code className="text-xs bg-gray-800 px-2 py-1 rounded font-mono">
                                      {game.room_id ? game.room_id.substring(0, 8) + '...' : '无'}
                                    </code>
                                  </td>
                                  <td className="py-3 px-4">
                                    <p className="text-gray-300">
                                      {opponentId ? opponentId.substring(0, 8) + '...' : '未知'}
                                    </p>
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                      game.winner_id === userDetail.id
                                        ? 'bg-green-500/20 text-green-400'
                                        : game.winner_id && game.winner_id !== userDetail.id
                                        ? 'bg-red-500/20 text-red-400'
                                        : 'bg-gray-500/20 text-gray-400'
                                    }`}>
                                      {game.winner_id === userDetail.id
                                        ? '胜利'
                                        : game.winner_id && game.winner_id !== userDetail.id
                                        ? '失败'
                                        : '平局'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="flex items-center">
                                      <Clock className="w-3 h-3 text-gray-400 mr-1" />
                                      <span className="text-gray-300">{duration}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="flex items-center">
                                      <span className="text-gray-300">
                                        {totalTasks > 0 ? `${completedTasks}/${totalTasks}` : '无'}
                                      </span>
                                      {totalTasks > 0 && (
                                        <div className="ml-2 w-16 bg-gray-700 rounded-full h-1.5">
                                          <div 
                                            className="bg-green-500 h-1.5 rounded-full" 
                                            style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
                                          ></div>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 底部按钮 */}
        <div className="flex justify-between items-center p-6 border-t border-gray-700/50">
          <div className="text-sm text-gray-400">
            {userDetail && (
              <>
                最后更新: {formatDate(userDetail.updated_at)}
                {userDetail.last_login_at && (
                  <span className="ml-4">最后登录: {formatDate(userDetail.last_login_at)}</span>
                )}
              </>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
            >
              关闭
            </button>
            {userDetail && (
              <button
                onClick={() => {
                  const message = `用户: ${userDetail.email}\n` +
                                `ID: ${userDetail.id}\n` +
                                `昵称: ${userDetail.nickname || '未设置'}\n` +
                                `会员状态: ${userDetail.account_expires_at && new Date(userDetail.account_expires_at) > new Date() ? '会员中' : '免费用户'}\n` +
                                `注册时间: ${formatDate(userDetail.created_at)}`
                  copyToClipboard(message)
                  alert('用户信息已复制到剪贴板')
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
              >
                复制信息
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}