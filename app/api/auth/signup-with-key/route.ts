// /app/api/auth/signup-with-key/route.ts - 保持原流程，仅优化会话生成
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * 生成唯一的初始会话标识（与中间件同步）
 */
function generateInitialSessionId(userId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `init_${userId}_${timestamp}_${random}`;
}

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

    // 1. 解析数据
    const { email, password, keyCode } = await request.json();
    const formattedKeyCode = keyCode?.trim().toUpperCase();
    
    if (!email || !password || !keyCode) {
      return NextResponse.json({ error: '邮箱、密码和密钥必填' }, { status: 400 });
    }

    // 2. 查询密钥
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

    // 3. 创建用户（需要邮箱确认）
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

    // 4. 计算有效期（与原代码保持一致）
    const now = new Date();
    let accountExpiresAt: string;
    
    // 情况1：有original_duration_hours（小时卡）
    if (keyData.original_duration_hours && keyData.duration_unit === 'hours') {
      const hours = parseFloat(keyData.original_duration_hours.toString());
      const expiryDate = new Date(now.getTime() + hours * 60 * 60 * 1000);
      accountExpiresAt = expiryDate.toISOString();
      console.log(`[API] 小时卡: ${hours}小时, 到期时间: ${accountExpiresAt}`);
    }
    // 情况2：使用account_valid_for_days（天卡）
    else {
      const validDays = keyData.account_valid_for_days || 30;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + validDays);
      accountExpiresAt = expiryDate.toISOString();
      console.log(`[API] 天卡: ${validDays}天, 到期时间: ${accountExpiresAt}`);
    }

    // 5. 🔥 优化点：生成唯一的初始会话标识
    const initialSessionId = generateInitialSessionId(authData.user.id);
    
    console.log('[API] 创建用户资料:', {
      userId: authData.user.id,
      sessionId: initialSessionId
    });
    
    // 创建用户资料（保持原逻辑）
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: authData.user.id,
      email: email.trim(),
      access_key_id: keyData.id,
      account_expires_at: accountExpiresAt,
      last_login_at: now.toISOString(),
      last_login_session: initialSessionId, // 🔥 使用优化的唯一标识
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      avatar_url: '',
      preferences: { 
        theme: 'default',
        showPreferenceModal: true // 🔥 标记需要显示偏好选择
      },
    });
    
    if (profileError) {
      console.error('[API] 创建用户资料失败:', profileError);
      // 尝试删除已创建的Auth用户（回滚）
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
      expiresAt: accountExpiresAt,
      requiresEmailConfirmation: true
    });

    // 6. 返回成功响应（保持原流程）
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