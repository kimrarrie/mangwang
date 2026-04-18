'use client'

import { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import EditorToolbar from '@/features/editor/EditorToolbar'
import type { CanvasHandle } from '@/features/editor/DiaryCanvas'
import type { ToolMode, TextOptions } from '@/features/editor/EditorToolbar'
import { isPattern, getPatternCSS } from '@/features/editor/EditorToolbar'
import { getUserById, getInitial, getAvatarStyle } from '@/features/diary/mockData'
import { useUser } from '@/features/auth/useUser'
import { getDiaryById, markDiaryAsRead, createDiary, appendLayer } from '@/lib/supabase/diaryService'
import type { Diary } from '@/features/diary/types'

const DiaryCanvas = dynamic(
  () => import('@/features/editor/DiaryCanvas'),
  { ssr: false }
)

export default function EditorPage() {
  const params = useParams()
  const router = useRouter()
  const canvasRef = useRef<CanvasHandle>(null)
  const { user } = useUser()

  const diaryId = params.diaryId as string
  const isNew = diaryId === 'new'

  // 기존 일기 정보 (비동기 로드)
  const [existingDiary, setExistingDiary] = useState<Diary | null>(null)
  const [isLoadingDiary, setIsLoadingDiary] = useState(!isNew)

  useEffect(() => {
    if (isNew || !user) return
    const load = async () => {
      setIsLoadingDiary(true)
      const diary = await getDiaryById(diaryId, user.id)
      if (diary) {
        setTitle(diary.title)
        // 열람 시 읽음 처리 — 하이라이트와 딱지가 사라짐
        await markDiaryAsRead(diaryId, user.id, diary.layers.length)
      }
      setExistingDiary(diary)
      setIsLoadingDiary(false)
    }
    load()
  }, [diaryId, isNew, user?.id])

  // 이전 레이어들의 이미지 URL 배열 (배경으로 깔릴 것들)
  const backgroundLayers = useMemo(() => {
    return existingDiary?.layers.map((layer) => layer.imageDataUrl) || []
  }, [existingDiary])

  const [isSaving, setIsSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [isEditingTitle, setIsEditingTitle] = useState(isNew)
  const [toolMode, setToolMode] = useState<ToolMode>('none')
  const [bgColor, setBgColor] = useState(isNew ? '#fefcf8' : 'transparent')
  // 기존 일기에 덧붙일 때는 배경 투명 (이전 레이어가 보이도록)

  // 캔버스 콘텐츠 유무 추적
  const [hasCanvasContent, setHasCanvasContent] = useState(false)

  // 제목 추천 팝업
  const [showTitlePopup, setShowTitlePopup] = useState(false)
  const [suggestedTitle, setSuggestedTitle] = useState('')

  // 레이어 히스토리 패널
  const [showLayerPanel, setShowLayerPanel] = useState(false)
  const [hiddenLayers, setHiddenLayers] = useState<Set<number>>(new Set())

  const toggleLayer = useCallback((index: number) => {
    setHiddenLayers((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  const handleModeChange = useCallback((mode: ToolMode) => {
    setToolMode(mode)
    // draw 모드일 때만 캔버스 그리기 활성화
    canvasRef.current?.setDrawingMode(mode === 'draw')
  }, [])

  const handleTextSubmit = useCallback((options: TextOptions) => {
    canvasRef.current?.addText(options)
  }, [])

  const handleBgChange = useCallback((color: string) => {
    setBgColor(color)
    // 패턴은 Fabric 캔버스에 직접 적용할 수 없으므로 CSS로 처리
    // Fabric 캔버스 배경은 단색만 지원
    if (isPattern(color)) {
      canvasRef.current?.setBackgroundColor('')
    } else {
      canvasRef.current?.setBackgroundColor(color)
    }
  }, [])

  // 제목 추천 생성
  const generateTitleSuggestion = useCallback(() => {
    if (!canvasRef.current) return '제목 없음'
    const textContent = canvasRef.current.getTextContent()
    if (textContent) {
      // 텍스트 내용 기반: 첫 줄 또는 앞 15자를 제목으로
      const firstLine = textContent.split('\n')[0].trim()
      return firstLine.length > 15 ? firstLine.slice(0, 15) + '...' : firstLine
    }
    // 텍스트가 없으면 (그림만 있을 때)
    const currentUser = user ? getUserById(user.id) : null
    return `${currentUser?.displayName || '나'}의 그림`
  }, [user])

  const handleSave = async () => {
    if (!canvasRef.current) return

    // 새 일기에서 제목이 없으면 → 제목 추천 팝업
    if (isNew && !title.trim()) {
      setSuggestedTitle(generateTitleSuggestion())
      setShowTitlePopup(true)
      return
    }

    doSave(title)
  }

  const doSave = async (finalTitle?: string) => {
    if (!canvasRef.current || !user) return
    setIsSaving(true)

    const saveTitle = finalTitle || title || '제목 없음'
    const imageData = await canvasRef.current.toDataURL()

    if (!imageData) {
      setIsSaving(false)
      return
    }

    try {
      if (isNew) {
        await createDiary(saveTitle, imageData, user.id)
      } else if (existingDiary) {
        await appendLayer(existingDiary.id, imageData, user.id, existingDiary.layers.length)
      }
      router.push('/')
    } catch (err) {
      console.error('저장 실패:', err)
      alert('저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault()
      canvasRef.current?.undo()
    }
  }, [])

  // 기존 일기 로딩 중이면 스피너 표시
  if (isLoadingDiary) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <p className="text-white/60 font-handwriting text-xl">불러오는 중...</p>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 bg-black flex flex-col items-center justify-center"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="relative w-full h-full max-w-[430px] max-h-[932px] flex flex-col overflow-hidden shadow-2xl">

        {/* 상단 바 */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/40 to-transparent">
          <button
            onClick={() => router.push('/')}
            className="text-white/80 hover:text-white text-xl w-10 h-10 flex items-center justify-center"
          >
            ✕
          </button>

          {isEditingTitle ? (
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title && setIsEditingTitle(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && title) {
                  setIsEditingTitle(false)
                  e.stopPropagation()
                }
              }}
              placeholder="제목"
              className="font-handwriting text-lg text-white text-center bg-transparent border-b border-white/30 focus:border-white/60 outline-none px-2 py-1 w-40"
            />
          ) : (
            <button onClick={() => setIsEditingTitle(true)} className="font-handwriting text-lg text-white/90">
              {title}
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving || !hasCanvasContent}
            className="text-sm font-bold px-4 py-2 rounded-full bg-white text-ink-800 hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            {isSaving ? '...' : '완료'}
          </button>
        </div>

        {/* 캔버스 — 패턴 배경은 CSS로 적용 */}
        <div
          className="flex-1 relative"
          style={isPattern(bgColor) ? getPatternCSS(bgColor) : undefined}
        >
          <DiaryCanvas
            ref={canvasRef}
            backgroundColor={bgColor}
            backgroundLayers={backgroundLayers}
            hiddenLayerIndices={hiddenLayers}
            onContentChange={setHasCanvasContent}
          />

          {/* 레이어 히스토리 패널 — 우측 하단, 밝은 반투명 */}
          {showLayerPanel && existingDiary && (
            <div className="absolute bottom-16 right-2 z-30 w-52 bg-white/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/40 overflow-hidden">
              <div className="px-3 py-2 border-b border-ink-800/10">
                <p className="text-ink-800/70 text-xs font-bold">히스토리</p>
              </div>
              <div className="flex flex-col py-1">
                {/* 최신순 정렬: 배열을 뒤집어서 표시 */}
                {[...existingDiary.layers].reverse().map((layer, reversedIndex) => {
                  const originalIndex = existingDiary.layers.length - 1 - reversedIndex
                  const isOriginal = originalIndex === 0
                  const editor = getUserById(layer.editorId)
                  const avatar = getAvatarStyle(layer.editorId)
                  const isHidden = hiddenLayers.has(originalIndex)
                  const timeLabel = formatRelativeLayerTime(layer.editedAt)

                  return (
                    <button
                      key={originalIndex}
                      onClick={() => !isOriginal && toggleLayer(originalIndex)}
                      className={`flex items-center gap-2.5 px-3 py-2 transition ${
                        isOriginal ? 'cursor-default' : 'hover:bg-ink-800/8'
                      } ${isHidden ? 'opacity-35' : ''}`}
                    >
                      {/* 프로필 원형 */}
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${avatar.className}`}
                        style={avatar.style}
                      >
                        {getInitial(layer.editorId)}
                      </div>
                      {/* 정보 */}
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-ink-800 text-[11px] font-medium truncate">
                          {editor?.displayName || '알 수 없음'}
                          {isOriginal && <span className="text-ink-800/40 ml-0.5">(오리지널)</span>}
                        </p>
                        <p className="text-ink-800/40 text-[10px]">{timeLabel}</p>
                      </div>
                      {/* 눈 아이콘 */}
                      <span className="text-xs shrink-0">
                        {isOriginal ? '🔒' : isHidden ? '🙈' : '👁️'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <EditorToolbar
            mode={toolMode}
            onModeChange={handleModeChange}
            onColorChange={(color) => canvasRef.current?.setBrushColor(color)}
            onWidthChange={(width) => canvasRef.current?.setBrushWidth(width)}
            onTextSubmit={handleTextSubmit}
            onBackgroundChange={handleBgChange}
            onUndo={() => canvasRef.current?.undo()}
            currentBgColor={bgColor}
            showHistory={!!existingDiary && existingDiary.layers.length > 0}
            isHistoryOpen={showLayerPanel}
            onHistoryToggle={() => setShowLayerPanel(!showLayerPanel)}
          />
        </div>

        {/* 제목 추천 팝업 */}
        {showTitlePopup && (
          <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center px-6">
            <div className="bg-paper-50 rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden">
              <div className="px-5 pt-5 pb-3">
                <p className="font-handwriting text-lg text-ink-800 font-bold text-center mb-1">제목을 정해주세요</p>
                <p className="text-xs text-ink-700/50 text-center">일기 목록에서 보여질 제목이에요</p>
              </div>
              <div className="px-5 pb-4">
                <input
                  autoFocus
                  value={suggestedTitle}
                  onChange={(e) => setSuggestedTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && suggestedTitle.trim()) {
                      const finalTitle = suggestedTitle.trim()
                      setTitle(finalTitle)
                      setShowTitlePopup(false)
                      doSave(finalTitle)
                    }
                    e.stopPropagation()
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-paper-100 border border-paper-200 font-handwriting text-ink-800 text-center outline-none focus:border-ink-800/30 transition"
                  placeholder="제목을 입력하세요"
                />
              </div>
              <div className="flex border-t border-paper-200">
                <button
                  onClick={() => setShowTitlePopup(false)}
                  className="flex-1 py-3.5 text-sm text-ink-700/50 hover:bg-paper-100 transition"
                >
                  취소
                </button>
                <button
                  onClick={() => {
                    if (suggestedTitle.trim()) {
                      const finalTitle = suggestedTitle.trim()
                      setTitle(finalTitle)
                      setShowTitlePopup(false)
                      doSave(finalTitle)
                    }
                  }}
                  disabled={!suggestedTitle.trim()}
                  className="flex-1 py-3.5 text-sm font-bold text-ink-800 hover:bg-paper-100 transition border-l border-paper-200 disabled:opacity-30"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// 레이어 상대 시간 포맷
// 1달 미만: "방금", "3분 전", "2시간 전", "5일 전"
// 1달 이상: "4월 7일 오후 3:42"
function formatRelativeLayerTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return '방금'
  if (diffMin < 60) return `${diffMin}분 전`
  if (diffHour < 24) return `${diffHour}시간 전`
  if (diffDay < 30) return `${diffDay}일 전`

  // 1달 이상이면 날짜 + 시간 표시
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = date.getHours()
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const period = hours < 12 ? '오전' : '오후'
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  return `${month}월 ${day}일 ${period} ${displayHour}:${minutes}`
}
