// /app/game/page.tsx
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from "next/link";
import { Button } from "@/components/ui/button";
import GameView from "@/components/game-view";
import { getActiveSession } from "./actions";

export default async function GamePage() {
  // 1. 创建Supabase客户端并验证会员
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  
  // 2. 检查用户登录状态
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }
  
  // 3. 检查会员有效期
  const { data: profile } = await supabase
    .from('profiles')
    .select('account_expires_at')
    .eq('id', user.id)
    .single();
  
  const isExpired = !profile?.account_expires_at || new Date(profile.account_expires_at) < new Date();
  if (isExpired) {
    redirect('/account-expired');
  }
  
  // 4. 原有的业务逻辑
  const userId = user.id;
  const { session } = await getActiveSession();

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      {session && userId ? (
        <GameView session={session as any} userId={userId} />
      ) : (
        <div className="w-full max-w-md grid gap-4 text-center">
          <h2 className="text-xl font-bold">暂无进行中的游戏</h2>
          <p className="text-sm text-foreground/70">请在大厅创建或加入房间并开始游戏。</p>
          <div>
            <Button asChild variant="outline">
              <Link href="/lobby">返回大厅</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
