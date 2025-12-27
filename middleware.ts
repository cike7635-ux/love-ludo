import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// ==================== 工具函数 ====================

function generateSessionId(userId: string, accessToken: string): string {
  const tokenPart = accessToken.substring(0, 12);
  // 🚀 移除时间戳，确保同一设备登录生成的会话标识相同
  return `sess_${userId}_${tokenPart}`;
}

function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || ['2200691917@qq.com'];
  return adminEmails.some(adminEmail => 
    adminEmail.trim().toLowerCase() === email.toLowerCase()
  );
}

function isProtectedGamePath(path: string): boolean {
  const exactPaths = ['/lobby', '/game', '/profile', '/themes', '/game-history', '/themes/new'];
  if (exactPaths.includes(path)) return true;
  const prefixPaths = ['/game/', '/themes/'];
  return prefixPaths.some(prefix => path.startsWith(prefix));
}

function isPublicPath(path: string): boolean {
  const exactPublicPaths = ['/', '/login', '/account-expired', '/renew', '/admin', '/admin/unauthorized', '/login/expired'];
  if (exactPublicPaths.includes(path)) return true;
  const prefixPublicPaths = ['/auth/', '/api/auth/'];
  return prefixPublicPaths.some(prefix => path.startsWith(prefix));
}

function createMiddlewareClient(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              path: '/',
            });
          });
        },
      },
    }
  );

  return { supabase, response };
}

async function getVerifiedUser(supabase: any) {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return { user: null, error };
    }
    
    return { user, error: null };
  } catch (error: any) {
    return { user: null, error };
  }
}

async function getCurrentSession(supabase: any) {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    return { session, error };
  } catch (error: any) {
    return { session: null, error };
  }
}

async function updateUserSessionForLogin(supabase: any, userId: string, sessionId: string) {
  const now = new Date().toISOString();
  return await supabase
    .from('profiles')
    .update({
      last_login_at: now,
      last_login_session: sessionId,
      updated_at: now
    })
    .eq('id', userId);
}

async function updateUserActivity(supabase: any, userId: string) {
  const now = new Date().toISOString();
  await supabase
    .from('profiles')
    .update({
      last_login_at: now,
      updated_at: now
    })
    .eq('id', userId);
}

/**
 * 🔥 关键修复：严格的多设备检测（3秒宽限期）
 */
async function performStrictDeviceCheck(
  supabase: any, 
  user: any, 
  currentSessionId: string, 
  requestId: string,
  profile: any
): Promise<{ allowed: boolean; reason: string }> {
  
  // 1. 检查是否有会话标识
  if (!profile.last_login_session) {
    console.log(`[${requestId}] 用户无会话标识，设置为当前会话`);
    await updateUserSessionForLogin(supabase, user.id, currentSessionId);
    return { allowed: true, reason: 'session_initialized' };
  }
  
  // 2. 检查是否是初始会话（init_开头）
  if (profile.last_login_session.startsWith('init_')) {
    console.log(`[${requestId}] 更新初始会话为真实会话`);
    await updateUserSessionForLogin(supabase, user.id, currentSessionId);
    return { allowed: true, reason: 'initial_session_updated' };
  }
  
  // 3. 🔥 核心比对：会话标识必须完全匹配
  const storedSession = profile.last_login_session;
  
  console.log(`[${requestId}] 🔍 会话检查:`, {
    current: currentSessionId,
    stored: storedSession,
    match: storedSession === currentSessionId
  });
  
  if (storedSession === currentSessionId) {
    console.log(`[${requestId}] ✅ 会话匹配，允许访问`);
    
    // 🔥 活动时只更新时间，不更新会话标识
    updateUserActivity(supabase, user.id).catch(() => {});
    
    return { allowed: true, reason: 'session_matched' };
  }
  
  // 🔥 4. 3秒宽限期（仅用于token刷新）
  const lastLoginTime = profile.last_login_at ? new Date(profile.last_login_at) : null;
  if (lastLoginTime) {
    const timeSinceLastLogin = Date.now() - lastLoginTime.getTime();
    if (timeSinceLastLogin < 3000) { // 🔥 3秒宽限期
      console.log(`[${requestId}] 3秒宽限期内，更新会话标识`);
      
      await updateUserSessionForLogin(supabase, user.id, currentSessionId);
      return { allowed: true, reason: 'grace_period' };
    }
  }
  
  // 5. 多设备登录 → 拒绝访问
  console.log(`[${requestId}] 🚨 检测到多设备登录！立即踢出`);
  console.log(`[${requestId}] 存储会话: ${storedSession}`);
  console.log(`[${requestId}] 当前会话: ${currentSessionId}`);
  
  return { allowed: false, reason: 'multi_device' };
}

