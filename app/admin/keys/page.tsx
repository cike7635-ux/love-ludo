// /app/admin/keys/page.tsx
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  Key, Copy, Check, Trash2, Plus, Search, Filter, Download, 
  Shield, Clock, Users, Eye, EyeOff, RefreshCw, AlertCircle,
  BarChart3, MoreVertical, ChevronDown, Edit, Ban, Loader2,
  ExternalLink, Calendar, Hash, Zap, Settings, Star, User,
  Mail, Smartphone, Globe, Lock, Unlock, FileText, Info
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// 密钥类型定义（根据数据库实际结构）
interface AccessKey {
  id: number
  key_code: string
  key_expires_at: string | null
  account_valid_for_days: number
  is_active: boolean
  used_at: string | null
  created_at: string
  updated_at: string
  user_id: string | null
  max_uses: number | null
  used_count: number
  description: string | null
  
  // 关联的用户信息
  user?: {
    email: string
    nickname: string | null
    preferences?: any
  }
}

interface Stats {
  total: number
  active: number
  used: number
  unused: number
  expired: number
  inactive: number
  todayExpiring: number
  nearExpiring: number
}

interface FilterState {
  status: 'all' | 'active' | 'used' | 'unused' | 'expired' | 'inactive'
  search: string
  dateRange: 'all' | 'today' | 'week' | 'month' | 'custom'
  sortBy: 'created_at' | 'key_code' | 'account_valid_for_days' | 'used_at'
  sortOrder: 'asc' | 'desc'
}

