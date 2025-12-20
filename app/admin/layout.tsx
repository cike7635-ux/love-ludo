// /app/admin/layout.tsx - 简化版本
import { requireAdmin } from '@/lib/admin/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  console.log('🔄 开始渲染后台布局...');
  await requireAdmin();
  console.log('✅ 权限验证通过，渲染后台');

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center">
                  <span className="text-xl font-bold text-blue-600">Love Ludo</span>
                  <span className="ml-2 text-sm text-gray-500">后台管理</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">管理员</span>
              <a
                href="/login?logout=true"
                className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
              >
                退出登录
              </a>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        <aside className="w-64 bg-white border-r min-h-[calc(100vh-4rem)]">
          <nav className="mt-5 px-2 space-y-1">
            <a
              href="/admin"
              className="group flex items-center px-2 py-2 text-base font-medium rounded-md bg-blue-100 text-blue-700"
            >
              仪表板
            </a>
            <a
              href="/admin/keys"
              className="group flex items-center px-2 py-2 text-base font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            >
              密钥管理
            </a>
            <a
              href="/admin/users"
              className="group flex items-center px-2 py-2 text-base font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            >
              用户管理
            </a>
            <a
              href="/admin/ai-usage"
              className="group flex items-center px-2 py-2 text-base font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            >
              AI使用统计
            </a>
          </nav>
        </aside>

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
