// /lib/admin/auth-utils.ts
export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || ['2200691917@qq.com'];
  return adminEmails.some(adminEmail => 
    adminEmail.trim().toLowerCase() === email.toLowerCase()
  );
}

export function verifyAdminKey(inputKey: string): boolean {
  const adminKey = process.env.NEXT_PUBLIC_ADMIN_KEY || 'ADMIN@2024';
  return inputKey === adminKey;
}
