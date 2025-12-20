// /app/admin/ai-usage/page.tsx - 修复版本
import { validateAdminSession } from '@/lib/admin/auth';

export default async function AiUsagePage() {
  await validateAdminSession();
  
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">AI使用统计</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">AI使用统计功能正在开发中...</p>
        <p className="mt-4">
          <a href="/admin" className="text-blue-600 hover:text-blue-800">
            返回仪表板
          </a>
        </p>
      </div>
    </div>
  );
}
