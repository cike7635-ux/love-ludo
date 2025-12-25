// /app/admin/keys/components/BulkActions.tsx
'use client'

import { useState } from 'react'
import { 
  Check, Trash2, Eye, EyeOff, Copy, Loader2, AlertTriangle,
  Shield, Lock, Unlock, MoreVertical, X
} from 'lucide-react'

interface BulkActionsProps {
  selectedKeys: number[]
  onAction: (action: 'disable' | 'enable' | 'delete', reason?: string) => Promise<void>
  loading: boolean
}

export default function BulkActions({ selectedKeys, onAction, loading }: BulkActionsProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showReasonInput, setShowReasonInput] = useState<'disable' | 'enable' | 'delete' | null>(null)
  const [reason, setReason] = useState('')

  const handleAction = async (action: 'disable' | 'enable' | 'delete') => {
    if (action === 'delete') {
      setShowReasonInput('delete')
    } else {
      await onAction(action)
    }
  }

  const handleConfirmWithReason = async () => {
    if (showReasonInput && reason.trim()) {
      await onAction(showReasonInput, reason.trim())
      setShowReasonInput(null)
      setReason('')
    } else if (showReasonInput) {
      await onAction(showReasonInput)
      setShowReasonInput(null)
      setReason('')
    }
  }

  if (selectedKeys.length === 0) return null

  return (
    <>
      {/* 批量操作栏 */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
        <div className="bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-xl shadow-xl p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center mr-3">
                <Check className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  已选中 <span className="text-amber-400">{selectedKeys.length}</span> 个密钥
                </p>
                <p className="text-xs text-gray-400">选择要执行的操作</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleAction('disable')}
                disabled={loading}
                className="px-3 py-2 bg-gradient-to-r from-red-600 to-pink-600 hover:opacity-90 rounded-lg text-sm text-white flex items-center disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <EyeOff className="w-4 h-4 mr-1" />
                )}
                禁用
              </button>

              <button
                onClick={() => handleAction('enable')}
                disabled={loading}
                className="px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90 rounded-lg text-sm text-white flex items-center disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Eye className="w-4 h-4 mr-1" />
                )}
                启用
              </button>

              <button
                onClick={() => handleAction('delete')}
                disabled={loading}
                className="px-3 py-2 bg-gradient-to-r from-red-700 to-rose-700 hover:opacity-90 rounded-lg text-sm text-white flex items-center disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-1" />
                )}
                删除
              </button>

              <button
                onClick={() => setShowMenu(!showMenu)}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-300 flex items-center"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 更多操作菜单 */}
          {showMenu && (
            <div className="absolute bottom-full left-0 mb-2 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-lg animate-slide-up">
              <div className="p-2">
                <button
                  onClick={() => {
                    // 复制选中的密钥代码
                    const text = selectedKeys.map(id => `密钥ID: ${id}`).join('\n')
                    navigator.clipboard.writeText(text)
                    setShowMenu(false)
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded flex items-center"
                >
                  <Copy className="w-4 h-4 mr-2 text-blue-400" />
                  复制选中密钥ID
                </button>
                <button
                  onClick={() => {
                    // 查看选中密钥详情
                    setShowMenu(false)
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded flex items-center"
                >
                  <Shield className="w-4 h-4 mr-2 text-amber-400" />
                  批量查看详情
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 原因输入模态框 */}
      {showReasonInput && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md animate-fade-in">
            <div className="px-6 py-4 border-b border-gray-700">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-amber-400 mr-3" />
                <h3 className="text-lg font-semibold text-white">
                  {showReasonInput === 'delete' ? '删除确认' : `${showReasonInput === 'disable' ? '禁用' : '启用'}操作`}
                </h3>
              </div>
            </div>

            <div className="p-6">
              <p className="text-gray-300 mb-4">
                {showReasonInput === 'delete' 
                  ? `确定要删除选中的 ${selectedKeys.length} 个密钥吗？此操作不可撤销！`
                  : `确定要${showReasonInput === 'disable' ? '禁用' : '启用'}选中的 ${selectedKeys.length} 个密钥吗？`
                }
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  操作原因（可选）
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="请输入操作原因，便于后续追溯..."
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 h-24 resize-none"
                  maxLength={200}
                />
                <p className="text-gray-500 text-xs mt-1">
                  最多200个字符
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowReasonInput(null)
                    setReason('')
                  }}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmWithReason}
                  disabled={loading}
                  className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:opacity-90 rounded-lg text-sm text-white flex items-center disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      处理中...
                    </>
                  ) : (
                    <>
                      {showReasonInput === 'delete' ? (
                        <Trash2 className="w-4 h-4 mr-2" />
                      ) : showReasonInput === 'disable' ? (
                        <EyeOff className="w-4 h-4 mr-2" />
                      ) : (
                        <Eye className="w-4 h-4 mr-2" />
                      )}
                      确认{showReasonInput === 'delete' ? '删除' : showReasonInput === 'disable' ? '禁用' : '启用'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}