// ==================== 中间件主函数 ====================

export async function middleware(request: NextRequest) {
  const currentPath = request.nextUrl.pathname;
  const requestId = Math.random().toString(36).substring(7);
  
  if (!currentPath.startsWith('/_next') && !currentPath.startsWith('/favicon')) {
    console.log(`[${requestId}] 中间件: ${currentPath}`);
  }
  
  try {
    const { supabase, response } = createMiddlewareClient(request);
    
    // 1. 公开路径
    if (isPublicPath(currentPath)) {
      return response;
    }
    
    // 2. API路径
    if (currentPath.startsWith('/api/')) {
      return response;
    }
    
    // 3. 管理员路径
    if (currentPath.startsWith('/admin')) {
      return response;
    }
    
    // 4. 受保护的游戏路径
    if (isProtectedGamePath(currentPath)) {
      try {
        const { user, error: authError } = await getVerifiedUser(supabase);
        
        if (authError || !user) {
          console.log(`[${requestId}] 用户未登录，重定向到登录页`);
          const redirectUrl = new URL('/login', request.url);
          redirectUrl.searchParams.set('redirect', currentPath);
          return NextResponse.redirect(redirectUrl);
        }
        
        console.log(`[${requestId}] 用户已登录: ${user.email}`);
        
        const { session: currentSession, error: sessionError } = await getCurrentSession(supabase);
        
        if (sessionError || !currentSession) {
          console.warn(`[${requestId}] 获取会话失败`);
          const redirectUrl = new URL('/login', request.url);
          redirectUrl.searchParams.set('redirect', currentPath);
          return NextResponse.redirect(redirectUrl);
        }
        
        // 生成当前会话标识
        const currentSessionId = generateSessionId(user.id, currentSession.access_token);
        
        // 查询用户资料
        let profile = null;
        try {
          const { data, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, account_expires_at, last_login_at, last_login_session, created_at')
            .eq('id', user.id)
            .single();
          
          if (profileError) {
            console.error(`[${requestId}] 查询用户资料失败:`, profileError);
            const redirectUrl = new URL('/login', request.url);
            redirectUrl.searchParams.set('redirect', currentPath);
            return NextResponse.redirect(redirectUrl);
          }
          
          profile = data;
        } catch (profileError) {
          console.error(`[${requestId}] 查询用户资料异常:`, profileError);
          const redirectUrl = new URL('/login', request.url);
          redirectUrl.searchParams.set('redirect', currentPath);
          return NextResponse.redirect(redirectUrl);
        }
        
        if (!profile) {
          const redirectUrl = new URL('/login', request.url);
          redirectUrl.searchParams.set('redirect', currentPath);
          return NextResponse.redirect(redirectUrl);
        }
        
        // 会员过期检查
        const now = new Date();
        if (!profile.account_expires_at) {
          console.log(`[${requestId}] 用户未设置会员有效期`);
          if (currentPath !== '/account-expired' && currentPath !== '/renew') {
            return NextResponse.redirect(new URL('/account-expired', request.url));
          }
        } else {
          const expiryDate = new Date(profile.account_expires_at);
          const isExpired = expiryDate < now;
          
          if (isExpired) {
            console.log(`[${requestId}] 会员已过期`);
            if (currentPath !== '/account-expired' && currentPath !== '/renew') {
              return NextResponse.redirect(new URL('/account-expired', request.url));
            }
          }
        }
        
        // 🔥 执行严格的多设备检测（3秒宽限期）
        const deviceCheck = await performStrictDeviceCheck(
          supabase, 
          user, 
          currentSessionId, 
          requestId,
          profile
        );
        
        if (!deviceCheck.allowed) {
          console.log(`[${requestId}] ❌ 多设备检测不通过: ${deviceCheck.reason}`);
          
          const redirectUrl = new URL('/login/expired', request.url);
          redirectUrl.searchParams.set('reason', deviceCheck.reason);
          redirectUrl.searchParams.set('email', user.email || '');
          
          return NextResponse.redirect(redirectUrl);
        }
        
        console.log(`[${requestId}] ✅ 安全检查通过，放行`);
        return response;
        
      } catch (error) {
        console.error(`[${requestId}] 验证异常:`, error);
        const redirectUrl = new URL('/login', request.url);
        redirectUrl.searchParams.set('redirect', currentPath);
        return NextResponse.redirect(redirectUrl);
      }
    }
    
    return response;
    
  } catch (globalError) {
    console.error(`[中间件] 全局异常:`, globalError);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};