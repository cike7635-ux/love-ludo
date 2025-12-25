'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function TestDBPage() {
  const [testResults, setTestResults] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string, type: 'info' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [`[${timestamp}] ${type === 'error' ? '❌' : 'ℹ️'} ${message}`, ...prev.slice(0, 9)])
  }

  const testDatabaseConnection = async () => {
    setLoading(true)
    setLogs([])
    
    try {
      addLog('开始数据库连接测试...')
      
      const supabase = createClient()
      
      // 测试1: 查询 profiles 表
      addLog('测试1: 查询 profiles 表...')
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('count(*)')
        .single()
      
      addLog(`profiles表: ${profiles?.count || 0} 条记录`)
      
      // 测试2: 查询 access_keys 表
      addLog('测试2: 查询 access_keys 表...')
      const { data: keys, error: keysError } = await supabase
        .from('access_keys')
        .select('count(*)')
        .single()
      
      addLog(`access_keys表: ${keys?.count || 0} 条记录`)
      
      // 收集结果
      setTestResults({
        profiles: {
          success: !profilesError,
          count: profiles?.count || 0,
          error: profilesError?.message
        },
        accessKeys: {
          success: !keysError,
          count: keys?.count || 0,
          error: keysError?.message
        }
      })
      
      addLog('测试完成')
      
    } catch (err: any) {
      addLog(`测试异常: ${err.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    testDatabaseConnection()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
            <span className="text-white font-bold">DB</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">数据库连接测试</h1>
            <p className="text-gray-400 mt-2">极简版本 - 测试数据库连接状态</p>
          </div>
        </div>
        
        <button
          onClick={testDatabaseConnection}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
          disabled={loading}
        >
          {loading ? '测试中...' : '重新测试'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：测试结果 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 连接状态卡片 */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">连接状态</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg ${testResults.profiles?.success ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
                <div className="text-center">
                  <div className="text-2xl font-bold mb-2 text-white">
                    {testResults.profiles?.count || 0}
                  </div>
                  <div className="text-gray-300">profiles 表</div>
                  {testResults.profiles?.error && (
                    <div className="text-red-400 text-sm mt-2">{testResults.profiles.error}</div>
                  )}
                </div>
              </div>
              
              <div className={`p-4 rounded-lg ${testResults.accessKeys?.success ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
                <div className="text-center">
                  <div className="text-2xl font-bold mb-2 text-white">
                    {testResults.accessKeys?.count || 0}
                  </div>
                  <div className="text-gray-300">access_keys 表</div>
                  {testResults.accessKeys?.error && (
                    <div className="text-red-400 text-sm mt-2">{testResults.accessKeys.error}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 环境变量检查 */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">环境变量状态</h3>
            
            <div className="space-y-2">
              <div className={`p-3 rounded ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Supabase URL</span>
                  <span className={process.env.NEXT_PUBLIC_SUPABASE_URL ? 'text-green-400' : 'text-red-400'}>
                    {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ 已设置' : '✗ 未设置'}
                  </span>
                </div>
                {process.env.NEXT_PUBLIC_SUPABASE_URL && (
                  <div className="text-gray-500 text-xs mt-1 truncate">
                    {process.env.NEXT_PUBLIC_SUPABASE_URL}
                  </div>
                )}
              </div>
              
              <div className={`p-3 rounded ${process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Publishable Key</span>
                  <span className={process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? 'text-green-400' : 'text-red-400'}>
                    {process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? '✓ 已设置' : '✗ 未设置'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：日志 */}
        <div className="space-y-6">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">测试日志</h3>
            
            <div className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-gray-500 text-center py-8">暂无日志记录</div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log, index) => (
                    <div
                      key={index}
                      className={`text-sm ${log.includes('❌') ? 'text-red-400' : 'text-gray-300'}`}
                    >
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 底部诊断信息 */}
      <div className="mt-6 bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">诊断信息</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-900/20 rounded-lg">
            <h4 className="font-medium text-white mb-2">Supabase 连接</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '有效' : '无效'}</li>
              <li>• Key: {process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? '已设置' : '未设置'}</li>
              <li>• 状态: {testResults.profiles?.success ? '连接正常' : '连接异常'}</li>
            </ul>
          </div>
          
          <div className="p-4 bg-purple-900/20 rounded-lg">
            <h4 className="font-medium text-white mb-2">数据统计</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• 用户数量: {testResults.profiles?.count || 0}</li>
              <li>• 密钥数量: {testResults.accessKeys?.count || 0}</li>
              <li>• 测试时间: {new Date().toLocaleString()}</li>
            </ul>
          </div>
          
          <div className="p-4 bg-green-900/20 rounded-lg">
            <h4 className="font-medium text-white mb-2">建议操作</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• 检查 Supabase 项目状态</li>
              <li>• 验证表结构是否完整</li>
              <li>• 确保 RLS 策略正确</li>
              <li>• 查看浏览器控制台错误</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
