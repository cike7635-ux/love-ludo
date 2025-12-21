// /middleware.ts - 完整版本
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// ==================== 配置与工具函数 ====================

/**
 * 检查是否是管理员邮箱
 */
function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || ['2200691917@qq.com'];
  return adminEmails.some(adminEmail => 
    adminEmail.trim().toLowerCase() === email.toLowerCase()
  );
}

/**
 * 检查是否受保护的游戏路径
 */
function isProtectedGamePath(path: string): boolean {
  // 精确匹配的路径
  const exactPaths = [
    '/lobby',
    '/game',
    '/profile', 
    '/themes',
    '/game-history',
  ];
  
  if (exactPaths.includes(path)) {
    return true;
  }
  
  // 前缀匹配的路径（如 /themes/123）
  const prefixPaths = [
    '/game/',
    '/themes/',
  ];
  
  return prefixPaths.some(prefix => path.startsWith(prefix));
}

/**
 * 检查是否公开路径（不需要认证）
 */
function isPublicPath(path: string): boolean {
  // 精确匹配的公开路径
  const exactPublicPaths = [
    '/',
    '/login',
    '/account-expired', 
    '/renew',
    '/admin',
    '/admin/unauthorized',
    '/login/expired',
  ];
  
  if (exactPublicPaths.includes(path)) {
    return true;
  }
  
  // 前缀匹配的公开路径
  const prefixPublicPaths = [
    '/auth/',
    '/api/auth/',
  ];
  
  for (const prefix of prefixPublicPaths) {
    if (path.startsWith(prefix)) {
      return true;
    }
  }
  
  return false;
}

// ==================== 中间件主函数 ====================

