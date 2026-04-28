'use client'

import { useState } from 'react'
import type { DiaryBook as DiaryBookType } from '@/features/diary/seasonUtils'

type DiaryBookProps = {
  book: DiaryBookType
  onClick: () => void
  onMenuAction: (action: 'customize' | 'pdf') => void
}

// 계절별 색상 테마
const SEASON_COLORS: Record<string, { spine: string; cover: string; label: string; text: string }> = {
  spring: { spine: '#d4a574', cover: '#8b6f47', label: '#fefcf0', text: '#5c4a2e' },
  summer: { spine: '#5a8a6a', cover: '#3d6b4f', label: '#f0faf4', text: '#2d4a38' },
  autumn: { spine: '#b8734a', cover: '#8b5e3c', label: '#fef8f0', text: '#5c3d24' },
  winter: { spine: '#6b7b8d', cover: '#4a5968', label: '#f0f4f8', text: '#3a4856' },
}

export default function DiaryBook({ book, onClick, onMenuAction }: DiaryBookProps) {
  const [showMenu, setShowMenu] = useState(false)
  const colors = SEASON_COLORS[book.season] || SEASON_COLORS.spring

  return (
    <div className="relative">
      {/* 일기장 카드 */}
      <button
        onClick={onClick}
        className="w-full aspect-[3/4] rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] relative"
        style={{ backgroundColor: colors.cover }}
      >
        {/* 책등 (왼쪽 띠) */}
        <div
          className="absolute left-0 top-0 bottom-0 w-4"
          style={{ backgroundColor: colors.spine }}
        />

        {/* 노트북 질감 — 미세한 줄무늬 패턴 */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 3px,
              rgba(255,255,255,0.3) 3px,
              rgba(255,255,255,0.3) 4px
            )`,
          }}
        />

        {/* 가운데 라벨 영역 */}
        <div className="absolute inset-0 flex items-center justify-center px-6">
          <div
            className="w-full py-5 px-4 rounded-md shadow-inner"
            style={{ backgroundColor: colors.label }}
          >
            <p
              className="font-handwriting text-xl font-bold text-center leading-tight"
              style={{ color: colors.text }}
            >
              {book.label}
            </p>
            <p
              className="font-handwriting text-sm text-center mt-1.5 opacity-60"
              style={{ color: colors.text }}
            >
              {book.diaries.length}편의 일기
            </p>
          </div>
        </div>
      </button>

      {/* 더보기 버튼 (⋯) */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          setShowMenu(!showMenu)
        }}
        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center transition text-white text-xs font-bold"
      >
        ⋯
      </button>

      {/* 드롭다운 메뉴 */}
      {showMenu && (
        <>
          {/* 바깥 클릭으로 닫기 */}
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute top-10 right-1 z-50 bg-paper-50 rounded-xl shadow-xl border border-paper-200 overflow-hidden w-36">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(false)
                onMenuAction('customize')
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-ink-800 hover:bg-paper-100 transition"
            >
              🎨 표지 꾸미기
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(false)
                onMenuAction('pdf')
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-ink-800 hover:bg-paper-100 transition border-t border-paper-200"
            >
              📄 PDF 다운로드
            </button>
          </div>
        </>
      )}
    </div>
  )
}
