// /app/admin/layout.tsx - 最终安全版本
'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import AdminNavbar from '@/components/admin/navbar'
import './admin-styles.css'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname()
  const isAdminRoute = pathname?.startsWith('/admin')

  useEffect(() => {
    // 只在管理员路由下添加标记
    if (isAdminRoute) {
      document.body.setAttribute('data-admin-page', 'true')
      
      // 隐藏其他导航元素
      const hideOtherNavs = () => {
        // 只针对明确的底部导航
        const bottomNavs = document.querySelectorAll(`
          nav:not(.admin-navbar),
          footer,
          [class*="bottom-nav"],
          [class*="BottomNav"]
        `)
        
        bottomNavs.forEach(el => {
          // 检查是否在管理员容器内
          const isInAdminLayout = el.closest('.admin-layout-root')
          if (!isInAdminLayout) {
            (el as HTMLElement).style.display = 'none'
          }
        })
      }
      
      hideOtherNavs()
      
      // 设置超时确保执行
      const timer = setTimeout(hideOtherNavs, 100)
      
      return () => {
        clearTimeout(timer)
        document.body.removeAttribute('data-admin-page')
        
        // 恢复显示被隐藏的元素
        const hiddenElements = document.querySelectorAll('[style*="display: none"]')
        hiddenElements.forEach(el => {
          const isAdminElement = el.closest('.admin-layout-root')
          if (!isAdminElement) {
            (el as HTMLElement).style.display = ''
          }
        })
      }
    }
  }, [isAdminRoute])

  // 如果不是管理员路由，返回原始布局
  if (!isAdminRoute) {
    return <>{children}</>
  }

  return (
    <div className="admin-layout-root">
      <AdminNavbar />
      <div className="admin-content-wrapper">
        {children}
      </div>
    </div>
  )
}