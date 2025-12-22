// /components/admin/navbar.tsx - 最终简化版
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Users, 
  Key, 
  Brain, 
  Settings,
  LogOut
} from 'lucide-react'

const navItems = [
  { href: '/admin/dashboard', label: '仪表板', icon: LayoutDashboard },
  { href: '/admin/users', label: '用户管理', icon: Users },
  { href: '/admin/keys', label: '密钥管理', icon: Key },
  { href: '/admin/ai-usage', label: 'AI统计', icon: Brain },
  { href: '/admin/settings', label: '系统设置', icon: Settings },
]

export default function AdminNavbar() {
  const pathname = usePathname()
  
  return (
    <nav className="admin-navbar">
      <div className="navbar-container">
        {/* Logo */}
        <div className="navbar-logo">
          <Link href="/admin/dashboard" className="logo-link">
            <div className="logo-icon">LL</div>
            <span className="logo-text">Love Ludo 后台</span>
          </Link>
        </div>

        {/* 桌面导航 */}
        <div className="navbar-desktop">
          <div className="nav-items">
            {navItems.map((item) => {
              const isActive = pathname === item.href || 
                             (item.href !== '/admin/dashboard' && 
                              pathname?.startsWith(item.href))
              const Icon = item.icon
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon className="nav-icon" />
                  <span className="nav-label">{item.label}</span>
                </Link>
              )
            })}
          </div>
          
          {/* 退出按钮 */}
          <div className="navbar-actions">
            <Link
              href="/lobby"
              className="logout-button"
            >
              <LogOut className="logout-icon" />
              <span>返回游戏</span>
            </Link>
          </div>
        </div>

        {/* 移动端菜单按钮 */}
        <button className="mobile-menu-button">
          <svg className="menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </nav>
  )
}