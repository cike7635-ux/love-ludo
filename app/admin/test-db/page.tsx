'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Database, CheckCircle, XCircle, RefreshCw, AlertTriangle,
  Key, Users, Clock, Server, Link, FileText, ArrowRight,
  Cpu, HardDrive, Network, Shield, Zap, Settings, Globe,
  Activity, AlertCircle, ChevronRight, Terminal, Wifi, 
  BarChart, Filter, Search, Download
} from 'lucide-react'

export default function DatabaseTestPage() {
  const [testResults, setTestResults] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [envVars, setEnvVars] = useState<Record<string, any>>({})
  const [tablesInfo, setTablesInfo] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'summary' | 'tables' | 'env' | 'actions'>('summary')
  const [testLogs, setTestLogs] = useState<string[]>([])

  // 添加测试日志
  const addLog = (message: string, type: 'info' | 'warning' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString('zh-CN', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    
    let icon = 'ℹ️'
    if (type === 'warning') icon = '⚠️'
    if (type === 'error') icon = '❌'
    
    setTestLogs(prev => [`[${timestamp}] ${icon} ${message}`, ...prev.slice(0, 49)])
  }

  // 检查环境变量
  useEffect(() => {
    const checkEnvVars = () => {
      const envs: Record<string, any> = {}
      
      // 关键环境变量
      const requiredVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'ADMIN_EMAILS',
        'NEXT_PUBLIC_ADMIN_KEY'
      ]
      
      requiredVars.forEach(variable => {
        const value = process.env[variable]
        envs[variable] = {
          value: value ? '✅ 已设置' : '❌ 未设置',
          length: value ? value.length : 0,
          preview: value ? `${value.substring(0, 15)}...` : '无',
          exists: !!value
        }
      })
      
      // 可选环境变量
      const optionalVars = [
        'NEXT_PUBLIC_SITE_URL',
        'NODE_ENV',
        'VERCEL_URL',
        'VERCEL_ENV'
      ]
      
      optionalVars.forEach(variable => {
        const value = process.env[variable]
        if (value) {
          envs[variable] = {
            value: '✅ 已设置',
            length: value.length,
            preview: value.substring(0, 20),
            exists: true
          }
        }
      })
      
      setEnvVars(envs)
      addLog('环境变量检查完成', 'info')
    }
    
    checkEnvVars()
  }, [])

  // 完整的数据库连接测试
  const runFullTest = async () => {
    setLoading(true)
    setTestLogs([])
    const supabase = createClient()
    const results: any = {}
    
    try {
      addLog('开始数据库连接测试...', 'info')

      // 🧪 测试1: 认证连接
      addLog('测试1: 认证连接检查...', 'info')
      const { data: authData, error: authError } = await supabase.auth.getSession()
      results.auth = {
        success: !authError,
        hasSession: !!authData?.session,
        sessionType: authData?.session ? '已认证' : '匿名',
        error: authError?.message,
        timestamp: new Date().toISOString()
      }
      
      if (authError) {
        addLog(`认证失败: ${authError.message}`, 'error')
      } else {
        addLog('✅ 认证连接成功', 'info')
      }

      // 🧪 测试2: 获取所有表
      addLog('测试2: 获取数据库表结构...', 'info')
      try {
        const { data: tablesData, error: tablesError } = await supabase
          .from('information_schema.tables')
          .select('table_name, table_type')
          .eq('table_schema', 'public')
          .order('table_name')

        results.tables = {
          success: !tablesError,
          count: tablesData?.length || 0,
          tables: tablesData || [],
          error: tablesError?.message
        }
        
        if (tablesData) {
          setTablesInfo(tablesData)
          addLog(`✅ 发现 ${tablesData.length} 个表`, 'info')
        } else if (tablesError) {
          addLog(`表查询失败: ${tablesError.message}`, 'error')
        }
      } catch (tablesErr: any) {
        results.tables = { success: false, error: tablesErr.message }
        addLog(`表查询异常: ${tablesErr.message}`, 'error')
      }

      // 🧪 测试3: profiles 表测试
      addLog('测试3: 查询 profiles 表...', 'info')
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, nickname, created_at')
        .limit(5)
        .order('created_at', { ascending: false })

      results.profiles = {
        success: !profilesError,
        count: profiles?.length || 0,
        sample: profiles || [],
        error: profilesError?.message,
        queryTime: new Date().toISOString()
      }
      
      if (profilesError) {
        addLog(`profiles表查询失败: ${profilesError.message}`, 'error')
      } else {
        addLog(`✅ profiles表: ${profiles?.length || 0} 条记录`, 'info')
      }

      // 🧪 测试4: access_keys 表测试
      addLog('测试4: 查询 access_keys 表...', 'info')
      const { data: keys, error: keysError } = await supabase
        .from('access_keys')
        .select('id, key_code, is_active, created_at')
        .limit(5)
        .order('created_at', { ascending: false })

      results.accessKeys = {
        success: !keysError,
        count: keys?.length || 0,
        sample: keys || [],
        error: keysError?.message,
        queryTime: new Date().toISOString()
      }
      
      if (keysError) {
        addLog(`access_keys表查询失败: ${keysError.message}`, 'error')
      } else {
        addLog(`✅ access_keys表: ${keys?.length || 0} 条记录`, 'info')
      }

      // 🧪 测试5: 插入测试数据
      addLog('测试5: 数据插入测试...', 'info')
      const testEmail = `test-${Date.now()}@love-ludo-test.com`
      const testData = {
        email: testEmail,
        nickname: '测试用户-' + Date.now().toString().slice(-6),
        preferences: { 
          gender: 'test',
          test: true,
          timestamp: Date.now()
        }
      }

      try {
        const { data: insertedData, error: insertError } = await supabase
          .from('profiles')
          .insert(testData)
          .select()

        results.insertTest = {
          success: !insertError,
          data: insertedData,
          insertedId: insertedData?.[0]?.id,
          error: insertError?.message,
          timestamp: new Date().toISOString()
        }
        
        if (insertError) {
          addLog(`❌ 数据插入失败: ${insertError.message}`, 'error')
        } else {
          addLog(`✅ 成功插入测试数据 (ID: ${insertedData?.[0]?.id})`, 'info')
        }
      } catch (insertErr: any) {
        results.insertTest = { success: false, error: insertErr.message }
        addLog(`❌ 插入操作异常: ${insertErr.message}`, 'error')
      }

      // 🧪 测试6: 删除测试数据
      if (results.insertTest?.success && results.insertTest?.insertedId) {
        addLog('测试6: 数据删除测试...', 'info')
        try {
          const { error: deleteError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', results.insertTest.insertedId)

          results.deleteTest = {
            success: !deleteError,
            error: deleteError?.message,
            deletedId: results.insertTest.insertedId,
            timestamp: new Date().toISOString()
          }
          
          if (deleteError) {
            addLog(`❌ 数据删除失败: ${deleteError.message}`, 'error')
          } else {
            addLog(`✅ 成功删除测试数据 (ID: ${results.insertTest.insertedId})`, 'info')
          }
        } catch (deleteErr: any) {
          results.deleteTest = { success: false, error: deleteErr.message }
          addLog(`❌ 删除操作异常: ${deleteErr.message}`, 'error')
        }
      }

      // 🧪 测试7: Service Role Key API 测试
      addLog('测试7: Service Role Key 测试...', 'info')
      try {
        const response = await fetch('/api/admin/test-data', {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache'
          },
          credentials: 'include'
        })
        
        const serviceRoleResult = await response.json()
        
        results.serviceRole = {
          success: response.ok,
          status: response.status,
          statusText: response.statusText,
          data: serviceRoleResult,
          error: serviceRoleResult.error,
          timestamp: new Date().toISOString()
        }
        
        if (response.ok) {
          addLog(`✅ Service Role Key 测试成功 (状态: ${response.status})`, 'info')
        } else {
          addLog(`❌ Service Role Key 测试失败 (状态: ${response.status})`, 'error')
        }
      } catch (serviceRoleError: any) {
        results.serviceRole = {
          success: false,
          error: serviceRoleError.message,
          timestamp: new Date().toISOString()
        }
        addLog(`❌ Service Role Key 请求异常: ${serviceRoleError.message}`, 'error')
      }

      // 🧪 测试8: 其他关键表测试
      addLog('测试8: 测试其他关键表...', 'info')
      const otherTables = ['themes', 'tasks', 'rooms', 'game_sessions', 'ai_usage_records']
      results.otherTables = {}
      
      for (const tableName of otherTables) {
        try {
          const { count, error } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true })
          
          results.otherTables[tableName] = {
            exists: !error,
            count: count || 0,
            error: error?.message
          }
          
          if (error) {
            addLog(`表 ${tableName}: 查询失败 - ${error.message}`, 'warning')
          } else {
            addLog(`表 ${tableName}: ${count || 0} 条记录`, 'info')
          }
        } catch (err: any) {
          results.otherTables[tableName] = { exists: false, error: err.message }
          addLog(`表 ${tableName}: 异常 - ${err.message}`, 'error')
        }
      }

      addLog('✅ 所有测试完成', 'info')

    } catch (error: any) {
      results.generalError = error.message
      addLog(`💥 测试过程中发生异常: ${error.message}`, 'error')
    }

    setTestResults(results)
    setLoading(false)
  }

  // 重新运行测试
  const rerunTests = () => {
    setLoading(true)
    setTimeout(() => {
      runFullTest()
    }, 100)
  }

  // 快速测试某个表
  const testSpecificTable = async (tableName: string) => {
    const supabase = createClient()
    addLog(`快速测试表: ${tableName}...`, 'info')
    
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(3)
      
      if (error) {
        addLog(`❌ 表 ${tableName} 查询失败: ${error.message}`, 'error')
      } else {
        addLog(`✅ 表 ${tableName}: ${data?.length || 0} 条记录`, 'info')
      }
    } catch (err: any) {
      addLog(`❌ 表 ${tableName} 异常: ${err.message}`, 'error')
    }
  }

  // 初始化运行测试
  useEffect(() => {
    runFullTest()
  }, [])

  // 计算总体状态
  const getOverallStatus = () => {
    if (!testResults.auth) return 'unknown'
    
    const criticalTests = [
      testResults.auth?.success,
      testResults.profiles?.success,
      testResults.insertTest?.success,
      testResults.serviceRole?.success
    ]
    
    if (criticalTests.every(test => test === true)) return 'healthy'
    if (criticalTests.some(test => test === false)) return 'critical'
    return 'warning'
  }

  const overallStatus = getOverallStatus()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center mb-8">
            <Database className="w-8 h-8 text-blue-400 mr-3 animate-pulse" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">数据库深度诊断</h1>
              <p className="text-gray-400 mt-2">正在全面测试数据库连接...</p>
            </div>
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8">
            <div className="flex flex-col items-center justify-center">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Database className="w-8 h-8 text-blue-400" />
                </div>
              </div>
              <p className="text-gray-300 mt-4">正在运行全面的数据库测试...</p>
              <p className="text-gray-500 text-sm mt-2">这可能需要一些时间</p>
              
              <div className="mt-6 w-full max-w-md">
                <div className="flex justify-between text-xs text-gray-400 mb-2">
                  <span>连接测试</span>
                  <span>表结构检查</span>
                  <span>数据操作</span>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse"
                    style={{ width: '70%' }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题和状态 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center">
            <Database className="w-8 h-8 text-blue-400 mr-3" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">数据库深度诊断</h1>
              <p className="text-gray-400 mt-2">全面测试数据库连接、权限和操作</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className={`px-4 py-2 rounded-lg flex items-center ${
              overallStatus === 'healthy' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
              overallStatus === 'warning' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
              'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                overallStatus === 'healthy' ? 'bg-green-400 animate-pulse' :
                overallStatus === 'warning' ? 'bg-amber-400 animate-pulse' :
                'bg-red-400 animate-pulse'
              }`}></div>
              {overallStatus === 'healthy' ? '状态健康' :
               overallStatus === 'warning' ? '部分异常' : '严重问题'}
            </div>
            
            <button
              onClick={rerunTests}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 rounded-lg text-white flex items-center"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              重新测试
            </button>
          </div>
        </div>

        {/* 选项卡导航 */}
        <div className="mb-6">
          <div className="flex space-x-1 border-b border-gray-700">
            {[
              { id: 'summary', label: '测试概览', icon: BarChart },
              { id: 'tables', label: '表结构', icon: HardDrive },
              { id: 'env', label: '环境变量', icon: Settings },
              { id: 'actions', label: '操作日志', icon: Terminal }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 flex items-center text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-white'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：摘要信息 */}
          <div className="lg:col-span-2">
            {activeTab === 'summary' && (
              <div className="space-y-6">
                {/* 连接状态卡片 */}
                <div className={`p-6 rounded-xl border ${
                  testResults.auth?.success
                    ? 'bg-green-900/20 border-green-700/50'
                    : 'bg-red-900/20 border-red-700/50'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      {testResults.auth?.success ? (
                        <CheckCircle className="w-6 h-6 text-green-400 mr-3" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-400 mr-3" />
                      )}
                      <div>
                        <h3 className="text-lg font-semibold text-white">数据库连接状态</h3>
                        <p className="text-gray-400 text-sm">
                          {testResults.auth?.success ? '连接成功' : '连接失败'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Network className="w-5 h-5 text-gray-400" />
                      <span className="text-sm text-gray-400">实时</span>
                    </div>
                  </div>
                  
                  {testResults.auth?.success ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-gray-900/50 rounded-lg">
                          <p className="text-gray-400 text-xs">认证状态</p>
                          <p className="text-green-400 text-sm mt-1">已连接</p>
                        </div>
                        <div className="p-3 bg-gray-900/50 rounded-lg">
                          <p className="text-gray-400 text-xs">会话类型</p>
                          <p className="text-blue-400 text-sm mt-1">{testResults.auth.sessionType}</p>
                        </div>
                      </div>
                      <p className="text-green-400 text-sm flex items-center">
                        <Link className="w-4 h-4 mr-2" />
                        数据库连接正常，可以进行数据操作
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-red-400 mb-3">无法连接到数据库</p>
                      <pre className="text-sm bg-gray-900 p-3 rounded overflow-auto text-red-300">
                        {testResults.auth?.error || '未知错误'}
                      </pre>
                    </div>
                  )}
                </div>

                {/* 表统计卡片 */}
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <HardDrive className="w-6 h-6 text-blue-400 mr-3" />
                      <div>
                        <h3 className="text-lg font-semibold text-white">数据库表统计</h3>
                        <p className="text-gray-400 text-sm">
                          共 {testResults.tables?.count || 0} 个表
                        </p>
                      </div>
                    </div>
                    <div className="text-gray-400 text-sm">
                      <FileText className="w-5 h-5 inline mr-1" />
                      PostgreSQL
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 核心表状态 */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-300">核心表状态</h4>
                      
                      <div className={`p-3 rounded-lg ${
                        testResults.profiles?.success ? 'bg-green-500/10' : 'bg-red-500/10'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="text-gray-300">profiles</span>
                          </div>
                          <div className="flex items-center">
                            <span className={`text-sm ${
                              testResults.profiles?.success ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {testResults.profiles?.count || 0} 条记录
                            </span>
                            {testResults.profiles?.success ? (
                              <CheckCircle className="w-4 h-4 text-green-400 ml-2" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-400 ml-2" />
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className={`p-3 rounded-lg ${
                        testResults.accessKeys?.success ? 'bg-green-500/10' : 'bg-red-500/10'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Key className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="text-gray-300">access_keys</span>
                          </div>
                          <div className="flex items-center">
                            <span className={`text-sm ${
                              testResults.accessKeys?.success ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {testResults.accessKeys?.count || 0} 条记录
                            </span>
                            {testResults.accessKeys?.success ? (
                              <CheckCircle className="w-4 h-4 text-green-400 ml-2" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-400 ml-2" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* 其他表状态 */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-300">其他表状态</h4>
                      {testResults.otherTables && Object.entries(testResults.otherTables).map(([tableName, tableInfo]: [string, any]) => (
                        <div key={tableName} className={`p-3 rounded-lg ${
                          tableInfo.exists ? 'bg-blue-500/10' : 'bg-gray-800/50'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <FileText className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="text-gray-300">{tableName}</span>
                            </div>
                            <div className="flex items-center">
                              <span className={`text-sm ${
                                tableInfo.exists ? 'text-blue-400' : 'text-gray-500'
                              }`}>
                                {tableInfo.exists ? `${tableInfo.count} 条` : '不存在'}
                              </span>
                              {tableInfo.error && (
                                <AlertCircle className="w-4 h-4 text-amber-400 ml-2" title={tableInfo.error} />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 操作测试结果 */}
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <Activity className="w-6 h-6 text-purple-400 mr-3" />
                      <div>
                        <h3 className="text-lg font-semibold text-white">操作测试结果</h3>
                        <p className="text-gray-400 text-sm">数据插入、删除和权限测试</p>
                      </div>
                    </div>
                    <div className="text-gray-400 text-sm">
                      <Zap className="w-5 h-5 inline mr-1" />
                      完整测试
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* 插入测试 */}
                    <div className={`p-4 rounded-lg ${
                      testResults.insertTest?.success ? 'bg-green-500/10 border border-green-500/30' :
                      testResults.insertTest ? 'bg-red-500/10 border border-red-500/30' :
                      'bg-gray-900/50'
                    }`}>
                      <div className="flex items-center mb-2">
                        <Plus className="w-5 h-5 mr-2 text-gray-400" />
                        <span className="text-gray-300 text-sm">数据插入测试</span>
                      </div>
                      {testResults.insertTest ? (
                        testResults.insertTest.success ? (
                          <div>
                            <p className="text-green-400 text-sm">✅ 插入成功</p>
                            <p className="text-gray-500 text-xs mt-1">
                              ID: {testResults.insertTest.insertedId?.substring(0, 8)}...
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-red-400 text-sm">❌ 插入失败</p>
                            <p className="text-gray-500 text-xs mt-1 truncate">
                              {testResults.insertTest.error}
                            </p>
                          </div>
                        )
                      ) : (
                        <p className="text-gray-500 text-sm">未执行</p>
                      )}
                    </div>
                    
                    {/* 删除测试 */}
                    <div className={`p-4 rounded-lg ${
                      testResults.deleteTest?.success ? 'bg-green-500/10 border border-green-500/30' :
                      testResults.deleteTest ? 'bg-red-500/10 border border-red-500/30' :
                      'bg-gray-900/50'
                    }`}>
                      <div className="flex items-center mb-2">
                        <Trash2 className="w-5 h-5 mr-2 text-gray-400" />
                        <span className="text-gray-300 text-sm">数据删除测试</span>
                      </div>
                      {testResults.deleteTest ? (
                        testResults.deleteTest.success ? (
                          <div>
                            <p className="text-green-400 text-sm">✅ 删除成功</p>
                            <p className="text-gray-500 text-xs mt-1">
                              已清理测试数据
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-red-400 text-sm">❌ 删除失败</p>
                            <p className="text-gray-500 text-xs mt-1 truncate">
                              {testResults.deleteTest.error}
                            </p>
                          </div>
                        )
                      ) : testResults.insertTest?.success ? (
                        <p className="text-gray-500 text-sm">无需删除</p>
                      ) : (
                        <p className="text-gray-500 text-sm">未执行</p>
                      )}
                    </div>
                    
                    {/* Service Role 测试 */}
                    <div className={`p-4 rounded-lg ${
                      testResults.serviceRole?.success ? 'bg-green-500/10 border border-green-500/30' :
                      testResults.serviceRole ? 'bg-red-500/10 border border-red-500/30' :
                      'bg-gray-900/50'
                    }`}>
                      <div className="flex items-center mb-2">
                        <Shield className="w-5 h-5 mr-2 text-gray-400" />
                        <span className="text-gray-300 text-sm">Service Role 测试</span>
                      </div>
                      {testResults.serviceRole ? (
                        testResults.serviceRole.success ? (
                          <div>
                            <p className="text-green-400 text-sm">✅ 测试成功</p>
                            <p className="text-gray-500 text-xs mt-1">
                              状态: {testResults.serviceRole.status}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-red-400 text-sm">❌ 测试失败</p>
                            <p className="text-gray-500 text-xs mt-1 truncate">
                              错误: {testResults.serviceRole.error}
                            </p>
                          </div>
                        )
                      ) : (
                        <p className="text-gray-500 text-sm">未执行</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tables' && (
              <div className="space-y-6">
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <HardDrive className="w-6 h-6 text-blue-400 mr-3" />
                      <div>
                        <h3 className="text-lg font-semibold text-white">数据库表详情</h3>
                        <p className="text-gray-400 text-sm">
                          共 {tablesInfo.length} 个表
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="搜索表名..."
                        className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500"
                      />
                      <button className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300">
                        <Search className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-700/50">
                          <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">表名</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">类型</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tablesInfo.map((table: any, index: number) => {
                          const isCoreTable = ['profiles', 'access_keys', 'themes', 'tasks', 'rooms'].includes(table.table_name)
                          return (
                            <tr key={index} className="border-b border-gray-700/30 hover:bg-gray-800/30">
                              <td className="py-3 px-4">
                                <div className="flex items-center">
                                  {isCoreTable ? (
                                    <FileText className="w-4 h-4 text-blue-400 mr-2" />
                                  ) : (
                                    <FileText className="w-4 h-4 text-gray-400 mr-2" />
                                  )}
                                  <code className={`font-mono text-sm ${
                                    isCoreTable ? 'text-blue-300' : 'text-gray-300'
                                  }`}>
                                    {table.table_name}
                                  </code>
                                  {isCoreTable && (
                                    <span className="ml-2 px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                                      核心表
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="text-gray-400 text-sm">
                                  {table.table_type === 'BASE TABLE' ? '数据表' : '视图'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <button
                                  onClick={() => testSpecificTable(table.table_name)}
                                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300"
                                >
                                  快速测试
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* 核心表数据预览 */}
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">核心表数据预览</h3>
                  
                  <div className="space-y-6">
                    {/* profiles 表数据 */}
                    {testResults.profiles?.sample?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center">
                          <Users className="w-4 h-4 mr-2" />
                          profiles 表 (最近5条)
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-700/50">
                                <th className="text-left py-2 px-3 text-gray-400 font-medium text-xs">ID</th>
                                <th className="text-left py-2 px-3 text-gray-400 font-medium text-xs">邮箱</th>
                                <th className="text-left py-2 px-3 text-gray-400 font-medium text-xs">昵称</th>
                                <th className="text-left py-2 px-3 text-gray-400 font-medium text-xs">创建时间</th>
                              </tr>
                            </thead>
                            <tbody>
                              {testResults.profiles.sample.map((profile: any, idx: number) => (
                                <tr key={idx} className="border-b border-gray-700/30">
                                  <td className="py-2 px-3">
                                    <code className="text-xs text-gray-400">{profile.id.substring(0, 8)}...</code>
                                  </td>
                                  <td className="py-2 px-3 text-gray-300 text-xs truncate max-w-[120px]">
                                    {profile.email}
                                  </td>
                                  <td className="py-2 px-3 text-gray-400 text-xs">
                                    {profile.nickname || '-'}
                                  </td>
                                  <td className="py-2 px-3 text-gray-500 text-xs">
                                    {new Date(profile.created_at).toLocaleDateString('zh-CN')}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    
                    {/* access_keys 表数据 */}
                    {testResults.accessKeys?.sample?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center">
                          <Key className="w-4 h-4 mr-2" />
                          access_keys 表 (最近5条)
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-700/50">
                                <th className="text-left py-2 px-3 text-gray-400 font-medium text-xs">ID</th>
                                <th className="text-left py-2 px-3 text-gray-400 font-medium text-xs">密钥代码</th>
                                <th className="text-left py-2 px-3 text-gray-400 font-medium text-xs">状态</th>
                                <th className="text-left py-2 px-3 text-gray-400 font-medium text-xs">创建时间</th>
                              </tr>
                            </thead>
                            <tbody>
                              {testResults.accessKeys.sample.map((key: any, idx: number) => (
                                <tr key={idx} className="border-b border-gray-700/30">
                                  <td className="py-2 px-3">
                                    <code className="text-xs text-gray-400">{key.id}</code>
                                  </td>
                                  <td className="py-2 px-3">
                                    <code className="text-xs text-gray-300 font-mono">
                                      {key.key_code || `ID: ${key.id}`}
                                    </code>
                                  </td>
                                  <td className="py-2 px-3">
                                    <span className={`px-2 py-0.5 text-xs rounded ${
                                      key.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                    }`}>
                                      {key.is_active ? '激活' : '禁用'}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-gray-500 text-xs">
                                    {new Date(key.created_at).toLocaleDateString('zh-CN')}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'env' && (
              <div className="space-y-6">
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <Settings className="w-6 h-6 text-green-400 mr-3" />
                      <div>
                        <h3 className="text-lg font-semibold text-white">环境变量配置</h3>
                        <p className="text-gray-400 text-sm">检查所有必要的环境变量</p>
                      </div>
                    </div>
                    <div className="text-gray-400 text-sm">
                      <Globe className="w-5 h-5 inline mr-1" />
                      Vercel 环境
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {/* 必需环境变量 */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-2">必需环境变量</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(envVars)
                          .filter(([key]) => ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'ADMIN_EMAILS', 'NEXT_PUBLIC_ADMIN_KEY'].includes(key))
                          .map(([key, info]: [string, any]) => (
                            <div key={key} className={`p-3 rounded-lg border ${
                              info.exists ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
                            }`}>
                              <div className="flex items-center justify-between mb-1">
                                <code className="text-sm text-gray-300 font-mono">{key}</code>
                                <span className={`text-xs ${info.exists ? 'text-green-400' : 'text-red-400'}`}>
                                  {info.exists ? '✅ 正常' : '❌ 缺失'}
                                </span>
                              </div>
                              <div className="text-gray-400 text-xs">
                                长度: {info.length} 字符
                              </div>
                              <div className="text-gray-500 text-xs mt-1 truncate">
                                值: {info.preview}
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                    
                    {/* 可选环境变量 */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-2">可选环境变量</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(envVars)
                          .filter(([key]) => !['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'ADMIN_EMAILS', 'NEXT_PUBLIC_ADMIN_KEY'].includes(key))
                          .map(([key, info]: [string, any]) => (
                            <div key={key} className="p-3 bg-gray-900/50 rounded-lg border border-gray-700/50">
                              <div className="flex items-center justify-between mb-1">
                                <code className="text-sm text-gray-300 font-mono">{key}</code>
                                <span className="text-xs text-blue-400">可选</span>
                              </div>
                              <div className="text-gray-400 text-xs">
                                长度: {info.length} 字符
                              </div>
                              <div className="text-gray-500 text-xs mt-1 truncate">
                                值: {info.preview}
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'actions' && (
              <div className="space-y-6">
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <Terminal className="w-6 h-6 text-amber-400 mr-3" />
                      <div>
                        <h3 className="text-lg font-semibold text-white">测试操作日志</h3>
                        <p className="text-gray-400 text-sm">实时记录所有测试操作</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setTestLogs([])}
                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300"
                      >
                        清空日志
                      </button>
                      <button
                        onClick={() => {
                          const logsText = testLogs.join('\n')
                          navigator.clipboard.writeText(logsText)
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:opacity-90 rounded-lg text-sm text-white"
                      >
                        复制日志
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-gray-900 rounded-lg p-4 h-[400px] overflow-y-auto font-mono">
                    {testLogs.length === 0 ? (
                      <div className="text-gray-500 text-center py-8">
                        <Terminal className="w-8 h-8 mx-auto mb-2" />
                        <p>暂无日志记录</p>
                        <p className="text-sm mt-1">运行测试后将显示详细日志</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {testLogs.map((log, index) => {
                          const isError = log.includes('❌')
                          const isWarning = log.includes('⚠️')
                          return (
                            <div
                              key={index}
                              className={`text-sm ${
                                isError ? 'text-red-400' :
                                isWarning ? 'text-amber-400' :
                                'text-gray-300'
                              }`}
                            >
                              {log}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 右侧：状态面板和操作 */}
          <div className="space-y-6">
            {/* 状态概览 */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">测试状态概览</h3>
              
              <div className="space-y-4">
                {[
                  { 
                    label: '数据库连接', 
                    status: testResults.auth?.success ? 'success' : 'error',
                    icon: Wifi,
                    description: testResults.auth?.success ? '连接正常' : '连接失败'
                  },
                  { 
                    label: '表结构检查', 
                    status: testResults.tables?.success ? 'success' : 'warning',
                    icon: HardDrive,
                    description: testResults.tables?.success ? `${testResults.tables.count} 个表` : '表查询失败'
                  },
                  { 
                    label: '数据操作', 
                    status: testResults.insertTest?.success ? 'success' : testResults.insertTest ? 'error' : 'pending',
                    icon: Activity,
                    description: testResults.insertTest?.success ? '读写正常' : '操作失败'
                  },
                  { 
                    label: '权限验证', 
                    status: testResults.serviceRole?.success ? 'success' : testResults.serviceRole ? 'error' : 'pending',
                    icon: Shield,
                    description: testResults.serviceRole?.success ? '权限正常' : '权限异常'
                  }
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <item.icon className={`w-5 h-5 mr-3 ${
                        item.status === 'success' ? 'text-green-400' :
                        item.status === 'error' ? 'text-red-400' :
                        item.status === 'warning' ? 'text-amber-400' : 'text-gray-400'
                      }`} />
                      <div>
                        <p className="text-gray-300 text-sm">{item.label}</p>
                        <p className="text-gray-500 text-xs">{item.description}</p>
                      </div>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${
                      item.status === 'success' ? 'bg-green-400 animate-pulse' :
                      item.status === 'error' ? 'bg-red-400' :
                      item.status === 'warning' ? 'bg-amber-400' : 'bg-gray-500'
                    }`}></div>
                  </div>
                ))}
              </div>
            </div>

            {/* 快速操作 */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">快速操作</h3>
              
              <div className="space-y-3">
                <button
                  onClick={() => testSpecificTable('profiles')}
                  className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 text-sm flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    <span>测试 profiles 表</span>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => testSpecificTable('access_keys')}
                  className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 text-sm flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <Key className="w-4 h-4 mr-2" />
                    <span>测试 access_keys 表</span>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </button>
                
                <button
                  onClick={rerunTests}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 rounded-lg text-white text-sm flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    <span>运行完整测试</span>
                  </div>
                  <Zap className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 诊断建议 */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <AlertTriangle className="w-5 h-5 text-amber-400 mr-2" />
                诊断建议
              </h3>
              
              <div className="space-y-3">
                {!testResults.auth?.success && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <h4 className="text-sm font-medium text-white mb-1">连接失败</h4>
                    <ul className="text-gray-300 text-sm space-y-1">
                      <li>• 检查 Supabase 项目状态</li>
                      <li>• 验证环境变量配置</li>
                      <li>• 确认网络连接正常</li>
                      <li>• 检查防火墙设置</li>
                    </ul>
                  </div>
                )}

                {testResults.auth?.success && !testResults.insertTest?.success && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <h4 className="text-sm font-medium text-white mb-1">写入权限问题</h4>
                    <ul className="text-gray-300 text-sm space-y-1">
                      <li>• 检查 RLS 策略设置</li>
                      <li>• 确认 Service Role Key 权限</li>
                      <li>• 验证表结构和字段</li>
                      <li>• 检查数据插入约束</li>
                    </ul>
                  </div>
                )}

                {testResults.auth?.success && testResults.profiles?.count === 0 && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <h4 className="text-sm font-medium text-white mb-1">数据表为空</h4>
                    <ul className="text-gray-300 text-sm space-y-1">
                      <li>• 这是正常现象（新项目）</li>
                      <li>• 可通过密钥生成器添加数据</li>
                      <li>• 或等待用户注册生成数据</li>
                    </ul>
                  </div>
                )}

                {testResults.serviceRole?.success === false && (
                  <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                    <h4 className="text-sm font-medium text-white mb-1">Service Role Key 问题</h4>
                    <ul className="text-gray-300 text-sm space-y-1">
                      <li>• 检查 Vercel 环境变量</li>
                      <li>• 重新配置 Service Role Key</li>
                      <li>• 验证 Key 权限范围</li>
                      <li>• 重启部署重新加载变量</li>
                    </ul>
                  </div>
                )}

                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <h4 className="text-sm font-medium text-white mb-1">常规建议</h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• 定期运行此测试页面</li>
                    <li>• 记录测试结果以便追踪</li>
                    <li>• 对比不同环境的测试结果</li>
                    <li>• 根据日志修复具体问题</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 系统信息 */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">系统信息</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">环境:</span>
                  <span className="text-gray-300">{process.env.NODE_ENV}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">测试时间:</span>
                  <span className="text-gray-300">{new Date().toLocaleString('zh-CN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Supabase 状态:</span>
                  <span className={testResults.auth?.success ? 'text-green-400' : 'text-red-400'}>
                    {testResults.auth?.success ? '在线' : '离线'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">总测试数:</span>
                  <span className="text-gray-300">8 项</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部信息 */}
        <div className="mt-6 p-4 bg-gray-800/30 border border-gray-700/50 rounded-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-medium text-white mb-1">支持信息</h4>
              <p className="text-gray-400 text-sm">
                如果问题持续存在，请参考以下资源
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://supabase.com/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 text-sm"
              >
                Supabase 文档
              </a>
              <a
                href="https://vercel.com/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 text-sm"
              >
                Vercel 文档
              </a>
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1.5 bg-blue-600 hover:opacity-90 rounded-lg text-white text-sm"
              >
                刷新页面
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
