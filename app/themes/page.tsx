// /app/themes/page.tsx
// 优化版本：仅改进文字布局和样式
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from "next/link";
import { listMyThemes } from "./actions";
import { Plus, Layers, Edit, Hash, Clock, Calendar, ChevronRight } from "lucide-react";
import DeleteThemeButton from '@/app/components/themes/delete-theme-button';

export default async function ThemesPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { 
      cookies: { 
        getAll: () => cookieStore.getAll(),
      }
    }
  );
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('account_expires_at, nickname')
    .eq('id', user.id)
    .single();
  
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
  
  const isExpired = profile?.account_expires_at && new Date(profile.account_expires_at) < new Date();
  if (isExpired) {
    redirect('/account-expired');
  }
  
  const { data: themes } = await listMyThemes();

  return (
    <>
      <div className="max-w-md mx-auto min-h-svh flex flex-col pb-24">
        {/* 顶部标题区域 */}
        <div className="px-6 pt-8 pb-6">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">主题库</h2>
            <p className="text-sm text-gray-400">
              管理你的专属游戏主题
              <span className="inline-block mx-2">•</span>
              <span className="text-brand-pink">{themes?.length || 0} 个主题</span>
            </p>
          </div>
          
          {/* 会员状态提示 */}
          <div className="mb-6 p-4 glass rounded-2xl border border-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-brand-pink to-brand-purple animate-pulse"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-300">会员有效期</p>
                <p className="text-lg font-bold text-white">
                  {profile?.account_expires_at ? 
                    new Date(profile.account_expires_at).toLocaleDateString('zh-CN', {
                      month: 'long',
                      day: 'numeric'
                    }) : 
                    <span className="text-brand-pink">新用户体验期</span>
                  }
                </p>
              </div>
            </div>
          </div>
          
          {/* 创建主题按钮 */}
          <Link
            href="/themes/new"
            className="flex items-center justify-center gap-3 w-full h-14 gradient-primary rounded-2xl shadow-lg shadow-brand-pink/20 hover:shadow-xl hover:shadow-brand-pink/30 transition-all duration-200 active:scale-[0.98] no-underline mb-8"
          >
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <Plus className="w-3 h-3 text-white" />
            </div>
            <span className="text-white font-semibold text-lg">创建新主题</span>
            <div className="ml-auto pr-3">
              <ChevronRight className="w-4 h-4 text-white/60" />
            </div>
          </Link>

          {/* 主题列表 */}
          <div className="space-y-4">
            {themes?.length === 0 && (
              <div className="glass rounded-2xl p-8 text-center border border-white/10">
                <div className="w-20 h-20 mx-auto mb-4 glass rounded-2xl flex items-center justify-center border border-white/10">
                  <Layers className="w-10 h-10 text-white/30" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">暂无主题</h3>
                <p className="text-sm text-gray-400 mb-6">点击上方按钮创建你的第一个主题</p>
                <Link
                  href="/themes/new"
                  className="inline-flex items-center gap-2 px-6 py-3 glass rounded-xl text-sm font-medium text-white hover:bg-white/10 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  开始创建
                </Link>
              </div>
            )}

            {themes?.map((t) => (
              <div 
                key={t.id} 
                className="relative glass rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all duration-300 group overflow-hidden"
              >
                {/* 渐变背景层 */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-brand-pink/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* 操作按钮 */}
                <div className="absolute top-4 right-4 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 z-10">
                  <Link
                    href={`/themes/${t.id}`}
                    className="p-2 rounded-lg glass border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                    aria-label="编辑主题"
                  >
                    <Edit className="w-3.5 h-3.5 text-white" />
                  </Link>
                  
                  <DeleteThemeButton themeId={t.id} themeTitle={t.title} />
                </div>
                
                {/* 主题内容 */}
                <Link 
                  href={`/themes/${t.id}`}
                  className="block no-underline relative z-1"
                >
                  {/* 标题区域 */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-pink/20 to-brand-purple/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-bold text-white">
                        {t.title.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-lg text-white mb-1 truncate group-hover:text-brand-pink transition-colors">
                        {t.title}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                          <Calendar className="w-3 h-3" />
                          {new Date(t.created_at).toLocaleDateString('zh-CN', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                          <Hash className="w-3 h-3" />
                          {t.task_count ?? 0} 个任务
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* 描述 */}
                  {t.description && (
                    <div className="mt-3 mb-4">
                      <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed pl-0.5 border-l-2 border-white/10 pl-3">
                        {t.description}
                      </p>
                    </div>
                  )}
                  
                  {/* 底部操作提示 */}
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      点击查看详情
                    </div>
                    <div className="flex items-center gap-1 text-xs text-brand-pink font-medium">
                      <span>编辑任务</span>
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
          
          {/* 操作说明 */}
          {themes && themes.length > 0 && (
            <div className="mt-8 p-5 glass rounded-2xl border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-brand-pink/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-brand-pink">i</span>
                </div>
                <h3 className="text-sm font-semibold text-gray-200">使用提示</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-pink mt-1.5 flex-shrink-0"></div>
                  <p className="text-xs text-gray-400 flex-1">点击主题卡片查看和编辑任务</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-purple mt-1.5 flex-shrink-0"></div>
                  <p className="text-xs text-gray-400 flex-1">桌面端鼠标悬停显示编辑和删除按钮</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                  <p className="text-xs text-gray-400 flex-1">每个主题可以包含多个相关任务</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}