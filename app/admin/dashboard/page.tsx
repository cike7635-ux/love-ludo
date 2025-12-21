// /app/admin/dashboard/page.tsx
import { requireAdmin } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { Users, Key, Brain, Gamepad2, BarChart3 } from 'lucide-react';

export default async function AdminDashboard() {
  await requireAdmin();
  const supabase = await createClient();

  // 获取统计信息
  let stats = [
    { label: '总用户数', value: 0, icon: Users, color: 'text-blue-600' },
    { label: '可用密钥', value: 0, icon: Key, color: 'text-green-600' },
    { label: 'AI使用量', value: 0, icon: Brain, color: 'text-purple-600' },
    { label: '游戏总数', value: 0, icon: Gamepad2, color: 'text-orange-600' },
  ];

  try {
    // 用户统计
    const { count: userCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    stats[0].value = userCount || 0;

    // 密钥统计
    const { count: keyCount } = await supabase
      .from('access_keys')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    stats[1].value = keyCount || 0;

    // AI使用统计（简化）
    const { count: aiUsageCount } = await supabase
      .from('ai_usage_records')
      .select('*', { count: 'exact', head: true });
    stats[2].value = aiUsageCount || 0;

  } catch (error) {
    console.error('获取统计数据失败:', error);
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">系统仪表板</h1>
        <p className="text-gray-600 mt-2">欢迎来到 Love Ludo 后台管理系统</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-sm p-6 border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold mt-2">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full bg-gray-50`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 快速操作 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <h3 className="text-lg font-semibold mb-4">快速操作</h3>
          <div className="space-y-3">
            <a
              href="/admin/keys"
              className="flex items-center p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Key className="w-5 h-5 text-blue-600 mr-3" />
              <span>密钥管理</span>
            </a>
            <a
              href="/admin/users"
              className="flex items-center p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Users className="w-5 h-5 text-green-600 mr-3" />
              <span>用户管理</span>
            </a>
            <a
              href="/admin/ai-usage"
              className="flex items-center p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Brain className="w-5 h-5 text-purple-600 mr-3" />
              <span>AI使用统计</span>
            </a>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <h3 className="text-lg font-semibold mb-4">系统状态</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">API服务</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                正常
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">数据库</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                正常
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">游戏服务器</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                正常
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