export default function KeysPage() {
  const router = useRouter()
  
  // 状态管理
  const [keys, setKeys] = useState<AccessKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<number[]>([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  
  // 筛选状态
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    search: '',
    dateRange: 'all',
    sortBy: 'created_at',
    sortOrder: 'desc'
  })
  
  // 统计信息
  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    used: 0,
    unused: 0,
    expired: 0,
    inactive: 0,
    todayExpiring: 0,
    nearExpiring: 0
  })

  // 获取密钥数据
  const fetchKeys = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('📡 开始获取密钥数据...')
      
      // 使用新的测试API获取数据
      const response = await fetch('/api/admin/test-keys', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      console.log('📦 API响应状态:', response.status)
      
      if (!response.ok) {
        throw new Error(`API请求失败 (${response.status})`)
      }

      const result = await response.json()
      console.log('📊 API返回结果:', result)

      if (!result.success) {
        throw new Error(result.error || '获取密钥数据失败')
      }

      const keysData: AccessKey[] = result.data || []
      console.log(`✅ 获取到 ${keysData.length} 条密钥数据`)
      
      // 检查数据结构
      if (keysData.length > 0) {
        console.log('🔍 第一条密钥数据:', keysData[0])
      }

      setKeys(keysData)

      // 计算统计数据
      const now = new Date()
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      
      const sevenDaysLater = new Date()
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)
      
      const statsData: Stats = {
        total: keysData.length,
        active: keysData.filter(k => k.is_active && (!k.key_expires_at || new Date(k.key_expires_at) > now)).length,
        used: keysData.filter(k => k.used_at !== null).length,
        unused: keysData.filter(k => k.used_at === null && k.is_active).length,
        expired: keysData.filter(k => k.key_expires_at && new Date(k.key_expires_at) < now).length,
        inactive: keysData.filter(k => !k.is_active).length,
        todayExpiring: keysData.filter(k => {
          if (!k.key_expires_at) return false
          const expiry = new Date(k.key_expires_at)
          return expiry.toDateString() === today.toDateString()
        }).length,
        nearExpiring: keysData.filter(k => {
          if (!k.key_expires_at) return false
          const expiry = new Date(k.key_expires_at)
          return expiry > now && expiry <= sevenDaysLater
        }).length
      }
      
      setStats(statsData)

    } catch (error: any) {
      console.error('❌ 获取密钥数据失败:', error)
      setError(`获取数据失败: ${error.message}`)
      setKeys([])
    } finally {
      setLoading(false)
    }
  }, [])

  // 复制密钥到剪贴板
  const copyToClipboard = (keyCode: string) => {
    navigator.clipboard.writeText(keyCode)
    setCopiedKey(keyCode)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  // 计算密钥状态
  const getKeyStatus = (key: AccessKey) => {
    const now = new Date()
    
    if (!key.is_active) {
      return {
        label: '已禁用',
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/15',
        icon: Ban,
        iconColor: 'text-gray-400'
      }
    }
    
    if (key.key_expires_at && new Date(key.key_expires_at) < now) {
      return {
        label: '已过期',
        color: 'text-red-400',
        bgColor: 'bg-red-500/15',
        icon: AlertCircle,
        iconColor: 'text-red-400'
      }
    }
    
    if (key.used_at) {
      return {
        label: '已使用',
        color: 'text-green-400',
        bgColor: 'bg-green-500/15',
        icon: Check,
        iconColor: 'text-green-400'
      }
    }
    
    return {
      label: '未使用',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/15',
      icon: Clock,
      iconColor: 'text-amber-400'
    }
  }

  // 计算剩余有效期
  const getRemainingTime = (key: AccessKey): { text: string; color: string } => {
    const now = new Date()
    
    if (key.key_expires_at) {
      const expiryDate = new Date(key.key_expires_at)
      const diffTime = expiryDate.getTime() - now.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays > 0) {
        if (diffDays === 1) {
          return { text: '明天过期', color: 'text-red-400' }
        } else if (diffDays <= 7) {
          return { text: `${diffDays}天后过期`, color: 'text-amber-400' }
        } else {
          return { text: `${diffDays}天后过期`, color: 'text-blue-400' }
        }
      } else if (diffDays === 0) {
        return { text: '今天过期', color: 'text-red-400' }
      } else {
        return { text: `已过期${Math.abs(diffDays)}天`, color: 'text-red-400' }
      }
    }
    
    // 如果没有过期时间，使用account_valid_for_days计算
    return { 
      text: `有效期${key.account_valid_for_days}天`, 
      color: 'text-green-400' 
    }
  }

  // 过滤密钥
  const filteredKeys = useMemo(() => {
    return keys.filter(key => {
      // 搜索过滤
      const searchLower = filters.search.toLowerCase()
      const searchMatch = 
        filters.search === '' ||
        key.key_code.toLowerCase().includes(searchLower) ||
        (key.description && key.description.toLowerCase().includes(searchLower)) ||
        (key.user?.email && key.user.email.toLowerCase().includes(searchLower)) ||
        (key.user?.nickname && key.user.nickname.toLowerCase().includes(searchLower))

      // 状态过滤
      const now = new Date()
      let statusMatch = true
      
      switch (filters.status) {
        case 'active':
          statusMatch = key.is_active && (!key.key_expires_at || new Date(key.key_expires_at) > now)
          break
        case 'used':
          statusMatch = key.used_at !== null
          break
        case 'unused':
          statusMatch = key.used_at === null && key.is_active
          break
        case 'expired':
          statusMatch = key.key_expires_at !== null && new Date(key.key_expires_at) < now
          break
        case 'inactive':
          statusMatch = !key.is_active
          break
        default:
          statusMatch = true
      }

      // 日期范围过滤
      let dateMatch = true
      if (filters.dateRange !== 'all' && key.created_at) {
        const created = new Date(key.created_at)
        const now = new Date()
        
        switch (filters.dateRange) {
          case 'today':
            dateMatch = created.toDateString() === now.toDateString()
            break
          case 'week':
            const weekAgo = new Date()
            weekAgo.setDate(weekAgo.getDate() - 7)
            dateMatch = created >= weekAgo
            break
          case 'month':
            const monthAgo = new Date()
            monthAgo.setMonth(monthAgo.getMonth() - 1)
            dateMatch = created >= monthAgo
            break
          default:
            dateMatch = true
        }
      }

      return searchMatch && statusMatch && dateMatch
    }).sort((a, b) => {
      // 排序
      let aValue: any, bValue: any
      
      switch (filters.sortBy) {
        case 'key_code':
          aValue = a.key_code
          bValue = b.key_code
          break
        case 'account_valid_for_days':
          aValue = a.account_valid_for_days
          bValue = b.account_valid_for_days
          break
        case 'used_at':
          aValue = a.used_at || '0'
          bValue = b.used_at || '0'
          break
        default:
          aValue = a.created_at
          bValue = b.created_at
      }
      
      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
  }, [keys, filters])

  // 批量操作
  const handleBulkAction = async (action: 'disable' | 'enable' | 'delete') => {
    if (selectedKeys.length === 0) return
    
    const confirmText = {
      disable: `确定要禁用选中的 ${selectedKeys.length} 个密钥吗？\n禁用后密钥将无法使用。`,
      enable: `确定要启用选中的 ${selectedKeys.length} 个密钥吗？\n启用后密钥可以正常使用。`,
      delete: `确定要删除选中的 ${selectedKeys.length} 个密钥吗？\n此操作不可撤销！`
    }[action]
    
    if (!confirm(confirmText)) return
    
    try {
      // 这里应该调用实际的API
      // 暂时模拟成功
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      alert(`✅ 成功${action === 'disable' ? '禁用' : action === 'enable' ? '启用' : '删除'}了 ${selectedKeys.length} 个密钥`)
      
      // 刷新数据
      setRefreshTrigger(prev => prev + 1)
      setSelectedKeys([])
      setShowBulkActions(false)
      
    } catch (error: any) {
      console.error('批量操作失败:', error)
      alert(`❌ 操作失败: ${error.message}`)
    }
  }

  // 导出密钥为CSV
  const exportToCSV = () => {
    const headers = ['密钥代码', '描述', '有效期(天)', '状态', '使用者', '使用时间', '创建时间', '过期时间', '使用次数', '最大使用次数']
    
    const csvData = filteredKeys.map(key => {
      const status = getKeyStatus(key)
      const remaining = getRemainingTime(key)
      
      return [
        key.key_code,
        key.description || '-',
        key.account_valid_for_days,
        status.label,
        key.user?.email || key.user?.nickname || '-',
        key.used_at ? new Date(key.used_at).toLocaleString('zh-CN') : '-',
        new Date(key.created_at).toLocaleString('zh-CN'),
        key.key_expires_at ? new Date(key.key_expires_at).toLocaleString('zh-CN') : '-',
        key.used_count || 0,
        key.max_uses || '无限次'
      ]
    })
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `love-ludo-keys_${new Date().toLocaleDateString('zh-CN')}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  // 初始化加载
  useEffect(() => {
    fetchKeys()
  }, [fetchKeys, refreshTrigger])

  // 处理密钥操作
  const handleKeyAction = async (keyId: number, action: 'disable' | 'enable' | 'delete') => {
    const actionText = {
      disable: '禁用',
      enable: '启用',
      delete: '删除'
    }[action]
    
    if (!confirm(`确定要${actionText}此密钥吗？`)) return
    
    try {
      // 这里应该调用实际的API
      // 暂时模拟成功
      await new Promise(resolve => setTimeout(resolve, 500))
      
      alert(`✅ 密钥${actionText}成功`)
      setRefreshTrigger(prev => prev + 1)
      
    } catch (error: any) {
      alert(`❌ ${actionText}失败: ${error.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 p-4 md:p-6">
      {/* 页面标题与操作区 */}
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center">
              <Key className="w-6 h-6 md:w-7 md:h-7 mr-2 text-amber-400" />
              密钥管理
            </h1>
            <p className="text-gray-400 mt-2">
              共 {stats.total} 个密钥 • 
              <span className="mx-2 text-green-400">{stats.active} 个有效</span> • 
              <span className="mx-2 text-amber-400">{stats.unused} 个未使用</span>
              {stats.todayExpiring > 0 && (
                <span className="ml-2 text-red-400">⚠️ {stats.todayExpiring} 个今日过期</span>
              )}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {selectedKeys.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkAction('disable')}
                  className="px-3 py-2 bg-gradient-to-r from-red-600 to-pink-600 hover:opacity-90 rounded-lg text-sm text-white whitespace-nowrap"
                >
                  批量禁用 ({selectedKeys.length})
                </button>
                <button
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 flex items-center relative"
                >
                  <MoreVertical className="w-4 h-4 mr-2" />
                  更多操作
                  <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showBulkActions ? 'rotate-180' : ''}`} />
                </button>
                
                {showBulkActions && (
                  <div className="absolute right-0 mt-12 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
                    <button
                      onClick={() => handleBulkAction('enable')}
                      className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 border-b border-gray-700 flex items-center"
                    >
                      <Unlock className="w-4 h-4 mr-2 text-green-400" />
                      批量启用
                    </button>
                    <button
                      onClick={() => handleBulkAction('delete')}
                      className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 border-b border-gray-700 flex items-center"
                    >
                      <Trash2 className="w-4 h-4 mr-2 text-red-400" />
                      批量删除
                    </button>
                    <button
                      onClick={exportToCSV}
                      className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 flex items-center"
                    >
                      <Download className="w-4 h-4 mr-2 text-blue-400" />
                      导出选中密钥
                    </button>
                  </div>
                )}
              </div>
            )}
            
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 flex items-center"
            >
              <Filter className="w-4 h-4 mr-2" />
              高级筛选
            </button>
            
            <button
              onClick={exportToCSV}
              className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              导出CSV
            </button>
            
            <Link
              href="/admin/keys/generate"
              className="px-3 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:opacity-90 rounded-lg text-sm text-white flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              生成新密钥
            </Link>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg animate-fade-in">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
              <div>
                <p className="text-red-400">{error}</p>
                <button
                  onClick={fetchKeys}
                  className="mt-2 text-sm text-red-300 hover:text-red-200 flex items-center"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  重试
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 搜索和筛选栏 */}
        <div className="flex flex-col md:flex-row gap-3 mt-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="搜索密钥代码、描述、使用者邮箱或昵称..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {[
              { value: 'all', label: '全部密钥', count: stats.total, color: 'text-gray-400' },
              { value: 'active', label: '有效', count: stats.active, color: 'text-green-400' },
              { value: 'unused', label: '未使用', count: stats.unused, color: 'text-amber-400' },
              { value: 'used', label: '已使用', count: stats.used, color: 'text-blue-400' },
              { value: 'expired', label: '已过期', count: stats.expired, color: 'text-red-400' },
              { value: 'inactive', label: '已禁用', count: stats.inactive, color: 'text-gray-400' }
            ].map((item) => (
              <button
                key={item.value}
                className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap flex items-center ${filters.status === item.value
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                onClick={() => setFilters(prev => ({ ...prev, status: item.value as any }))}
              >
                <span className={filters.status !== item.value ? item.color : ''}>
                  {item.label}
                </span>
                {item.count !== undefined && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-amber-500/20 rounded text-xs">
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 高级筛选 */}
        {showAdvancedFilters && (
          <div className="mt-4 p-4 bg-gray-800/50 border border-gray-700/50 rounded-lg animate-slide-down">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  创建时间范围
                </label>
                <select
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  value={filters.dateRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
                >
                  <option value="all">全部时间</option>
                  <option value="today">今天</option>
                  <option value="week">最近7天</option>
                  <option value="month">最近30天</option>
                  <option value="custom">自定义</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  排序方式
                </label>
                <select
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                >
                  <option value="created_at">创建时间</option>
                  <option value="key_code">密钥代码</option>
                  <option value="account_valid_for_days">有效期</option>
                  <option value="used_at">使用时间</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  排序顺序
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, sortOrder: 'desc' }))}
                    className={`flex-1 px-3 py-2 rounded-lg ${filters.sortOrder === 'desc' ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                  >
                    最新优先
                  </button>
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, sortOrder: 'asc' }))}
                    className={`flex-1 px-3 py-2 rounded-lg ${filters.sortOrder === 'asc' ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                  >
                    最早优先
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 密钥统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 hover:bg-gray-800/70 transition-colors cursor-pointer">
          <div className="flex items-center">
            <Key className="w-5 h-5 mr-2 text-amber-400" />
            <p className="text-sm text-gray-400">总密钥数</p>
          </div>
          <p className="text-xl md:text-2xl font-bold text-white mt-2">{stats.total}</p>
        </div>
        
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 hover:bg-gray-800/70 transition-colors cursor-pointer">
          <div className="flex items-center">
            <Shield className="w-5 h-5 mr-2 text-green-400" />
            <p className="text-sm text-gray-400">有效密钥</p>
          </div>
          <p className="text-xl md:text-2xl font-bold text-white mt-2">{stats.active}</p>
        </div>
        
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 hover:bg-gray-800/70 transition-colors cursor-pointer">
          <div className="flex items-center">
            <Clock className="w-5 h-5 mr-2 text-amber-400" />
            <p className="text-sm text-gray-400">未使用</p>
          </div>
          <p className="text-xl md:text-2xl font-bold text-amber-400 mt-2">{stats.unused}</p>
        </div>
        
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 hover:bg-gray-800/70 transition-colors cursor-pointer">
          <div className="flex items-center">
            <Check className="w-5 h-5 mr-2 text-blue-400" />
            <p className="text-sm text-gray-400">已使用</p>
          </div>
          <p className="text-xl md:text-2xl font-bold text-blue-400 mt-2">{stats.used}</p>
        </div>
        
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 hover:bg-gray-800/70 transition-colors cursor-pointer">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-red-400" />
            <p className="text-sm text-gray-400">已过期</p>
          </div>
          <p className="text-xl md:text-2xl font-bold text-red-400 mt-2">{stats.expired}</p>
        </div>
        
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 hover:bg-gray-800/70 transition-colors cursor-pointer">
          <div className="flex items-center">
            <Ban className="w-5 h-5 mr-2 text-gray-400" />
            <p className="text-sm text-gray-400">已禁用</p>
          </div>
          <p className="text-xl md:text-2xl font-bold text-gray-400 mt-2">{stats.inactive}</p>
        </div>
        
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 hover:bg-gray-800/70 transition-colors cursor-pointer">
          <div className="flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-red-400" />
            <p className="text-sm text-gray-400">今日过期</p>
          </div>
          <p className="text-xl md:text-2xl font-bold text-red-400 mt-2">{stats.todayExpiring}</p>
        </div>
        
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 hover:bg-gray-800/70 transition-colors cursor-pointer">
          <div className="flex items-center">
            <Zap className="w-5 h-5 mr-2 text-amber-400" />
            <p className="text-sm text-gray-400">7天内过期</p>
          </div>
          <p className="text-xl md:text-2xl font-bold text-amber-400 mt-2">{stats.nearExpiring}</p>
        </div>
      </div>

      {/* 密钥列表表格 */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-700/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center">
              <h2 className="text-lg font-semibold text-white">密钥列表</h2>
              <div className="ml-4 flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-amber-600' : 'bg-gray-800'}`}
                >
                  <FileText className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-amber-600' : 'bg-gray-800'}`}
                >
                  <BarChart3 className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={fetchKeys}
                className="px-3 py-1 bg-gray-800 rounded text-sm hover:bg-gray-700 flex items-center transition-colors"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                刷新
              </button>
              <span className="text-gray-400 text-sm">
                显示 {filteredKeys.length} / {keys.length} 个密钥
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 md:p-16 text-center">
            <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-400 mt-4">正在加载密钥数据...</p>
            <p className="text-gray-500 text-sm mt-2">如果长时间未加载，请检查数据库连接</p>
          </div>
        ) : keys.length === 0 ? (
          <div className="p-8 md:p-16 text-center">
            <Key className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">暂无密钥数据</h3>
            <p className="text-gray-500 mb-6">数据库中尚未创建密钥，请先生成密钥</p>
            <Link
              href="/admin/keys/generate"
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:opacity-90 rounded-lg text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              立即生成密钥
            </Link>
          </div>
        ) : filteredKeys.length === 0 ? (
          <div className="p-8 md:p-16 text-center">
            <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">未找到匹配的密钥</h3>
            <p className="text-gray-500 mb-4">请尝试调整搜索条件或筛选状态</p>
            {filters.search && (
              <p className="text-gray-500 text-sm mb-6">搜索词: "{filters.search}"</p>
            )}
            <button
              onClick={() => setFilters({ 
                status: 'all',
                search: '',
                dateRange: 'all',
                sortBy: 'created_at',
                sortOrder: 'desc'
              })}
              className="inline-flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300"
            >
              清除所有筛选
            </button>
          </div>
        ) : viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead>
                <tr className="border-b border-gray-700/50 bg-gray-900/50">
                  <th className="text-left py-3 px-4 md:px-6">
                    <input
                      type="checkbox"
                      checked={selectedKeys.length === filteredKeys.length && filteredKeys.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedKeys(filteredKeys.map(k => k.id))
                        } else {
                          setSelectedKeys([])
                        }
                      }}
                      className="rounded border-gray-600 bg-gray-800"
                    />
                  </th>
                  <th className="text-left py-3 px-4 md:px-6 text-gray-400 font-medium text-sm">密钥代码</th>
                  <th className="text-left py-3 px-4 md:px-6 text-gray-400 font-medium text-sm">描述</th>
                  <th className="text-left py-3 px-4 md:px-6 text-gray-400 font-medium text-sm">时长</th>
                  <th className="text-left py-3 px-4 md:px-6 text-gray-400 font-medium text-sm">状态</th>
                  <th className="text-left py-3 px-4 md:px-6 text-gray-400 font-medium text-sm">使用者</th>
                  <th className="text-left py-3 px-4 md:px-6 text-gray-400 font-medium text-sm">使用次数</th>
                  <th className="text-left py-3 px-4 md:px-6 text-gray-400 font-medium text-sm">剩余有效期</th>
                  <th className="text-left py-3 px-4 md:px-6 text-gray-400 font-medium text-sm">创建时间</th>
                  <th className="text-left py-3 px-4 md:px-6 text-gray-400 font-medium text-sm">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredKeys.map((key) => {
                  const status = getKeyStatus(key)
                  const StatusIcon = status.icon
                  const remaining = getRemainingTime(key)
                  const isSelected = selectedKeys.includes(key.id)
                  
                  return (
                    <tr 
                      key={key.id} 
                      className={`border-b border-gray-700/30 hover:bg-gray-800/30 transition-colors ${isSelected ? 'bg-blue-500/5' : ''}`}
                    >
                      <td className="py-3 px-4 md:px-6">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedKeys(prev => [...prev, key.id])
                            } else {
                              setSelectedKeys(prev => prev.filter(id => id !== key.id))
                            }
                          }}
                          className="rounded border-gray-600 bg-gray-800"
                        />
                      </td>
                      
                      <td className="py-3 px-4 md:px-6">
                        <div className="flex items-center space-x-2">
                          <code 
                            className="font-mono text-sm bg-gray-900 px-3 py-2 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer truncate max-w-[180px]"
                            onClick={() => copyToClipboard(key.key_code)}
                            title="点击复制密钥"
                          >
                            {key.key_code}
                          </code>
                          <button
                            onClick={() => copyToClipboard(key.key_code)}
                            className={`p-1.5 rounded transition-colors ${copiedKey === key.key_code ? 'bg-green-500/20' : 'hover:bg-gray-700'}`}
                            title={copiedKey === key.key_code ? '已复制' : '复制密钥'}
                          >
                            {copiedKey === key.key_code ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </td>
                      
                      <td className="py-3 px-4 md:px-6">
                        <div className="max-w-[150px]">
                          <p className="text-gray-300 text-sm truncate" title={key.description || ''}>
                            {key.description || '-'}
                          </p>
                        </div>
                      </td>
                      
                      <td className="py-3 px-4 md:px-6">
                        <div className="flex flex-col">
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium mb-1 w-fit">
                            {key.account_valid_for_days} 天
                          </span>
                          {key.key_expires_at && (
                            <span className="text-gray-500 text-xs">
                              至 {new Date(key.key_expires_at).toLocaleDateString('zh-CN')}
                            </span>
                          )}
                        </div>
                      </td>
                      
                      <td className="py-3 px-4 md:px-6">
                        <span className={`inline-flex items-center px-2.5 py-1.5 rounded-full text-xs ${status.bgColor} ${status.color}`}>
                          <StatusIcon className="w-3 h-3 mr-1.5" />
                          {status.label}
                        </span>
                      </td>
                      
                      <td className="py-3 px-4 md:px-6">
                        {key.user ? (
                          <div className="space-y-1 max-w-[150px]">
                            <div className="flex items-center">
                              <User className="w-3 h-3 text-gray-500 mr-1" />
                              <p className="text-gray-300 text-sm truncate">{key.user.email}</p>
                            </div>
                            {key.user.nickname && (
                              <p className="text-gray-500 text-xs truncate">{key.user.nickname}</p>
                            )}
                            {key.used_at && (
                              <p className="text-gray-600 text-xs">使用于: {new Date(key.used_at).toLocaleDateString('zh-CN')}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500 text-sm">-</span>
                        )}
                      </td>
                      
                      <td className="py-3 px-4 md:px-6">
                        <div className="flex items-center space-x-2">
                          <Hash className="w-4 h-4 text-gray-400" />
                          <div>
                            <span className="text-gray-300 text-sm">
                              {key.max_uses ? `${key.used_count || 0} / ${key.max_uses}` : '∞ 次'}
                            </span>
                            {key.max_uses && (
                              <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
                                <div 
                                  className="bg-green-500 h-1.5 rounded-full"
                                  style={{ width: `${Math.min(100, ((key.used_count || 0) / key.max_uses) * 100)}%` }}
                                ></div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      <td className="py-3 px-4 md:px-6">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className={`text-sm ${remaining.color}`}>
                            {remaining.text}
                          </span>
                        </div>
                      </td>
                      
                      <td className="py-3 px-4 md:px-6 text-gray-300 text-sm">
                        {new Date(key.created_at).toLocaleString('zh-CN')}
                      </td>
                      
                      <td className="py-3 px-4 md:px-6">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleKeyAction(key.id, key.is_active ? 'disable' : 'enable')}
                            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                            title={key.is_active ? '禁用密钥' : '启用密钥'}
                          >
                            {key.is_active ? (
                              <EyeOff className="w-4 h-4 text-amber-400" />
                            ) : (
                              <Eye className="w-4 h-4 text-green-400" />
                            )}
                          </button>
                          <button
                            onClick={() => handleKeyAction(key.id, 'delete')}
                            className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
                            title="删除密钥"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          // 网格视图
          <div className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredKeys.map((key) => {
                const status = getKeyStatus(key)
                const StatusIcon = status.icon
                const remaining = getRemainingTime(key)
                
                return (
                  <div
                    key={key.id}
                    className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4 hover:border-gray-600 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <code className="font-mono text-sm text-white bg-gray-900 px-3 py-2 rounded-lg border border-gray-700">
                          {key.key_code}
                        </code>
                      </div>
                      <button
                        onClick={() => copyToClipboard(key.key_code)}
                        className="p-1.5 hover:bg-gray-700 rounded-lg"
                        title="复制密钥"
                      >
                        <Copy className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs ${status.bgColor} ${status.color}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </span>
                        <span className="text-gray-400 text-sm">
                          {key.account_valid_for_days}天
                        </span>
                      </div>
                      
                      {key.description && (
                        <p className="text-gray-300 text-sm line-clamp-2">
                          {key.description}
                        </p>
                      )}
                      
                      <div className="pt-3 border-t border-gray-700/50">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500 text-xs">使用者</p>
                            <p className="text-gray-300 truncate">
                              {key.user?.email || '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs">使用次数</p>
                            <p className="text-gray-300">
                              {key.max_uses ? `${key.used_count || 0}/${key.max_uses}` : '∞'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs">有效期</p>
                            <p className={remaining.color}>
                              {remaining.text}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs">创建时间</p>
                            <p className="text-gray-300 text-xs">
                              {new Date(key.created_at).toLocaleDateString('zh-CN')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 底部提示信息 */}
      <div className="mt-6 p-4 bg-gray-800/30 border border-gray-700/50 rounded-lg">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-blue-400 mr-2 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-white mb-1">使用说明</h4>
            <ul className="text-gray-400 text-sm space-y-1">
              <li>• 如果数据为空，请确保已成功运行密钥生成器并创建了密钥</li>
              <li>• 检查数据库连接状态：访问 <Link href="/admin/test-db" className="text-blue-400 hover:underline">数据库测试页面</Link></li>
              <li>• 使用次数限制：支持有限次和无限次使用模式</li>
              <li>• 密钥有效期：支持固定天数和指定过期日期两种模式</li>
              <li>• 支持批量操作：选中多个密钥后可进行批量启用/禁用/删除操作</li>
              <li>• 支持导出功能：可将密钥列表导出为CSV文件</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 全局样式 */}
      <style jsx global>{`
        .animate-fade-in {
          animation: fadeIn 0.3s ease-in-out;
        }
        .animate-slide-down {
          animation: slideDown 0.3s ease-out;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideDown {
          from { 
            opacity: 0;
            transform: translateY(-10px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
