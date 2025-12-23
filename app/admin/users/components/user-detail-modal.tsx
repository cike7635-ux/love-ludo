// /app/admin/users/components/user-detail-modal.tsx
'use client'

import { X, Mail, User, Calendar, Key, Brain, Gamepad2, ExternalLink, Copy, Check } from 'lucide-react'
import { UserDetail } from '../types'
import { useState } from 'react'

interface UserDetailModalProps {
  isOpen: boolean
  onClose: () => void
  userDetail: UserDetail | null
  loading: boolean
}

export default function UserDetailModal({ isOpen, onClose, userDetail, loading }: UserDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'keys' | 'ai' | 'games'>('info')
  const [copied, setCopied] = useState<string | null>(null)

  if (!isOpen) return null

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(text)
    setTimeout(() => setCopied(null), 2000)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '无'
    return new Date(dateString).toLocaleString('zh-CN')
  }

  const calculateDaysRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return 0
    const now = new Date()
    const expireDate = new Date(expiresAt)
    const diffTime = expireDate.getTime() - now.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

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
              <p className="text-gray-400 mt-1">
                {userDetail.email} • ID: {userDetail.id.substring(0, 8)}...
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
                  { id: 'keys', label: '密钥记录', icon: Key },
                  { id: 'ai', label: 'AI使用', icon: Brain },
                  { id: 'games', label: '游戏记录', icon: Gamepad2 }
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
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {tab.label}
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
                        <p className="text-sm text-gray-400">用户ID</p>
                        <div className="flex items-center mt-1">
                          <code className="text-sm bg-gray-800 px-3 py-1 rounded font-mono">
                            {userDetail.id}
                          </code>
                          <button
                            onClick={() => copyToClipboard(userDetail.id)}
                            className="ml-2 p-1 hover:bg-gray-700 rounded"
                          >
                            {copied === userDetail.id ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">邮箱</p>
                        <div className="flex items-center mt-1">
                          <Mail className="w-4 h-4 text-gray-400 mr-2" />
                          <p className="text-white">{userDetail.email}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">昵称</p>
                        <p className="text-white mt-1">{userDetail.nickname || '未设置'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">全名</p>
                        <p className="text-white mt-1">{userDetail.full_name || '未设置'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">个人简介</p>
                        <p className="text-white mt-1">{userDetail.bio || '未设置'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">偏好设置</p>
                        <pre className="text-sm text-gray-300 mt-1 bg-gray-800 p-2 rounded overflow-x-auto">
                          {JSON.stringify(userDetail.preferences, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>

                  {/* 账号状态卡片 */}
                  <div className="bg-gray-900/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">账号状态</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-gray-800/30 rounded-lg p-4">
                        <p className="text-sm text-gray-400">会员状态</p>
                        <div className="mt-2">
                          {userDetail.account_expires_at && new Date(userDetail.account_expires_at) > new Date() ? (
                            <>
                              <span className="inline-block px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full text-sm">
                                会员中
                              </span>
                              <p className="text-gray-400 text-xs mt-2">
                                剩余 {calculateDaysRemaining(userDetail.account_expires_at)} 天
                              </p>
                            </>
                          ) : (
                            <span className="inline-block px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm">
                              免费用户
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="bg-gray-800/30 rounded-lg p-4">
                        <p className="text-sm text-gray-400">最后登录</p>
                        <div className="flex items-center mt-2">
                          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                          <p className="text-white">{formatDate(userDetail.last_login_at)}</p>
                        </div>
                      </div>
                      <div className="bg-gray-800/30 rounded-lg p-4">
                        <p className="text-sm text-gray-400">注册时间</p>
                        <p className="text-white mt-2">{formatDate(userDetail.created_at)}</p>
                      </div>
                      <div className="bg-gray-800/30 rounded-lg p-4">
                        <p className="text-sm text-gray-400">最后更新</p>
                        <p className="text-white mt-2">{formatDate(userDetail.updated_at)}</p>
                      </div>
                    </div>
                  </div>

                  {/* 当前会话卡片 */}
                  {userDetail.last_login_session && (
                    <div className="bg-gray-900/50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">当前会话</h3>
                      <div className="bg-gray-800/30 rounded-lg p-4">
                        <p className="text-sm text-gray-400">会话标识</p>
                        <div className="flex items-center justify-between mt-2">
                          <code className="text-sm bg-gray-800 px-3 py-1 rounded font-mono truncate flex-1 mr-2">
                            {userDetail.last_login_session}
                          </code>
                          <button
                            onClick={() => copyToClipboard(userDetail.last_login_session!)}
                            className="p-2 hover:bg-gray-700 rounded"
                          >
                            {copied === userDetail.last_login_session ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 密钥记录标签页 */}
              {activeTab === 'keys' && (
                <div className="space-y-6">
                  <div className="bg-gray-900/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">所有密钥记录</h3>
                    {userDetail.accessKeys.length === 0 ? (
                      <p className="text-gray-400 text-center py-8">暂无密钥记录</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-700/50">
                              <th className="text-left py-3 px-4 text-gray-400 font-medium">密钥</th>
                              <th className="text-left py-3 px-4 text-gray-400 font-medium">状态</th>
                              <th className="text-left py-3 px-4 text-gray-400 font-medium">使用次数</th>
                              <th className="text-left py-3 px-4 text-gray-400 font-medium">使用时间</th>
                              <th className="text-left py-3 px-4 text-gray-400 font-medium">过期时间</th>
                              <th className="text-left py-3 px-4 text-gray-400 font-medium">有效天数</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userDetail.accessKeys.map((key) => (
                              <tr key={key.id} className="border-b border-gray-700/30">
                                <td className="py-3 px-4">
                                  <div className="flex items-center">
                                    <code className="text-sm bg-gray-800 px-2 py-1 rounded font-mono">
                                      {key.key_code}
                                    </code>
                                    <button
                                      onClick={() => copyToClipboard(key.key_code)}
                                      className="ml-2 p-1 hover:bg-gray-700 rounded"
                                    >
                                      <Copy className="w-3 h-3 text-gray-400" />
                                    </button>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    key.is_active
                                      ? 'bg-green-500/20 text-green-400'
                                      : 'bg-red-500/20 text-red-400'
                                  }`}>
                                    {key.is_active ? '可用' : '已停用'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-gray-300">
                                  {key.used_count}/{key.max_uses}
                                </td>
                                <td className="py-3 px-4 text-gray-300">
                                  {key.used_at ? formatDate(key.used_at) : '未使用'}
                                </td>
                                <td className="py-3 px-4 text-gray-300">
                                  {key.key_expires_at ? formatDate(key.key_expires_at) : '无限制'}
                                </td>
                                <td className="py-3 px-4 text-gray-300">
                                  {key.account_valid_for_days}天
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* AI使用标签页 */}
              {activeTab === 'ai' && (
                <div className="space-y-6">
                  <div className="bg-gray-900/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">AI使用记录</h3>
                    {userDetail.aiUsageRecords.length === 0 ? (
                      <p className="text-gray-400 text-center py-8">暂无AI使用记录</p>
                    ) : (
                      <div className="space-y-4">
                        {userDetail.aiUsageRecords.map((record) => (
                          <div key={record.id} className="bg-gray-800/30 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center">
                                <Brain className="w-4 h-4 text-purple-400 mr-2" />
                                <span className="text-white font-medium">{record.feature}</span>
                                <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                                  record.success
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {record.success ? '成功' : '失败'}
                                </span>
                              </div>
                              <span className="text-gray-400 text-sm">
                                {formatDate(record.created_at)}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-gray-400 mb-1">请求内容</p>
                                <pre className="text-xs bg-gray-900 p-2 rounded overflow-x-auto max-h-32">
                                  {JSON.stringify(record.request_data, null, 2)}
                                </pre>
                              </div>
                              <div>
                                <p className="text-sm text-gray-400 mb-1">响应内容</p>
                                <pre className="text-xs bg-gray-900 p-2 rounded overflow-x-auto max-h-32">
                                  {JSON.stringify(record.response_data, null, 2)}
                                </pre>
                              </div>
                            </div>
                            
                            {record.token_usage && (
                              <div className="mt-3 pt-3 border-t border-gray-700/50">
                                <p className="text-sm text-gray-400 mb-1">Token使用情况</p>
                                <div className="grid grid-cols-3 gap-2">
                                  <div className="bg-gray-800/50 rounded p-2">
                                    <p className="text-xs text-gray-400">输入Token</p>
                                    <p className="text-white">{record.token_usage.input_tokens.toLocaleString()}</p>
                                  </div>
                                  <div className="bg-gray-800/50 rounded p-2">
                                    <p className="text-xs text-gray-400">输出Token</p>
                                    <p className="text-white">{record.token_usage.output_tokens.toLocaleString()}</p>
                                  </div>
                                  <div className="bg-gray-800/50 rounded p-2">
                                    <p className="text-xs text-gray-400">缓存状态</p>
                                    <p className={`text-sm ${record.token_usage.cache_hit ? 'text-green-400' : 'text-amber-400'}`}>
                                      {record.token_usage.cache_hit ? '命中' : '未命中'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
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
                  <div className="bg-gray-900/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">游戏历史记录</h3>
                    {userDetail.gameHistory.length === 0 ? (
                      <p className="text-gray-400 text-center py-8">暂无游戏记录</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-700/50">
                              <th className="text-left py-3 px-4 text-gray-400 font-medium">游戏时间</th>
                              <th className="text-left py-3 px-4 text-gray-400 font-medium">房间ID</th>
                              <th className="text-left py-3 px-4 text-gray-400 font-medium">结果</th>
                              <th className="text-left py-3 px-4 text-gray-400 font-medium">得分</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userDetail.gameHistory.map((game) => (
                              <tr key={game.id} className="border-b border-gray-700/30">
                                <td className="py-3 px-4 text-gray-300">
                                  {formatDate(game.created_at)}
                                </td>
                                <td className="py-3 px-4">
                                  <code className="text-sm bg-gray-800 px-2 py-1 rounded font-mono">
                                    {game.room_id.substring(0, 8)}...
                                  </code>
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    game.result === 'win'
                                      ? 'bg-green-500/20 text-green-400'
                                      : game.result === 'lose'
                                      ? 'bg-red-500/20 text-red-400'
                                      : 'bg-gray-500/20 text-gray-400'
                                  }`}>
                                    {game.result === 'win' ? '胜利' : game.result === 'lose' ? '失败' : '平局'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-white font-medium">
                                  {game.score}
                                </td>
                              </tr>
                            ))}
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
        <div className="flex justify-end gap-3 p-6 border-t border-gray-700/50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
          >
            关闭
          </button>
          {userDetail && (
            <button
              onClick={() => {
                // 可以添加编辑功能
                alert('编辑功能待实现')
              }}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:opacity-90 rounded-lg text-white"
            >
              编辑用户
            </button>
          )}
        </div>
      </div>
    </div>
  )
}