export async function middleware(request: NextRequest) {
  const currentPath = request.nextUrl.pathname;
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] 中间件开始: ${currentPath}`);
  
  try {
    // 创建响应对象
    const response = NextResponse.next();
    
    // 创建Supabase客户端
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => {
            const cookies: { name: string; value: string }[] = [];
            request.cookies.getAll().forEach(cookie => {
              cookies.push({ name: cookie.name, value: cookie.value });
            });
            return cookies;
          },
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    // ============ 路径分类处理 ============
    
    // 1. 公开路径直接放行
    if (isPublicPath(currentPath)) {
      console.log(`[${requestId}] 公开路径，直接放行`);
      return response;
    }
    
    // 2. API路径处理
    if (currentPath.startsWith('/api/')) {
      console.log(`[${requestId}] API路径，放行`);
      return response;
    }
    
    // 3. 管理员路径处理（独立验证）
    if (currentPath.startsWith('/admin')) {
      console.log(`[${requestId}] 管理员路径处理`);
      
      // 管理员登录页面直接放行
      if (currentPath === '/admin' || currentPath === '/admin/login') {
        console.log(`[${requestId}] 管理员登录页，放行`);
        return response;
      }
      
      // 其他管理员页面需要验证管理员密钥
      const adminKeyVerified = request.cookies.get('admin_key_verified');
      if (!adminKeyVerified || adminKeyVerified.value !== 'true') {
        console.log(`[${requestId}] 管理员未通过密钥验证`);
        
        const redirectUrl = new URL('/admin', request.url);
        redirectUrl.searchParams.set('redirect', currentPath);
        return NextResponse.redirect(redirectUrl);
      }
      
      // 验证管理员登录状态
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        console.log(`[${requestId}] 管理员未登录`);
        return NextResponse.redirect(new URL('/admin', request.url));
      }
      
      // 验证管理员邮箱
      if (!isAdminEmail(user.email)) {
        console.log(`[${requestId}] 非管理员访问后台: ${user.email}`);
        return NextResponse.redirect(new URL('/admin/unauthorized', request.url));
      }
      
      console.log(`[${requestId}] 管理员验证通过: ${user.email}`);
      return response;
    }
    
    // 4. 受保护的游戏路径（完整验证）
    if (isProtectedGamePath(currentPath)) {
      console.log(`[${requestId}] 游戏路径验证开始`);
      
      try {
        // ============ 基础登录验证 ============
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          console.log(`[${requestId}] 用户未登录`);
          
          const redirectUrl = new URL('/login', request.url);
          redirectUrl.searchParams.set('redirect', currentPath);
          return NextResponse.redirect(redirectUrl);
        }
        
        console.log(`[${requestId}] 用户已登录: ${user.email}`);
        
        // ============ 获取用户资料 ============
        let profile = null;
        try {
          const { data, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, account_expires_at, last_login_at, last_login_session')
            .eq('id', user.id)
            .single();
          
          if (profileError) {
            console.warn(`[${requestId}] 查询用户资料失败: ${profileError.message}`);
            // 资料不存在时允许继续，避免循环重定向
            return response;
          }
          
          profile = data;
        } catch (profileError) {
          console.error(`[${requestId}] 获取用户资料异常:`, profileError);
          return response;
        }
        
        if (!profile) {
          console.log(`[${requestId}] 用户资料不存在`);
          return response;
        }
        
        // ============ 会员过期验证 ============
        const now = new Date();
        const isExpired = !profile.account_expires_at || 
                         new Date(profile.account_expires_at) < now;
        
        if (isExpired && currentPath !== '/account-expired') {
          console.log(`[${requestId}] 会员已过期: ${profile.account_expires_at}`);
          return NextResponse.redirect(new URL('/account-expired', request.url));
        }
        
        // ============ 优化的多设备登录验证 ============
        try {
          // 获取当前会话信息
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          
          if (!currentSession) {
            console.warn(`[${requestId}] 当前会话不存在`);
            const redirectUrl = new URL('/login', request.url);
            redirectUrl.searchParams.set('redirect', currentPath);
            return NextResponse.redirect(redirectUrl);
          }
          
          // 生成当前会话标识
          const currentSessionId = `sess_${currentSession.user.id}_${currentSession.access_token.substring(0, 12)}`;
          
          // 只有数据库中存在会话标识时才进行比对
          if (profile.last_login_session) {
            console.log(`[${requestId}] 会话标识检查:`, {
              stored: profile.last_login_session.substring(0, 20),
              current: currentSessionId.substring(0, 20),
              match: profile.last_login_session === currentSessionId
            });
            
            // 只在标识符明确不匹配时才视为多设备登录
            if (profile.last_login_session !== currentSessionId) {
              console.log(`[${requestId}] 检测到会话标识不匹配`);
              
              // 额外检查：是否是刚登录的情况（最后登录时间很近）
              const lastLoginTime = profile.last_login_at ? new Date(profile.last_login_at) : null;
              const now = new Date();
              const timeSinceLastLogin = lastLoginTime ? now.getTime() - lastLoginTime.getTime() : 0;
              
              // 如果最后登录发生在最近30秒内，可能是正常登录过程，不强制退出
              if (timeSinceLastLogin < 30000) {
                console.log(`[${requestId}] 最后登录发生在 ${timeSinceLastLogin}ms 前，认为是正常登录，跳过多设备检查`);
              } else {
                console.log(`[${requestId}] 判定为多设备登录，强制退出`);
                
                // 清除会话cookie
                response.cookies.delete('sb-access-token');
                response.cookies.delete('sb-refresh-token');
                
                // 重定向到过期页面
                const redirectUrl = new URL('/login/expired', request.url);
                redirectUrl.searchParams.set('email', user.email || '');
                redirectUrl.searchParams.set('reason', 'multi_device');
                if (lastLoginTime) {
                  redirectUrl.searchParams.set('last_login_time', lastLoginTime.toISOString());
                }
                
                return NextResponse.redirect(redirectUrl);
              }
            }
          } else {
            // 数据库中无会话标识，说明是首次或重置后登录
            console.log(`[${requestId}] 无历史会话标识，初始化新的会话`);
          }
          
          // ============ 更新会话信息 ============
          // 只有在会话验证通过后才更新
          try {
            const newSessionId = `sess_${currentSession.user.id}_${currentSession.access_token.substring(0, 12)}`;
            await supabase
              .from('profiles')
              .update({ 
                last_login_at: now.toISOString(),
                last_login_session: newSessionId,
                updated_at: now.toISOString()
              })
              .eq('id', user.id);
              
            console.log(`[${requestId}] 已更新会话信息`);
          } catch (updateError) {
            console.warn(`[${requestId}] 更新会话信息失败:`, updateError);
          }
          
        } catch (sessionError) {
          console.error(`[${requestId}] 会话验证错误:`, sessionError);
        }
        
        console.log(`[${requestId}] 游戏路径验证通过`);
        return response;
        
      } catch (gamePathError) {
        console.error(`[${requestId}] 游戏路径验证异常:`, gamePathError);
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }
    
    // 5. 其他未分类路径
    console.log(`[${requestId}] 其他路径，放行`);
    return response;
    
  } catch (globalError) {
    console.error(`[中间件] 全局异常:`, globalError);
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

// ==================== 中间件配置 ====================

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
