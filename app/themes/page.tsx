// /app/themes/page.tsx
// 优化版本：改进UI界面，更美观的视觉设计
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from "next/link";
import { listMyThemes } from "./actions";
import { Plus, Layers, Edit, Hash, Clock, Sparkles, Grid, List, ChevronRight } from "lucide-react";
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
    <div className="min-h-svh max-w-4xl mx-auto p-4 pb-28">
      {/* 头部区域 */}
      <div className="mb-8 pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-white to-gray-300 bg-clip-text text-transparent">
              主题库
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              管理你的专属游戏主题，创建个性化体验
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1 glass rounded-full border border-white/10">
              {themes?.length || 0} 个主题
            </span>
          </div>
        </div>

        {/* 会员状态卡片 */}
        <div className="glass rounded-2xl p-4 mb-6 border border-white/10 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-300">欢迎回来，{profile?.nickname || user.email?.split('@')[0]}</p>
                <p className="text-xs text-gray-400">
                  会员有效期：{profile?.account_expires_at ? 
                    new Date(profile.account_expires_at).toLocaleDateString('zh-CN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : 
                    '新用户享受30天体验期'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 操作区域 */}
      <div className="glass rounded-2xl p-4 mb-6 border border-white/10 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Link
              href="/themes/new"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 gradient-primary rounded-xl font-semibold text-white hover:shadow-lg hover:shadow-brand-pink/25 transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              创建新主题
            </Link>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg glass border border-white/10 hover:bg-white/5 transition-colors">
              <Grid className="w-4 h-4" />
            </button>
            <button className="p-2 rounded-lg bg-white/10 border border-white/10">
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 主题列表区域 */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5" />
          我的主题
          <span className="text-xs px-2 py-0.5 bg-white/5 rounded-full">
            {themes?.length || 0}
          </span>
        </h2>

        {themes?.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center border border-white/10 backdrop-blur-xl">
            <div className="w-24 h-24 mx-auto mb-6 glass rounded-2xl flex items-center justify-center border border-white/10">
              <Layers className="w-12 h-12 text-white/20" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">暂无主题</h3>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              开始创建你的第一个主题，设计专属于你们的互动体验
            </p>
            <Link
              href="/themes/new"
              className="inline-flex items-center gap-2 px-8 py-3 gradient-primary rounded-xl font-semibold text-white hover:shadow-lg hover:shadow-brand-pink/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              创建第一个主题
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {themes?.map((t) => (
              <div 
                key={t.id} 
                className="group relative glass rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-xl hover:shadow-brand-pink/10 backdrop-blur-xl overflow-hidden"
              >
                {/* 渐变装饰 */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-brand-pink/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* 操作按钮 */}
                <div className="absolute top-4 right-4 flex items-center gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Link
                    href={`/themes/${t.id}`}
                    className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
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
                  {/* 主题图标 */}
                  <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-4">
                    <span className="text-lg font-bold text-white">
                      {t.title.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  
                  {/* 标题 */}
                  <h3 className="font-semibold text-lg text-white mb-2 line-clamp-1 group-hover:text-brand-pink transition-colors">
                    {t.title}
                  </h3>
                  
                  {/* 描述 */}
                  {t.description && (
                    <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                      {t.description}
                    </p>
                  )}
                  
                  {/* 统计信息 */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs text-gray-300">{t.task_count ?? 0}</span>
                        <span className="text-xs text-gray-500">任务</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {new Date(t.created_at).toLocaleDateString('zh-CN', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </span>
                      </div>
                    </div>
                    
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-brand-pink group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部提示 */}
      {themes && themes.length > 0 && (
        <div className="glass rounded-2xl p-5 border border-white/10 backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-pink/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-brand-pink" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-200 mb-2">使用提示</h4>
              <div className="space-y-2 text-xs text-gray-400">
                <p className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-pink"></span>
                  点击主题卡片进入详情页，可添加和编辑任务
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-purple"></span>
                  鼠标悬停在主题卡片上显示编辑和删除按钮
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  每个主题可以包含多个任务，游戏中会随机抽取
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}