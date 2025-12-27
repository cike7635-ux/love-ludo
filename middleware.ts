// /middleware.ts - 完整修复版本
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// ==================== 配置与工具函数 ====================

/**
 * 检查是否是管理员邮箱
 */
function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || ['2200691917@qq.com'];
  return adminEmails.some(adminEmail => adminEmail.trim().toLowerCase() === email.toLowerCase());
}

/**
 * 检查是否受保护的游戏路径
 */
function isProtectedGamePath(path: string): boolean {
  const exactPaths = ['/lobby', '/game', '/profile', '/themes', '/game-history'];
  if (exactPaths.includes(path)) return true;
  const prefixPaths = ['/game/', '/themes/'];
  return prefixPaths.some(prefix => path.startsWith(prefix));
}

/**
 * 检查是否公开路径（不需要认证）
 */
function isPublicPath(path: string): boolean {
  const exactPublicPaths = ['/', '/login', '/account-expired', '/renew', '/admin', '/admin/unauthorized', '/login/expired'];
  if (exactPublicPaths.includes(path)) return true;
  const prefixPublicPaths = ['/auth/', '/api/auth/'];
  return prefixPublicPaths.some(prefix => path.startsWith(prefix));
}

/**
 * 在中间件中安全创建Supabase客户端
 */
function createMiddlewareClient(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            if (name === 'admin_key_verified') {
              response.cookies.set({
                name,
                value,
                path: '/',
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24,
              });
            } else {
              response.cookies.set(name, value, options);
            }
          });
        },
      },
    }
  );

  return { supabase, response };
}

/**
 * 设置管理员验证Cookie
 */
function setAdminKeyVerifiedCookie(response: NextResponse) {
  response.cookies.set({
    name: 'admin_key_verified',
    value: 'true',
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
  });
  return response;
}

/**
 * 获取已验证的用户信息
 */
async function getVerifiedUser(supabase: any) {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.warn('[已验证用户] 获取用户失败:', error.message);
      return { user: null, error };
    }
    
    return { user, error: null };
  } catch (error: any) {
    console.error('[已验证用户] 异常:', error.message);
    return { user: null, error };
  }
}

/**
 * 创建带有已验证用户头信息的响应
 */
function createResponseWithUserHeaders(request: NextRequest, user: any, isAdmin: boolean = false) {
  const headers = new Headers(request.headers);
  
  headers.set('x-verified-user-id', user.id);
  
  if (user.email) {
    headers.set('x-verified-user-email', user.email);
  }
  
  if (user.user_metadata?.name) {
    headers.set('x-verified-user-name', user.user_metadata.name);
  }
  
  if (isAdmin) {
    headers.set('x-admin-verified', 'true');
  }
  
  headers.set('x-user-verified-by-middleware', 'true');
  
  const response = NextResponse.next({
    request: {
      headers: headers,
    },
  });
  
  return response;
}

/**
 * 更新用户活动时间（每60秒更新一次）
 */
async function updateUserActivity(supabase: any, userId: string, requestId: string) {
  try {
    const now = new Date().toISOString();
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('last_login_at')
      .eq('id', userId)
      .maybeSingle();
    
    if (profile?.last_login_at) {
      const lastUpdate = new Date(profile.last_login_at);
      const timeSinceUpdate = Date.now() - lastUpdate.getTime();
      
      if (timeSinceUpdate > 60000) {
        await supabase
          .from('profiles')
          .update({ 
            last_login_at: now,
            updated_at: now
          })
          .eq('id', userId);
        
        console.log(`[${requestId}] 更新用户活动时间`);
      }
    } else {
      await supabase
        .from('profiles')
        .update({ 
          last_login_at: now,
          updated_at: now
        })
        .eq('id', userId);
    }
  } catch (error) {
    console.error(`[${requestId}] 更新活动时间失败:`, error);
  }
}

/**
 * 🔥 关键修复：严格的多设备检测函数
 */
