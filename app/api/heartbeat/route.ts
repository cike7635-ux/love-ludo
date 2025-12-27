// /app/api/heartbeat/route.ts - 心跳API
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  console.log('[心跳API] 请求');
  try {
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
              console.error('[心跳API] 设置cookie失败:', error);
            }
          },
        },
      }
    );

    // 获取当前用户
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('[心跳API] 用户未登录');
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    // 更新用户最后活动时间
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        last_login_at: now,
        updated_at: now
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[心跳API] 更新活动时间失败:', updateError);
      return NextResponse.json({ success: false, error: '更新失败' }, { status: 500 });
    }

    console.log('[心跳API] 活动时间已更新:', user.email);
    return NextResponse.json({ 
      success: true, 
      message: '活动时间已更新',
      updated_at: now
    });

  } catch (error: any) {
    console.error('[心跳API] 异常:', error);
    return NextResponse.json({ 
      success: false, 
      error: '服务器内部错误' 
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';