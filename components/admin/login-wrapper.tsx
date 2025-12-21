// /components/admin/login-wrapper.tsx
'use client';

import { Suspense } from 'react';
import AdminLoginForm from './login-form';
import { useSearchParams } from 'next/navigation';

// 内部组件，使用useSearchParams
function AdminLoginFormWithParams() {
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect') || '/admin/dashboard';
  
  return <AdminLoginForm redirectParam={redirectParam} />;
}

// 主包装器组件
export default function AdminLoginWrapper() {
  return (
    <Suspense fallback={<div className="text-center py-4">加载中...</div>}>
      <AdminLoginFormWithParams />
    </Suspense>
  );
}
