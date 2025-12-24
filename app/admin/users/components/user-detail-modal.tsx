// /app/admin/users/components/user-detail-modal.tsx - 优化版
'use client'

import { useState, useMemo, useEffect } from 'react'
import { X, RefreshCw, Copy, Check, Calendar, Key, Brain, Gamepad2, Mail, User, Clock, Shield, ExternalLink, Tag, History, Activity } from 'lucide-react'
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
  
  const accessKeys = userDetail?.access_keys || []
  const aiUsageRecords = userDetail?.ai_usage_records || []
  const gameHistory = userDetail?.game_history || []
  
  const stats = useMemo(() => {
    if (!userDetail) return null
    
    // 计算密钥统计
    const keyStats = {
      total: accessKeys.length,
      active: accessKeys.filter(k => k.is_active).length,
      expired: accessKeys.filter(k => 
        k.key_expires_at && new Date(k.key_expires_at) < new Date()
      ).length,
      unused: accessKeys.filter(k => !k.used_at).length,
      currentId: userDetail.access_key_id
    }
    
    // 计算AI统计
    const aiStats = {
      total: aiUsageRecords.length,
      success: aiUsageRecords.filter(r => r.success).length,
      recent: aiUsageRecords.filter(r => 
        r.created_at && new Date(r.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length
    }
    
    // 计算游戏统计
    const gameStats = {
      total: gameHistory.length,
      wins: gameHistory.filter(g => g.winner_id === userDetail.id).length,
      recent: gameHistory.filter(g => 
        g.started_at && new Date(g.started_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length
    }
    
    return { keyStats, aiStats, gameStats }
  }, [userDetail, accessKeys, aiUsageRecords, gameHistory])
  
  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '无记录'
    try {
      return new Date(dateString).toLocaleString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }
  
  const formatShortDate = (dateString: string | null) => {
    if (!dateString) return '无'
    try {
      return new Date(dateString).toLocaleDateString('zh-CN')
    } catch {
      return dateString
    }
  }
  
  const formatDuration = (start: string | null, end: string | null) => {
    if (!start || !end) return '未知'
    try {
      const startDate = new Date(start)
      const endDate = new Date(end)
      const diffMs = endDate.getTime() - startDate.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      return diffMins < 60 ? `${diffMins}分钟` : `${Math.floor(diffMins / 60)}小时${diffMins % 60}分钟`
    } catch {
      return '未知'
    }
  }
  
  const getAccountStatus = () => {
    if (!userDetail?.account_expires_at) return { status: '免费用户', color: 'text-gray-400', bgColor: 'bg-gray-500/10' }
    const isExpired = new Date(userDetail.account_expires_at) < new Date()
    return isExpired 
      ? { status: '已过期', color: 'text-red-400', bgColor: 'bg-red-500/10' }
      : { status: '会员中', color: 'text-green-400', bgColor: 'bg-green-500/10' }
  }
  
  if (!isOpen) return null
  
  const accountStatus = getAccountStatus()
  
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 md:p-6">
      <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 rounded-2xl border border-gray-800 w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* 弹窗头部 */}
        <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-gradient-to-r from-gray-900/50 to-transparent">
          <div className="flex items-center space-x-4">
            <div className="relative">
              {userDetail?.avatar_url ? (
                <img 
                  src={userDetail.avatar_url} 
                  alt={userDetail.nickname || userDetail.email}
                  className="w-12 h-12 rounded-full ring-2 ring-gray-700"
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center ring-2 ring-gray-700">
                  <span className="text-white font-bold text-lg">
                    {(userDetail?.nickname || userDetail?.email || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ring-2 ring-gray-900 ${accountStatus.bgColor} flex items-center justify-center`}>
                <div className={`w-2 h-2 rounded-full ${accountStatus.color.replace('text-', 'bg-')}`} />
              </div>
            </div>
            
            <div>
              <h2 className="text-xl font-bold text-white flex items-center">
                {userDetail?.nickname || '无昵称'}
                {userDetail?.email === '2200691917@qq.com' && (
                  <span className="ml-2 bg-gradient-to-r from-amber-500 to-orange-500 text-xs px-2 py-1 rounded-full">
                    管理员
                  </span>
                )}
              </h2>
              <p className="text-gray-400 text-sm flex items-center mt-1">
                <Mail className="w-3 h-3 mr-1" />
                {userDetail?.email}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${accountStatus.bgColor} ${accountStatus.color}`}>
              {accountStatus.status}
            </div>
            
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors hover:scale-105"
                disabled={loading}
                title="刷新数据"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
            
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors hover:scale-105"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* 加载状态 */}
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-400 mt-4 text-lg">加载用户详情中...</p>
          </div>
        ) : !userDetail ? (
          <div className="p-12 text-center">
            <User className="w-20 h-20 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">未找到用户信息</p>
          </div>
        ) : (
          <>
            {/* 标签页导航 */}
            <div className="border-b border-gray-800 bg-gray-900/30">
              <div className="flex">
                {[
                  { id: 'basic', label: '基本信息', icon: User, count: null },
                  { id: 'keys', label: '密钥记录', icon: Key, count: accessKeys.length },
                  { id: 'ai', label: 'AI使用', icon: Brain, count: aiUsageRecords.length },
                  { id: 'games', label: '游戏记录', icon: Gamepad2, count: gameHistory.length }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    className={`flex-1 flex items-center justify-center px-6 py-3 text-sm font-medium transition-all relative ${
                      activeTab === tab.id
                        ? 'text-blue-400 border-b-2 border-blue-500 bg-gradient-to-t from-blue-500/5 to-transparent'
                        : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/30'
                    }`}
                    onClick={() => setActiveTab(tab.id as any)}
                  >
                    <tab.icon className="w-4 h-4 mr-2" />
                    {tab.label}
                    {tab.count !== null && (
                      <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
                        activeTab === tab.id
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-gray-700 text-gray-400'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            
            {/* 标签页内容 */}
            <div className="overflow-auto max-h-[calc(90vh-180px)]">
              {/* 基本信息标签页 */}
              {activeTab === 'basic' && (
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 用户基本信息 */}
                    <div className="lg:col-span-2 space-y-6">
                      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-5">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                          <User className="w-5 h-5 mr-2 text-blue-400" />
                          用户信息
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors">
                              <div className="flex items-center">
                                <Tag className="w-4 h-4 mr-2 text-gray-400" />
                                <span className="text-gray-400">用户ID:</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <code className="text-sm font-mono text-gray-300 truncate max-w-[200px]">
                                  {userDetail.id}
                                </code>
                                <button
                                  onClick={() => handleCopy(userDetail.id, 'id')}
                                  className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
                                  title="复制ID"
                                >
                                  {copiedField === 'id' ? (
                                    <Check className="w-4 h-4 text-green-400" />
                                  ) : (
                                    <Copy className="w-4 h-4 text-gray-400" />
                                  )}
                                </button>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors">
                              <div className="flex items-center">
                                <Mail className="w-4 h-4 mr-2 text-gray-400" />
                                <span className="text-gray-400">邮箱:</span>
                              </div>
                              <span className="text-white truncate">{userDetail.email}</span>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors">
                              <div className="flex items-center">
                                <User className="w-4 h-4 mr-2 text-gray-400" />
                                <span className="text-gray-400">昵称:</span>
                              </div>
                              <span className="text-white">{userDetail.nickname || '未设置'}</span>
                            </div>
                            
                            <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors">
                              <div className="flex items-center">
                                <Activity className="w-4 h-4 mr-2 text-gray-400" />
                                <span className="text-gray-400">简介:</span>
                              </div>
                              <span className="text-gray-300 text-right">{userDetail.bio || '未设置'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* 偏好设置 */}
                      {userDetail.preferences && Object.keys(userDetail.preferences).length > 0 && (
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-5">
                          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                            <Activity className="w-5 h-5 mr-2 text-blue-400" />
                            偏好设置
                          </h3>
                          <div className="bg-gray-900/50 p-4 rounded-lg overflow-auto">
                            <pre className="text-sm text-gray-300 whitespace-pre-wrap">
                              {JSON.stringify(userDetail.preferences, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* 账户状态 */}
                    <div className="space-y-6">
                      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-5">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                          <Shield className="w-5 h-5 mr-2 text-blue-400" />
                          账户状态
                        </h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                            <div className="flex items-center">
                              <Shield className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="text-gray-400">会员状态:</span>
                            </div>
                            <span className={`font-medium ${accountStatus.color}`}>
                              {accountStatus.status}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="text-gray-400">会员到期:</span>
                            </div>
                            <span className="text-white">{formatShortDate(userDetail.account_expires_at)}</span>
                          </div>
                          
                          <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="text-gray-400">最后登录:</span>
                            </div>
                            <span className="text-white">{formatDate(userDetail.last_login_at)}</span>
                          </div>
                          
                          <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                            <div className="flex items-center">
                              <History className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="text-gray-400">注册时间:</span>
                            </div>
                            <span className="text-white">{formatDate(userDetail.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* 统计概览 */}
                      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-5">
                        <h3 className="text-lg font-semibold text-white mb-4">统计概览</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gray-800/30 p-3 rounded-lg">
                            <p className="text-xs text-gray-400">密钥总数</p>
                            <p className="text-xl font-bold text-white">{stats?.keyStats.total || 0}</p>
                          </div>
                          <div className="bg-gray-800/30 p-3 rounded-lg">
                            <p className="text-xs text-gray-400">AI请求</p>
                            <p className="text-xl font-bold text-blue-400">{stats?.aiStats.total || 0}</p>
                          </div>
                          <div className="bg-gray-800/30 p-3 rounded-lg">
                            <p className="text-xs text-gray-400">游戏场次</p>
                            <p className="text-xl font-bold text-green-400">{stats?.gameStats.total || 0}</p>
                          </div>
                          <div className="bg-gray-800/30 p-3 rounded-lg">
                            <p className="text-xs text-gray-400">胜率</p>
                            <p className="text-xl font-bold text-amber-400">
                              {stats?.gameStats.total 
                                ? `${((stats.gameStats.wins / stats.gameStats.total) * 100).toFixed(1)}%` 
                                : '0%'
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* 密钥记录标签页 */}
              {activeTab === 'keys' && (
                <div className="p-6">
                  <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
                      <p className="text-sm text-gray-400 mb-1">总密钥数</p>
                      <p className="text-2xl font-bold text-white">{stats?.keyStats.total || 0}</p>
                    </div>
                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
                      <p className="text-sm text-gray-400 mb-1">活跃密钥</p>
                      <p className="text-2xl font-bold text-green-400">{stats?.keyStats.active || 0}</p>
                    </div>
                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
                      <p className="text-sm text-gray-400 mb-1">已过期</p>
                      <p className="text-2xl font-bold text-red-400">{stats?.keyStats.expired || 0}</p>
                    </div>
                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
                      <p className="text-sm text-gray-400 mb-1">当前密钥ID</p>
                      <p className="text-2xl font-bold text-blue-400">{userDetail.access_key_id || '无'}</p>
                    </div>
                  </div>
                  
                  {accessKeys.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Key className="w-10 h-10 text-gray-600" />
                      </div>
                      <p className="text-gray-400 text-lg">暂无密钥记录</p>
                      <p className="text-gray-500 text-sm mt-2">该用户尚未激活任何密钥</p>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-800 bg-gray-900/50">
                              <th className="text-left py-4 px-6 text-gray-400 font-medium">密钥代码</th>
                              <th className="text-left py-4 px-6 text-gray-400 font-medium">状态</th>
                              <th className="text-left py-4 px-6 text-gray-400 font-medium">有效期</th>
                              <th className="text-left py-4 px-6 text-gray-400 font-medium">使用时间</th>
                              <th className="text-left py-4 px-6 text-gray-400 font-medium">操作</th>
                            </tr>
                          </thead>
                          <tbody>
                            {accessKeys.map((key, index) => {
                              const isActive = key.is_active
                              const isExpired = key.key_expires_at && new Date(key.key_expires_at) < new Date()
                              const isCurrent = key.id === userDetail.access_key_id
                              
                              return (
                                <tr 
                                  key={index} 
                                  className={`border-b border-gray-800/30 transition-all hover:bg-gray-800/30 ${
                                    isCurrent ? 'bg-blue-500/5' : ''
                                  }`}
                                >
                                  <td className="py-4 px-6">
                                    <div className="flex items-center">
                                      <code className="text-sm bg-gray-900 px-3 py-1.5 rounded-lg font-mono border border-gray-800">
                                        {key.key_code || key.keyCode || '未知'}
                                      </code>
                                      {isCurrent && (
                                        <span className="ml-2 bg-gradient-to-r from-blue-500 to-blue-600 text-xs px-2 py-1 rounded-full">
                                          当前使用
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-4 px-6">
                                    <div className="flex items-center space-x-2">
                                      <div className={`w-2 h-2 rounded-full ${
                                        isActive ? 'bg-green-500' : 'bg-red-500'
                                      }`} />
                                      <span className={`text-sm ${
                                        isActive ? 'text-green-400' : 'text-red-400'
                                      }`}>
                                        {isActive ? '活跃' : '禁用'}
                                      </span>
                                      {isExpired && (
                                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">
                                          已过期
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-4 px-6 text-gray-300">
                                    {key.key_expires_at ? formatDate(key.key_expires_at) : '永久有效'}
                                  </td>
                                  <td className="py-4 px-6">
                                    <div className="flex flex-col">
                                      <span className="text-gray-300">
                                        {key.used_at ? formatDate(key.used_at) : '未使用'}
                                      </span>
                                      {key.used_count !== undefined && key.used_count > 0 && (
                                        <span className="text-xs text-gray-500 mt-1">
                                          已使用 {key.used_count} 次
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-4 px-6">
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={() => key.key_code && handleCopy(key.key_code, `key-${index}`)}
                                        className="text-blue-400 hover:text-blue-300 text-sm flex items-center bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors"
                                      >
                                        <Copy className="w-3 h-3 mr-1" />
                                        复制
                                      </button>
                                      {isCurrent && (
                                        <button
                                          className="text-amber-400 hover:text-amber-300 text-sm flex items-center bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg transition-colors"
                                        >
                                          <Key className="w-3 h-3 mr-1" />
                                          当前
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* AI使用记录标签页 */}
              {activeTab === 'ai' && (
                <div className="p-6">
                  <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-5">
                      <p className="text-sm text-gray-400 mb-2">总请求数</p>
                      <p className="text-2xl font-bold text-white">{stats?.aiStats.total || 0}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        7天内请求: {stats?.aiStats.recent || 0}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-5">
                      <p className="text-sm text-gray-400 mb-2">成功请求</p>
                      <p className="text-2xl font-bold text-green-400">{stats?.aiStats.success || 0}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        成功率: {stats?.aiStats.total 
                          ? `${((stats.aiStats.success / stats.aiStats.total) * 100).toFixed(1)}%` 
                          : '0%'
                        }
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-5">
                      <p className="text-sm text-gray-400 mb-2">最近使用</p>
                      <p className="text-2xl font-bold text-blue-400">
                        {aiUsageRecords.length > 0 
                          ? formatDate(aiUsageRecords[aiUsageRecords.length - 1]?.created_at)
                          : '从未使用'
                        }
                      </p>
                    </div>
                  </div>
                  
                  {aiUsageRecords.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Brain className="w-10 h-10 text-gray-600" />
                      </div>
                      <p className="text-gray-400 text-lg">暂无AI使用记录</p>
                      <p className="text-gray-500 text-sm mt-2">该用户尚未使用过AI功能</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {aiUsageRecords.slice(0, 10).map((record, index) => (
                        <div 
                          key={index} 
                          className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-5 hover:border-gray-600/50 transition-all"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center">
                              <Brain className="w-5 h-5 mr-3 text-blue-400" />
                              <div>
                                <span className="text-white font-medium">{record.feature || '未知功能'}</span>
                                <span className={`ml-3 px-2 py-1 rounded text-xs ${
                                  record.success 
                                    ? 'bg-green-500/20 text-green-400' 
                                    : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {record.success ? '成功' : '失败'}
                                </span>
                              </div>
                            </div>
                            <span className="text-gray-400 text-sm">
                              {formatDate(record.created_at || record.createdAt)}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">请求数据</p>
                              <div className="bg-gray-900/50 p-3 rounded-lg overflow-auto max-h-48">
                                <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                                  {JSON.stringify(record.request_data || record.requestData || {}, null, 2)}
                                </pre>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">响应数据</p>
                              <div className="bg-gray-900/50 p-3 rounded-lg overflow-auto max-h-48">
                                <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                                  {JSON.stringify(record.response_data || record.responseData || {}, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {aiUsageRecords.length > 10 && (
                        <div className="text-center pt-6">
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
                  <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-5">
                      <p className="text-sm text-gray-400 mb-2">总场次</p>
                      <p className="text-2xl font-bold text-white">{stats?.gameStats.total || 0}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        7天内场次: {stats?.gameStats.recent || 0}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-5">
                      <p className="text-sm text-gray-400 mb-2">胜场</p>
                      <p className="text-2xl font-bold text-green-400">{stats?.gameStats.wins || 0}</p>
                    </div>
                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-5">
                      <p className="text-sm text-gray-400 mb-2">负场</p>
                      <p className="text-2xl font-bold text-red-400">
                        {stats ? stats.gameStats.total - stats.gameStats.wins : 0}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-5">
                      <p className="text-sm text-gray-400 mb-2">胜率</p>
                      <p className="text-2xl font-bold text-blue-400">
                        {stats?.gameStats.total 
                          ? `${((stats.gameStats.wins / stats.gameStats.total) * 100).toFixed(1)}%` 
                          : '0%'
                        }
                      </p>
                    </div>
                  </div>
                  
                  {gameHistory.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Gamepad2 className="w-10 h-10 text-gray-600" />
                      </div>
                      <p className="text-gray-400 text-lg">暂无游戏记录</p>
                      <p className="text-gray-500 text-sm mt-2">该用户尚未参与过游戏</p>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-800 bg-gray-900/50">
                              <th className="text-left py-4 px-6 text-gray-400 font-medium">对局ID</th>
                              <th className="text-left py-4 px-6 text-gray-400 font-medium">对手</th>
                              <th className="text-left py-4 px-6 text-gray-400 font-medium">结果</th>
                              <th className="text-left py-4 px-6 text-gray-400 font-medium">时长</th>
                              <th className="text-left py-4 px-6 text-gray-400 font-medium">开始时间</th>
                            </tr>
                          </thead>
                          <tbody>
                            {gameHistory.map((game, index) => {
                              const isWin = game.winner_id === userDetail.id
                              const isDraw = !game.winner_id
                              
                              return (
                                <tr 
                                  key={index} 
                                  className="border-b border-gray-800/30 hover:bg-gray-800/30 transition-all"
                                >
                                  <td className="py-4 px-6">
                                    <code className="text-xs bg-gray-900 px-3 py-1.5 rounded-lg font-mono border border-gray-800">
                                      {game.id?.substring(0, 8) || '未知'}
                                    </code>
                                  </td>
                                  <td className="py-4 px-6">
                                    <div className="flex flex-col">
                                      <span className="text-gray-300">
                                        玩家{game.player1_id === userDetail.id ? '2' : '1'}
                                      </span>
                                      <span className="text-xs text-gray-500 mt-1">
                                        {game.player1_id === userDetail.id ? '你是玩家1' : '你是玩家2'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-4 px-6">
                                    <div className="flex items-center">
                                      <div className={`w-3 h-3 rounded-full mr-2 ${
                                        isWin ? 'bg-green-500' : isDraw ? 'bg-yellow-500' : 'bg-red-500'
                                      }`} />
                                      <span className={`text-sm ${
                                        isWin ? 'text-green-400' : isDraw ? 'text-yellow-400' : 'text-red-400'
                                      }`}>
                                        {isWin ? '胜利' : isDraw ? '平局' : '失败'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-4 px-6">
                                    <span className="text-gray-300">
                                      {formatDuration(game.started_at, game.ended_at)}
                                    </span>
                                  </td>
                                  <td className="py-4 px-6">
                                    <span className="text-gray-300">
                                      {formatDate(game.started_at)}
                                    </span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
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
