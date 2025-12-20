// /app/account-expired/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button"; // 使用您的UI组件库
import { CalendarOff, RefreshCw, Home, Mail } from "lucide-react"; // 添加图标

export default function AccountExpiredPage() {
  return (
    <div className="min-h-svh flex flex-col items-center justify-center p-6">
      {/* 玻璃拟态容器，与您网站风格一致 */}
      <div className="glass rounded-2xl p-8 w-full max-w-md text-center border border-white/10">
        
        {/* 图标区 - 更醒目的视觉提示 */}
        <div className="w-20 h-20 gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
          <CalendarOff className="w-10 h-10 text-white" />
        </div>
        
        {/* 标题与描述 */}
        <h1 className="text-2xl font-bold mb-2 text-white">账号已过期</h1>
        <p className="text-gray-300 mb-1">您的会员访问权限已到期</p>
        <p className="text-sm text-gray-400 mb-6">游戏功能已暂时无法使用</p>

        {/* 关键操作区：突出续费 */}
        <div className="space-y-3 mb-8">
          <Button asChild className="w-full gradient-primary py-3.5 rounded-xl font-semibold hover:scale-[1.02] transition-transform">
            <Link href="/renew" className="flex items-center justify-center">
              <RefreshCw className="w-5 h-5 mr-2" />
              立即续费解锁完整功能
            </Link>
          </Button>
          
          <div className="text-xs text-gray-500">使用新的产品密钥完成续费</div>
        </div>

        {/* 次要操作与帮助信息 */}
        <div className="space-y-4 pt-6 border-t border-white/10">
          <div className="flex gap-3">
            <Button asChild variant="outline" className="flex-1 py-3 rounded-xl">
              <Link href="/profile" className="flex items-center justify-center">
                <Mail className="w-4 h-4 mr-2" />
                查看账户
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1 py-3 rounded-xl">
              <Link href="/" className="flex items-center justify-center">
                <Home className="w-4 h-4 mr-2" />
                返回首页
              </Link>
            </Button>
          </div>
          
          {/* 客服信息 - 促进转化 */}
          <div className="pt-4">
            <p className="text-sm text-gray-400 mb-2">需要帮助或遇到问题？</p>
            <div className="text-sm">
              <p className="text-gray-300">微信客服: <span className="text-cyan-300">xiyi1397</span></p>
              <p className="text-gray-300">淘宝店铺: <span className="text-amber-300">《希夷书斋》</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* 可选的背景装饰 */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl -z-10"></div>
    </div>
  );
}
