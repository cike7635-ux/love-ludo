import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from "next/link";

// 辅助函数：从JWT中解析创建时间（安全版本）
function getJwtCreationTime(jwt: string): Date | null {
  try {
    // JWT格式: header.payload.signature
    const payloadBase64 = jwt.split('.')[1];
    if (!payloadBase64) return null;
    
    // Base64解码（兼容Node.js和浏览器环境）
    let payloadJson: string;
    
    // 处理可能的Base64 URL编码
    const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    const paddedBase64 = pad ? base64 + '='.repeat(4 - pad) : base64;
    
    // 在Node.js环境中使用Buffer，在浏览器中使用atob
    if (typeof Buffer !== 'undefined') {
      payloadJson = Buffer.from(paddedBase64, 'base64').toString();
    } else {
      // 浏览器环境
      payloadJson = decodeURIComponent(
        atob(paddedBase64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    }
    
    const payload = JSON.parse(payloadJson);
    
    // iat是签发时间（秒），需要转换为毫秒
    if (payload.iat) {
      return new Date(payload.iat * 1000);
    }
    
    return null;
  } catch (error) {
    console.error('解析JWT失败:', error);
    return null;
  }
}

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
  // 1. 创建Supabase客户端（使用createServerClient）
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
    .select('account_expires_at, last_login_at, last_login_session, nickname, email')
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
      console.log(`[游戏记录页面] 检测到新登录，强制退出用户: ${user.email}`);
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
  console.log(`[游戏记录页面] 用户 ${user.email} 会话验证通过`);
  console.log(`  - JWT会话创建时间: ${sessionCreatedTime ? sessionCreatedTime.toISOString() : '无法解析'}`);
  console.log(`  - 最后登录时间: ${lastLoginTime ? lastLoginTime.toISOString() : '无记录'}`);
  console.log(`  - 会话标识: ${profile.last_login_session || '无标识'}`);
  // ============ 会话验证结束 ============
  
  // 7. 原有的业务逻辑 - 获取游戏记录数据
  const { data: history } = await supabase
    .from("game_history")
    .select("*")
    .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
    .order("ended_at", { ascending: false })
    .limit(50);

  const records = (history ?? []) as GameHistoryRecord[];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nickname")
    .in("id", [...new Set(records.flatMap(r => [r.player1_id, r.player2_id, r.winner_id]).filter(Boolean) as string[])]);

  const nicknameMap = new Map((profiles ?? []).map(p => [p.id, p.nickname]));

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
