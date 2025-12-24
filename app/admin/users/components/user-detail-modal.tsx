// /app/admin/users/components/user-detail-modal.tsx
'use client'

import { useState, useMemo, useEffect } from 'react'
import { X, RefreshCw, Copy, Check, Calendar, Key, Brain, Gamepad2, Mail, User, Clock, Shield, ExternalLink } from 'lucide-react'
import { UserDetail } from '../types'

interface UserDetailModalProps {
  isOpen: boolean
  onClose: () => void
  userDetail: UserDetail | null
  loading: boolean
  onRefresh?: () => void
}

export default function UserDetailModal({ isOpen, onClose, userDetail, loading, onRefresh }: UserDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'keys' | 'ai' | 'games'>('basic')
  const [copiedField, setCopiedField] = useState<string | null>(null)
  
  // 🔥 关键修复：直接使用下划线字段
  const accessKeys = userDetail?.access_keys || []
  const aiUsageRecords = userDetail?.ai_usage_records || []
  const gameHistory = userDetail?.game_history || []
  
  // 计算统计数据
  const stats = useMemo(() => {
    if (!userDetail) return null
    
    return {
      totalKeys: accessKeys.length,
      activeKeys: accessKeys.filter(k => k.is_active).length,
      expiredKeys: accessKeys.filter(k => 
        k.key_expires_at && new Date(k.key_expires_at) < new Date()
      ).length,
      totalAIRecords: aiUsageRecords.length,
      successfulAI: aiUsageRecords.filter(r => r.success).length,
      totalGames: gameHistory.length,
      wins: gameHistory.filter(g => g.winner_id === userDetail.id).length
    }
  }, [userDetail, accessKeys, aiUsageRecords, gameHistory])
  
  // 处理复制
  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }
  
  // 格式化日期
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '无记录'
    try {
      return new Date(dateString).toLocaleString('zh-CN')
    } catch {
      return dateString
    }
  }
  
  // 格式化时长
  const formatDuration = (start: string | null, end: string | null) => {
    if (!start || !end) return '未知'
    try {
      const startDate = new Date(start)
      const endDate = new Date(end)
      const diffMs = endDate.getTime() - startDate.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      return `${diffMins}分钟`
    } catch {
      return '未知'
    }
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl border border-gray-800 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* 弹窗头部 */}
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center">
              <User className="w-5 h-5 mr-2 text-blue-400" />
              用户详情
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {userDetail?.email}
              {userDetail?.nickname && ` · ${userDetail.nickname}`}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300"
                disabled={loading}
                title="刷新数据"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
            
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* 加载状态 */}
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-400 mt-4">加载用户详情中...</p>
          </div>
        ) : !userDetail ? (
          <div className="p-12 text-center">
            <User className="w-16 h-16 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">未找到用户信息</p>
          </div>
        ) : (
          <>
            {/* 标签页导航 */}
            <div className="border-b border-gray-800">
              <div className="flex overflow-x-auto">
                {[
                  { id: 'basic', label: '基本信息', icon: User },
                  { id: 'keys', label: `密钥记录 (${accessKeys.length})`, icon: Key },
                  { id: 'ai', label: `AI使用 (${aiUsageRecords.length})`, icon: Brain },
                  { id: 'games', label: `游戏记录 (${gameHistory.length})`, icon: Gamepad2 }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    className={`flex items-center px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-400'
                        : 'border-transparent text-gray-400 hover:text-gray-300'
                    }`}
                    onClick={() => setActiveTab(tab.id as any)}
                  >
                    <tab.icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* 标签页内容 */}
            <div className="overflow-auto max-h-[calc(90vh-200px)]">
              {/* 基本信息标签页 */}
              {activeTab === 'basic' && (
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 左侧：用户信息 */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">用户信息</h3>
                      <div className="space-y-4">
                        {[
                          { label: '用户ID', value: userDetail.id, copy: true },
                          { label: '邮箱', value: userDetail.email, icon: Mail },
                          { label: '昵称', value: userDetail.nickname || '无' },
                          { label: '简介', value: userDetail.bio || '无' }
                        ].map((field) => (
                          <div key={field.label} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                            <div className="flex items-center">
                              {field.icon && <field.icon className="w-4 h-4 mr-2 text-gray-400" />}
                              <span className="text-gray-400">{field.label}:</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-white truncate max-w-[200px]">{field.value}</span>
                              {field.copy && (
                                <button
                                  onClick={() => handleCopy(field.value, field.label)}
                                  className="p-1 hover:bg-gray-700 rounded"
                                  title="复制"
                                >
                                  {copiedField === field.label ? (
                                    <Check className="w-4 h-4 text-green-400" />
                                  ) : (
                                    <Copy className="w-4 h-4 text-gray-400" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* 右侧：账户状态 */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">账户状态</h3>
                      <div className="space-y-4">
                        {[
                          { 
                            label: '会员状态', 
                            value: userDetail.account_expires_at 
                              ? new Date(userDetail.account_expires_at) > new Date() 
                                ? '会员中' 
                                : '已过期'
                              : '免费用户',
                            icon: Shield,
                            color: userDetail.account_expires_at 
                              ? new Date(userDetail.account_expires_at) > new Date() 
                                ? 'text-green-400' 
                                : 'text-red-400'
                              : 'text-gray-400'
                          },
                          { 
                            label: '会员到期', 
                            value: formatDate(userDetail.account_expires_at),
                            icon: Calendar
                          },
                          { 
                            label: '最后登录', 
                            value: formatDate(userDetail.last_login_at),
                            icon: Clock
                          },
                          { 
                            label: '注册时间', 
                            value: formatDate(userDetail.created_at),
                            icon: Calendar
                          }
                        ].map((field) => (
                          <div key={field.label} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                            <div className="flex items-center">
                              <field.icon className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="text-gray-400">{field.label}:</span>
                            </div>
                            <span className={field.color || 'text-white'}>{field.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* 偏好设置 */}
                  {userDetail.preferences && Object.keys(userDetail.preferences).length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold text-white mb-4">偏好设置</h3>
                      <pre className="bg-gray-900 p-4 rounded-lg overflow-auto text-sm text-gray-300">
                        {JSON.stringify(userDetail.preferences, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
              
              {/* 密钥记录标签页 */}
              {activeTab === 'keys' && (
                <div className="p-6">
                  <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gray-800/50 rounded-xl p-4">
                      <p className="text-sm text-gray-400">总密钥数</p>
                      <p className="text-2xl font-bold text-white">{stats?.totalKeys || 0}</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-4">
                      <p className="text-sm text-gray-400">活跃密钥</p>
                      <p className="text-2xl font-bold text-green-400">{stats?.activeKeys || 0}</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-4">
                      <p className="text-sm text-gray-400">已过期</p>
                      <p className="text-2xl font-bold text-red-400">{stats?.expiredKeys || 0}</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-4">
                      <p className="text-sm text-gray-400">当前密钥ID</p>
                      <p className="text-2xl font-bold text-blue-400">{userDetail.access_key_id || '无'}</p>
                    </div>
                  </div>
                  
                  {accessKeys.length === 0 ? (
                    <div className="text-center py-12">
                      <Key className="w-16 h-16 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">暂无密钥记录</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-800">
                            <th className="text-left py-3 px-4 text-gray-400">密钥代码</th>
                            <th className="text-left py-3 px-4 text-gray-400">状态</th>
                            <th className="text-left py-3 px-4 text-gray-400">有效期</th>
                            <th className="text-left py-3 px-4 text-gray-400">使用时间</th>
                            <th className="text-left py-3 px-4 text-gray-400">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {accessKeys.map((key, index) => (
                            <tr key={index} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                              <td className="py-3 px-4">
                                <code className="text-sm bg-gray-900 px-2 py-1 rounded">
                                  {key.key_code || key.keyCode || '未知'}
                                </code>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  key.is_active || key.isActive
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {key.is_active || key.isActive ? '活跃' : '禁用'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-gray-300 text-sm">
                                {key.key_expires_at ? formatDate(key.key_expires_at) : '永久'}
                              </td>
                              <td className="py-3 px-4 text-gray-300 text-sm">
                                {key.used_at ? formatDate(key.used_at) : '未使用'}
                              </td>
                              <td className="py-3 px-4">
                                <button
                                  onClick={() => key.key_code && handleCopy(key.key_code, `key-${index}`)}
                                  className="text-blue-400 hover:text-blue-300 text-sm flex items-center"
                                >
                                  <Copy className="w-3 h-3 mr-1" />
                                  复制
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
              
              {/* AI使用记录标签页 */}
              {activeTab === 'ai' && (
                <div className="p-6">
                  <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-800/50 rounded-xl p-4">
                      <p className="text-sm text-gray-400">总请求数</p>
                      <p className="text-2xl font-bold text-white">{stats?.totalAIRecords || 0}</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-4">
                      <p className="text-sm text-gray-400">成功请求</p>
                      <p className="text-2xl font-bold text-green-400">{stats?.successfulAI || 0}</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-4">
                      <p className="text-sm text-gray-400">成功率</p>
                      <p className="text-2xl font-bold text-blue-400">
                        {stats?.totalAIRecords 
                          ? `${((stats.successfulAI / stats.totalAIRecords) * 100).toFixed(1)}%` 
                          : '0%'
                        }
                      </p>
                    </div>
                  </div>
                  
                  {aiUsageRecords.length === 0 ? (
                    <div className="text-center py-12">
                      <Brain className="w-16 h-16 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">暂无AI使用记录</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {aiUsageRecords.slice(0, 10).map((record, index) => (
                        <div key={index} className="bg-gray-800/50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <Brain className="w-4 h-4 mr-2 text-blue-400" />
                              <span className="text-white font-medium">{record.feature || '未知功能'}</span>
                              <span className={`ml-3 px-2 py-1 rounded text-xs ${
                                record.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                              }`}>
                                {record.success ? '成功' : '失败'}
                              </span>
                            </div>
                            <span className="text-gray-400 text-sm">
                              {formatDate(record.created_at || record.createdAt)}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                            <div>
                              <p className="text-xs text-gray-400 mb-1">请求数据</p>
                              <pre className="bg-gray-900 p-2 rounded text-xs overflow-auto max-h-32">
                                {JSON.stringify(record.request_data || record.requestData || {}, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 mb-1">响应数据</p>
                              <pre className="bg-gray-900 p-2 rounded text-xs overflow-auto max-h-32">
                                {JSON.stringify(record.response_data || record.responseData || {}, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {aiUsageRecords.length > 10 && (
                        <div className="text-center pt-4">
                          <p className="text-gray-400 text-sm">
                            显示最近10条记录，共{aiUsageRecords.length}条
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {/* 游戏记录标签页 */}
              {activeTab === 'games' && (
                <div className="p-6">
                  <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gray-800/50 rounded-xl p-4">
                      <p className="text-sm text-gray-400">总场次</p>
                      <p className="text-2xl font-bold text-white">{stats?.totalGames || 0}</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-4">
                      <p className="text-sm text-gray-400">胜场</p>
                      <p className="text-2xl font-bold text-green-400">{stats?.wins || 0}</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-4">
                      <p className="text-sm text-gray-400">负场</p>
                      <p className="text-2xl font-bold text-red-400">
                        {stats ? stats.totalGames - stats.wins : 0}
                      </p>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-4">
                      <p className="text-sm text-gray-400">胜率</p>
                      <p className="text-2xl font-bold text-blue-400">
                        {stats?.totalGames 
                          ? `${((stats.wins / stats.totalGames) * 100).toFixed(1)}%` 
                          : '0%'
                        }
                      </p>
                    </div>
                  </div>
                  
                  {gameHistory.length === 0 ? (
                    <div className="text-center py-12">
                      <Gamepad2 className="w-16 h-16 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">暂无游戏记录</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-800">
                            <th className="text-left py-3 px-4 text-gray-400">对局ID</th>
                            <th className="text-left py-3 px-4 text-gray-400">对手</th>
                            <th className="text-left py-3 px-4 text-gray-400">结果</th>
                            <th className="text-left py-3 px-4 text-gray-400">时长</th>
                            <th className="text-left py-3 px-4 text-gray-400">开始时间</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gameHistory.map((game, index) => (
                            <tr key={index} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                              <td className="py-3 px-4">
                                <code className="text-xs bg-gray-900 px-2 py-1 rounded">
                                  {game.id?.substring(0, 8) || '未知'}
                                </code>
                              </td>
                              <td className="py-3 px-4 text-gray-300">
                                玩家{game.player1_id === userDetail.id ? '2' : '1'}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  game.winner_id === userDetail.id
                                    ? 'bg-green-500/20 text-green-400'
                                    : game.winner_id
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-gray-500/20 text-gray-400'
                                }`}>
                                  {game.winner_id === userDetail.id ? '胜利' : 
                                   game.winner_id ? '失败' : '平局/未结束'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-gray-300">
                                {formatDuration(game.started_at, game.ended_at)}
                              </td>
                              <td className="py-3 px-4 text-gray-300 text-sm">
                                {formatDate(game.started_at)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
