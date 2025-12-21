// /app/login/expired/page.tsx
"use client"; // 声明为客户端组 件

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createBrowserClient } from '@supabase/ssr';

// 关键配置：将此页面标记为完全动态，跳过静态生成
export const dynamic = 'force-dynamic';

// 使用Suspense包装，以优雅地处理useSearchParams的客户端加载
function LoginExpiredContent() {
  const router = useRouter();
  const searchParams = useSearchParams(); // 现在在Suspense子组件内安全调用
  const email = searchParams.get('email') || '';
  const reason = searchParams.get('reason') || 'multi_device';
  const lastLoginTime = searchParams.get('last_login_time');

  useEffect(() => {
    // 自动清理会话Cookie
    const cleanupCookies = () => {
      document.cookie.split(';').forEach(cookie => {
        const cookieName = cookie.split('=')[0].trim();
        if (cookieName.includes('sb-') || cookieName === 'admin_key_verified') {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });
    };
    cleanupCookies();
  }, []);

  const handleClearAndLogin = async () => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
      );
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('清理会话失败:', error);
      router.push('/login');
    }
  };

  const getReasonMessage = () => {
    switch (reason) {
      case 'new_device_login':
        return {
          title: '检测到新设备登录',
          details: [
            '您的账号已在其他设备上重新登录。',
            '为确保账号安全，当前设备会话已自动失效。'
          ]
        };
      default:
        return {
          title: '登录会话已过期',
          details: [
            '您的登录会话因安全策略已自动失效。',
            '这通常发生在账号从其他设备登录后。'
          ]
        };
    }
  };

  const reasonInfo = getReasonMessage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-950 p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-2xl flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white text-center">
            {reasonInfo.title}
          </h1>
          <p className="text-gray-400 text-sm mt-2 text-center">
            您的会话已结束，请重新登录
          </p>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-300 font-medium mb-2">安全提示</p>
              <ul className="text-sm text-amber-400/80 space-y-1">
                {reasonInfo.details.map((detail, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{detail}</span>
                  </li>
                ))}
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>重新登录前，系统已自动为您清理本地会话。</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          {email && (
            <div className="bg-gray-700/30 rounded-lg p-3">
              <p className="text-sm text-gray-300">
                <span className="text-gray-400">受影响的账号：</span>
                <span className="font-medium">{email}</span>
              </p>
            </div>
          )}
          {lastLoginTime && (
            <div className="bg-gray-700/30 rounded-lg p-3">
              <p className="text-sm text-gray-300">
                <span className="text-gray-400">新登录时间：</span>
                <span className="font-medium">
                  {new Date(lastLoginTime).toLocaleString('zh-CN')}
                </span>
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleClearAndLogin}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            安全重新登录
          </Button>

          <Button
            onClick={() => router.push('/')}
            variant="outline"
            className="w-full border-gray-600 hover:bg-white/5 text-gray-300 hover:text-white py-3"
          >
            返回首页
          </Button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-700/50">
          <div className="text-center text-xs text-gray-500 space-y-2">
            <p>💡 如果此情况频繁发生，请检查账号安全性</p>
            <p>📧 如需帮助请联客服微信：xiyi1397</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// 默认导出包裹了Suspense的页面组件
export default function LoginExpiredPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-lg">正在检查您的会话状态...</div>
      </div>
    }>
      <LoginExpiredContent />
    </Suspense>
  );
}
