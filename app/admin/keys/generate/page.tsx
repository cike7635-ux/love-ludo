// /app/admin/keys/generate/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Key, ArrowLeft, Plus, Copy, Check, RefreshCw, Download, 
  Clock, Users, Hash, Tag, AlertCircle, Sparkles, Calendar,
  Settings, X, Save, AlertTriangle
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function GenerateKeysPage() {
  const router = useRouter()
  
  // 表单状态
  const [duration, setDuration] = useState<number>(30) // 30天
  const [maxUses, setMaxUses] = useState<number | null>(1) // 1次使用
  const [count, setCount] = useState<number>(1) // 生成数量
  const [prefix, setPrefix] = useState<string>('XY') // 密钥前缀
  const [customPrefix, setCustomPrefix] = useState<boolean>(false)
  const [description, setDescription] = useState<string>('')
  const [generatedKeys, setGeneratedKeys] = useState<string[]>([])
  const [generating, setGenerating] = useState<boolean>(false)
  const [copiedAll, setCopiedAll] = useState<boolean>(false)
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false)
  const [customDays, setCustomDays] = useState<number>(30)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // 时长选项（支持小时级别）
  const durationOptions = [
    { value: 1/24, label: '1小时', display: '1小时', key: '1h' },
    { value: 2/24, label: '2小时', display: '2小时', key: '2h' },
    { value: 4/24, label: '4小时', display: '4小时', key: '4h' },
    { value: 12/24, label: '12小时', display: '12小时', key: '12h' },
    { value: 1, label: '1天', display: '1天', key: '1d' },
    { value: 2, label: '2天', display: '2天', key: '2d' },
    { value: 7, label: '7天', display: '7天', key: '7d' },
    { value: 30, label: '30天', display: '30天', key: '30d' },
    { value: 90, label: '90天', display: '3个月', key: '90d' },
    { value: 180, label: '180天', display: '6个月', key: '180d' },
    { value: 365, label: '365天', display: '1年', key: '365d' },
    { value: -1, label: 'custom', display: '自定义', key: 'custom' }
  ]

  // 使用次数选项
  const maxUsesOptions = [
    { value: 1, label: '1次' },
    { value: 2, label: '2次' },
    { value: 4, label: '4次' },
    { value: 10, label: '10次' },
    { value: null, label: '无限次' }
  ]

  // 预设前缀选项
  const prefixOptions = [
    { value: 'XY', label: 'XY (系统默认)' },
    { value: 'VIP', label: 'VIP (会员专用)' },
    { value: 'TEST', label: 'TEST (测试专用)' },
    { value: 'PROMO', label: 'PROMO (促销活动)' },
    { value: 'LOVE', label: 'LOVE (情侣专用)' }
  ]

  // 处理时长选择
  const handleDurationSelect = (value: number) => {
    if (value === -1) {
      setShowCustomInput(true)
    } else {
      setDuration(value)
      setShowCustomInput(false)
    }
  }

  // 处理自定义天数输入
  const handleCustomDaysChange = (value: number) => {
    if (value >= 1 && value <= 999) {
      setCustomDays(value)
      setDuration(value)
    }
  }

  // 取消自定义
  const handleCancelCustom = () => {
    setShowCustomInput(false)
    setDuration(30)
    setCustomDays(30)
  }

  // 生成随机密钥
  const generateRandomKey = (): string => {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const length = 8
    let result = ''
    
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    
    // 根据时长生成正确的代码
    let durationCode = ''
    if (duration === 1/24) {
      durationCode = '1H'
    } else if (duration === 2/24) {
      durationCode = '2H'
    } else if (duration === 4/24) {
      durationCode = '4H'
    } else if (duration === 12/24) {
      durationCode = '12H'
    } else if (duration === 1) {
      durationCode = '1D'
    } else if (duration === 2) {
      durationCode = '2D'
    } else if (duration === 7) {
      durationCode = '7D'
    } else if (duration === 30) {
      durationCode = '30D'
    } else if (duration === 90) {
      durationCode = '90D'
    } else if (duration === 180) {
      durationCode = '180D'
    } else if (duration === 365) {
      durationCode = '365D'
    } else {
      // 自定义天数
      durationCode = `${duration}D`
    }
    
    return `${prefix}-${durationCode}-${result}`
  }

  // 生成密钥
  const handleGenerateKeys = () => {
    setGenerating(true)
    setError(null)
    
    // 模拟API调用延迟
    setTimeout(() => {
      try {
        const newKeys: string[] = []
        for (let i = 0; i < count; i++) {
          newKeys.push(generateRandomKey())
        }
        
        setGeneratedKeys(newKeys)
        setSuccess(`成功生成 ${newKeys.length} 个密钥`)
        
      } catch (err) {
        setError('生成密钥时发生错误')
      } finally {
        setGenerating(false)
      }
    }, 800)
  }

  // 复制所有密钥
  const copyAllKeys = () => {
    const keysText = generatedKeys.join('\n')
    navigator.clipboard.writeText(keysText)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2000)
  }

  // 下载密钥
  const downloadKeys = () => {
    const keysText = generatedKeys.join('\n')
    const blob = new Blob([keysText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `love-ludo-keys_${new Date().toLocaleDateString('zh-CN')}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  // 清除生成的密钥
  const clearKeys = () => {
    setGeneratedKeys([])
    setSuccess(null)
  }

  // 提交到数据库
  const handleSubmit = async () => {
    if (generatedKeys.length === 0) {
      setError('请先生成密钥')
      return
    }

    try {
      setGenerating(true)
      setError(null)
      
      // 准备数据
      const requestData = {
        keys: generatedKeys,
        duration_days: duration,
        max_uses: maxUses,
        description: description || undefined
      }

      console.log('提交密钥数据:', requestData)
      
      const response = await fetch('/api/admin/keys/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
        credentials: 'include'
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(`✅ 成功创建了 ${generatedKeys.length} 个密钥！`)
        
        // 3秒后跳转回密钥列表页
        setTimeout(() => {
          router.push('/admin/keys')
        }, 3000)
      } else {
        throw new Error(result.error || '创建密钥失败')
      }
    } catch (error: any) {
      console.error('创建密钥失败:', error)
      setError(`❌ 创建密钥失败: ${error.message}`)
    } finally {
      setGenerating(false)
    }
  }

  // 获取显示时长文本
  const getDurationText = (): string => {
    if (duration === 1/24) return '1小时'
    if (duration === 2/24) return '2小时'
    if (duration === 4/24) return '4小时'
    if (duration === 12/24) return '12小时'
    if (duration === 1) return '1天'
    if (duration === 2) return '2天'
    if (duration === 7) return '7天'
    if (duration === 30) return '30天'
    if (duration === 90) return '3个月'
    if (duration === 180) return '6个月'
    if (duration === 365) return '1年'
    return `${duration}天`
  }

  // 获取时长代码（用于密钥格式）
  const getDurationCode = (): string => {
    if (duration === 1/24) return '1H'
    if (duration === 2/24) return '2H'
    if (duration === 4/24) return '4H'
    if (duration === 12/24) return '12H'
    if (duration === 1) return '1D'
    if (duration === 2) return '2D'
    if (duration === 7) return '7D'
    if (duration === 30) return '30D'
    if (duration === 90) return '90D'
    if (duration === 180) return '180D'
    if (duration === 365) return '365D'
    return `${duration}D`
  }

  // 清除消息
  const clearMessages = () => {
    setError(null)
    setSuccess(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 p-4 md:p-6">
      {/* 页面标题 */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link
              href="/admin/keys"
              className="mr-4 p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center">
                <Key className="w-6 h-6 md:w-7 md:h-7 mr-2 text-amber-400" />
                生成新密钥
              </h1>
              <p className="text-gray-400 mt-2">
                创建带有使用次数限制的访问密钥
                {generatedKeys.length > 0 && (
                  <span className="ml-2 text-amber-400">
                    • 已生成 {generatedKeys.length} 个密钥
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 消息提示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
              <p className="text-red-400">{error}</p>
            </div>
            <button onClick={clearMessages} className="p-1 hover:bg-red-500/20 rounded">
              <X className="w-4 h-4 text-red-400" />
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Check className="w-5 h-5 text-green-400 mr-3" />
              <p className="text-green-400">{success}</p>
            </div>
            <button onClick={clearMessages} className="p-1 hover:bg-green-500/20 rounded">
              <X className="w-4 h-4 text-green-400" />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* 左侧：配置表单 */}
        <div className="space-y-6">
          {/* 配置卡片 */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-amber-400" />
              密钥配置
            </h2>
            
            <div className="space-y-6">
              {/* 时长选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-blue-400" />
                  使用有效期
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {durationOptions.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => handleDurationSelect(option.value)}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        (duration === option.value) || 
                        (option.value === -1 && showCustomInput)
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {option.display}
                    </button>
                  ))}
                </div>
                
                {/* 自定义天数输入框 */}
                {showCustomInput && (
                  <div className="mt-4 p-4 bg-gray-900/70 rounded-lg border border-blue-500/50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <Settings className="w-4 h-4 mr-2 text-blue-400" />
                        <span className="text-sm font-medium text-gray-300">自定义天数</span>
                      </div>
                      <button
                        onClick={handleCancelCustom}
                        className="p-1 hover:bg-red-500/20 rounded"
                        title="取消自定义"
                      >
                        <X className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <input
                          type="number"
                          min="1"
                          max="999"
                          value={customDays}
                          onChange={(e) => handleCustomDaysChange(parseInt(e.target.value) || 30)}
                          className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-center"
                          placeholder="输入天数"
                        />
                        <span className="text-gray-300 whitespace-nowrap">天</span>
                      </div>
                      
                      <div className="flex space-x-2 overflow-x-auto pb-2">
                        {[1, 3, 7, 15, 30, 60, 90, 180].map((day) => (
                          <button
                            key={`quick-${day}`}
                            type="button"
                            onClick={() => handleCustomDaysChange(day)}
                            className={`px-3 py-1.5 rounded text-xs ${
                              customDays === day
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                          >
                            {day}天
                          </button>
                        ))}
                      </div>
                      
                      <p className="text-gray-500 text-xs">
                        当前自定义: {customDays} 天
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="mt-3 p-3 bg-gray-900/30 rounded-lg">
                  <p className="text-gray-400 text-sm">
                    <span className="text-blue-400">当前选择:</span> {getDurationText()}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    密钥格式: {prefix}-{getDurationCode()}-XXXXXXXX
                  </p>
                  <div className="mt-2 p-2 bg-blue-900/20 border border-blue-700/30 rounded">
                    <p className="text-xs text-blue-300">
                      💡 注意：小时级别密钥将准确存储，支持1小时、2小时、4小时、12小时等
                    </p>
                  </div>
                </div>
              </div>

              {/* 使用次数 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                  <Users className="w-4 h-4 mr-2 text-green-400" />
                  使用次数限制
                </label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {maxUsesOptions.map((option) => (
                    <button
                      key={option.value || 'unlimited'}
                      type="button"
                      onClick={() => setMaxUses(option.value)}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${maxUses === option.value
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 p-3 bg-gray-900/30 rounded-lg">
                  <p className="text-gray-500 text-sm">
                    选择"无限次"则不限制使用次数，"2次"表示每个密钥最多可用2次
                  </p>
                  <p className="text-green-400 text-xs mt-1">
                    当前选择: {maxUses === null ? '无限次' : `${maxUses}次`}
                  </p>
                </div>
              </div>

              {/* 生成数量 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                  <Hash className="w-4 h-4 mr-2 text-purple-400" />
                  生成数量
                </label>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">1个</span>
                    <span className="text-gray-400 text-sm">100个</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:cursor-pointer"
                  />
                  <div className="flex items-center justify-center">
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={count}
                        onChange={(e) => {
                          const value = parseInt(e.target.value)
                          if (value >= 1 && value <= 100) {
                            setCount(value)
                          }
                        }}
                        className="w-32 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-center text-lg font-bold"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                        个
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-gray-900/30 rounded-lg">
                  <p className="text-gray-500 text-sm">
                    可批量生成 1-100 个密钥，适用于批量发放或促销活动
                  </p>
                  <p className="text-purple-400 text-xs mt-1">
                    预计总使用次数: {maxUses === null ? '∞' : `${count * maxUses}次`}
                  </p>
                </div>
              </div>

              {/* 密钥前缀 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                  <Tag className="w-4 h-4 mr-2 text-amber-400" />
                  密钥前缀
                </label>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {prefixOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setPrefix(option.value)
                          setCustomPrefix(false)
                        }}
                        className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                          !customPrefix && prefix === option.value
                            ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        {option.label.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => setCustomPrefix(!customPrefix)}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        customPrefix
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      自定义前缀
                    </button>
                    
                    {customPrefix && (
                      <div className="flex-1 flex items-center space-x-2">
                        <input
                          type="text"
                          value={prefix}
                          onChange={(e) => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                          maxLength={6}
                          placeholder="输入2-6位大写字母"
                          className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                        />
                        <button
                          onClick={() => {
                            if (prefix.length >= 2) {
                              setCustomPrefix(false)
                            } else {
                              setError('前缀至少需要2个字符')
                            }
                          }}
                          className="px-3 py-2 bg-green-600 hover:opacity-90 rounded-lg text-white text-sm"
                        >
                          确定
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3 p-3 bg-gray-900/30 rounded-lg">
                  <p className="text-gray-500 text-sm">
                    密钥格式：<code className="text-amber-400">{prefix}-{getDurationCode()}-XXXXXXXX</code>
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    示例：{prefix}-{getDurationCode()}-A1B2C3D4
                  </p>
                </div>
              </div>

              {/* 描述（可选） */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                  备注说明（可选）
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="输入此批密钥的用途说明，便于后续管理..."
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 h-24 resize-none"
                  maxLength={200}
                />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-gray-500 text-xs">
                    最多200个字符，建议填写生成用途便于追踪
                  </p>
                  <span className={`text-xs ${description.length >= 190 ? 'text-red-400' : 'text-gray-500'}`}>
                    {description.length}/200
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-col md:flex-row gap-3">
            <button
              onClick={handleGenerateKeys}
              disabled={generating || (showCustomInput && customDays < 1)}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:opacity-90 rounded-lg text-white font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2" />
                  生成密钥 ({count}个)
                </>
              )}
            </button>
            
            {generatedKeys.length > 0 && (
              <button
                onClick={handleSubmit}
                disabled={generating}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90 rounded-lg text-white font-medium disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    保存到数据库
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* 右侧：预览与结果 */}
        <div className="space-y-6">
          {/* 预览卡片 */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-purple-400" />
              密钥预览
            </h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">单个密钥示例</span>
                  <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                    格式预览
                  </span>
                </div>
                <code className="font-mono text-lg text-white bg-gray-800 px-4 py-3 rounded-lg block text-center border border-gray-700 hover:border-gray-600 transition-colors">
                  {prefix}-{getDurationCode()}-A1B2C3D4
                </code>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="text-gray-500">
                    <span className="block text-xs mb-1">有效期:</span>
                    <span className="text-blue-400 font-medium">
                      {getDurationText()}
                    </span>
                  </div>
                  <div className="text-gray-500">
                    <span className="block text-xs mb-1">使用次数:</span>
                    <span className="text-green-400 font-medium">
                      {maxUses === null ? '无限次' : `${maxUses}次`}
                    </span>
                  </div>
                  <div className="text-gray-500">
                    <span className="block text-xs mb-1">前缀:</span>
                    <span className="text-amber-400 font-medium">
                      {prefix}
                    </span>
                  </div>
                  <div className="text-gray-500">
                    <span className="block text-xs mb-1">格式:</span>
                    <span className="text-gray-400 font-medium">
                      {getDurationCode()}
                    </span>
                  </div>
                </div>
              </div>

              {/* 统计信息 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-gray-900/30 rounded-lg">
                  <p className="text-gray-400 text-xs">密钥总数</p>
                  <p className="text-xl font-bold text-white mt-1">{count}个</p>
                </div>
                <div className="p-3 bg-gray-900/30 rounded-lg">
                  <p className="text-gray-400 text-xs">预计使用次数</p>
                  <p className="text-xl font-bold text-white mt-1">
                    {maxUses === null ? '∞' : `${count * maxUses}次`}
                  </p>
                </div>
                <div className="p-3 bg-gray-900/30 rounded-lg">
                  <p className="text-gray-400 text-xs">有效期</p>
                  <p className="text-xl font-bold text-white mt-1">{getDurationText()}</p>
                </div>
                <div className="p-3 bg-gray-900/30 rounded-lg">
                  <p className="text-gray-400 text-xs">前缀代码</p>
                  <p className="text-xl font-bold text-white mt-1">{prefix}</p>
                </div>
              </div>

              {/* 配置汇总 */}
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <h4 className="text-sm font-medium text-white mb-3">配置汇总</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex flex-col">
                    <span className="text-gray-400 text-xs">前缀:</span>
                    <span className="text-amber-400 font-medium mt-1">{prefix}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-400 text-xs">时长:</span>
                    <span className="text-blue-400 font-medium mt-1">{getDurationText()}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-400 text-xs">使用限制:</span>
                    <span className="text-green-400 font-medium mt-1">
                      {maxUses === null ? '无限次' : `${maxUses}次`}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-400 text-xs">生成数量:</span>
                    <span className="text-purple-400 font-medium mt-1">{count}个</span>
                  </div>
                </div>
                {description && (
                  <div className="mt-3 pt-3 border-t border-gray-700/50">
                    <span className="text-gray-400 text-xs">备注:</span>
                    <p className="text-gray-300 text-sm mt-1 truncate">{description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 生成结果 */}
          {generatedKeys.length > 0 && (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <Key className="w-5 h-5 mr-2 text-green-400" />
                  已生成密钥 ({generatedKeys.length}个)
                </h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={copyAllKeys}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    title={copiedAll ? '已复制' : '复制所有密钥'}
                  >
                    {copiedAll ? (
                      <Check className="w-5 h-5 text-green-400" />
                    ) : (
                      <Copy className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={downloadKeys}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    title="下载密钥"
                  >
                    <Download className="w-5 h-5 text-blue-400" />
                  </button>
                  <button
                    onClick={clearKeys}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                    title="清除所有密钥"
                  >
                    <RefreshCw className="w-5 h-5 text-red-400" />
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {generatedKeys.map((key, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-900/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                          #{index + 1}
                        </span>
                        <code className="font-mono text-sm text-white truncate flex-1">{key}</code>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(key)
                          const buttons = document.querySelectorAll(`[data-key-index="${index}"]`)
                          buttons.forEach(btn => {
                            const icon = btn.querySelector('svg')
                            if (icon) {
                              const originalClass = icon.className.baseVal
                              icon.className.baseVal = originalClass.replace('text-gray-400', 'text-green-400').replace('Copy', 'Check')
                              setTimeout(() => {
                                icon.className.baseVal = originalClass
                              }, 2000)
                            }
                          })
                        }}
                        data-key-index={index}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded transition-opacity"
                        title="复制密钥"
                      >
                        <Copy className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-start">
                  <AlertTriangle className="w-4 h-4 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-300 mb-1">
                      重要提示
                    </p>
                    <ul className="text-xs text-gray-400 space-y-1">
                      <li>• 请务必复制并保存这些密钥</li>
                      <li>• 点击"保存到数据库"按钮后，密钥将正式生效</li>
                      <li>• 建议同时下载备份，以防丢失</li>
                      <li>• 密钥格式: {prefix}-{getDurationCode()}-随机码</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 底部操作栏 */}
      {generatedKeys.length > 0 && (
        <div className="mt-6 p-4 bg-gray-800/30 border border-gray-700/50 rounded-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-medium text-white mb-1">下一步操作</h4>
              <p className="text-gray-400 text-sm">
                您已成功生成 {generatedKeys.length} 个密钥，请选择后续操作
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={clearKeys}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300"
              >
                清除重做
              </button>
              <button
                onClick={copyAllKeys}
                className={`px-4 py-2 rounded-lg text-sm text-white ${copiedAll ? 'bg-green-600' : 'bg-blue-600 hover:opacity-90'}`}
              >
                {copiedAll ? '✓ 已复制' : '复制所有密钥'}
              </button>
              <button
                onClick={handleSubmit}
                disabled={generating}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90 rounded-lg text-sm text-white disabled:opacity-50"
              >
                {generating ? '保存中...' : '保存到数据库'}
              </button>
              <Link
                href="/admin/keys"
                className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:opacity-90 rounded-lg text-sm text-white flex items-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回密钥列表
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 数据库状态提示 */}
      <div className="mt-4 p-3 bg-gray-800/20 border border-gray-700/30 rounded-lg">
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
          <p className="text-xs text-gray-400">
            数据库状态: <span className="text-green-400">连接正常</span> | 
            当前配置: {getDurationText()} · {maxUses === null ? '无限次' : `${maxUses}次`} · {count}个密钥
          </p>
        </div>
      </div>
    </div>
  )
}
