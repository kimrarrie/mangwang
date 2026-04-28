import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // 'class' 전략: <html class="dark"> 로 다크모드 토글
  darkMode: 'class',
  theme: {
    extend: {
      // 만광 전용 색상 — CSS 변수(RGB 채널) 참조
      // <alpha-value> 플레이스홀더 덕분에 bg-paper-100/80 같은 opacity modifier 자동 호환
      colors: {
        paper: {
          50:  'rgb(var(--color-paper-50)  / <alpha-value>)',
          100: 'rgb(var(--color-paper-100) / <alpha-value>)',
          200: 'rgb(var(--color-paper-200) / <alpha-value>)',
          300: 'rgb(var(--color-paper-300) / <alpha-value>)',
        },
        ink: {
          700: 'rgb(var(--color-ink-700) / <alpha-value>)',
          800: 'rgb(var(--color-ink-800) / <alpha-value>)',
          900: 'rgb(var(--color-ink-900) / <alpha-value>)',
        },
      },
      // 손글씨 폰트
      fontFamily: {
        handwriting: ['var(--font-gaegu)', 'cursive'],
        sans: ['var(--font-pretendard)', 'sans-serif'],
      },
      // 종이 질감용 그림자
      boxShadow: {
        'diary': '2px 3px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'diary-hover': '4px 6px 16px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
}

export default config
