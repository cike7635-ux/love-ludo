// /components/admin/logout-button.tsx - 客户端组件
'use client';

import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function LogoutButton() {
  const router = useRouter();
  
  const handleLogout = async () => {
    try {
      // 使用客户端 Supabase 客户端
      const supabase = createClientComponentClient();
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
    >
      退出登录
    </button>
  );
}
