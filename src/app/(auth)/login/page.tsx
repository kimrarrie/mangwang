'use client'

import { signInWithGoogle } from '@/features/auth/actions'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-paper-100 flex items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        {/* 로고 영역 */}
        <div className="text-center">
          <h1 className="font-handwriting text-4xl text-ink-800 font-bold mb-2">
            만남의 광장
          </h1>
          <p className="font-handwriting text-ink-700/50 text-base">
            베레리향이 함께 만드는 일기장
          </p>
        </div>

        {/* 로그인 카드 */}
        <div className="w-full bg-paper-50 rounded-2xl border border-paper-200 shadow-sm p-6 flex flex-col gap-4">
          <p className="text-xs text-ink-700/40 text-center">
            구글 계정으로 시작하세요
          </p>
          <button
            onClick={() => signInWithGoogle()}
            className="w-full flex items-center justify-center gap-3 bg-white border border-paper-300 rounded-xl px-4 py-3.5 text-ink-800 font-handwriting text-base hover:bg-paper-100 active:scale-95 transition shadow-sm"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            구글로 로그인
          </button>
        </div>
      </div>
    </div>
  )
}
