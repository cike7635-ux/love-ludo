// /app/admin/keys/page.tsx - 修复后的导入部分
'use client'

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import {
  Key
  , Copy, Check, Trash2, Plus, Search, Filter, Download,
  Shield
  , Clock, Users, Eye, EyeOff, RefreshCw, AlertCircle,
  BarChart3
  , MoreVertical, ChevronDown, Edit, Ban, Loader2,
  ExternalLink
  , Calendar, Hash, Zap, Settings, Star, User,
  Mail
  , Smartphone, Globe, Lock, Unlock, FileText, Info,
  X, ChevronUp, ChevronRight, ChevronLeft, ChevronFirst, ChevronLast,
  DownloadCloud
  , BarChart, PieChart, TrendingUp, Activity, Database,
  AlertTriangle
  , HelpCircle, Maximize2, Minimize2, Grid, List,
  Columns
  , FilterX, History, CalendarDays, Tag, CreditCard,
  ArrowUpDown
  , Sliders, Cpu, Battery, Wifi, Cloud,
  GitBranch
  , GitPullRequest, GitCommit, GitMerge, GitCompare,
  Folder
  , FolderOpen, File, FileText as FileTextIcon,
  FolderTree
  , Network, Server, HardDrive, MemoryStick,
  Cpu
    as CpuIcon, Thermometer, Gauge, BatteryCharging,
  Power
  , PowerOff, Play, Pause, StopCircle, SkipForward,
  SkipBack
  , FastForward, Rewind, Repeat, Shuffle,
  Volume2
  , VolumeX, Mic, MicOff, Headphones, Radio,
  Music
  , Video, Film, Camera, Image, Palette,
  Paintbrush
  , Brush, PenTool, Ruler, Scissors,
  Package
  , Box, Cube, Package2, Container, Layers,
  Archive
  , Inbox, Mailbox, Send, MailOpen, Reply,
  Share2
  , Link, Link2, Unlink, LockKeyhole,
  KeyRound
  , KeySquare, Keyboard, MousePointerClick,
  Hand
  , HandMetal, Globe2, Map, MapPin, Navigation,
  Compass
  , Flag, Home, Building, Building2, Hotel,
  Store
  , ShoppingCart, ShoppingBag, CreditCard as CreditCardIcon,
  DollarSign
  , Euro, PoundSterling, Yen, Bitcoin,
  TrendingUp
    as TrendingUpIcon, TrendingDown, LineChart,
  CandlestickChart
  , PieChart as PieChartIcon, DonutChart,
  BarChart2
  , BarChartHorizontal, Timeline,
  Graph
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

// 导入组件
import KeyTable from './components/KeyTable'
import StatsPanel from './components/StatsPanel'
import Filters from './components/Filters'
import BulkActions from './components/BulkActions'
import ExportModal from './components/ExportModal'
import { AccessKey, KeyStatus, statusConfig, KeyStatistics } from './types'

// 主页面组件
export default function KeysPage() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <KeysContent />
    </Suspense>
  )
}

// 加载页面
function LoadingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 p-4 md:p-6">
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">正在加载密钥管理页面...</p>
        </div>
      </div>
    </div>
  )
}

