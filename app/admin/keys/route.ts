import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// 生成随机密钥的函数
function generateKeyCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'CPFLY-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// GET请求：获取所有密钥
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data, error } = await supabase
      .from('access_keys')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取密钥列表失败:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('服务器错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

// POST请求：创建新密钥
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const body = await request.json();

    // 生成密钥
    const keyCode = generateKeyCode();

    // 插入数据库
    const { data, error } = await supabase
      .from('access_keys')
      .insert({
        key_code: keyCode,
        description: body.description,
        max_uses: body.maxUses || 1,
        used_count: 0,
        account_valid_for_days: body.validDays || 30,
        is_active: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('创建密钥失败:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('服务器错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
