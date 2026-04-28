'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type ThemeContextType = {
  isDark: boolean | null  // null = 마운트 전 (hydration mismatch 방지용)
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: null,
  toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // null = 아직 클라이언트 마운트 전 → 토글 버튼을 숨겨서 아이콘 깜빡임 방지
  const [isDark, setIsDark] = useState<boolean | null>(null)

  // 마운트 시 localStorage 또는 시스템 설정으로부터 초기 테마 결정
  useEffect(() => {
    const stored = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldBeDark = stored ? stored === 'dark' : prefersDark
    setIsDark(shouldBeDark)
  }, [])

  // isDark 상태 → html.dark 클래스 + localStorage 동기화
  useEffect(() => {
    if (isDark === null) return
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDark])

  const toggleTheme = () => setIsDark((prev) => !prev)

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