async function performStrictDeviceCheck(
  supabase: any, 
  user: any, 
  currentSessionId: string, 
  requestId: string,
  profile: any
): Promise<{ allowed: boolean; reason: string; details?: any }> {
  const now = new Date();
  
  // 1. 确保会话标识存在（不应该发生，因为SQL已经修复，但安全起见）
  if (!profile.last_login_session) {
    console.log(`[${requestId}] 用户会话标识为空，设置为当前会话`);
    
    await supabase
      .from('profiles')
      .update({
        last_login_session: currentSessionId,
        last_login_at: now.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('id', user.id);
    
    return { allowed: true, reason: 'session_initialized' };
  }
  
  // 2. 检查是否是初始会话（init_开头）
  if (profile.last_login_session.startsWith('init_')) {
    console.log(`[${requestId}] 更新初始会话为真实会话`);
    
    await supabase
      .from('profiles')
      .update({
        last_login_session: currentSessionId,
        last_login_at: now.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('id', user.id);
    
    return { allowed: true, reason: 'initial_session_updated' };
  }
  
  // 3. 严格比对会话标识
  if (profile.last_login_session === currentSessionId) {
    console.log(`[${requestId}] 会话匹配，允许访问`);
    return { allowed: true, reason: 'session_matched' };
  }
  
  // 4. 检查30秒宽限期（仅用于token刷新）
  const lastLoginTime = profile.last_login_at ? new Date(profile.last_login_at) : null;
  if (lastLoginTime) {
    const timeSinceLastLogin = now.getTime() - lastLoginTime.getTime();
    if (timeSinceLastLogin < 30000) { // 30秒
      console.log(`[${requestId}] 30秒宽限期内，更新会话标识`);
      
      await supabase
        .from('profiles')
        .update({
          last_login_session: currentSessionId,
          updated_at: now.toISOString()
        })
        .eq('id', user.id);
      
      return { allowed: true, reason: 'grace_period' };
    }
  }
  
  // 5. 多设备登录 → 拒绝
  console.log(`[${requestId}] 🔥 检测到多设备登录`);
  console.log(`[${requestId}] 存储会话: ${profile.last_login_session}`);
  console.log(`[${requestId}] 当前会话: ${currentSessionId}`);
  
  return { 
    allowed: false, 
    reason: 'multi_device',
    details: {
      stored_session: profile.last_login_session,
      current_session: currentSessionId,
      last_login: profile.last_login_at
    }
  };
}

/**
 * 🔥 关键修复：处理缺失的用户资料
 */
async function handleMissingProfile(
  supabase: any, 
  user: any, 
  requestId: string, 
  currentPath: string, 
  request: NextRequest
): Promise<NextResponse> {
  console.log(`[${requestId}] 用户 ${user.email} 资料不存在，创建完整资料`);
  
  try {
    const now = new Date().toISOString();
    const initialSessionId = `init_${user.id}_${Date.now()}`;
    
    const { error: createError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        account_expires_at: null, // 没有会员期，需要续费
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
    
    console.log(`[${requestId}] 新用户资料创建成功，重定向到续费页面`);
    
    if (currentPath !== '/account-expired' && currentPath !== '/renew') {
      return NextResponse.redirect(new URL('/account-expired', request.url));
    }
    
    return NextResponse.next();
    
  } catch (createErr) {
    console.error(`[${requestId}] 创建资料过程异常:`, createErr);
    return NextResponse.redirect(new URL('/account-expired', request.url));
  }
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
    
    // ============ 路径分类处理 ============
    
    // 1. 公开路径直接放行
    if (isPublicPath(currentPath)) {
      if (currentPath === '/admin' || currentPath === '/admin/login') {
        console.log(`[${requestId}] 管理员登录页，放行`);
      }
      return response;
    }
    
    // 2. API路径处理
    if (currentPath.startsWith('/api/admin/')) {
      console.log(`[${requestId}] 处理管理API: ${currentPath}`);
      
      const adminKeyVerified = request.cookies.get('admin_key_verified');
      
      if (!adminKeyVerified || adminKeyVerified.value !== 'true') {
        console.log(`[${requestId}] 管理API未通过密钥验证`);
        
        const referer = request.headers.get('referer');
        const isFromAdminPage = referer?.includes('/admin/');
        
        if (!isFromAdminPage) {
          return NextResponse.json(
            { success: false, error: '未授权访问管理API' },
            { status: 401 }
          );
        } else {
          console.log(`[${requestId}] 管理API通过referer验证: ${referer}`);
        }
      } else {
        console.log(`[${requestId}] 管理API通过Cookie验证`);
      }
      
      return response;
    }
    
    // 其他API路径直接放行
    if (currentPath.startsWith('/api/')) {
      return response;
    }
    
    // 3. 管理员路径处理
    if (currentPath.startsWith('/admin')) {
      if (currentPath === '/admin' || currentPath === '/admin/login') {
        return response;
      }
      
      const adminKeyVerified = request.cookies.get('admin_key_verified');
      
      if (!adminKeyVerified || adminKeyVerified.value !== 'true') {
        console.log(`[${requestId}] 管理员未通过密钥验证`);
        const redirectUrl = new URL('/admin', request.url);
        redirectUrl.searchParams.set('redirect', currentPath);
        return NextResponse.redirect(redirectUrl);
      }
      
      const { user, error } = await getVerifiedUser(supabase);
      
      if (error || !user) {
        console.log(`[${requestId}] 管理员未登录`);
        return NextResponse.redirect(new URL('/admin', request.url));
      }
      
      if (!isAdminEmail(user.email)) {
        console.log(`[${requestId}] 非管理员访问后台: ${user.email}`);
        return NextResponse.redirect(new URL('/admin/unauthorized', request.url));
      }
      
      console.log(`[${requestId}] 管理员验证通过: ${user.email}`);
      
      const adminResponse = setAdminKeyVerifiedCookie(
        createResponseWithUserHeaders(request, user, true)
      );
      
      return adminResponse;
    }
    
    // 4. 受保护的游戏路径（完整验证）
    if (isProtectedGamePath(currentPath)) {
      try {
        // ============ 基础登录验证 ============
        const { user, error: authError } = await getVerifiedUser(supabase);
        
        if (authError || !user) {
          console.log(`[${requestId}] 用户未登录，重定向到登录页`);
          const redirectUrl = new URL('/login', request.url);
          redirectUrl.searchParams.set('redirect', currentPath);
          return NextResponse.redirect(redirectUrl);
        }
        
        console.log(`[${requestId}] 用户已登录: ${user.email} (管理员: ${isAdminEmail(user.email)})`);
        
        // 如果是管理员访问游戏路径，不要强制重定向到后台
        if (isAdminEmail(user.email)) {
          console.log(`[${requestId}] 管理员访问游戏路径，正常处理`);
        }
        
        // ============ 获取用户资料 ============
        let profile = null;
        try {
          // 🔥 关键修复：使用 single() 而不是 maybeSingle()
          const { data, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, account_expires_at, last_login_at, last_login_session, created_at')
            .eq('id', user.id)
            .single(); // ✅ 期望有且只有一条记录
          
          if (profileError) {
            // 检查是否是"no rows"错误
            if (profileError.code === 'PGRST116' || profileError.message.includes('No rows found')) {
              console.log(`[${requestId}] 用户资料不存在 (PGRST116)`);
              return await handleMissingProfile(supabase, user, requestId, currentPath, request);
            }
            
            console.warn(`[${requestId}] 查询用户资料失败:`, profileError.message);
            return await handleMissingProfile(supabase, user, requestId, currentPath, request);
          }
          
          profile = data;
        } catch (profileError) {
          console.error(`[${requestId}] 获取用户资料异常:`, profileError);
          return await handleMissingProfile(supabase, user, requestId, currentPath, request);
        }
        
        if (!profile) {
          console.log(`[${requestId}] 用户资料不存在`);
          return await handleMissingProfile(supabase, user, requestId, currentPath, request);
        }
        
        // ============ 会员过期验证 ============
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
        
        // ============ 🔥 关键：严格的多设备登录验证 ============
        try {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          
          if (!currentSession) {
            console.warn(`[${requestId}] 当前会话不存在`);
            const redirectUrl = new URL('/login', request.url);
            redirectUrl.searchParams.set('redirect', currentPath);
            return NextResponse.redirect(redirectUrl);
          }
          
          // 生成当前会话标识
          const currentSessionId = `sess_${currentSession.user.id}_${currentSession.access_token.substring(0, 12)}`;
          
          // 🔥 执行严格的多设备检测
          const deviceCheck = await performStrictDeviceCheck(
            supabase, 
            user, 
            currentSessionId, 
            requestId,
            profile
          );
          
          if (!deviceCheck.allowed) {
            console.log(`[${requestId}] 多设备检测不通过: ${deviceCheck.reason}`);
            
            const redirectUrl = new URL('/login/expired', request.url);
            redirectUrl.searchParams.set('reason', deviceCheck.reason);
            redirectUrl.searchParams.set('email', user.email || '');
            
            if (deviceCheck.details) {
              redirectUrl.searchParams.set('stored_session', deviceCheck.details.stored_session.substring(0, 20));
              redirectUrl.searchParams.set('current_session', deviceCheck.details.current_session.substring(0, 20));
            }
            
            return NextResponse.redirect(redirectUrl);
          }
          
          console.log(`[${requestId}] 多设备检测通过: ${deviceCheck.reason}`);
          
          // 异步更新活动时间
          updateUserActivity(supabase, user.id, requestId).catch(() => {});
          
          return createResponseWithUserHeaders(request, user);
          
        } catch (sessionError) {
          console.error(`[${requestId}] 会话验证错误:`, sessionError);
          // 出错时也更新活动时间，然后放行（避免因错误中断用户）
          updateUserActivity(supabase, user.id, requestId).catch(() => {});
          return createResponseWithUserHeaders(request, user);
        }
        
      } catch (gamePathError) {
        console.error(`[${requestId}] 游戏路径验证异常:`, gamePathError);
        const redirectUrl = new URL('/login', request.url);
        redirectUrl.searchParams.set('redirect', currentPath);
        return NextResponse.redirect(redirectUrl);
      }
    }
    
    // 5. 其他未分类路径
    try {
      const { user } = await getVerifiedUser(supabase);
      if (user) {
        return createResponseWithUserHeaders(request, user);
      }
    } catch (e) {
      // 忽略错误，继续处理
    }
    
    return response;
    
  } catch (globalError) {
    console.error(`[中间件] 全局异常:`, globalError);
    const redirectUrl = new URL('/login', request.url);
    return NextResponse.redirect(redirectUrl);
  }
}

// ==================== 中间件配置 ====================

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};