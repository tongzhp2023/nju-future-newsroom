'use client'

import { useState, useEffect } from 'react'

export default function ThemeToggle() {
  const [darkMode, setDarkMode] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const isDark = document.documentElement.classList.contains('dark')
    setDarkMode(isDark)
  }, [])

  const toggleDarkMode = () => {
    const next = !darkMode
    setDarkMode(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  if (!mounted) {
    return <div className="w-[52px] h-[28px]" />
  }

  return (
    <button
      onClick={toggleDarkMode}
      className="relative inline-flex items-center justify-center w-[52px] h-[28px] rounded-full transition-colors duration-300 focus:outline-none border border-[var(--border)]"
      style={{ background: darkMode ? 'var(--surface-active)' : 'var(--surface-raised)' }}
      title={darkMode ? '切换到浅色模式' : '切换到深色模式'}
      aria-label="切换主题"
    >
      {/* 太阳图标（左侧）— 垂直水平居中 */}
      <span className={`absolute left-[6px] top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center transition-opacity duration-200 ${darkMode ? 'opacity-30' : 'opacity-90'}`}>
        <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
        </svg>
      </span>

      {/* 月亮图标（右侧）— 垂直水平居中 */}
      <span className={`absolute right-[6px] top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center transition-opacity duration-200 ${darkMode ? 'opacity-90' : 'opacity-30'}`}>
        <svg className="w-3.5 h-3.5 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      </span>

      {/* 滑块圆环 — 半透明边框，不遮挡图标 */}
      <span
        className={`absolute top-1/2 -translate-y-1/2 w-[22px] h-[22px] rounded-full transition-all duration-300 ${
          darkMode
            ? 'left-[27px] border-2 border-indigo-400/60 bg-indigo-400/10'
            : 'left-[3px] border-2 border-amber-400/60 bg-amber-400/10'
        }`}
      />
    </button>
  )
}
