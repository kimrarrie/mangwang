'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DiaryCard from '@/components/ui/DiaryCard'
import { getInitial, getAvatarStyle } from '@/features/diary/mockData'
import { useUser } from '@/features/auth/useUser'
import { getSortedDiaries } from '@/lib/supabase/diaryService'
import type { Diary } from '@/features/diary/types'

export default function HomePage() {
  const router = useRouter()
  const { user } = useUser()
  const [diaries, setDiaries] = useState<Diary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setLoading(true)
      const result = await getSortedDiaries(user.id)
      setDiaries(result)
      setLoading(false)
    }
    load()
  }, [user?.id])

  // 프로필 로드 후 아바타 표시 (loading=false 이후에만)
  const headerAvatar = user && !loading ? getAvatarStyle(user.id) : null

  // 오늘 날짜 포맷
  const today = new Date()
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']
  const dayStr = dayNames[today.getDay()]

  return (
    <div className="min-h-screen">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 backdrop-blur-sm bg-paper-100/80 border-b border-paper-200">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center justify-between">
          <h1 className="font-handwriting text-2xl text-ink-800 font-bold">
            만남의 광장
          </h1>
          {/* 프로필 아이콘 */}
          <button
            onClick={() => router.push('/profile')}
            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ring-2 ring-white hover:scale-105 active:scale-95 transition ${headerAvatar?.className || 'bg-gray-200'}`}
            style={headerAvatar?.style}
          >
            {user && !loading ? getInitial(user.id) : ''}
          </button>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-lg mx-auto px-5 py-6 pb-24">
        {/* 오늘 날짜 + 아카이브 링크 */}
        <div className="flex items-center justify-between mb-6">
          <p className="font-handwriting text-xl text-ink-700/70">
            {dateStr} {dayStr}요일
          </p>
          <button
            onClick={() => router.push('/archive')}
            className="font-handwriting text-sm text-ink-700/40 hover:text-ink-700/70 transition"
          >
            모든 일기장 보기 →
          </button>
        </div>

        {/* 일기 목록 */}
        {loading ? (
          <div className="text-center py-20">
            <p className="font-handwriting text-xl text-ink-700/40">불러오는 중...</p>
          </div>
        ) : diaries.length > 0 ? (
          <div className="flex flex-col gap-4">
            {diaries.map((diary) => (
              <DiaryCard
                key={diary.id}
                diary={diary}
                onClick={() => router.push(`/editor/${diary.id}`)}
              />
            ))}
          </div>
        ) : !loading ? (
          <div className="text-center py-20">
            <p className="font-handwriting text-2xl text-ink-700/40 mb-2">
              아직 일기가 없어요
            </p>
            <p className="text-sm text-ink-700/30">
              아래 버튼을 눌러 첫 일기를 써보세요!
            </p>
          </div>
        ) : null}
      </main>

      {/* 새 일기 쓰기 플로팅 버튼 */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center z-20">
        <button
          onClick={() => router.push('/editor/new')}
          className="flex items-center gap-2 px-6 py-3.5 bg-ink-800 text-paper-50 rounded-full shadow-lg hover:bg-ink-900 transition-all hover:scale-105 active:scale-95 font-handwriting text-lg"
        >
          <span className="text-xl">✏️</span>
          새 일기 쓰기
        </button>
      </div>
    </div>
  )
}
