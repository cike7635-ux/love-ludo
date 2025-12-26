// /app/themes/page.tsx
// 修复版本：移除setAll和多设备检测逻辑
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from "next/link";
import { listMyThemes } from "./actions";
import { Plus, Layers, Edit, Hash, Clock, MoreVertical } from "lucide-react";
import DeleteThemeButton from '@/app/components/themes/delete-theme-button';

export default async function ThemesPage() {
  // 1. 创建简化的Supabase客户端（移除setAll）
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { 
      cookies: { 
        getAll: () => cookieStore.getAll(),
        // ❌ 移除setAll，让中间件处理cookie刷新
      }
    }
  );
  
  // 2. 检查用户登录状态
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }
  
  // 3. 获取用户资料（检查会员有效期）
  const { data: profile } = await supabase
    .from('profiles')
    .select('account_expires_at')
    .eq('id', user.id)
    .single();
  
  // 如果是新用户且没有profile，创建基本profile
  if (!profile) {
    console.log(`[Themes] 新用户 ${user.email} 资料不存在，创建基本资料`);
    const { error: insertError } = await supabase
      .from('profiles')
      .insert([{ 
        id: user.id, 
        email: user.email,
        created_at: new Date().toISOString()
      }]);
    
    if (insertError) {
      console.error('[Themes] 创建用户资料失败:', insertError);
    }
  }
  
  // 4. 检查会员有效期
  const isExpired = profile?.account_expires_at && new Date(profile.account_expires_at) < new Date();
  if (isExpired) {
    redirect('/account-expired');
  }
  
  // 5. 获取主题数据（会自动初始化新用户主题）
  const { data: themes } = await listMyThemes();

  return (
    <>
      <div className="max-w-md mx-auto min-h-svh flex flex-col pb-24">
        {/* 顶部标题区域 */}
        <div className="px-6 pt-8 pb-6">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">主题库</h2>
          
          {/* 会员状态提示 */}
          <div className="mb-4 p-3 glass rounded-xl">
            <p className="text-sm text-green-400 text-center">
              会员有效期至：{profile?.account_expires_at ? 
                new Date(profile.account_expires_at).toLocaleDateString('zh-CN') : 
                '新用户'}
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
            {themes?.length === 0 && (
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-white/5 rounded-2xl flex items-center justify-center">
                  <Layers className="w-8 h-8 text-white/30" />
                </div>
                <p className="text-white/70 font-medium mb-1">暂无主题</p>
                <p className="text-sm text-white/40">点击上方按钮创建你的第一个主题</p>
              </div>
            )}

            {themes?.map((t) => (
              <div 
                key={t.id} 
                className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all duration-200 group"
              >
                {/* 操作按钮 */}
                <div className="absolute top-4 right-4 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                  <Link
                    href={`/themes/${t.id}`}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    aria-label="编辑主题"
                  >
                    <Edit className="w-3.5 h-3.5 text-white" />
                  </Link>
                  
                  <DeleteThemeButton themeId={t.id} themeTitle={t.title} />
                </div>
                
                {/* 主题内容 */}
                <Link 
                  href={`/themes/${t.id}`}
                  className="block no-underline"
                >
                  <div className="flex flex-col items-center mb-3">
                    <h4 className="font-semibold text-base text-white mb-1 text-center w-full">
                      {t.title}
                    </h4>
                    
                    <div className="flex items-center justify-center space-x-4 mt-2">
                      <div className="flex items-center space-x-1">
                        <Hash className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm text-gray-400">{t.task_count ?? 0} 任务</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm text-gray-400">
                          {new Date(t.created_at).toLocaleDateString('zh-CN', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {t.description && (
                    <p className="text-sm text-gray-400 line-clamp-2 mt-2 text-center">
                      {t.description}
                    </p>
                  )}
                  
                  <div className="hidden md:flex items-center justify-center mt-3">
                    <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              </div>
            ))}
          </div>
          
          {/* 操作说明 */}
          {themes && themes.length > 0 && (
            <div className="mt-8 p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
              <div className="text-center text-xs text-gray-400 space-y-1">
                <p>💡 提示：点击主题卡片可以查看和编辑主题详情</p>
                <p className="hidden md:block">🖱️ 桌面端：鼠标悬停显示操作按钮</p>
                <p className="md:hidden">📱 移动端：可直接看到编辑和删除按钮</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
