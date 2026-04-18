import type { Metadata } from 'next'
import { Gaegu } from 'next/font/google'
import './globals.css'

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className={`${gaegu.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-paper-100 text-ink-700">
        {children}
      </body>
    </html>
  )
}