// 主内容组件
function KeysContent() {
  const searchParams = useSearchParams()
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
  const [operationLoading, setOperationLoading] = useState<number | null>(null)
  const [bulkOperationLoading, setBulkOperationLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showExportModal, setShowExportModal] = useState(false)

  // 筛选状态
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<KeyStatus | 'all'>('all')
  const [sortBy, setSortBy] = useState<'created_at' | 'key_code' | 'used_count'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  // 统计信息
  const [stats, setStats] = useState<KeyStatistics>({
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

      const response = await fetch('/api/admin/keys/list', {
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache' }
      })

      console.log('📦 API响应状态:', response.status)

      if (!response.ok) {
        throw new Error(`API请求失败 (${response.status})`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '获取密钥数据失败')
      }

      const keysData: AccessKey[] = result.data || []
      console.log(`✅ 获取到 ${keysData.length} 条密钥数据`)

      setKeys(keysData)

      // 计算统计数据
      const now = new Date()
      const today = new Date()
      today.setHours(23, 59, 59, 999)

      const sevenDaysLater = new Date()
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)

      const statsData: KeyStatistics = {
        total: keysData.length,
        active: keysData.filter(k => k.is_active && (!k.key_expires_at || new Date(k.key_expires_at) > now)).length,
        used: keysData.filter(k => k.used_count > 0 || k.used_at || k.user_id).length,
        unused: keysData.filter(k => k.used_count === 0 && !k.used_at && !k.user_id && k.is_active).length,
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

  // 获取统计信息
  const fetchStatistics = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/keys/statistics', {
        credentials: 'include'
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          const data = result.data.overview
          setStats({
            total: data.total_keys || 0,
            active: data.active_keys || 0,
            used: data.used_keys || 0,
            unused: data.unused_keys || 0,
            expired: data.expired_keys || 0,
            inactive: data.disabled_keys || 0,
            todayExpiring: data.today_expiring || 0,
            nearExpiring: data.near_expiring || 0
          })
        }
      }
    } catch (error) {
      console.error('获取统计信息失败:', error)
    }
  }, [])

  // 复制密钥到剪贴板
  const copyToClipboard = (keyCode: string) => {
    navigator.clipboard.writeText(keyCode)
    setCopiedKey(keyCode)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  // 计算密钥状态
  const getKeyStatus = (key: AccessKey): KeyStatus => {
    const now = new Date()

    if (!key.is_active) {
      return 'disabled'
    }

    // 检查绝对有效期是否过期
    if (key.key_expires_at && new Date(key.key_expires_at) < now) {
      return 'expired'
    }

    // 检查是否已使用
    if (key.used_count > 0 || key.used_at || key.user_id) {
      return 'used'
    }

    // 未使用
    return 'unused'
  }

  // 计算剩余有效期
  const getRemainingTime = (key: AccessKey): { text: string; color: string; isExpired: boolean } => {
    const now = new Date()

    // 1. 检查绝对有效期（激活截止时间）
    if (key.key_expires_at) {
      const expiryDate = new Date(key.key_expires_at)
      const diffMs = expiryDate.getTime() - now.getTime()

      if (diffMs <= 0) {
        return {
          text: '已过期',
          color: 'text-red-400',
          isExpired: true
        }
      }

      // 未激活，显示激活截止时间
      if (!key.used_at && !key.user_id) {
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

        if (diffDays <= 7) {
          return {
            text: `${diffDays}天后激活截止`,
            color: 'text-amber-400',
            isExpired: false
          }
        }
        return {
          text: `${diffDays}天后激活截止`,
          color: 'text-blue-400',
          isExpired: false
        }
      }
    }

    // 2. 如果已激活，计算使用有效期
    if (key.used_at) {
      const usedDate = new Date(key.used_at)

      // 优先使用 original_duration_hours 计算
      let expiryTime
      if (key.original_duration_hours) {
        expiryTime = new Date(usedDate.getTime() + key.original_duration_hours * 60 * 60 * 1000)
      } else {
        expiryTime = new Date(usedDate.getTime() + key.account_valid_for_days * 24 * 60 * 60 * 1000)
      }

      const diffMs = expiryTime.getTime() - now.getTime()

      if (diffMs <= 0) {
        return {
          text: '已过期',
          color: 'text-red-400',
          isExpired: true
        }
      }

      // 转换为友好的时间显示
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffHours / 24)
      const remainingHours = diffHours % 24

      if (diffDays > 0) {
        if (remainingHours > 0) {
          return {
            text: `${diffDays}天${remainingHours}小时后过期`,
            color: diffDays <= 7 ? 'text-amber-400' : 'text-green-400',
            isExpired: false
          }
        }
        return {
          text: `${diffDays}天后过期`,
          color: diffDays <= 7 ? 'text-amber-400' : 'text-green-400',
          isExpired: false
        }
      } else {
        return {
          text: `${diffHours}小时后过期`,
          color: diffHours <= 24 ? 'text-amber-400' : 'text-blue-400',
          isExpired: false
        }
      }
    }

    // 3. 未激活也没有绝对有效期
    return {
      text: `有效期${key.account_valid_for_days}天`,
      color: 'text-green-400',
      isExpired: false
    }
  }

  // 获取时长显示
  const getDurationDisplay = (key: AccessKey): string => {
    // 优先使用 original_duration_hours
    if (key.original_duration_hours) {
      const hours = key.original_duration_hours

      if (hours < 24) {
        // 显示小时
        const displayHours = Math.floor(hours)
        const displayMinutes = Math.round((hours - displayHours) * 60)

        if (displayHours === 0) {
          return `${displayMinutes}分钟`
        } else if (displayMinutes === 0) {
          return `${displayHours}小时`
        } else {
          return `${displayHours}小时${displayMinutes}分钟`
        }
      } else if (hours < 24 * 30) {
        // 显示天
        const days = hours / 24
        if (days === Math.floor(days)) {
          return `${days}天`
        } else {
          // 显示天和小时
          const fullDays = Math.floor(days)
          const remainingHours = Math.round((days - fullDays) * 24)
          return `${fullDays}天${remainingHours}小时`
        }
      } else {
        // 显示月
        const months = hours / (24 * 30)
        if (months === Math.floor(months)) {
          return `${months}个月`
        } else {
          // 转换为天
          const days = Math.round(hours / 24)
          return `${days}天`
        }
      }
    }

    // 回退到 account_valid_for_days
    const days = key.account_valid_for_days
    if (days < 30) {
      return `${days}天`
    } else {
      const months = Math.round(days / 30)
      return `${months}个月`
    }
  }

  // 过滤密钥
  const filteredKeys = useMemo(() => {
    return keys.filter(key => {
      // 搜索过滤
      const searchMatch = search === '' ||
        key.key_code.toLowerCase().includes(search.toLowerCase()) ||
        (key.description && key.description.toLowerCase().includes(search.toLowerCase())) ||
        (key.user?.email && key.user.email.toLowerCase().includes(search.toLowerCase()))

      // 状态过滤
      let statusMatch = true

      if (statusFilter !== 'all') {
        const keyStatus = getKeyStatus(key)
        statusMatch = keyStatus === statusFilter
      }

      return searchMatch && statusMatch
    }).sort((a, b) => {
      // 排序
      let aValue: any, bValue: any

      if (sortBy === 'key_code') {
        aValue = a.key_code
        bValue = b.key_code
      } else if (sortBy === 'used_count') {
        aValue = a.used_count || 0
        bValue = b.used_count || 0
      } else {
        aValue = a.created_at
        bValue = b.created_at
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
  }, [keys, search, statusFilter, sortBy, sortOrder])

  // 分页数据
  const paginatedKeys = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredKeys.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredKeys, currentPage, itemsPerPage])

  // 单个密钥操作
  const handleKeyAction = async (keyId: number, action: 'disable' | 'enable' | 'delete', reason?: string) => {
    const actionText = {
      disable: '禁用',
      enable: '启用',
      delete: '删除'
    }[action]

    if (action === 'delete') {
      if (!confirm(`确定要删除此密钥吗？\n此操作不可撤销！${reason ? `\n原因：${reason}` : ''}`)) {
        return
      }
    } else {
      if (!confirm(`确定要${actionText}此密钥吗？${reason ? `\n原因：${reason}` : ''}`)) {
        return
      }
    }

    setOperationLoading(keyId)

    try {
      const response = await fetch(`/api/admin/keys/${keyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
        credentials: 'include'
      })

      const result = await response.json()

      if (result.success) {
        setSuccessMessage(`密钥已${actionText}`)
        setTimeout(() => setSuccessMessage(null), 3000)

        // 刷新数据
        setRefreshTrigger(prev => prev + 1)

        // 如果删除了选中的密钥，从选中列表中移除
        if (action === 'delete') {
          setSelectedKeys(prev => prev.filter(id => id !== keyId))
        }
      } else {
        throw new Error(result.error || `${actionText}失败`)
      }
    } catch (error: any) {
      alert(`❌ ${actionText}失败: ${error.message}`)
    } finally {
      setOperationLoading(null)
    }
  }

  // 批量操作
  const handleBulkAction = async (action: 'disable' | 'enable' | 'delete', reason?: string) => {
    if (selectedKeys.length === 0) return

    const actionText = {
      disable: '禁用',
      enable: '启用',
      delete: '删除'
    }[action]

    const confirmText = {
      disable: `确定要禁用选中的 ${selectedKeys.length} 个密钥吗？\n禁用后密钥将无法使用。${reason ? `\n原因：${reason}` : ''}`,
      enable: `确定要启用选中的 ${selectedKeys.length} 个密钥吗？\n启用后密钥可以正常使用。${reason ? `\n原因：${reason}` : ''}`,
      delete: `确定要删除选中的 ${selectedKeys.length} 个密钥吗？\n此操作不可撤销！${reason ? `\n原因：${reason}` : ''}`
    }[action]

    if (!confirm(confirmText)) return

    setBulkOperationLoading(true)

    try {
      const response = await fetch('/api/admin/keys/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          keyIds: selectedKeys,
          reason
        }),
        credentials: 'include'
      })

      const result = await response.json()

      if (result.success) {
        setSuccessMessage(`成功${actionText}了 ${selectedKeys.length} 个密钥`)
        setTimeout(() => setSuccessMessage(null), 3000)

        // 刷新数据
        setRefreshTrigger(prev => prev + 1)
        setSelectedKeys([])
        setShowBulkActions(false)
      } else {
        throw new Error(result.error || `${actionText}失败`)
      }
    } catch (error: any) {
      alert(`❌ 批量${actionText}失败: ${error.message}`)
    } finally {
      setBulkOperationLoading(false)
    }
  }

  // 查看密钥详情
  const viewKeyDetail = (keyId: number) => {
    router.push(`/admin/keys/${keyId}`)
  }

  // 复制选中的密钥
  const copySelectedKeys = () => {
    const selectedKeyCodes = keys
      .filter(key => selectedKeys.includes(key.id))
      .map(key => key.key_code)

    if (selectedKeyCodes.length === 0) return

    const text = selectedKeyCodes.join('\n')
    navigator.clipboard.writeText(text)
    setSuccessMessage(`已复制 ${selectedKeyCodes.length} 个密钥到剪贴板`)
    setTimeout(() => setSuccessMessage(null), 2000)
  }

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedKeys.length === filteredKeys.length) {
      setSelectedKeys([])
    } else {
      setSelectedKeys(filteredKeys.map(key => key.id))
    }
  }

  // 初始化加载
  useEffect(() => {
    fetchKeys()
    fetchStatistics()

    // 设置定时刷新（每5分钟）
    const interval = setInterval(() => {
      fetchStatistics()
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [fetchKeys, fetchStatistics, refreshTrigger])

  // 自动清除成功消息
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  // 页面改变时重置到第一页
  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter, itemsPerPage])

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
                  disabled={bulkOperationLoading}
                  className="px-3 py-2 bg-gradient-to-r from-red-600 to-pink-600 hover:opacity-90 rounded-lg text-sm text-white whitespace-nowrap disabled:opacity-50"
                >
                  {bulkOperationLoading ? '处理中...' : `批量禁用 (${selectedKeys.length})`}
                </button>
                <button
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  disabled={bulkOperationLoading}
                  className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 flex items-center disabled:opacity-50"
                >
                  <MoreVertical className="w-4 h-4 mr-2" />
                  更多操作
                  <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showBulkActions ? 'rotate-180' : ''}`} />
                </button>
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
              onClick={() => setShowExportModal(true)}
              className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              导出数据
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

        {/* 成功消息 */}
        {successMessage && (
          <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg animate-fade-in">
            <div className="flex items-center">
              <Check className="w-5 h-5 text-green-400 mr-3" />
              <p className="text-green-400">{successMessage}</p>
            </div>
          </div>
        )}

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

        {/* 批量操作下拉菜单 */}
        {showBulkActions && selectedKeys.length > 0 && (
          <div className="mt-4 p-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg animate-slide-down">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-white mb-2">批量操作 ({selectedKeys.length}个密钥)</h3>
                <p className="text-gray-400 text-sm">选择要执行的操作：</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkAction('enable')}
                  disabled={bulkOperationLoading}
                  className="px-3 py-2 bg-green-600 hover:opacity-90 rounded-lg text-sm text-white flex items-center disabled:opacity-50"
                >
                  <Unlock className="w-4 h-4 mr-2" />
                  批量启用
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  disabled={bulkOperationLoading}
                  className="px-3 py-2 bg-red-600 hover:opacity-90 rounded-lg text-sm text-white flex items-center disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  批量删除
                </button>
                <button
                  onClick={copySelectedKeys}
                  className="px-3 py-2 bg-blue-600 hover:opacity-90 rounded-lg text-sm text-white flex items-center"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  复制密钥
                </button>
                <button
                  onClick={() => setShowBulkActions(false)}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-300"
                >
                  <X className="w-4 h-4" />
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
              placeholder="搜索密钥代码、描述、邮箱..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {[
              { value: 'all', label: '全部密钥', count: stats.total, color: 'text-gray-400' },
              { value: 'active', label: '有效', count: stats.active, color: 'text-green-400' },
              { value: 'unused', label: '未使用', count: stats.unused, color: 'text-amber-400' },
              { value: 'used', label: '已使用', count: stats.used, color: 'text-blue-400' },
              { value: 'expired', label: '已过期', count: stats.expired, color: 'text-red-400' },
              { value: 'disabled', label: '已禁用', count: stats.inactive, color: 'text-gray-400' }
            ].map((item) => (
              <button
                key={item.value}
                className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap flex items-center ${statusFilter === item.value
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                onClick={() => setStatusFilter(item.value as any)}
              >
                <span className={statusFilter !== item.value ? item.color : ''}>
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
          <div className="mt-4 p-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg animate-slide-down">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  排序方式
                </label>
                <select
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                >
                  <option value="created_at">创建时间</option>
                  <option value="key_code">密钥代码</option>
                  <option value="used_count">使用次数</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  排序顺序
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSortOrder('desc')}
                    className={`flex-1 px-3 py-2 rounded-lg ${sortOrder === 'desc' ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                  >
                    最新优先
                  </button>
                  <button
                    onClick={() => setSortOrder('asc')}
                    className={`flex-1 px-3 py-2 rounded-lg ${sortOrder === 'asc' ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                  >
                    最早优先
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  每页显示
                </label>
                <select
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                >
                  <option value={10}>10 条/页</option>
                  <option value={20}>20 条/页</option>
                  <option value={50}>50 条/页</option>
                  <option value={100}>100 条/页</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSearch('')
                      setStatusFilter('all')
                      setSortBy('created_at')
                      setSortOrder('desc')
                      setItemsPerPage(20)
                    }}
                    className="flex-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300"
                  >
                    重置所有筛选
                  </button>
                  <button
                    onClick={() => setShowAdvancedFilters(false)}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white"
                  >
                    关闭高级筛选
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 统计面板 */}
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
            <div>
              <h2 className="text-lg font-semibold text-white">密钥列表</h2>
              <p className="text-gray-400 text-sm mt-1">
                {selectedKeys.length > 0 && (
                  <span className="text-amber-400 mr-3">已选中 {selectedKeys.length} 个密钥</span>
                )}
                显示 {paginatedKeys.length} / {filteredKeys.length} 个密钥 • 第 {currentPage} 页，共 {Math.ceil(filteredKeys.length / itemsPerPage)} 页
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={fetchKeys}
                className="px-3 py-1 bg-gray-800 rounded text-sm hover:bg-gray-700 flex items-center transition-colors disabled:opacity-50"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                {loading ? '加载中...' : '刷新数据'}
              </button>
              <button
                onClick={toggleSelectAll}
                className="px-3 py-1 bg-gray-800 rounded text-sm hover:bg-gray-700 text-gray-300"
              >
                {selectedKeys.length === filteredKeys.length && filteredKeys.length > 0 ? '取消全选' : '全选当前页'}
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 md:p-16 text-center">
            <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-400 mt-4">正在加载密钥数据...</p>
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
            {search && (
              <p className="text-gray-500 text-sm mb-6">搜索词: "{search}"</p>
            )}
            <button
              onClick={() => {
                setSearch('')
                setStatusFilter('all')
              }}
              className="inline-flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300"
            >
              清除所有筛选
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px]">
                <thead>
                  <tr className="border-b border-gray-700/50 bg-gray-900/50">
                    <th className="text-left py-3 px-4 md:px-6">
                      <input
                        type="checkbox"
                        checked={selectedKeys.length === filteredKeys.length && filteredKeys.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-600 bg-gray-800"
                      />
                    </th>
                    <th className="text-left py-3 px-4 md:px-6 text-gray-400 font-medium text-sm">密钥代码</th>
                    <th className="text-left py-3 px-4 md:px-6 text-gray-400 font-medium text-sm">描述</th>
                    <th className="text-left py-3 px-4 md:px-6 text-gray-400 font-medium text-sm">有效期</th>
                    <th className="text-left py-3 px-4 md:px-6 text-gray-400 font-medium text-sm">状态</th>
                    <th className="text-left py-3 px-4 md:px-6 text-gray-400 font-medium text-sm">使用者</th>
                    <th className="text-left py-3 px-4 md:px-6 text-gray-400 font-medium text-sm">使用次数</th>
                    <th className="text-left py-3 px-4 md:px-6 text-gray-400 font-medium text-sm">剩余有效期</th>
                    <th className="text-left py-3 px-4 md:px-6 text-gray-400 font-medium text-sm">创建时间</th>
                    <th className="text-left py-3 px-4 md:px-6 text-gray-400 font-medium text-sm">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedKeys.map((key) => {
                    const keyStatus = getKeyStatus(key)
                    const status = statusConfig[keyStatus]
                    const StatusIcon = status.icon
                    const remaining = getRemainingTime(key)
                    const durationDisplay = getDurationDisplay(key)
                    const isSelected = selectedKeys.includes(key.id)
                    const isOperationLoading = operationLoading === key.id

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
                            disabled={isOperationLoading}
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
                              disabled={isOperationLoading}
                              className={`p-1.5 rounded transition-colors ${copiedKey === key.key_code ? 'bg-green-500/20' : 'hover:bg-gray-700'} disabled:opacity-50`}
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
                              {durationDisplay}
                            </span>
                            {key.key_expires_at && (
                              <span className="text-gray-500 text-xs">
                                激活截止: {new Date(key.key_expires_at).toLocaleDateString('zh-CN')}
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
                              onClick={() => viewKeyDetail(key.id)}
                              className="p-1.5 hover:bg-blue-500/20 rounded transition-colors"
                              title="查看详情"
                            >
                              <Eye className="w-4 h-4 text-blue-400" />
                            </button>
                            <button
                              onClick={() => handleKeyAction(key.id, key.is_active ? 'disable' : 'enable')}
                              disabled={isOperationLoading}
                              className="p-1.5 hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                              title={key.is_active ? '禁用密钥' : '启用密钥'}
                            >
                              {isOperationLoading ? (
                                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                              ) : key.is_active ? (
                                <EyeOff className="w-4 h-4 text-amber-400" />
                              ) : (
                                <Eye className="w-4 h-4 text-green-400" />
                              )}
                            </button>
                            <button
                              onClick={() => handleKeyAction(key.id, 'delete')}
                              disabled={isOperationLoading}
                              className="p-1.5 hover:bg-red-500/20 rounded transition-colors disabled:opacity-50"
                              title="删除密钥"
                            >
                              {isOperationLoading ? (
                                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4 text-red-400" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* 分页控件 */}
            {filteredKeys.length > itemsPerPage && (
              <div className="px-4 md:px-6 py-4 border-t border-gray-700/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center text-sm text-gray-400">
                    显示第 {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredKeys.length)} 条，
                    共 {filteredKeys.length} 条记录
                  </div>

                  <div className="flex items-center space-x-2">
                    <select
                      value={itemsPerPage}
                      onChange={(e) => setItemsPerPage(Number(e.target.value))}
                      className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300"
                    >
                      <option value={10}>10 条/页</option>
                      <option value={20}>20 条/页</option>
                      <option value={50}>50 条/页</option>
                      <option value={100}>100 条/页</option>
                    </select>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="p-2 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronFirst className="w-4 h-4 text-gray-400" />
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4 text-gray-400" />
                      </button>

                      <span className="px-3 py-1 text-sm text-gray-300">
                        {currentPage} / {Math.ceil(filteredKeys.length / itemsPerPage)}
                      </span>

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredKeys.length / itemsPerPage), prev + 1))}
                        disabled={currentPage >= Math.ceil(filteredKeys.length / itemsPerPage)}
                        className="p-2 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </button>
                      <button
                        onClick={() => setCurrentPage(Math.ceil(filteredKeys.length / itemsPerPage))}
                        disabled={currentPage >= Math.ceil(filteredKeys.length / itemsPerPage)}
                        className="p-2 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLast className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 导出模态框 */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        selectedKeys={selectedKeys}
        totalKeys={filteredKeys.length}
        filters={{
          status: statusFilter,
          search,
          sort_by: sortBy,
          sort_order: sortOrder
        }}
      />

      {/* 底部提示信息 */}
      <div className="mt-6 p-4 bg-gray-800/30 border border-gray-700/50 rounded-lg">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-blue-400 mr-2 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-white mb-1">操作说明</h4>
            <ul className="text-gray-400 text-sm space-y-1">
              <li>• <span className="text-amber-400">禁用</span>：密钥暂时不可用，但保留记录</li>
              <li>• <span className="text-green-400">启用</span>：恢复禁用的密钥</li>
              <li>• <span className="text-red-400">删除</span>：永久删除密钥，不可恢复</li>
              <li>• 支持批量操作：选中多个密钥后可使用批量功能</li>
              <li>• 支持高级筛选：点击"高级筛选"按钮查看更多选项</li>
              <li>• 支持导出功能：可导出CSV、JSON或文本格式</li>
              <li>• 小时级别密钥：支持1小时、2小时、4小时、12小时等时长</li>
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