// /lib/admin/auth-utils.ts - 简化版
export function isAdminPath(pathname: string): boolean {
  return pathname.startsWith('/admin') && !pathname.includes('/admin/login')
}

export function getAdminRedirectPath(pathname: string): string {
  if (pathname.startsWith('/admin')) {
    return `/admin?redirect=${encodeURIComponent(pathname)}`
  }
  return '/admin'
}