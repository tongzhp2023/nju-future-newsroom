'use client'

import { useEffect } from 'react'

/**
 * 主题初始化组件
 * 在客户端 mount 时立即读取 localStorage 并设置 dark class
 * 配合 CSS @media (prefers-color-scheme: dark) 作为默认值，避免闪烁
 */
export function ThemeScript() {
  useEffect(() => {
    try {
      const saved = localStorage.getItem('theme')
      if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    } catch (e) {
      // ignore
    }
  }, [])

  return null
}
