import type { Metadata } from 'next'
import { Gaegu } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'

// 한글 손글씨 폰트 — 일기 내용, 제목 등에 사용
const gaegu = Gaegu({
  variable: '--font-gaegu',
  subsets: ['latin'],
  weight: ['300', '400', '700'],
})

export const metadata: Metadata = {
  title: '만광 — 만남의 광장',
  description: '3명이 돌아가며 쓰는 교환일기',
}

// flicker 방지 인라인 스크립트
// HTML 파싱 즉시 실행 → React 하이드레이션보다 훨씬 먼저 html.dark 클래스 적용
// → 첫 페인트부터 올바른 테마 색상으로 렌더링 (흰 화면 깜빡임 없음)
const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (!stored && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  } catch(e) {}
})();
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className={`${gaegu.variable} h-full antialiased`}>
      <head>
        {/* eslint-disable-next-line @next/next/no-before-interactive-script-component */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-paper-100 text-ink-700">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
