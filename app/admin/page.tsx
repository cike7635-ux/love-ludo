// /app/admin/page.tsx
import { createClient } from '@/lib/supabase/server';
import { validateAdminSession } from '@/lib/admin/auth';
import { 
  Users, 
  Key, 
  Brain, 
  Gamepad2 
} from 'lucide-react';

export default async function AdminDashboard() {
  const { user } = await validateAdminSession();
  const supabase = createClient();

  // 获取基础统计数据
  const [
    { count: totalUsers = 0 },
    { count: activeUsers = 0 },
    { count: totalKeys = 0 },
    { count: activeKeys = 0 },
    { count: totalGames = 0 },
    { count: totalAIUsage = 0 },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles')
      .select('*', { count: 'exact', head: true })
      .gt('account_expires_at', new Date().toISOString()),
    supabase.from('access_keys').select('*', { count: 'exact', head: true }),
    supabase.from('access_keys')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('used_count', 0),
    supabase.from('game_sessions').select('*', { count: 'exact', head: true }),
    supabase.from('ai_usage_records')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const stats = [
    { icon: Users, label: '总用户数', value: totalUsers, color: 'bg-blue-100 text-blue-600' },
    { icon: Users, label: '活跃会员', value: activeUsers, color: 'bg-green-100 text-green-600' },
    { icon: Key, label: '总密钥数', value: totalKeys, color: 'bg-purple-100 text-purple-600' },
    { icon: Key, label: '可用密钥', value: activeKeys, color: 'bg-orange-100 text-orange-600' },
    { icon: Gamepad2, label: '游戏总数', value: totalGames, color: 'bg-pink-100 text-pink-600' },
    { icon: Brain, label: 'AI使用量', value: totalAIUsage, color: 'bg-indigo-100 text-indigo-600' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">系统仪表板</h1>
        <p className="text-gray-600 mt-2">
          欢迎回来，{user?.email}！今天是 {new Date().toLocaleDateString('zh-CN')}
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold mt-2">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 快速操作 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">快速操作</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="/admin/keys?generate=true"
            className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Key className="w-8 h-8 text-blue-600 mb-2" />
            <span className="text-sm font-medium">生成密钥</span>
          </a>
          <a
            href="/admin/users"
            className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Users className="w-8 h-8 text-green-600 mb-2" />
            <span className="text-sm font-medium">用户管理</span>
          </a>
          <a
            href="/admin/ai-usage"
            className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Brain className="w-8 h-8 text-purple-600 mb-2" />
            <span className="text-sm font-medium">AI统计</span>
          </a>
          <a
            href="/admin/settings"
            className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Gamepad2 className="w-8 h-8 text-amber-600 mb-2" />
            <span className="text-sm font-medium">游戏管理</span>
          </a>
        </div>
      </div>

      {/* 系统信息 */}
      <div className="mt-8 text-sm text-gray-500">
        <p>系统状态：运行正常</p>
        <p className="mt-1">最后更新：{new Date().toLocaleString('zh-CN')}</p>
      </div>
    </div>
  );
}
