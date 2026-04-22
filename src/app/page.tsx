'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DiaryCard from '@/components/ui/DiaryCard'
import { getInitial, getAvatarStyle } from '@/features/diary/mockData'
import { useUser } from '@/features/auth/useUser'
import { getSortedDiaries, deleteDiary } from '@/lib/supabase/diaryService'
import type { Diary } from '@/features/diary/types'

export default function HomePage() {
  const router = useRouter()
  const { user } = useUser()
  const [diaries, setDiaries] = useState<Diary[]>([])
  const [loading, setLoading] = useState(true)

  // 삭제 확인 모달 상태
  const [diaryToDelete, setDiaryToDelete] = useState<Diary | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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

  // 실제 삭제 실행
  const handleConfirmDelete = async () => {
    if (!diaryToDelete) return
    setIsDeleting(true)
    try {
      await deleteDiary(diaryToDelete.id)
      // 화면에서 즉시 제거 (DB 재조회 없이)
      setDiaries((prev) => prev.filter((d) => d.id !== diaryToDelete.id))
      setDiaryToDelete(null)
    } catch (err) {
      console.error('일기 삭제 실패:', err)
      alert('삭제에 실패했어요. 다시 시도해주세요.')
    } finally {
      setIsDeleting(false)
    }
  }

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
                // 본인이 만든 일기일 때만 삭제 콜백 전달
                onDelete={
                  user && diary.createdBy === user.id
                    ? () => setDiaryToDelete(diary)
                    : undefined
                }
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

      {/* 삭제 확인 모달 */}
      {diaryToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-6">
          <div className="bg-paper-50 rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <p className="font-handwriting text-lg text-ink-800 font-bold text-center mb-2">
                일기를 삭제할까요?
              </p>
              <p className="text-xs text-ink-700/50 text-center leading-relaxed">
                <span className="font-bold text-ink-800/80">"{diaryToDelete.title}"</span>
                <br />
                일기와 모든 덧붙임이 사라져요.
                <br />
                되돌릴 수 없어요.
              </p>
            </div>
            <div className="flex border-t border-paper-200">
              <button
                onClick={() => setDiaryToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-3.5 text-sm text-ink-700/60 hover:bg-paper-100 transition disabled:opacity-40"
              >
                취소
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-3.5 text-sm font-bold text-red-500 hover:bg-red-50 transition border-l border-paper-200 disabled:opacity-40"
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
