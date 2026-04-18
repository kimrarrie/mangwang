'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { mockDiaries } from '@/features/diary/mockData'
import { getBookById } from '@/features/diary/seasonUtils'

// 계절별 표지 색상
const COVER_COLORS: Record<string, { bg: string; text: string; sub: string }> = {
  spring: { bg: '#8b6f47', text: '#fefcf0', sub: '#d4c5a8' },
  summer: { bg: '#3d6b4f', text: '#f0faf4', sub: '#a8d4b8' },
  autumn: { bg: '#8b5e3c', text: '#fef8f0', sub: '#d4b8a0' },
  winter: { bg: '#4a5968', text: '#f0f4f8', sub: '#a8b8c8' },
}

export default function SlideshowPage() {
  const params = useParams()
  const router = useRouter()
  const bookId = params.bookId as string

  const book = useMemo(() => getBookById(bookId, mockDiaries), [bookId])

  const [currentPage, setCurrentPage] = useState(0)
  const [prevPage, setPrevPage] = useState<number | null>(null)
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev' | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  // 총 페이지 = 1(표지) + 일기 수
  const totalPages = book ? 1 + book.diaries.length : 0

  const goNext = useCallback(() => {
    if (isAnimating) return
    setCurrentPage((p) => {
      if (p >= totalPages - 1) return p
      setPrevPage(p)
      setSlideDirection('next')
      setIsAnimating(true)
      setTimeout(() => { setIsAnimating(false); setPrevPage(null); setSlideDirection(null) }, 400)
      return p + 1
    })
  }, [totalPages, isAnimating])

  const goPrev = useCallback(() => {
    if (isAnimating) return
    setCurrentPage((p) => {
      if (p <= 0) return p
      setPrevPage(p)
      setSlideDirection('prev')
      setIsAnimating(true)
      setTimeout(() => { setIsAnimating(false); setPrevPage(null); setSlideDirection(null) }, 400)
      return p - 1
    })
  }, [isAnimating])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault()
      goNext()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      goPrev()
    } else if (e.key === 'Escape') {
      router.push('/archive')
    }
  }, [goNext, goPrev, router])

  // ===== 스와이프 처리 =====
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    const deltaY = e.changedTouches[0].clientY - touchStartY.current

    // 가로 스와이프가 세로보다 클 때만 반응 (스크롤과 구분)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX < 0) goNext()   // 왼쪽으로 스와이프 → 다음
      else goPrev()              // 오른쪽으로 스와이프 → 이전
    }
  }, [goNext, goPrev])

  if (!book) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <p className="text-white/60 font-handwriting text-xl">일기장을 찾을 수 없어요</p>
      </div>
    )
  }

  const coverColors = COVER_COLORS[book.season] || COVER_COLORS.spring

  // 페이지 인덱스로 콘텐츠 렌더링
  const renderPage = (pageIndex: number) => {
    if (pageIndex === 0) {
      return <CoverPage label={book.label} season={book.season} colors={coverColors} diaryCount={book.diaries.length} />
    }
    return <DiaryPage diary={book.diaries[pageIndex - 1]} />
  }

  return (
    <div
      className="fixed inset-0 bg-black flex flex-col items-center justify-center"
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      tabIndex={0}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
      role="presentation"
      ref={(el) => el?.focus()}
    >
      <div className="relative w-full h-full max-w-[430px] max-h-[932px] flex flex-col overflow-hidden shadow-2xl">

        {/* 닫기 버튼 */}
        <button
          onClick={() => router.push('/archive')}
          className="absolute top-3 left-3 z-30 text-white/70 hover:text-white text-xl w-10 h-10 flex items-center justify-center bg-black/20 rounded-full backdrop-blur-sm transition"
        >
          ✕
        </button>

        {/* 페이지 카운터 */}
        <div className="absolute top-4 right-4 z-30 text-white/50 text-xs font-handwriting bg-black/20 rounded-full px-3 py-1 backdrop-blur-sm">
          {currentPage + 1} / {totalPages}
        </div>

        {/* 페이지 콘텐츠 — 겹침 애니메이션 */}
        <div className="flex-1 relative overflow-hidden">
          {/*
            다음 페이지(next): 현재 페이지가 위에서 왼쪽으로 사라짐, 새 페이지는 뒤에 대기
            이전 페이지(prev): 새 페이지가 왼쪽에서 위로 들어옴, 이전 페이지는 뒤에 대기
          */}

          {slideDirection === 'next' && prevPage !== null ? (
            <>
              {/* 뒤: 새 페이지 (가만히 있음) */}
              <div className="absolute inset-0 z-0">
                {renderPage(currentPage)}
              </div>
              {/* 앞: 이전 페이지가 왼쪽으로 사라짐 */}
              <div className="absolute inset-0 z-10 page-slide-out-left">
                {renderPage(prevPage)}
              </div>
            </>
          ) : slideDirection === 'prev' && prevPage !== null ? (
            <>
              {/* 뒤: 이전 페이지 (가만히 있음) */}
              <div className="absolute inset-0 z-0">
                {renderPage(prevPage)}
              </div>
              {/* 앞: 새 페이지가 왼쪽에서 들어옴 */}
              <div className="absolute inset-0 z-10 page-slide-in-left">
                {renderPage(currentPage)}
              </div>
            </>
          ) : (
            /* 애니메이션 없을 때 — 현재 페이지만 표시 */
            <div className="absolute inset-0">
              {renderPage(currentPage)}
            </div>
          )}
        </div>

        {/* 페이지 전환 애니메이션 */}
        <style jsx global>{`
          .page-slide-out-left {
            animation: slideOutLeft 0.4s ease-in-out forwards;
          }
          .page-slide-in-left {
            animation: slideInLeft 0.4s ease-in-out forwards;
          }
          @keyframes slideOutLeft {
            from { transform: translateX(0); }
            to { transform: translateX(-100%); }
          }
          @keyframes slideInLeft {
            from { transform: translateX(-100%); }
            to { transform: translateX(0); }
          }
        `}</style>

        {/* 좌/우 네비게이션 버튼 */}
        {currentPage > 0 && (
          <button
            onClick={goPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-16 flex items-center justify-center bg-black/20 hover:bg-black/40 rounded-xl transition text-white/70 hover:text-white text-xl backdrop-blur-sm"
          >
            ‹
          </button>
        )}
        {currentPage < totalPages - 1 && (
          <button
            onClick={goNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-16 flex items-center justify-center bg-black/20 hover:bg-black/40 rounded-xl transition text-white/70 hover:text-white text-xl backdrop-blur-sm"
          >
            ›
          </button>
        )}

        {/* 하단 페이지 인디케이터 */}
        <div className="absolute bottom-4 left-0 right-0 z-20 flex items-center justify-center gap-1.5">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i)}
              className={`rounded-full transition-all ${
                i === currentPage
                  ? 'w-6 h-2 bg-white/80'
                  : 'w-2 h-2 bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ===== 표지 컴포넌트 =====

function CoverPage({ label, season, colors, diaryCount }: {
  label: string
  season: string
  colors: { bg: string; text: string; sub: string }
  diaryCount: number
}) {
  // 계절 이모지
  const seasonEmoji: Record<string, string> = {
    spring: '🌸', summer: '🌊', autumn: '🍁', winter: '❄️'
  }

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center relative"
      style={{ backgroundColor: colors.bg }}
    >
      {/* 책등 */}
      <div
        className="absolute left-0 top-0 bottom-0 w-5"
        style={{ backgroundColor: `${colors.bg}dd`, borderRight: `2px solid ${colors.sub}40` }}
      />

      {/* 노트북 줄무늬 질감 */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.4) 3px, rgba(255,255,255,0.4) 4px)`,
        }}
      />

      {/* 라벨 */}
      <div
        className="px-10 py-8 rounded-lg shadow-inner relative"
        style={{ backgroundColor: colors.text }}
      >
        <p className="text-5xl text-center mb-3">{seasonEmoji[season] || '📖'}</p>
        <h1
          className="font-handwriting text-3xl font-bold text-center leading-tight"
          style={{ color: colors.bg }}
        >
          {label}
        </h1>
        <p
          className="font-handwriting text-base text-center mt-2 opacity-50"
          style={{ color: colors.bg }}
        >
          {diaryCount}편의 일기
        </p>
      </div>
    </div>
  )
}

// ===== 일기 페이지 컴포넌트 =====

import type { Diary } from '@/features/diary/types'

function DiaryPage({ diary }: { diary: Diary }) {
  // 날짜 포맷
  const date = new Date(diary.createdAt)
  const dateStr = `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`

  return (
    <div className="w-full h-full relative bg-paper-50">
      {/* 레이어 이미지 스택 */}
      {diary.layers.map((layer, index) => (
        <img
          key={index}
          src={layer.imageDataUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-fill"
          style={{ zIndex: index }}
        />
      ))}

      {/* 하단 정보 오버레이 */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/50 to-transparent px-5 pb-10 pt-16">
        <h2 className="font-handwriting text-2xl text-white font-bold drop-shadow-md">
          {diary.title}
        </h2>
        <p className="font-handwriting text-sm text-white/70 mt-1 drop-shadow-md">
          {dateStr}
        </p>
      </div>
    </div>
  )
}
