// /app/api/auth/signup-with-key/route.ts - 修正版
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

    // 1. 解析数据
    const { email, password, keyCode } = await request.json();
    const formattedKeyCode = keyCode?.trim().toUpperCase();
    
    if (!email || !password || !keyCode) {
      return NextResponse.json({ error: '邮箱、密码和密钥必填' }, { status: 400 });
    }

    // 2. 查询密钥（获取所有有效期相关字段）
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

    // 3. 创建用户（不自动登录）
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

    // 4. 🔥 精确计算有效期（支持小时卡）
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

    // 5. 同步创建完整用户资料
    const initialSessionId = `init_${authData.user.id}_${Date.now()}`;
    
    console.log('[API] 同步创建用户资料:', {
      userId: authData.user.id,
      sessionId: initialSessionId
    });
    
    // 创建用户资料（profiles 表）
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: authData.user.id,
      email: email.trim(),
      access_key_id: keyData.id, // ✅ 触发器会自动更新密钥使用情况
      account_expires_at: accountExpiresAt, // ✅ 必须设置，不能为NULL
      last_login_at: now.toISOString(),
      last_login_session: initialSessionId,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      // 昵称会自动生成，不需要设置
      avatar_url: '',
      preferences: { theme: 'default' },
    });
    
    if (profileError) {
      console.error('[API] 创建用户资料失败:', profileError);
      // 尝试删除已创建的Auth用户（回滚）
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ 
        error: '注册失败，用户资料创建错误' 
      }, { status: 500 });
    }

    console.log('[API] 注册成功:', { 
      userId: authData.user.id, 
      email: email.trim(),
      expiresAt: accountExpiresAt
    });

    // 6. 返回成功响应
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