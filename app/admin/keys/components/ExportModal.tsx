// /app/admin/keys/components/ExportModal.tsx
'use client'

import { useState } from 'react'
import { 
  X, Download, FileText, Database, Check, AlertCircle, 
  Loader2, FileJson, FileSpreadsheet, HardDrive, Cpu
} from 'lucide-react'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  selectedKeys: number[]
  totalKeys: number
  filters: any
}

export default function ExportModal({ 
  isOpen, 
  onClose, 
  selectedKeys, 
  totalKeys,
  filters 
}: ExportModalProps) {
  const [exportType, setExportType] = useState<'selected' | 'filtered' | 'all'>('selected')
  const [format, setFormat] = useState<'csv' | 'json' | 'txt'>('csv')
  const [includeColumns, setIncludeColumns] = useState<string[]>([
    '密钥代码', '描述', '有效期', '状态', '使用者邮箱', '使用时间', '创建时间'
  ])
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const availableColumns = [
    { key: '密钥代码', label: '密钥代码', default: true },
    { key: '描述', label: '描述', default: true },
    { key: '有效期', label: '有效期', default: true },
    { key: '原始时长(小时)', label: '原始时长(小时)', default: false },
    { key: '账户有效期(天)', label: '账户有效期(天)', default: false },
    { key: '状态', label: '状态', default: true },
    { key: '最大使用次数', label: '最大使用次数', default: false },
    { key: '已使用次数', label: '已使用次数', default: true },
    { key: '使用者邮箱', label: '使用者邮箱', default: true },
    { key: '使用者昵称', label: '使用者昵称', default: false },
    { key: '使用时间', label: '使用时间', default: true },
    { key: '创建时间', label: '创建时间', default: true },
    { key: '过期时间', label: '过期时间', default: false },
    { key: '最后更新时间', label: '最后更新时间', default: false },
    { key: '密钥ID', label: '密钥ID', default: false }
  ]

  const getExportCount = () => {
    switch (exportType) {
      case 'selected':
        return selectedKeys.length
      case 'filtered':
        return totalKeys
      case 'all':
        return '全部'
      default:
        return 0
    }
  }

  const toggleColumn = (columnKey: string) => {
    if (includeColumns.includes(columnKey)) {
      setIncludeColumns(prev => prev.filter(col => col !== columnKey))
    } else {
      setIncludeColumns(prev => [...prev, columnKey])
    }
  }

  const handleExport = async () => {
    setExporting(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/keys/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          selected_ids: exportType === 'selected' ? selectedKeys : undefined,
          filters: exportType === 'filtered' ? filters : undefined,
          include_columns: includeColumns
        }),
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('导出请求失败')
      }

      // 创建下载链接
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      
      const filename = response.headers.get('Content-Disposition')
        ?.split('filename=')[1]
        ?.replace(/"/g, '') || `love-ludo-keys-export.${format}`
      
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      // 关闭模态框
      setTimeout(() => {
        onClose()
      }, 1000)

    } catch (error: any) {
      setError(error.message || '导出失败')
    } finally {
      setExporting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl animate-fade-in">
        {/* 标题栏 */}
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center">
            <Download className="w-5 h-5 text-amber-400 mr-3" />
            <h2 className="text-lg font-semibold text-white">导出密钥数据</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6">
          {/* 导出范围选择 */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-300 mb-3">导出范围</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { 
                  key: 'selected', 
                  label: '选中密钥', 
                  description: '导出当前选中的密钥',
                  count: selectedKeys.length,
                  icon: Check,
                  disabled: selectedKeys.length === 0
                },
                { 
                  key: 'filtered', 
                  label: '筛选结果', 
                  description: '导出所有筛选结果',
                  count: totalKeys,
                  icon: Filter,
                  disabled: false
                },
                { 
                  key: 'all', 
                  label: '全部密钥', 
                  description: '导出数据库中所有密钥',
                  count: '全部',
                  icon: Database,
                  disabled: false
                }
              ].map((option) => (
                <button
                  key={option.key}
                  onClick={() => setExportType(option.key as any)}
                  disabled={option.disabled}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    exportType === option.key
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:bg-gray-800'
                  } ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-lg ${exportType === option.key ? 'bg-amber-500/20' : 'bg-gray-700'}`}>
                      <option.icon className="w-4 h-4 text-amber-400" />
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      exportType === option.key ? 'bg-amber-500 text-white' : 'bg-gray-700 text-gray-300'
                    }`}>
                      {option.count}
                    </span>
                  </div>
                  <h4 className="text-sm font-medium text-white mb-1">{option.label}</h4>
                  <p className="text-xs text-gray-400">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 导出格式选择 */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-300 mb-3">导出格式</h3>
            <div className="flex gap-3">
              {[
                { key: 'csv', label: 'CSV格式', icon: FileSpreadsheet, description: 'Excel兼容，支持中文' },
                { key: 'json', label: 'JSON格式', icon: FileJson, description: '结构化数据，便于程序处理' },
                { key: 'txt', label: '文本格式', icon: FileText, description: '简单文本，便于查看' }
              ].map((option) => (
                <button
                  key={option.key}
                  onClick={() => setFormat(option.key as any)}
                  className={`flex-1 p-4 rounded-lg border text-center transition-all ${
                    format === option.key
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:bg-gray-800'
                  }`}
                >
                  <div className="flex justify-center mb-3">
                    <div className={`p-3 rounded-full ${format === option.key ? 'bg-blue-500/20' : 'bg-gray-700'}`}>
                      <option.icon className="w-6 h-6 text-blue-400" />
                    </div>
                  </div>
                  <h4 className="text-sm font-medium text-white mb-1">{option.label}</h4>
                  <p className="text-xs text-gray-400">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 列选择 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-300">选择导出的列</h3>
              <button
                onClick={() => {
                  const allKeys = availableColumns.map(col => col.key)
                  setIncludeColumns(includeColumns.length === allKeys.length ? [] : allKeys)
                }}
                className="text-xs text-amber-400 hover:text-amber-300"
              >
                {includeColumns.length === availableColumns.length ? '取消全选' : '全选所有列'}
              </button>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {availableColumns.map((column) => (
                <button
                  key={column.key}
                  onClick={() => toggleColumn(column.key)}
                  className={`px-3 py-2 rounded-lg text-sm flex items-center justify-center transition-colors ${
                    includeColumns.includes(column.key)
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {includeColumns.includes(column.key) && (
                    <Check className="w-3 h-3 mr-1" />
                  )}
                  {column.label}
                </button>
              ))}
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-4 h-4 text-red-400 mr-2" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
            <button
              onClick={onClose}
              disabled={exporting}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || (exportType === 'selected' && selectedKeys.length === 0)}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:opacity-90 rounded-lg text-sm text-white flex items-center disabled:opacity-50"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  导出中...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  开始导出 ({getExportCount()}个密钥)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}