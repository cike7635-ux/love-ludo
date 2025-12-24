// /app/admin/users/page.tsx - 完整修复版
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, Mail, Search, Download, MoreVertical, Key, ChevronDown, Shield } from 'lucide-react'
import UserDetailModal from './components/user-detail-modal'
import GrowthChart from './components/growth-chart'
import { User, UserDetail } from './types'

export const dynamic = 'force-dynamic'

const ITEMS_PER_PAGE = 20

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all')
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showBatchMenu, setShowBatchMenu] = useState(false)
  const [batchActionLoading, setBatchActionLoading] = useState(false)

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  // 获取用户数据 - 通过安全API
  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setUsers([])

    try {
      // 1. 构建查询参数
      const params = new URLSearchParams({
        table: 'profiles',
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      })

      // 2. 添加搜索参数
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim())
      }

      // 3. 添加筛选参数
      if (filter !== 'all') {
        params.append('filter', filter)
      }

      // 4. 调用安全API端点
      const apiUrl = `/api/admin/data?${params.toString()}`
      const response = await fetch(apiUrl, {
        credentials: 'include',
      })

      // 5. 检查响应状态
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API请求失败 (${response.status}): ${errorText}`)
      }

      // 6. 解析JSON数据
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'API返回未知错误')
      }

      // 7. 转换数据格式 - 修复密钥显示
      const formattedUsers: User[] = (result.data || []).map((profile: any) => {
        const lastLogin = profile.last_login_at
          ? new Date(profile.last_login_at).toLocaleString('zh-CN')
          : '从未登录'
        
        const createdAt = profile.created_at
          ? new Date(profile.created_at).toLocaleDateString('zh-CN')
          : '未知'

        const isPremium = profile.account_expires_at
          ? new Date(profile.account_expires_at) > new Date()
          : false

        // 🔥 修复密钥获取逻辑
        let activeKey = null
        let activeKeyUsedAt = null
        let activeKeyExpires = null
        
        // 方法1: 如果API返回了access_keys数组
        const accessKeys = profile.access_keys || []
        if (Array.isArray(accessKeys) && accessKeys.length > 0) {
          // 如果有access_key_id，找对应的密钥
          if (profile.access_key_id) {
            const currentKey = accessKeys.find((key: any) => key.id === profile.access_key_id)
            if (currentKey) {
              activeKey = currentKey.key_code
              activeKeyUsedAt = currentKey.used_at
              activeKeyExpires = currentKey.key_expires_at
            }
          }
          // 如果没有找到特定的，用第一个
          if (!activeKey && accessKeys.length > 0) {
            const firstKey = accessKeys[0]
            activeKey = firstKey.key_code
            activeKeyUsedAt = firstKey.used_at
            activeKeyExpires = firstKey.key_expires_at
          }
        }
        
        // 方法2: 如果API返回了单独的current_access_key
        if (!activeKey && profile.current_access_key) {
          activeKey = profile.current_access_key.key_code
          activeKeyUsedAt = profile.current_access_key.used_at
          activeKeyExpires = profile.current_access_key.key_expires_at
        }

        return {
          id: profile.id,
          email: profile.email,
          nickname: profile.nickname,
          fullName: profile.full_name,
          avatarUrl: profile.avatar_url,
          bio: profile.bio,
          preferences: profile.preferences,
          isAdmin: profile.email === '2200691917@qq.com',
          isPremium: isPremium,
          lastLogin: lastLogin,
          lastLoginRaw: profile.last_login_at,
          accountExpires: profile.account_expires_at,
          createdAt: createdAt,
          createdAtRaw: profile.created_at,
          accessKeyId: profile.access_key_id,
          activeKey: activeKey || (profile.access_key_id ? '需查看详情' : '无'),
          activeKeyUsedAt: activeKeyUsedAt,
          activeKeyExpires: activeKeyExpires,
          isActive: true
        }
      })

      // 8. 更新状态
      setUsers(formattedUsers)
      setTotalCount(result.pagination?.total || 0)

    } catch (error) {
      console.error('获取用户数据失败:', error)
      setUsers([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchTerm, filter])

  // 获取用户详情
  const fetchUserDetail = async (userId: string) => {
    console.log('🔍 开始获取用户详情:', userId)
    setDetailLoading(true)
    setSelectedUserDetail(null)
    
    try {
      const response = await fetch(`/api/admin/data?table=profiles&detailId=${userId}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`获取详情失败: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || '未找到用户详情')
      }

      const userDetail: UserDetail = {
        id: result.data.id || '',
        email: result.data.email || '',
        nickname: result.data.nickname || null,
        full_name: result.data.full_name || null,
        avatar_url: result.data.avatar_url || null,
        bio: result.data.bio || null,
        preferences: result.data.preferences || {},
        account_expires_at: result.data.account_expires_at || null,
        last_login_at: result.data.last_login_at || null,
        last_login_session: result.data.last_login_session || null,
        access_key_id: result.data.access_key_id || null,
        created_at: result.data.created_at || '',
        updated_at: result.data.updated_at || '',
        access_keys: result.data.access_keys || [],
        ai_usage_records: result.data.ai_usage_records || [],
        game_history: result.data.game_history || []
      }

      setSelectedUserDetail(userDetail)

    } catch (error: any) {
      console.error('获取用户详情失败:', error)
      setSelectedUserDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  // 批量操作
  const handleBatchAction = async (action: 'disable' | 'enable' | 'delete') => {
    if (!selectedUsers.length) return
    
    const actionNames = {
      disable: { text: '禁用', confirm: '确定要禁用这些账户吗？\n\n禁用后用户将无法登录系统。' },
      enable: { text: '启用', confirm: '确定要启用这些账户吗？\n\n启用后用户将恢复会员权限。' },
      delete: { text: '删除', confirm: '确定要删除这些账户吗？\n\n此操作会将用户标记为删除，但保留历史数据。' }
    }
    
    const { text, confirm: confirmText } = actionNames[action]
    
    if (!confirm(`${confirmText}\n\n涉及 ${selectedUsers.length} 个用户`)) return
    
    setBatchActionLoading(true)
    
    try {
      const response = await fetch('/api/admin/users/batch-disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userIds: selectedUsers,
          action: action,
          reason: `管理员批量${text}操作`
        }),
        credentials: 'include',
      })

      const result = await response.json()
      
      if (result.success) {
        alert(`✅ 成功${text}了 ${result.data.affectedCount} 个用户`)
        // 刷新用户列表
        fetchUsers()
        // 清空选择
        setSelectedUsers([])
        // 关闭菜单
        setShowBatchMenu(false)
      } else {
        throw new Error(result.error || '操作失败')
      }
    } catch (error: any) {
      console.error(`批量${text}失败:`, error)
      alert(`❌ 批量${text}失败: ${error.message}`)
    } finally {
      setBatchActionLoading(false)
    }
  }

  // CSV导出
  const handleExportCSV = () => {
    const headers = ['ID', '邮箱', '昵称', '会员状态', '最后登录', '注册时间', '当前密钥', '密钥使用时间', '密钥过期时间']
    const csvData = users.map(user => [
      user.id,
      user.email,
      user.nickname || '',
      user.isPremium ? '会员中' : '免费',
      user.lastLogin,
      user.createdAt,
      user.activeKey || '',
      user.activeKeyUsedAt ? new Date(user.activeKeyUsedAt).toLocaleString('zh-CN') : '',
      user.activeKeyExpires ? new Date(user.activeKeyExpires).toLocaleDateString('zh-CN') : ''
    ])

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `用户列表_${new Date().toLocaleDateString('zh-CN')}.csv`
    link.click()
  }

  // 初始化加载
  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // 处理详情查看
  const handleViewDetail = async (userId: string) => {
    await fetchUserDetail(userId)
    setDetailModalOpen(true)
  }

  // 刷新详情数据
  const handleRefreshDetail = useCallback(async () => {
    if (selectedUserDetail?.id) {
      await fetchUserDetail(selectedUserDetail.id)
    }
  }, [selectedUserDetail])

  // 渲染密钥单元格
  const renderKeyCell = (user: User) => {
    if (!user.activeKey || user.activeKey === '无') {
      return (
        <div className="flex items-center text-gray-500">
          <Key className="w-3 h-3 mr-1" />
          <span className="text-sm">无</span>
        </div>
      )
    }
    
    if (user.activeKey === '需查看详情') {
      return (
        <div className="text-center">
          <span className="text-blue-400 text-sm">{user.activeKey}</span>
          {user.accessKeyId && (
            <p className="text-gray-600 text-xs mt-1">
              密钥ID: {user.accessKeyId}
            </p>
          )}
        </div>
      )
    }
    
    return (
      <div className="space-y-1">
        <div className="flex items-center">
          <Key className="w-3 h-3 mr-1 text-amber-400" />
          <code className="text-xs bg-amber-500/10 text-amber-400 px-2 py-1 rounded font-mono truncate max-w-[120px]">
            {user.activeKey}
          </code>
        </div>
        {user.activeKeyUsedAt && (
          <p className="text-gray-500 text-xs">
            使用: {new Date(user.activeKeyUsedAt).toLocaleDateString('zh-CN')}
          </p>
        )}
        {user.activeKeyExpires && (
          <p className="text-gray-500 text-xs">
            过期: {new Date(user.activeKeyExpires).toLocaleDateString('zh-CN')}
          </p>
        )}
        {user.accessKeyId && (
          <p className="text-gray-600 text-xs">
            ID: {user.accessKeyId}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 p-4 md:p-6">
      {/* 页面标题与操作区 */}
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center">
              <Users className="w-6 h-6 md:w-7 md:h-7 mr-2 text-blue-400" />
              用户管理
            </h1>
            <p className="text-gray-400 mt-2">
              共 {totalCount} 个用户，{selectedUsers.length} 个已选择
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-2 md:px-4 md:py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 flex items-center"
              disabled={users.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              导出CSV
            </button>
            
            {selectedUsers.length > 0 && (
              <div className="relative">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBatchAction('disable')}
                    className="px-3 py-2 md:px-4 md:py-2 bg-gradient-to-r from-red-600 to-pink-600 hover:opacity-90 rounded-lg text-sm text-white whitespace-nowrap"
                    disabled={batchActionLoading}
                  >
                    {batchActionLoading ? '处理中...' : `批量禁用 (${selectedUsers.length})`}
                  </button>
                  <button
                    onClick={() => setShowBatchMenu(!showBatchMenu)}
                    className="px-3 py-2 md:px-4 md:py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 flex items-center"
                    disabled={batchActionLoading}
                  >
                    <MoreVertical className="w-4 h-4 mr-2" />
                    更多操作
                    <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showBatchMenu ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                
                {/* 批量操作菜单 */}
                {showBatchMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
                    <button
                      onClick={() => handleBatchAction('enable')}
                      className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 border-b border-gray-700 first:rounded-t-lg flex items-center"
                      disabled={batchActionLoading}
                    >
                      <Shield className="w-4 h-4 mr-2 text-green-400" />
                      批量启用会员
                    </button>
                    <button
                      onClick={() => handleBatchAction('delete')}
                      className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 last:rounded-b-lg flex items-center"
                      disabled={batchActionLoading}
                    >
                      <Users className="w-4 h-4 mr-2 text-red-400" />
                      批量删除账户
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* 搜索与筛选栏 */}
        <div className="flex flex-col md:flex-row gap-3 mt-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="搜索用户ID、邮箱或昵称（支持模糊匹配）..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {[
              { value: 'all', label: '全部用户' },
              { value: 'premium', label: '会员用户' },
              { value: 'free', label: '免费用户' },
              { value: 'active24h', label: '24h活跃' },
              { value: 'expired', label: '已过期' }
            ].map((item) => (
              <button
                key={item.value}
                className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap ${
                  filter === item.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
                onClick={() => {
                  setFilter(item.value)
                  setCurrentPage(1)
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
          <p className="text-sm text-gray-400">总用户数</p>
          <p className="text-xl md:text-2xl font-bold text-white mt-1">{totalCount}</p>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
          <p className="text-sm text-gray-400">会员用户</p>
          <p className="text-xl md:text-2xl font-bold text-white mt-1">
            {users.filter(u => u.isPremium).length}
          </p>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
          <p className="text-sm text-gray-400">24h活跃</p>
          <p className="text-xl md:text-2xl font-bold text-white mt-1">
            {users.filter(u => u.lastLoginRaw && 
              new Date(u.lastLoginRaw) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length}
          </p>
        </div>
        {/* 增长趋势图表 */}
        <div className="col-span-2">
          <GrowthChart />
        </div>
      </div>

      {/* 用户表格 */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-700/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">用户列表</h2>
            {totalPages > 1 && (
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-gray-800 rounded text-sm disabled:opacity-50 hover:bg-gray-700"
                >
                  上一页
                </button>
                <span className="text-gray-400 text-sm">
                  第 {currentPage} / {totalPages} 页
                </span>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-gray-800 rounded text-sm disabled:opacity-50 hover:bg-gray-700"
                >
                  下一页
                </button>
              </div>
            )}
          </div>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-400 mt-4">加载用户列表中...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">未找到匹配的用户</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="text-left py-3 px-4 md:px-6">
                    <input 
                      type="checkbox" 
                      checked={selectedUsers.length === users.length && users.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers(users.map(u => u.id))
                        } else {
                          setSelectedUsers([])
                        }
                      }}
                      className="rounded border-gray-600"
                    />
                  </th>
                  <th className="text-left py-3 px-4 md:px-6 text-gray-400 font-medium text-sm">用户ID</th>
                  <th className="text-left py-3 px-4 md:px-6 text-gray-400 font-medium text-sm">邮箱/昵称</th>
                  <th className="text-left py-3 px-4 md:px-6 text-gray-400 font-medium text-sm">当前密钥</th>
                  <th className="text-left py-3 px-4 md:px-6 text-gray-400 font-medium text-sm">会员状态</th>
                  <th className="text-left py-3 px-4 md:px-6 text-gray-400 font-medium text-sm">最后登录</th>
                  <th className="text-left py-3 px-4 md:px-6 text-gray-400 font-medium text-sm">注册时间</th>
                  <th className="text-left py-3 px-4 md:px-6 text-gray-400 font-medium text-sm">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-700/30 hover:bg-gray-800/30">
                    <td className="py-3 px-4 md:px-6">
                      <input 
                        type="checkbox" 
                        checked={selectedUsers.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers(prev => [...prev, user.id])
                          } else {
                            setSelectedUsers(prev => prev.filter(id => id !== user.id))
                          }
                        }}
                        className="rounded border-gray-600"
                      />
                    </td>
                    <td className="py-3 px-4 md:px-6">
                      <code className="text-xs bg-gray-900 px-2 py-1 rounded font-mono">
                        {user.id.substring(0, 8)}...
                      </code>
                    </td>
                    <td className="py-3 px-4 md:px-6">
                      <div className="flex items-center">
                        {user.avatarUrl ? (
                          <img 
                            src={user.avatarUrl} 
                            alt={user.nickname || user.email}
                            className="w-8 h-8 rounded-full mr-3"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
                            <span className="text-white font-semibold text-sm">
                              {(user.nickname || user.email).charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="text-white text-sm font-medium truncate max-w-[180px]">
                            {user.nickname || '无昵称'}
                            {user.isAdmin && ' 👑'}
                          </p>
                          <p className="text-gray-500 text-xs truncate max-w-[180px] flex items-center">
                            <Mail className="w-3 h-3 mr-1" />
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 md:px-6">
                      {renderKeyCell(user)}
                    </td>
                    <td className="py-3 px-4 md:px-6">
                      <div>
                        <span className={`px-2 py-1 rounded text-xs ${
                          user.isPremium 
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' 
                            : 'bg-gray-700 text-gray-300'
                        }`}>
                          {user.isPremium ? '会员中' : '免费用户'}
                        </span>
                        {user.accountExpires && (
                          <p className="text-gray-500 text-xs mt-1">
                            到期: {new Date(user.accountExpires).toLocaleDateString('zh-CN')}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 md:px-6 text-gray-300 text-sm">
                      {user.lastLogin}
                    </td>
                    <td className="py-3 px-4 md:px-6 text-gray-300 text-sm">
                      {user.createdAt}
                    </td>
                    <td className="py-3 px-4 md:px-6">
                      <button 
                        onClick={() => handleViewDetail(user.id)}
                        className="text-blue-400 hover:text-blue-300 text-sm hover:underline px-2 py-1 rounded hover:bg-gray-800"
                      >
                        查看详情
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* 用户详情弹窗 */}
      <UserDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        userDetail={selectedUserDetail}
        loading={detailLoading}
        onRefresh={handleRefreshDetail}
      />
    </div>
  )
}
