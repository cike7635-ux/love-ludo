// /app/themes/page.tsx - 修复版本
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from "next/link";
import { listMyThemes } from "./actions";
import { Plus, Layers, Edit } from "lucide-react";
import DeleteThemeButton from '@/app/components/themes/delete-theme-button';

// 辅助函数：从JWT中解析创建时间（安全版本）
function getJwtCreationTime(jwt: string): Date | null {
  try {
    const payloadBase64 = jwt.split('.')[1];
    if (!payloadBase64) return null;
    
    let payloadJson: string;
    const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    const paddedBase64 = pad ? base64 + '='.repeat(4 - pad) : base64;
    
    if (typeof Buffer !== 'undefined') {
      payloadJson = Buffer.from(paddedBase64, 'base64').toString();
    } else {
      payloadJson = decodeURIComponent(
        atob(paddedBase64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    }
    
    const payload = JSON.parse(payloadJson);
    if (payload.iat) {
      return new Date(payload.iat * 1000);
    }
    
    return null;
  } catch (error) {
    console.error('解析JWT失败:', error);
    return null;
  }
}

export default async function ThemesPage() {
  // 1. 创建Supabase客户端
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { 
      cookies: { 
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            console.error('设置cookie失败:', error);
          }
        }
      }
    }
  );
  
  // 2. 检查用户登录状态
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }
  
  // 3. 获取当前会话
  const { data: { session: currentSession } } = await supabase.auth.getSession();
  if (!currentSession) {
    await supabase.auth.signOut();
    redirect('/login?error=no_session');
  }
  
  // 4. 获取用户资料（包括会话信息和有效期）
  const { data: profile } = await supabase
    .from('profiles')
    .select('account_expires_at, last_login_at, last_login_session')
    .eq('id', user.id)
    .single();
  
  if (!profile) {
    redirect('/login?error=profile_not_found');
  }
  
  // 5. 检查会员有效期
  const isExpired = !profile?.account_expires_at || new Date(profile.account_expires_at) < new Date();
  if (isExpired) {
    redirect('/account-expired');
  }
  
  // ============ 【严格的多设备登录验证】 ============
  // 从JWT中解析会话创建时间
  const sessionCreatedTime = getJwtCreationTime(currentSession.access_token);
  const lastLoginTime = profile.last_login_at ? new Date(profile.last_login_at) : null;
  
  // 添加3秒容差，避免由于时间同步或处理延迟导致的误判
  const tolerance = 3000; // 3秒
  
  if (lastLoginTime && sessionCreatedTime) {
    // 计算时间差（毫秒）
    const timeDiff = lastLoginTime.getTime() - sessionCreatedTime.getTime();
    
    // 如果最后登录时间比会话创建时间晚（超过容差），说明有新登录
    if (timeDiff > tolerance) {
      console.log(`[主题页面] 检测到新登录，强制退出用户: ${user.email}`);
      console.log(`  - JWT会话创建时间: ${sessionCreatedTime.toISOString()}`);
      console.log(`  - 最后登录时间: ${lastLoginTime.toISOString()}`);
      console.log(`  - 时间差: ${timeDiff}ms`);
      
      // 强制退出当前会话
      await supabase.auth.signOut();
      
      // 重定向到专门的过期提示页面
      const userEmail = user.email || '';
      const lastLoginTimeStr = lastLoginTime.toISOString();
      
      redirect(`/login/expired?email=${encodeURIComponent(userEmail)}&last_login_time=${encodeURIComponent(lastLoginTimeStr)}`);
    }
  }
  
  // 6. 可选的：记录当前登录到日志（用于调试）
  console.log(`[主题页面] 用户 ${user.email} 会话验证通过`);
  console.log(`  - JWT会话创建时间: ${sessionCreatedTime ? sessionCreatedTime.toISOString() : '无法解析'}`);
  console.log(`  - 最后登录时间: ${lastLoginTime ? lastLoginTime.toISOString() : '无记录'}`);
  console.log(`  - 会话标识: ${profile.last_login_session || '无标识'}`);
  // ============ 会话验证结束 ============
  
  // 7. 原有的业务逻辑 - 获取主题数据
  const { data: themes } = await listMyThemes();

  return (
    <>
      <div className="max-w-md mx-auto min-h-svh flex flex-col pb-24">
        {/* 顶部标题区域 - 简约风格 */}
        <div className="px-6 pt-8 pb-6">
          <h2 className="text-3xl font-bold text-white mb-6">主题库</h2>
          
          {/* 会员状态提示 */}
          <div className="mb-4 p-3 glass rounded-xl">
            <p className="text-sm text-green-400 text-center">
              会员有效期至：{profile?.account_expires_at ? 
                new Date(profile.account_expires_at).toLocaleDateString('zh-CN') : 
                '未设置'}
            </p>
          </div>
          
          {/* 创建主题按钮 */}
          <Link
            href="/themes/new"
            className="flex items-center justify-center space-x-2 w-full h-12 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.98] no-underline mb-6"
          >
            <Plus className="w-5 h-5 text-white" />
            <span className="text-white font-semibold">创建新主题</span>
          </Link>

          {/* 主题列表 */}
          <div className="space-y-3">
            {themes.length === 0 && (
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-white/5 rounded-2xl flex items-center justify-center">
                  <Layers className="w-8 h-8 text-white/30" />
                </div>
                <p className="text-white/70 font-medium mb-1">暂无主题</p>
                <p className="text-sm text-white/40">点击上方按钮创建你的第一个主题</p>
              </div>
            )}

            {themes.map((t) => (
              <div 
                key={t.id} 
                className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all duration-200 group"
              >
                {/* 操作按钮 - 悬浮显示 */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <Link
                    href={`/themes/${t.id}`}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    aria-label="编辑主题"
                  >
                    <Edit className="w-3.5 h-3.5 text-white" />
                  </Link>
                  
                  {/* 删除按钮 - 客户端组件 */}
                  <DeleteThemeButton themeId={t.id} themeTitle={t.title} />
                </div>
                
                {/* 主题内容 - 可点击区域 */}
                <Link 
                  href={`/themes/${t.id}`}
                  className="block no-underline"
                >
                  <div className="flex items-start justify-between mb-2 pr-8">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-base text-white mb-1 truncate">{t.title}</h4>
                      <p className="text-sm text-white/50">{t.task_count ?? 0} 个任务</p>
                    </div>
                    <svg className="w-5 h-5 text-white/40 flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  {t.description && (
                    <p className="text-sm text-white/40 line-clamp-2 mt-2">
                      {t.description}
                    </p>
                  )}
                </Link>
              </div>
            ))}
          </div>
          
          {/* 提示信息 */}
          {themes.length > 0 && (
            <div className="mt-6 text-center text-xs text-gray-500">
              <p>提示：将鼠标悬停在主题卡片上可以显示操作按钮</p>
              <p className="mt-1">删除主题会同时删除该主题下的所有任务</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
