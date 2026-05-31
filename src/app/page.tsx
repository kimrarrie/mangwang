'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import DiaryCard from '@/components/ui/DiaryCard'
import { getInitial, getAvatarStyle } from '@/features/diary/mockData'
import { useUser } from '@/features/auth/useUser'
import { getSortedDiaries, deleteDiary, togglePin } from '@/lib/supabase/diaryService'
import { useTheme } from '@/components/ThemeProvider'
import type { Diary } from '@/features/diary/types'

export default function HomePage() {
  const router = useRouter()
  const { user } = useUser()
  const { isDark, toggleTheme } = useTheme()
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

  // 에디터 경로 사전 로드 — 버튼 클릭 전에 JS 번들과 페이지를 미리 받아둠
  useEffect(() => {
    router.prefetch('/editor/new')
  }, [router])

  // 일기 목록이 뜨면 상위 3개 에디터 경로도 prefetch (덧붙임 클릭 시 빠르게 진입)
  useEffect(() => {
    diaries.slice(0, 3).forEach((d) => router.prefetch(`/editor/${d.id}`))
  }, [diaries, router])

  // 프로필 로드 후 아바타 표시 (loading=false 이후에만)
  const headerAvatar = user && !loading ? getAvatarStyle(user.id) : null

  // 오늘 날짜 포맷
  const today = new Date()
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']
  const dayStr = dayNames[today.getDay()]

  // 핀 고정/해제
  const handleTogglePin = async (diary: Diary) => {
    const next = !diary.isPinned
    setDiaries((prev) => prev.map((d) => d.id === diary.id ? { ...d, isPinned: next } : d))
    try {
      await togglePin(diary.id, next)
    } catch {
      // 실패 시 롤백
      setDiaries((prev) => prev.map((d) => d.id === diary.id ? { ...d, isPinned: diary.isPinned } : d))
    }
  }

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
      <header className="sticky top-0 z-30 backdrop-blur-sm bg-paper-100/80 border-b border-paper-200">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center justify-between">
          <h1 className="font-handwriting text-2xl text-ink-800 font-bold">
            만남의 광장
          </h1>
          <div className="flex items-center gap-2">
            {/* 다크모드 토글 버튼 — 마운트 전(isDark===null)엔 숨김 */}
            {isDark !== null && (
              <button
                onClick={toggleTheme}
                className="w-9 h-9 rounded-full flex items-center justify-center text-lg hover:scale-105 active:scale-95 transition"
                aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
              >
                {isDark ? '☀️' : '🌙'}
              </button>
            )}
            {/* 프로필 아이콘 */}
            <button
              onClick={() => router.push('/profile')}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ring-2 ring-white hover:scale-105 active:scale-95 transition ${headerAvatar?.className || 'bg-gray-200'}`}
              style={headerAvatar?.style}
            >
              {user && !loading ? getInitial(user.id) : ''}
            </button>
          </div>
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

        {/* ===== 핀 스토리 스트립 ===== */}
        {!loading && diaries.some((d) => d.isPinned) && (
          <PinStrip diaries={diaries} onNavigate={(id) => router.push(`/editor/${id}`)} />
        )}

        {/* 일기 목록 */}
        {loading ? (
          <div className="text-center py-20">
            <p className="font-handwriting text-xl text-ink-700/40">불러오는 중...</p>
          </div>
        ) : diaries.length > 0 ? (
          <div className="flex flex-col gap-4">
            {/* 모든 일기 섹션 제목 */}
            <p className="font-handwriting text-sm text-ink-700/50 flex items-center gap-1 -mb-1">
              <span>📋</span> 모든 일기
            </p>
            {diaries.map((diary) => (
              <DiaryCard
                key={diary.id}
                diary={diary}
                onClick={() => router.push(`/editor/${diary.id}`)}
                onTogglePin={() => handleTogglePin(diary)}
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
          className="flex items-center gap-2 px-6 py-3.5 rounded-full transition-all hover:scale-105 active:scale-95 font-handwriting text-lg text-[#fefcf8]"
          style={{
            backgroundColor: '#C47C10',
            boxShadow: '0 4px 20px rgba(196, 124, 16, 0.45), 0 2px 6px rgba(0,0,0,0.15)',
          }}
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

// ===== 핀 스트립 컴포넌트 =====

function PinStrip({ diaries, onNavigate }: { diaries: Diary[]; onNavigate: (id: string) => void }) {
  const stripRef = useRef<HTMLDivElement>(null)

  // PC 마우스 휠 → 가로 스크롤 변환
  useEffect(() => {
    const el = stripRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault()
        el.scrollLeft += e.deltaY
      }
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  // 정렬: 미읽음 먼저, 같은 그룹 내 pinned_at 최신순
  const sorted = useMemo(() => {
    return [...diaries.filter((d) => d.isPinned)].sort((a, b) => {
      if (a.isPinnedUnread !== b.isPinnedUnread) return a.isPinnedUnread ? -1 : 1
      const aT = a.pinnedAt ?? a.createdAt
      const bT = b.pinnedAt ?? b.createdAt
      return bT.localeCompare(aT)
    })
  }, [diaries])

  return (
    <div className="mb-2 -mx-5 px-5">
      <p className="font-handwriting text-sm text-ink-700/50 mb-2 flex items-center gap-1">
        <span>📌</span> 고정 일기
      </p>
      {/* pt-2 pb-3 pl-1: outline이 잘리지 않도록 여백 */}
      <div ref={stripRef} className="flex gap-5 overflow-x-auto no-scrollbar pt-2 pb-3 pl-1 cursor-grab active:cursor-grabbing">
        {sorted.map((diary) => {
          const lastLayer = diary.layers[diary.layers.length - 1]
          const thumbSrc = lastLayer?.thumbDataUrl ?? lastLayer?.imageDataUrl
          const avatar = getAvatarStyle(diary.createdBy)
          const unread = diary.isPinnedUnread
          const ringColor = unread ? '#3B82F6' : '#c9b99a'

          return (
            <button
              key={diary.id}
              onClick={() => onNavigate(diary.id)}
              className="flex flex-col items-center gap-3 shrink-0"
            >
              {/* border + padding 방식: 요소 경계 안에 링이 포함되어 overflow에 절대 안 잘림 */}
              <div
                className="rounded-full shrink-0"
                style={{
                  width: 64,
                  height: 64,
                  border: `3px solid ${ringColor}`,
                  padding: 3,
                  boxSizing: 'border-box' as const,
                }}
              >
                <div className="w-full h-full rounded-full overflow-hidden">
                  {thumbSrc ? (
                    <img src={thumbSrc} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div
                      className={`w-full h-full flex items-center justify-center text-base font-bold ${avatar.className}`}
                      style={avatar.style}
                    >
                      {getInitial(diary.createdBy)}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-ink-700/60 max-w-[64px] truncate text-center leading-tight">
                {diary.title}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
