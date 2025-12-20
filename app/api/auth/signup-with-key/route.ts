import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  console.log('[API] 注册请求开始');
  
  try {
    // 1. 创建客户端
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              try { cookieStore.set(name, value, options); } catch {}
            });
          },
        },
      }
    );

    // 2. 解析数据
    const { email, password, keyCode } = await request.json();
    console.log('[API] 接收到请求:', { email, keyCode: keyCode?.toUpperCase() });

    if (!email || !password || !keyCode) {
      return NextResponse.json({ error: '邮箱、密码和密钥均为必填' }, { status: 400 });
    }

    // 3. 【核心】验证密钥 - 请确认您的表名是 `access_keys` 还是 `license_keys`
    const { data: keyData, error: keyError } = await supabase
      .from('access_keys') // 🔥 如果表名不对，这里会报错！
      .select('id, key_code, is_active, used_count, max_uses')
      .eq('key_code', keyCode.trim().toUpperCase())
      .eq('is_active', true)
      .single();

    console.log('[API] 密钥查询结果:', { keyData, keyError });

    if (keyError || !keyData) {
      return NextResponse.json({ error: '产品密钥无效或不存在' }, { status: 400 });
    }
    if (keyData.used_count >= keyData.max_uses) {
      return NextResponse.json({ error: '密钥使用次数已达上限' }, { status: 400 });
    }

    // 4. 【核心】创建用户
    console.log('[API] 开始创建用户...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password: password.trim(),
    });

    console.log('[API] 用户创建结果:', { authError, userId: authData?.user?.id });

    if (authError) {
      return NextResponse.json({ error: `注册失败: ${authError.message}` }, { status: 400 });
    }

    // 5. 简化：仅返回成功，不进行任何数据库更新操作
    console.log('[API] 注册流程成功完成');
    return NextResponse.json({
      success: true,
      message: '注册成功！',
      user: { id: authData.user?.id, email: authData.user?.email }
    });

  } catch (error: any) {
    // 6. 捕获并记录所有未预料的错误
    console.error('[API] 服务器内部捕获到异常:', error);
    return NextResponse.json(
      { error: `服务器内部错误: ${error.message}` }, // 将详细消息返回给前端
      { status: 500 }
    );
  }
}
