// /middleware.ts - 基于原注册API优化的中间件
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// ==================== 工具函数 ====================

/**
 * 生成唯一的会话标识（与登录表单同步）
 */
function generateSessionId(userId: string, accessToken: string): string {
  const tokenPart = accessToken.substring(0, 16);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `sess_${userId}_${tokenPart}_${timestamp}_${random}`;
}

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
  const exactPaths = ['/lobby', '/game', '/profile', '/themes', '/game-history', '/themes/new'];
  if (exactPaths.includes(path)) return true;
  const prefixPaths = ['/game/', '/themes/'];
  return prefixPaths.some(prefix => path.startsWith(prefix));
}

/**
 * 检查是否公开路径
 */
function isPublicPath(path: string): boolean {
  const exactPublicPaths = ['/', '/login', '/account-expired', '/renew', '/admin', '/admin/unauthorized', '/login/expired'];
  if (exactPublicPaths.includes(path)) return true;
  const prefixPublicPaths = ['/auth/', '/api/auth/'];
  return prefixPublicPaths.some(prefix => path.startsWith(prefix));
}

/**
 * 创建中间件客户端
 */
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

/**
 * 🔥 关键修复：获取已验证用户（替换getSession）
 */
async function getVerifiedUser(supabase: any) {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.warn('[getVerifiedUser] 获取用户失败:', error.message);
      return { user: null, error };
    }
    
    if (!user) {
      return { user: null, error: new Error('用户不存在') };
    }
    
    return { user, error: null };
  } catch (error: any) {
    console.error('[getVerifiedUser] 异常:', error.message);
    return { user: null, error };
  }
}

/**
 * 🔥 关键修复：获取当前会话
 */
async function getCurrentSession(supabase: any) {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      return { session: null, error: error || new Error('会话不存在') };
    }
    
    return { session, error: null };
  } catch (error: any) {
    console.error('[getCurrentSession] 异常:', error.message);
    return { session: null, error };
  }
}

/**
 * 🔥 关键修复：原子性更新用户会话（用于登录表单）
 */
async function updateUserSessionForLogin(supabase: any, userId: string, sessionId: string) {
  const now = new Date().toISOString();
  
  return await supabase
    .from('profiles')
    .update({
      last_login_at: now,
      last_login_session: sessionId, // 🔥 登录时更新会话标识
      updated_at: now
    })
    .eq('id', userId);
}

/**
 * 🔥 关键修复：更新用户活动时间（不更新会话标识）
 */
async function updateUserActivity(supabase: any, userId: string) {
  const now = new Date().toISOString();
  
  return await supabase
    .from('profiles')
    .update({
      last_login_at: now,
      updated_at: now
    })
    .eq('id', userId);
}

/**
 * 🔥 关键修复：严格的多设备检测
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
  
  // 🔥 3. 核心检测：比对会话标识
  const storedSession = profile.last_login_session;
  
  console.log(`[${requestId}] 🔍 会话检查:`, {
    current: currentSessionId.substring(0, 30) + '...',
    stored: storedSession.substring(0, 30) + '...',
    match: storedSession === currentSessionId
  });
  
  if (storedSession === currentSessionId) {
    console.log(`[${requestId}] ✅ 会话匹配，允许访问`);
    
    // 更新活动时间（但不更新会话标识）
    updateUserActivity(supabase, user.id).catch(() => {});
    
    return { allowed: true, reason: 'session_matched' };
  }
  
  // 4. 检查30秒宽限期（仅用于token刷新）
  const lastLoginTime = profile.last_login_at ? new Date(profile.last_login_at) : null;
  if (lastLoginTime) {
    const timeSinceLastLogin = Date.now() - lastLoginTime.getTime();
    if (timeSinceLastLogin < 30000) {
      console.log(`[${requestId}] 30秒宽限期内，更新会话标识`);
      await updateUserSessionForLogin(supabase, user.id, currentSessionId);
      return { allowed: true, reason: 'grace_period' };
    }
  }
  
  // 5. 多设备登录 → 拒绝访问
  console.log(`[${requestId}] 🚨 检测到多设备登录！`);
  console.log(`[${requestId}] 存储会话: ${storedSession.substring(0, 50)}...`);
  console.log(`[${requestId}] 当前会话: ${currentSessionId.substring(0, 50)}...`);
  
  return { allowed: false, reason: 'multi_device' };
}

/**
 * 处理缺失的用户资料
 */
