// /app/admin/keys/page.tsx - 修复版
'use client'

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Key, Search, Filter, Download, Plus, RefreshCw,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Eye, EyeOff, Trash2, Check, Copy, AlertCircle,
  BarChart3, Settings, MoreVertical, Calendar,
  Users, Clock, Hash, Shield, Ban, Zap,
  ExternalLink, FileText, Info, X, Loader2
} from 'lucide-react'

// 导入类型
import { AccessKey, FilterParams, KeyStatus } from './types'

// 状态标签配置
const statusConfig: Record<KeyStatus, {
  label: string
  color: string
  bgColor: string
  icon: any
}> = {
  unused: {
    label: '未使用',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/15',
    icon: Clock
  },
  used: {
    label: '已使用',
    color: 'text-green-400',
    bgColor: 'bg-green-500/15',
    icon: Check
  },
  expired: {
    label: '已过期',
    color: 'text-red-400',
    bgColor: 'bg-red-500/15',
    icon: AlertCircle
  },
  disabled: {
    label: '已禁用',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/15',
    icon: Ban
  }
}

// 内层组件 - 使用 useSearchParams
function KeysPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // 状态管理
  const [keys, setKeys] = useState<AccessKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<number[]>([])
  const [showFilters, setShowFilters] = useState(false)

  // 分页状态
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 1,
    has_next: false,
    has_prev: false
  })

  // 筛选状态
  const [filters, setFilters] = useState<FilterParams>({
    page: 1,
    limit: 20,
    sort_by: 'created_at',
    sort_order: 'desc'
  })




  // 在 KeysPageContent 组件中，修改 fetchKeys 函数：
  const fetchKeys = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      console.log('📡 使用简单API获取密钥数据...')

      // 使用简单API（新创建的）
      const response = await fetch('/api/admin/keys/simple', {
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache' }
      })

      console.log('📦 API响应状态:', response.status)

      if (!response.ok) {
        throw new Error(`API请求失败 (${response.status})`)
      }

      const result = await response.json()

      console.log('📊 API响应结果:', {
        success: result.success,
        keyCount: result.data?.keys?.length || 0
      })

      if (!result.success) {
        throw new Error(result.error || '获取密钥数据失败')
      }

      // 处理数据格式，确保与之前的一致
      const keysData = result.data.keys || []
      console.log(`✅ 获取到 ${keysData.length} 条密钥数据`)

      setKeys(keysData)

      // 计算统计数据
      const now = new Date()
      const statsData = {
        total: keysData.length,
        active: keysData.filter(k => k.is_active && (!k.key_expires_at || new Date(k.key_expires_at) > now)).length,
        used: keysData.filter(k => k.usage_count > 0 || k.used_at).length,
        unused: keysData.filter(k => k.usage_count === 0 && !k.used_at && k.is_active).length,
        expired: keysData.filter(k => k.key_expires_at && new Date(k.key_expires_at) < now).length,
        inactive: keysData.filter(k => !k.is_active).length,
        todayExpiring: 0, // 暂时不计算
        nearExpiring: 0   // 暂时不计算
      }

      setStats(statsData)

      // 设置分页信息（如果API返回了的话）
      if (result.data.pagination) {
        setPagination(result.data.pagination)
      }

    } catch (error: any) {
      console.error('❌ 获取密钥数据失败:', error)
      setError(`获取数据失败: ${error.message}`)
      setKeys([])
    } finally {
      setLoading(false)
    }
  }, [])

  // 处理筛选变化
  const handleFilterChange = (newFilters: Partial<FilterParams>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }))
    setSelectedKeys([])
  }

  // 处理分页
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= pagination.total_pages) {
      handleFilterChange({ page })
    }
  }

  // 处理排序
  const handleSort = (field: string) => {
    const newOrder = filters.sort_by === field && filters.sort_order === 'desc' ? 'asc' : 'desc'
    handleFilterChange({ sort_by: field, sort_order: newOrder })
  }

  // 导出CSV
  const handleExport = async (type: 'current_page' | 'filtered' | 'selected') => {
    try {
      const exportData = {
        export_type: type,
        filters: type === 'filtered' ? filters : undefined,
        selected_ids: type === 'selected' ? selectedKeys : undefined,
        page: type === 'current_page' ? pagination.page : undefined,
        limit: type === 'current_page' ? pagination.limit : undefined
      }

      const response = await fetch('/api/admin/keys/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData),
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('导出失败')
      }

      // 下载文件
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'keys.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

    } catch (error: any) {
      alert(`导出失败: ${error.message}`)
    }
  }

  // 批量操作
  const handleBatchAction = async (action: 'disable' | 'enable' | 'delete') => {
    if (selectedKeys.length === 0) return

    const confirmText = {
      disable: `确定要禁用选中的 ${selectedKeys.length} 个密钥吗？`,
      enable: `确定要启用选中的 ${selectedKeys.length} 个密钥吗？`,
      delete: `确定要删除选中的 ${selectedKeys.length} 个密钥吗？此操作不可撤销！`
    }[action]

    if (!confirm(confirmText)) return

    try {
      const response = await fetch('/api/admin/keys/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, keyIds: selectedKeys }),
        credentials: 'include'
      })

      const result = await response.json()

      if (result.success) {
        alert(`成功${action === 'delete' ? '删除' : action === 'enable' ? '启用' : '禁用'}了 ${selectedKeys.length} 个密钥`)
        fetchKeys()
        setSelectedKeys([])
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      alert(`操作失败: ${error.message}`)
    }
  }

  // 初始化加载
  useEffect(() => {
    const initialFilters: FilterParams = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      sort_by: searchParams.get('sort_by') || 'created_at',
      sort_order: (searchParams.get('sort_order') as 'asc' | 'desc') || 'desc',
      status: searchParams.get('status') || '',
      user_email: searchParams.get('user_email') || '',
      key_code: searchParams.get('key_code') || '',
      created_at_start: searchParams.get('created_at_start') || '',
      created_at_end: searchParams.get('created_at_end') || '',
      duration_min: searchParams.get('duration_min') ? parseInt(searchParams.get('duration_min')!) : undefined,
      duration_max: searchParams.get('duration_max') ? parseInt(searchParams.get('duration_max')!) : undefined,
      is_active: searchParams.get('is_active') === 'true' ? true :
        searchParams.get('is_active') === 'false' ? false : undefined
    }

    setFilters(initialFilters)
  }, [searchParams])

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  // 获取时长显示
  const getDurationDisplay = (key: AccessKey): string => {
    if (key.original_duration_hours) {
      const hours = key.original_duration_hours
      if (hours < 24) {
        return `${hours}小时`
      } else if (hours === 24) {
        return '1天'
      } else if (hours < 24 * 30) {
        return `${Math.round(hours / 24)}天`
      } else {
        return `${Math.round(hours / (24 * 30))}个月`
      }
    }
    return `${key.account_valid_for_days}天`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 p-4 md:p-6">
      {/* 页面标题 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center">
              <Key className="w-6 h-6 md:w-7 md:h-7 mr-2 text-amber-400" />
              密钥管理
            </h1>
            <p className="text-gray-400 mt-2">
              共 {pagination.total} 个密钥 • 第 {pagination.page}/{pagination.total_pages} 页
              {selectedKeys.length > 0 && (
                <span className="ml-2 text-amber-400">
                  • 已选中 {selectedKeys.length} 个
                </span>
              )}
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/admin/keys/generate"
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:opacity-90 rounded-lg text-white flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              生成新密钥
            </Link>
          </div>
        </div>
      </div>

      {/* 筛选工具栏 */}
      <div className="mb-6 p-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl">
        <div className="flex flex-col md:flex-row gap-4">
          {/* 搜索框 */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="搜索密钥代码或用户邮箱..."
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                value={filters.key_code || ''}
                onChange={(e) => handleFilterChange({ key_code: e.target.value })}
              />
            </div>
          </div>

          {/* 筛选按钮 */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 flex items-center"
          >
            <Filter className="w-4 h-4 mr-2" />
            筛选
            {showFilters ? (
              <ChevronUp className="w-4 h-4 ml-2" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-2" />
            )}
          </button>

          {/* 排序选择 */}
          <select
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
            value={filters.sort_by}
            onChange={(e) => handleFilterChange({ sort_by: e.target.value })}
          >
            <option value="created_at">按创建时间</option>
            <option value="updated_at">按更新时间</option>
            <option value="key_code">按密钥代码</option>
            <option value="account_valid_for_days">按有效期</option>
          </select>

          {/* 排序方向 */}
          <button
            onClick={() => handleFilterChange({ sort_order: filters.sort_order === 'asc' ? 'desc' : 'asc' })}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300"
          >
            {filters.sort_order === 'asc' ? '升序 ↑' : '降序 ↓'}
          </button>

          {/* 每页数量 */}
          <select
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
            value={filters.limit}
            onChange={(e) => handleFilterChange({ limit: parseInt(e.target.value) })}
          >
            <option value="10">10条/页</option>
            <option value="20">20条/页</option>
            <option value="50">50条/页</option>
            <option value="100">100条/页</option>
          </select>
        </div>

        {/* 高级筛选面板 */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-900/70 rounded-lg border border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 状态筛选 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  状态筛选
                </label>
                <select
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  value={filters.status || ''}
                  onChange={(e) => handleFilterChange({ status: e.target.value })}
                >
                  <option value="">全部状态</option>
                  <option value="unused">未使用</option>
                  <option value="used">已使用</option>
                  <option value="expired">已过期</option>
                  <option value="disabled">已禁用</option>
                </select>
              </div>

              {/* 创建时间范围 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  创建时间
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    value={filters.created_at_start || ''}
                    onChange={(e) => handleFilterChange({ created_at_start: e.target.value })}
                  />
                  <input
                    type="date"
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    value={filters.created_at_end || ''}
                    onChange={(e) => handleFilterChange({ created_at_end: e.target.value })}
                  />
                </div>
              </div>

              {/* 有效期范围 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  有效期（天）
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="最小"
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    value={filters.duration_min || ''}
                    onChange={(e) => handleFilterChange({
                      duration_min: e.target.value ? parseInt(e.target.value) : undefined
                    })}
                  />
                  <input
                    type="number"
                    placeholder="最大"
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    value={filters.duration_max || ''}
                    onChange={(e) => handleFilterChange({
                      duration_max: e.target.value ? parseInt(e.target.value) : undefined
                    })}
                  />
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-end">
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => {
                      setFilters({
                        page: 1,
                        limit: 20,
                        sort_by: 'created_at',
                        sort_order: 'desc'
                      })
                      setSelectedKeys([])
                    }}
                    className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300"
                  >
                    重置筛选
                  </button>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white"
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 批量操作栏 */}
      {selectedKeys.length > 0 && (
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-blue-500 mr-3 animate-pulse"></div>
              <span className="text-blue-400">
                已选中 {selectedKeys.length} 个密钥
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleBatchAction('disable')}
                className="px-4 py-2 bg-amber-600 hover:opacity-90 rounded-lg text-white"
              >
                禁用选中
              </button>
              <button
                onClick={() => handleBatchAction('enable')}
                className="px-4 py-2 bg-green-600 hover:opacity-90 rounded-lg text-white"
              >
                启用选中
              </button>
              <button
                onClick={() => handleBatchAction('delete')}
                className="px-4 py-2 bg-red-600 hover:opacity-90 rounded-lg text-white"
              >
                删除选中
              </button>
              <button
                onClick={() => handleExport('selected')}
                className="px-4 py-2 bg-blue-600 hover:opacity-90 rounded-lg text-white"
              >
                导出选中
              </button>
              <button
                onClick={() => setSelectedKeys([])}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300"
              >
                取消选择
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 导出操作栏 */}
      <div className="mb-6 p-4 bg-gray-800/30 border border-gray-700/50 rounded-xl">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleExport('current_page')}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            导出当前页
          </button>
          <button
            onClick={() => handleExport('filtered')}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 flex items-center"
          >
            <FileText className="w-4 h-4 mr-2" />
            导出筛选结果
          </button>
          <button
            onClick={() => handleExport('selected')}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 flex items-center"
          >
            <Check className="w-4 h-4 mr-2" />
            导出选中项
          </button>
          <button
            onClick={fetchKeys}
            disabled={loading}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 flex items-center"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? '刷新中...' : '刷新数据'}
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl animate-fade-in">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* 密钥列表表格 */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px]">
            <thead>
              <tr className="border-b border-gray-700/50 bg-gray-900/50">
                <th className="text-left py-3 px-4">
                  <input
                    type="checkbox"
                    checked={selectedKeys.length === keys.length && keys.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedKeys(keys.map(k => k.id))
                      } else {
                        setSelectedKeys([])
                      }
                    }}
                    className="rounded border-gray-600 bg-gray-800"
                  />
                </th>
                <th
                  className="text-left py-3 px-4 text-gray-400 font-medium text-sm cursor-pointer hover:text-white"
                  onClick={() => handleSort('key_code')}
                >
                  密钥代码 {filters.sort_by === 'key_code' && (
                    <span className="ml-1">{filters.sort_order === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">描述</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">有效期</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">状态</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">当前用户</th>
                <th
                  className="text-left py-3 px-4 text-gray-400 font-medium text-sm cursor-pointer hover:text-white"
                  onClick={() => handleSort('account_valid_for_days')}
                >
                  使用次数 {filters.sort_by === 'account_valid_for_days' && (
                    <span className="ml-1">{filters.sort_order === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th
                  className="text-left py-3 px-4 text-gray-400 font-medium text-sm cursor-pointer hover:text-white"
                  onClick={() => handleSort('created_at')}
                >
                  创建时间 {filters.sort_by === 'created_at' && (
                    <span className="ml-1">{filters.sort_order === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">操作</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center">
                    <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-gray-400 mt-4">正在加载密钥数据...</p>
                  </td>
                </tr>
              ) : keys.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center">
                    <Key className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-300 mb-2">暂无密钥数据</h3>
                    <p className="text-gray-500 mb-6">未找到匹配的密钥，请尝试调整筛选条件</p>
                    <button
                      onClick={() => {
                        setFilters({
                          page: 1,
                          limit: 20,
                          sort_by: 'created_at',
                          sort_order: 'desc'
                        })
                      }}
                      className="inline-flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300"
                    >
                      清除所有筛选
                    </button>
                  </td>
                </tr>
              ) : (
                keys.map((key) => {
                  const statusConfigItem = statusConfig[key.status]
                  const StatusIcon = statusConfigItem.icon
                  const isSelected = selectedKeys.includes(key.id)

                  return (
                    <tr
                      key={key.id}
                      className={`border-b border-gray-700/30 hover:bg-gray-800/30 transition-colors ${isSelected ? 'bg-blue-500/5' : ''
                        }`}
                    >
                      <td className="py-3 px-4">
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

                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <code className="font-mono text-sm text-white bg-gray-900 px-3 py-2 rounded-lg border border-gray-700 truncate max-w-[200px]">
                            {key.key_code}
                          </code>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="max-w-[150px]">
                          <p className="text-gray-300 text-sm truncate" title={key.description || ''}>
                            {key.description || '-'}
                          </p>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium mb-1 w-fit">
                            {getDurationDisplay(key)}
                          </span>
                          {key.key_expires_at && (
                            <span className="text-gray-500 text-xs">
                              截止: {new Date(key.key_expires_at).toLocaleDateString('zh-CN')}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1.5 rounded-full text-xs ${statusConfigItem.bgColor} ${statusConfigItem.color}`}>
                          <StatusIcon className="w-3 h-3 mr-1.5" />
                          {statusConfigItem.label}
                          {key.usage_count > 0 && key.status === 'used' && (
                            <span className="ml-1">({key.usage_count}次)</span>
                          )}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {key.current_user ? (
                          <div className="space-y-1 max-w-[150px]">
                            <div className="flex items-center">
                              <Users className="w-3 h-3 text-gray-500 mr-1" />
                              <p className="text-gray-300 text-sm truncate">
                                {key.current_user.email}
                              </p>
                            </div>
                            {key.current_user.nickname && (
                              <p className="text-gray-500 text-xs truncate">
                                {key.current_user.nickname}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500 text-sm">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Hash className="w-4 h-4 text-gray-400" />
                          <div>
                            <span className="text-gray-300 text-sm">
                              {key.max_uses ? `${key.usage_count} / ${key.max_uses}` : `${key.usage_count} / ∞`}
                            </span>
                            {key.max_uses && (
                              <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
                                <div
                                  className="bg-green-500 h-1.5 rounded-full"
                                  style={{
                                    width: `${Math.min(100, ((key.usage_count || 0) / key.max_uses) * 100)}%`
                                  }}
                                ></div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-gray-300 text-sm">
                          {new Date(key.created_at).toLocaleString('zh-CN')}
                        </div>
                        {key.last_used_at && (
                          <div className="text-gray-500 text-xs mt-1">
                            最后使用: {new Date(key.last_used_at).toLocaleDateString('zh-CN')}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => router.push(`/admin/keys/detail?id=${key.id}`)}
                            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                            title="查看详情"
                          >
                            <Eye className="w-4 h-4 text-blue-400" />
                          </button>

                          <button
                            onClick={() => {
                              // 单个操作逻辑
                              const action = key.is_active ? 'disable' : 'enable'
                              if (confirm(`确定要${action === 'disable' ? '禁用' : '启用'}此密钥吗？`)) {
                                // 调用单个操作API
                              }
                            }}
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
                            onClick={() => {
                              if (confirm('确定要删除此密钥吗？此操作不可撤销！')) {
                                // 调用删除API
                              }
                            }}
                            className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
                            title="删除密钥"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 分页控件 */}
        {keys.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-700/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="text-gray-400 text-sm">
                显示 {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} 条，共 {pagination.total} 条
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={pagination.page === 1}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  首页
                </button>

                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.has_prev}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  上一页
                </button>

                {/* 页码 */}
                <div className="flex space-x-1">
                  {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                    let pageNum
                    if (pagination.total_pages <= 5) {
                      pageNum = i + 1
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1
                    } else if (pagination.page >= pagination.total_pages - 2) {
                      pageNum = pagination.total_pages - 4 + i
                    } else {
                      pageNum = pagination.page - 2 + i
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-8 h-8 rounded-lg ${pagination.page === pageNum
                            ? 'bg-amber-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                          }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}

                  {pagination.total_pages > 5 && pagination.page < pagination.total_pages - 2 && (
                    <>
                      <span className="px-2 text-gray-500">...</span>
                      <button
                        onClick={() => handlePageChange(pagination.total_pages)}
                        className="w-8 h-8 bg-gray-800 text-gray-400 hover:bg-gray-700 rounded-lg"
                      >
                        {pagination.total_pages}
                      </button>
                    </>
                  )}
                </div>

                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.has_next}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  下一页
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>

                <button
                  onClick={() => handlePageChange(pagination.total_pages)}
                  disabled={pagination.page === pagination.total_pages}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  末页
                </button>
              </div>

              <div className="text-gray-400 text-sm">
                每页 {pagination.limit} 条，共 {pagination.total_pages} 页
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 统计信息卡片 */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl">
          <div className="flex items-center">
            <Key className="w-5 h-5 mr-2 text-amber-400" />
            <p className="text-sm text-gray-400">总密钥数</p>
          </div>
          <p className="text-xl md:text-2xl font-bold text-white mt-2">{pagination.total}</p>
        </div>

        <div className="p-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl">
          <div className="flex items-center">
            <Shield className="w-5 h-5 mr-2 text-green-400" />
            <p className="text-sm text-gray-400">有效密钥</p>
          </div>
          <p className="text-xl md:text-2xl font-bold text-white mt-2">
            {keys.filter(k => k.is_active && k.status !== 'expired').length}
          </p>
        </div>

        <div className="p-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl">
          <div className="flex items-center">
            <Clock className="w-5 h-5 mr-2 text-amber-400" />
            <p className="text-sm text-gray-400">未使用</p>
          </div>
          <p className="text-xl md:text-2xl font-bold text-amber-400 mt-2">
            {keys.filter(k => k.status === 'unused').length}
          </p>
        </div>

        <div className="p-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl">
          <div className="flex items-center">
            <Check className="w-5 h-5 mr-2 text-blue-400" />
            <p className="text-sm text-gray-400">已使用</p>
          </div>
          <p className="text-xl md:text-2xl font-bold text-blue-400 mt-2">
            {keys.filter(k => k.status === 'used').length}
          </p>
        </div>
      </div>

      {/* 操作提示 */}
      <div className="mt-6 p-4 bg-gray-800/30 border border-gray-700/50 rounded-lg">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-blue-400 mr-2 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-white mb-1">使用提示</h4>
            <ul className="text-gray-400 text-sm space-y-1">
              <li>• 支持多条件筛选和排序，点击表头可切换排序方式</li>
              <li>• 批量操作：选中多个密钥后可使用批量功能</li>
              <li>• 导出功能：支持导出当前页、筛选结果或选中项</li>
              <li>• 密钥详情：点击"查看详情"按钮查看完整使用历史</li>
              <li>• 小时级别密钥：支持1小时、2小时、4小时、12小时等时长</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// 外层组件 - 用Suspense包裹内层组件
export default function KeysPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 p-4 md:p-6">
          <div className="flex flex-col items-center justify-center h-96">
            <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 mt-4">正在加载密钥管理页面...</p>
            <p className="text-gray-500 text-sm mt-2">请稍候</p>
          </div>
        </div>
      }
    >
      <KeysPageContent />
    </Suspense>
  )
}