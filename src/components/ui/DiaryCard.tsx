'use client'

import { useEffect, useRef, useState } from 'react'
import { Diary } from '@/features/diary/types'
import { getUserById, getInitial, getAvatarStyle } from '@/features/diary/mockData'

type DiaryCardProps = {
  diary: Diary
  onClick?: () => void
  onDelete?: () => void  // 삭제 가능한 경우에만 전달 (본인이 만든 일기일 때)
}

export default function DiaryCard({ diary, onClick, onDelete }: DiaryCardProps) {
  const hasUnread = diary.unreadEdits > 0
  const lastEditorAvatar = getAvatarStyle(diary.lastEditedBy)

  // 메뉴 열림 상태
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 메뉴 바깥 클릭 시 닫기
  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  // 알림 뱃지 텍스트: 1~10은 숫자, 그 이상은 +10
  const badgeText = diary.unreadEdits > 10 ? '+10' : String(diary.unreadEdits)

  // 마지막 레이어 썸네일 (홈 카드용 — 썸네일 없으면 원본 사용)
  const lastLayer = diary.layers.length > 0 ? diary.layers[diary.layers.length - 1] : null
  const lastLayerImage = lastLayer ? (lastLayer.thumbDataUrl ?? lastLayer.imageDataUrl) : null

  // 마지막 편집자 이름 + 상대 시간
  const lastEditor = getUserById(diary.lastEditedBy)
  const isFirstLayer = diary.layers.length <= 1 // 레이어 1개 이하면 "생성함"
  const lastEditLabel = lastEditor
    ? `${lastEditor.displayName}${getSubjectParticle(lastEditor.displayName)} ${formatRelativeTime(diary.lastEditedAt)} ${isFirstLayer ? '생성함' : '덧붙임'}`
    : ''

  return (
    // 바깥 wrapper: overflow-visible로 딱지가 카드 밖으로 튀어나올 수 있게
    <div className="relative">
      {/* 안 읽은 편집 건수 뱃지 — 카드 바깥으로 튀어나옴 */}
      {hasUnread && (
        <div
          className={`absolute -top-2.5 -right-2.5 z-[5] ${lastEditorAvatar.className} w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-md`}
          style={lastEditorAvatar.style}
        >
          {badgeText}
        </div>
      )}

      {/* ⋯ 메뉴 버튼 — onDelete가 있을 때만 표시 (본인이 만든 일기) */}
      {onDelete && (
        <div ref={menuRef} className="absolute top-2 right-2 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen((v) => !v)
            }}
            className="w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white text-ink-800/70 hover:text-ink-800 flex items-center justify-center text-lg shadow-sm transition"
            aria-label="메뉴 열기"
          >
            ⋯
          </button>

          {/* 드롭다운 메뉴 */}
          {menuOpen && (
            <div className="absolute top-10 right-0 bg-paper-50 rounded-xl shadow-lg border border-paper-200 overflow-hidden min-w-[120px]">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  onDelete()
                }}
                className="w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition text-left flex items-center gap-2"
              >
                <span>🗑️</span>
                <span>삭제하기</span>
              </button>
            </div>
          )}
        </div>
      )}

      <button
        onClick={onClick}
        className={`relative paper-card overflow-hidden text-left w-full ${
          hasUnread ? `ring-2 ${lastEditorAvatar.ringClass}` : ''
        }`}
        style={hasUnread ? lastEditorAvatar.ringStyle : undefined}
      >
        {/* 일기 미리보기 이미지 — 가운데 부분을 잘라서 보여줌 */}
        {lastLayerImage ? (
          <div className="w-full h-40 bg-paper-50 relative overflow-hidden rounded-t-lg">
            {/* 마지막 레이어 썸네일만 표시 (Egress 절감) */}
            <img
              src={lastLayerImage}
              alt=""
              className="absolute inset-0 w-full h-full object-cover object-center"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="w-full h-32 bg-paper-50 flex items-center justify-center rounded-t-lg">
            <p className="text-sm text-ink-700/30 font-handwriting">아직 작성된 내용이 없어요</p>
          </div>
        )}

        {/* 하단 정보 영역 */}
        <div className="p-4">
          {/* 제목 */}
          <h3 className="font-handwriting text-xl text-ink-800 mb-2 leading-tight">
            {diary.title}
          </h3>

          {/* 편집자 아바타 + 업데이트 정보 */}
          <div className="flex items-center justify-between">
            {/* 편집자 원형 아바타 */}
            <div className="flex items-center gap-1.5">
              {diary.editors.map((editorId) => {
                const editor = getUserById(editorId)
                const avatar = getAvatarStyle(editorId)
                if (!editor) return null

                // 마지막 편집자에게 테두리 강조
                const isLastEditor = editorId === diary.lastEditedBy && hasUnread

                return (
                  <div
                    key={editorId}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm ${avatar.className} ${
                      isLastEditor ? `ring-2 ${avatar.ringClass}` : ''
                    }`}
                    style={{ ...avatar.style, ...(isLastEditor ? avatar.ringStyle : {}) }}
                    title={editor.displayName}
                  >
                    {getInitial(editorId)}
                  </div>
                )
              })}
            </div>

            {/* 최근 업데이트 정보 */}
            <span className={`text-xs ${hasUnread ? 'text-ink-700/70 font-medium' : 'text-ink-700/40'}`}>
              {lastEditLabel}
            </span>
          </div>
        </div>
      </button>
    </div>
  )
}

// 한국어 주격 조사 판별 ("이" 또는 "가")
// 마지막 글자에 받침(종성)이 있으면 "이", 없으면 "가"
function getSubjectParticle(name: string): string {
  const lastChar = name.charAt(name.length - 1)
  const code = lastChar.charCodeAt(0)

  // 한글 유니코드 범위: 0xAC00 ~ 0xD7A3
  if (code < 0xAC00 || code > 0xD7A3) return '이' // 한글이 아니면 "이"로 기본

  // 종성 여부: (코드 - 0xAC00) % 28 === 0 이면 받침 없음
  const hasFinalConsonant = (code - 0xAC00) % 28 !== 0
  return hasFinalConsonant ? '이' : '가'
}

// 상대 시간 포맷 ("방금", "3분 전", "2시간 전", "3일 전", "4월 5일")
function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return '방금'
  if (diffMin < 60) return `${diffMin}분 전`
  if (diffHour < 24) return `${diffHour}시간 전`
  if (diffDay < 7) return `${diffDay}일 전`

  // 7일 이상이면 날짜 표시
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}월 ${day}일`
}
