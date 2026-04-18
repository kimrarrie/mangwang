import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // 만광 전용 색상
      colors: {
        paper: {
          50: '#fefcf8',   // 가장 밝은 종이색
          100: '#fdf6e8',  // 크림색 배경
          200: '#f5e6c8',  // 노트 라인 색
          300: '#e8d5a8',  // 테두리
        },
        ink: {
          700: '#3d3529',  // 본문 텍스트
          800: '#2a241b',  // 제목
          900: '#1a1610',  // 진한 텍스트
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
