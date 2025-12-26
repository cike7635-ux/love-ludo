// /app/profile/history/page.tsx - 游戏历史记录页面（修复版）
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from "next/link";

type GameHistoryRecord = {
  id: string;
  session_id: string | null;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  task_results: { description?: string; task_text?: string | null; completed: boolean }[];
};

export default async function GameHistoryPage() {
  // 1. 创建Supabase客户端（简化版，移除setAll）
  const cookieStore = await cookies();
  
  // ✅ 使用简化的Supabase客户端，只读不写cookie
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { 
      cookies: { 
        getAll: () => cookieStore.getAll(),
        // ❌ 移除 setAll，页面组件不能设置cookie
      }
    }
  );
  
  // 2. 检查用户登录状态（使用getUser替代getSession）
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }
  
  // 3. ❌ 删除重复的多设备检测逻辑
  // 注意：多设备检测已经在中间件中处理，这里不需要重复
  
  // 4. 获取用户资料（只获取需要的字段）
  const { data: profile } = await supabase
    .from('profiles')
    .select('account_expires_at, nickname, email')
    .eq('id', user.id)
    .single();
  
  if (!profile) {
    console.error('用户资料未找到:', user.id);
    redirect('/login?error=profile_not_found');
  }
  
  // 5. 检查会员有效期（中间件已处理，这里只做显示）
  const isExpired = !profile?.account_expires_at || new Date(profile.account_expires_at) < new Date();
  if (isExpired) {
    // 中间件应该已经处理了重定向，这里做双重保险
    redirect('/account-expired');
  }
  
  // 6. 获取游戏记录数据
  const { data: history } = await supabase
    .from("game_history")
    .select("*")
    .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
    .order("ended_at", { ascending: false })
    .limit(50);

  const records = (history ?? []) as GameHistoryRecord[];

  // 7. 获取相关玩家的昵称
  const playerIds = new Set<string>();
  records.forEach(record => {
    if (record.player1_id) playerIds.add(record.player1_id);
    if (record.player2_id) playerIds.add(record.player2_id);
    if (record.winner_id) playerIds.add(record.winner_id);
  });

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nickname")
    .in("id", Array.from(playerIds));

  const nicknameMap = new Map((profiles ?? []).map(p => [p.id, p.nickname]));

  // 8. 渲染页面
  return (
    <div className="max-w-md mx-auto min-h-svh flex flex-col pb-24">
      <div className="gradient-primary px-6 pt-6 pb-10 rounded-b-3xl">
        <div className="flex items-center justify-between mb-6">
          <Link href="/profile" className="text-white/80 hover:text-white">
            ← 返回
          </Link>
          <h2 className="text-xl font-bold">游戏记录</h2>
          <div className="w-12" />
        </div>
      </div>

      {/* 会员状态提示 */}
      <div className="px-6 mt-4">
        <div className="glass rounded-xl p-3 mb-4">
          <p className="text-sm text-green-400 text-center">
            会员有效期至：{profile?.account_expires_at ? 
              new Date(profile.account_expires_at).toLocaleDateString('zh-CN') : 
              '未设置'}
          </p>
        </div>
      </div>

      <div className="px-6 mt-2 space-y-3">
        {records.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-8 text-center">
            <p className="text-gray-400">暂无游戏记录</p>
            <Link
              href="/lobby"
              className="mt-4 inline-block text-sm text-pink-400 hover:text-pink-300"
            >
              去开始游戏 →
            </Link>
          </div>
        ) : (
          records.map((record) => {
            const isWinner = record.winner_id === user.id;
            const opponentId = record.player1_id === user.id ? record.player2_id : record.player1_id;
            const opponentNickname = opponentId ? nicknameMap.get(opponentId) ?? "匿名玩家" : "匿名玩家";
            const endedAt = record.ended_at ? new Date(record.ended_at) : null;
            const completedTasks = (record.task_results ?? []).filter(t => t.completed).length;
            const totalTasks = (record.task_results ?? []).length;

            return (
              <div
                key={record.id}
                className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 hover:bg-white/10 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {isWinner ? (
                      <span className="px-2 py-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded text-xs font-bold">
                        胜利
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-white/10 rounded text-xs text-gray-400">
                        失败
                      </span>
                    )}
                    <span className="text-sm text-gray-400">
                      vs {opponentNickname}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {endedAt ? endedAt.toLocaleDateString("zh-CN") : "—"}
                  </span>
                </div>

                <div className="text-xs text-gray-400 space-y-2">
                  <div className="flex items-center justify-between">
                    <span>完成任务: {completedTasks} / {totalTasks}</span>
                    {endedAt && (
                      <span className="text-gray-500">
                        {endedAt.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                  {totalTasks > 0 && (
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-pink-500 to-purple-500"
                        style={{ width: `${Math.round((completedTasks / totalTasks) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>

                {totalTasks > 0 && (
                  <details className="mt-3 text-xs">
                    <summary className="cursor-pointer text-gray-400 hover:text-gray-300">
                      查看任务详情
                    </summary>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(record.task_results ?? []).map((task, idx) => (
                        <span
                          key={idx}
                          className={
                            `inline-flex items-center rounded-full px-2.5 py-1 border ` +
                            (task.completed
                              ? "bg-green-500/15 border-green-500/30 text-green-300"
                              : "bg-white/10 border-white/20 text-gray-300")
                          }
                        >
                          <span className={task.completed ? "text-green-300 mr-1" : "text-gray-300 mr-1"}>
                            {task.completed ? "✓" : "○"}
                          </span>
                          <span className="truncate max-w-[12rem]">{task.task_text}</span>
                        </span>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}