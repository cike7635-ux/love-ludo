"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, Shuffle, Key } from "lucide-react";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessKey, setAccessKey] = useState(""); // 新增：访问密钥状态
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRandom, setIsRandom] = useState(false);
  const router = useRouter();

  const generateRandomAccount = () => {
    const randomStr = Math.random().toString(36).substring(2, 11);
    const randomEmail = `user_${randomStr}@example.com`;
    const randomPass =
      Math.random().toString(36).substring(2, 14) +
      Math.random().toString(36).substring(2, 6).toUpperCase();
    setEmail(randomEmail);
    setPassword(randomPass);
    setAccessKey(""); // 清空访问密钥输入框
    setIsRandom(true);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // 调用带密钥验证的注册API
      const response = await fetch("/api/auth/signup-with-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          accessKey: accessKey.trim(), // 发送访问密钥
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // 如果API返回错误（如密钥无效）
        throw new Error(result.error || "注册失败");
      }

      // 保存注册时的账号与密码到 localStorage（仅客户端）
      try {
        localStorage.setItem(
          "account_credentials",
          JSON.stringify({ email, password })
        );
      } catch {}

      // 注册成功后，立即初始化默认题库
      try {
        const res = await fetch("/api/seed-default-tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) {
          console.warn("seed-default-tasks failed", await res.text());
        }
      } catch {}

      // 跳转逻辑保持不变
      if (isRandom) {
        router.replace("/lobby");
      } else {
        router.replace("/login");
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "注册过程中发生错误");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("", className)} {...props}>
      <form onSubmit={handleSignUp} className="space-y-4">
        <div>
          <Label htmlFor="email" className="block text-sm text-gray-300 mb-2">
            邮箱
          </Label>
          <div className="glass rounded-xl p-3 flex items-center space-x-2">
            <Mail className="w-5 h-5 text-gray-400" />
            <Input
              id="email"
              type="email"
              placeholder="请输入邮箱"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="password" className="block text-sm text-gray-300 mb-2">
            密码
          </Label>
          <div className="glass rounded-xl p-3 flex items-center space-x-2">
            <Lock className="w-5 h-5 text-gray-400" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="请输入密码"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* 新增：访问密钥输入框 */}
        <div>
          <Label htmlFor="accessKey" className="block text-sm text-gray-300 mb-2">
            访问密钥 <span className="text-red-400">*</span>
          </Label>
          <div className="glass rounded-xl p-3 flex items-center space-x-2">
            <Key className="w-5 h-5 text-gray-400" />
            <Input
              id="accessKey"
              type="text"
              placeholder="请输入访问密钥 (格式如：CPFLY-XXXXXX)"
              required
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 font-mono"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1 ml-1">
            没有密钥？请联系网站管理员获取。
          </p>
        </div>

        <Button
          type="button"
          onClick={generateRandomAccount}
          className="w-full glass py-3 rounded-xl font-medium hover:bg-white/10 transition-all flex items-center justify-center space-x-2"
        >
          <Shuffle className="w-4 h-4" />
          <span>生成随机邮箱和密码</span>
        </Button>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full gradient-primary py-3.5 rounded-xl font-semibold glow-pink transition-all hover:scale-105 active:scale-95 mt-6 text-white"
        >
          {isLoading ? "注册中..." : "注册"}
        </Button>
      </form>
    </div>
  );
}