async function handleMissingProfile(
  supabase: any, 
  user: any, 
  requestId: string, 
  currentPath: string, 
  request: NextRequest
): Promise<NextResponse> {
  
  console.log(`[${requestId}] 用户 ${user.email} 资料不存在，创建默认资料`);
  
  try {
    const now = new Date().toISOString();
    const initialSessionId = `init_${user.id}_${Date.now()}`;
    
    const { error: createError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        account_expires_at: null,
        last_login_at: now,
        last_login_session: initialSessionId,
        created_at: now,
        updated_at: now,
        avatar_url: '',
        preferences: { theme: 'default' }
      });
    
    if (createError) {
      console.error(`[${requestId}] 创建用户资料失败:`, createError);
      return NextResponse.redirect(new URL('/account-expired', request.url));
    }
    
    // 新用户重定向到续费页面
    if (currentPath !== '/account-expired' && currentPath !== '/renew') {
      return NextResponse.redirect(new URL('/account-expired', request.url));
    }
    
    return NextResponse.next();
    
  } catch (error) {
    console.error(`[${requestId}] 创建资料异常:`, error);
    return NextResponse.redirect(new URL('/account-expired', request.url));
  }
}

// ==================== 中间件主函数 ====================

export async function middleware(request: NextRequest) {
  const currentPath = request.nextUrl.pathname;
  const requestId = Math.random().toString(36).substring(7);
  
  if (!currentPath.startsWith('/_next') && !currentPath.startsWith('/favicon')) {
    console.log(`[${requestId}] 中间件处理: ${currentPath}`);
  }
  
  try {
    const { supabase, response } = createMiddlewareClient(request);
    
    // ============ 1. 公开路径 ============
    if (isPublicPath(currentPath)) {
      return response;
    }
    
    // ============ 2. API路径 ============
    if (currentPath.startsWith('/api/')) {
      return response;
    }
    
    // ============ 3. 管理员路径 ============
    if (currentPath.startsWith('/admin')) {
      // 保持原有逻辑
      return response;
    }
    
    // ============ 4. 受保护的游戏路径 ============
    if (isProtectedGamePath(currentPath)) {
      try {
        // 🔥 使用已验证的用户信息
        const { user, error: authError } = await getVerifiedUser(supabase);
        
        if (authError || !user) {
          console.log(`[${requestId}] 用户未登录，重定向到登录页`);
          const redirectUrl = new URL('/login', request.url);
          redirectUrl.searchParams.set('redirect', currentPath);
          return NextResponse.redirect(redirectUrl);
        }
        
        console.log(`[${requestId}] 用户已登录: ${user.email}`);
        
        // 🔥 获取当前会话
        const { session: currentSession, error: sessionError } = await getCurrentSession(supabase);
        
        if (sessionError || !currentSession) {
          console.warn(`[${requestId}] 获取会话失败:`, sessionError?.message);
          const redirectUrl = new URL('/login', request.url);
          redirectUrl.searchParams.set('redirect', currentPath);
          return NextResponse.redirect(redirectUrl);
        }
        
        // 🔥 生成当前会话标识（与登录表单同步）
        const currentSessionId = generateSessionId(user.id, currentSession.access_token);
        
        // 🔥 查询用户资料（使用 single()）
        let profile = null;
        try {
          const { data, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, account_expires_at, last_login_at, last_login_session, created_at')
            .eq('id', user.id)
            .single();
          
          if (profileError) {
            if (profileError.code === 'PGRST116') {
              return await handleMissingProfile(supabase, user, requestId, currentPath, request);
            }
            throw profileError;
          }
          
          profile = data;
        } catch (profileError) {
          console.error(`[${requestId}] 查询用户资料异常:`, profileError);
          return await handleMissingProfile(supabase, user, requestId, currentPath, request);
        }
        
        if (!profile) {
          return await handleMissingProfile(supabase, user, requestId, currentPath, request);
        }
        
        // 🔥 会员过期检查
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
            console.log(`[${requestId}] 会员已过期: ${expiryDate.toISOString()}`);
            if (currentPath !== '/account-expired' && currentPath !== '/renew') {
              return NextResponse.redirect(new URL('/account-expired', request.url));
            }
          } else {
            console.log(`[${requestId}] 会员有效，到期时间: ${expiryDate.toISOString()}`);
          }
        }
        
        // 🔥 执行严格的多设备检测
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
        
        console.log(`[${requestId}] ✅ 所有安全检查通过，放行用户`);
        
        return response;
        
      } catch (error) {
        console.error(`[${requestId}] 游戏路径验证异常:`, error);
        const redirectUrl = new URL('/login', request.url);
        redirectUrl.searchParams.set('redirect', currentPath);
        return NextResponse.redirect(redirectUrl);
      }
    }
    
    // ============ 5. 其他路径 ============
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