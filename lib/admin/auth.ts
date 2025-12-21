// /lib/admin/auth.ts - 简化的验证函数
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function validateAdminSession() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return { isAdmin: false, user: null };
    }

    // 检查是否是管理员邮箱
    const adminEmails = ['2200691917@qq.com']; // 硬编码管理员邮箱
    const isAdmin = adminEmails.includes(user.email?.toLowerCase() || '');
    
    if (!isAdmin) {
      return { isAdmin: false, user };
    }
    
    return { isAdmin: true, user };
    
  } catch (error) {
    return { isAdmin: false, user: null };
  }
}

export async function requireAdmin() {
  const { isAdmin } = await validateAdminSession();
  if (!isAdmin) {
    redirect('/admin');
  }
}
