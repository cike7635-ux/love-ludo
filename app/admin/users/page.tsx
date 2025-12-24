// /app/admin/users/page.tsx - 完整修复版
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, Mail, Calendar, Shield, Search, Filter, Download, MoreVertical, Key, Brain, Gamepad2 } from 'lucide-react'
import UserDetailModal from './components/user-detail-modal'
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

      // 7. 转换数据格式 - 🔥 使用下划线命名
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

        return {
          id: profile.id,
          email: profile.email,
          nickname: profile.nickname,
          full_name: profile.full_name,  // 🔥 下划线
          avatar_url: profile.avatar_url,  // 🔥 下划线
          bio: profile.bio,
          preferences: profile.preferences,
          isAdmin: profile.email === '2200691917@qq.com', // 您的管理员邮箱
          isPremium: isPremium,
          lastLogin: lastLogin,
          lastLoginRaw: profile.last_login_at,  // 🔥 下划线
          accountExpires: profile.account_expires_at,  // 🔥 下划线
          createdAt: createdAt,
          createdAtRaw: profile.created_at,  // 🔥 下划线
          access_key_id: profile.access_key_id,  // 🔥 下划线
          // 列表查询不返回密钥数据，所以显示"需查看详情"
          activeKey: '需查看详情',
          activeKeyUsedAt: null,
          activeKeyExpires: null,
          isActive: true,
          // 🔥 添加其他下划线字段
          last_login_session: profile.last_login_session,
          updated_at: profile.updated_at
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

  // 🔥 修复：获取用户详情 - 完整修复版
  const fetchUserDetail = async (userId: string) => {
    console.log('🔍 开始获取用户详情:', userId)
    setDetailLoading(true)
    setSelectedUserDetail(null) // 先清空旧数据
    
    try {
      const response = await fetch(`/api/admin/data?table=profiles&detailId=${userId}`, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API响应失败:', response.status, errorText)
        throw new Error(`获取详情失败: ${response.status}`)
      }

      const result = await response.json()
      
      console.log('📦 API返回详情结果:', {
        成功: result.success,
        错误信息: result.error,
        数据结构: result.data ? Object.keys(result.data) : '无数据',
        密钥字段存在: result.data && 'access_keys' in result.data,
        密钥长度: result.data?.access_keys?.length || 0,
        AI字段存在: result.data && 'ai_usage_records' in result.data,
        AI长度: result.data?.ai_usage_records?.length || 0,
        游戏字段存在: result.data && 'game_history' in result.data,
        游戏长度: result.data?.game_history?.length || 0
      })
      
      if (!result.success) {
        console.error('❌ API返回失败:', result.error)
        throw new Error(result.error || '未找到用户详情')
      }

      if (!result.data) {
        console.error('❌ API返回的data为空')
        throw new Error('用户详情数据为空')
      }

      // 🔥 直接构建 UserDetail 对象（使用下划线命名）
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
        game_history: result.data.game_history || [],
        // 可选字段
        key_usage_history: result.data.key_usage_history || [],
        current_access_key: result.data.current_access_key || null
      }

      console.log('✅ 构建的用户详情对象:', {
        id: userDetail.id,
        email: userDetail.email,
        access_keys长度: userDetail.access_keys.length,
        ai_usage_records长度: userDetail.ai_usage_records.length,
        game_history长度: userDetail.game_history.length,
        日期字段: {
          account_expires_at: userDetail.account_expires_at,
          last_login_at: userDetail.last_login_at,
          created_at: userDetail.created_at
        }
      })

      setSelectedUserDetail(userDetail)

    } catch (error: any) {
      console.error('❌ 获取用户详情失败:', error.message)
      console.error('错误堆栈:', error.stack)
      setSelectedUserDetail(null)
      
      // 显示友好的错误提示（可选）
      if (process.env.NODE_ENV === 'development') {
        alert(`获取用户详情失败: ${error.message}\n请查看控制台日志获取详细信息。`)
      }
    } finally {
      setDetailLoading(false)
    }
  }

  // 批量禁用用户（暂时简化）
  const handleBatchDisable = async () => {
    if (!selectedUsers.length || !confirm(`确定要禁用这 ${selectedUsers.length} 个账户吗？`)) return
    alert('批量禁用功能正在开发中，请稍后使用')
  }

  // CSV导出
  const handleExportCSV = () => {
    const headers = ['ID', '邮箱', '昵称', '会员状态', '最后登录', '注册时间', '当前密钥', '密钥使用时间']
    const csvData = users.map(user => [
      user.id,
      user.email,
      user.nickname || '',
      user.isPremium ? '会员中' : '免费',
      user.lastLogin,
      user.createdAt,
      user.activeKey || '需查看详情',
      user.activeKeyUsedAt ? new Date(user.activeKeyUsedAt).toLocaleString('zh-CN') : ''
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
    console.log('👀 查看用户详情:', userId)
    await fetchUserDetail(userId)
    setDetailModalOpen(true)
  }

  // 🔥 刷新详情数据
  const handleRefreshDetail = useCallback(async () => {
    if (selectedUserDetail?.id) {
      console.log('🔄 刷新用户详情:', selectedUserDetail.id)
      await fetchUserDetail(selectedUserDetail.id)
    }
  }, [selectedUserDetail])

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
            >
              <Download className="w-4 h-4 mr-2" />
              导出CSV
            </button>
            {selectedUsers.length > 0 && (
              <button
                onClick={handleBatchDisable}
                className="px-3 py-2 md:px-4 md:py-2 bg-gradient-to-r from-red-600 to-pink-600 hover:opacity-90 rounded-lg text-sm text-white whitespace-nowrap"
              >
                批量禁用 ({selectedUsers.length})
              </button>
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
        <div className="col-span-2 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
          <p className="text-sm text-gray-400">用户增长趋势（最近7天）</p>
          <p className="text-xs text-blue-400 mt-1 cursor-pointer hover:underline">
            点击查看详细图表 →
          </p>
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
                  className="px-3 py-1 bg-gray-800 rounded text-sm disabled:opacity-50"
                >
                  上一页
                </button>
                <span className="text-gray-400 text-sm">
                  第 {currentPage} / {totalPages} 页
                </span>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-gray-800 rounded text-sm disabled:opacity-50"
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
                      />
                    </td>
                    <td className="py-3 px-4 md:px-6">
                      <code className="text-xs bg-gray-900 px-2 py-1 rounded font-mono">
                        {user.id.substring(0, 8)}...
                      </code>
                    </td>
                    <td className="py-3 px-4 md:px-6">
                      <div className="flex items-center">
                        {user.avatar_url ? (
                          <img 
                            src={user.avatar_url} 
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
                      {/* 🔥 列表页面不显示具体密钥，提示用户查看详情 */}
                      <div className="text-center">
                        <span className="text-gray-500 text-sm">{user.activeKey}</span>
                        {user.access_key_id && (
                          <p className="text-gray-600 text-xs mt-1">
                            密钥ID: {user.access_key_id}
                          </p>
                        )}
                      </div>
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
                        className="text-blue-400 hover:text-blue-300 text-sm hover:underline"
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
