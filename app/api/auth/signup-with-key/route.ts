// /app/api/auth/signup-with-key/route.ts - 修复偏好设置问题
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  console.log('[API] 注册开始');
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
              console.error('[注册API] 设置cookie失败:', error);
            }
          },
        },
      }
    );

    const { email, password, keyCode } = await request.json();
    const formattedKeyCode = keyCode?.trim().toUpperCase();
    
    if (!email || !password || !keyCode) {
      return NextResponse.json({ error: '邮箱、密码和密钥必填' }, { status: 400 });
    }

    const { data: keyData, error: keyError } = await supabase
      .from('access_keys')
      .select('id, key_code, used_count, max_uses, key_expires_at, account_valid_for_days, original_duration_hours, duration_unit')
      .eq('key_code', formattedKeyCode)
      .eq('is_active', true)
      .single();

    if (keyError || !keyData) {
      console.error('[API] 密钥查询失败:', keyError);
      return NextResponse.json({ error: '产品密钥无效' }, { status: 400 });
    }
    
    if (keyData.used_count >= keyData.max_uses) {
      return NextResponse.json({ error: '密钥使用次数已达上限' }, { status: 400 });
    }
    
    if (keyData.key_expires_at && new Date() > new Date(keyData.key_expires_at)) {
      return NextResponse.json({ error: '密钥已过期' }, { status: 400 });
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password: password.trim(),
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/login`,
      },
    });
    
    if (authError || !authData.user) {
      console.error('[API] 创建用户失败:', authError);
      return NextResponse.json({ error: `注册失败: ${authError?.message}` }, { status: 400 });
    }

    // 计算有效期
    const now = new Date();
    let accountExpiresAt: string;
    
    if (keyData.original_duration_hours && keyData.duration_unit === 'hours') {
      const hours = parseFloat(keyData.original_duration_hours.toString());
      const expiryDate = new Date(now.getTime() + hours * 60 * 60 * 1000);
      accountExpiresAt = expiryDate.toISOString();
    } else {
      const validDays = keyData.account_valid_for_days || 30;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + validDays);
      accountExpiresAt = expiryDate.toISOString();
    }

    // 🔥 生成初始会话标识（与中间件格式一致）
    const initialSessionId = `init_${authData.user.id}_${Date.now()}`;
    
    console.log('[API] 创建用户资料:', {
      userId: authData.user.id,
      sessionId: initialSessionId
    });
    
    // 🔥 创建用户资料
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: authData.user.id,
      email: email.trim(),
      access_key_id: keyData.id,
      account_expires_at: accountExpiresAt,
      last_login_at: now.toISOString(),
      last_login_session: initialSessionId,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      avatar_url: '',
      // 🚀 关键修复：设置为空对象，而不是默认theme
      preferences: {},
    });
    
    if (profileError) {
      console.error('[API] 创建用户资料失败:', profileError);
      try {
        await supabase.auth.admin.deleteUser(authData.user.id);
      } catch (deleteError) {
        console.error('[API] 删除用户失败:', deleteError);
      }
      return NextResponse.json({ 
        error: '注册失败，用户资料创建错误' 
      }, { status: 500 });
    }

    console.log('[API] 注册成功:', { 
      userId: authData.user.id, 
      email: email.trim(),
      expiresAt: accountExpiresAt
    });

    return NextResponse.json({
      success: true,
      message: '注册成功！请检查邮箱确认注册，然后登录',
      user: { 
        id: authData.user.id, 
        email: authData.user.email 
      },
      expires_at: accountExpiresAt,
      note: '请前往登录页面使用注册的邮箱和密码登录'
    });

  } catch (error: any) {
    console.error('[API] 注册异常:', error);
    return NextResponse.json({ 
      error: '服务器内部错误，请稍后重试或联系客服' 
    }, { status: 500 });
  }
}