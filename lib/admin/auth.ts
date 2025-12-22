// /lib/admin/auth.ts - 简化安全版
import { createClient } from '@/lib/supabase/server'

export async function getAdminUser() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null

    // 检查是否为管理员
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || []
    const userEmail = user.email?.toLowerCase()
    
    if (userEmail && adminEmails.includes(userEmail)) {
      return user
    }
    
    return null
  } catch (error) {
    console.error('获取管理员用户失败:', error)
    return null
  }
}

export async function requireAdmin() {
  const user = await getAdminUser()
  
  if (!user) {
    throw new Error('需要管理员权限')
  }
  
  return user
}