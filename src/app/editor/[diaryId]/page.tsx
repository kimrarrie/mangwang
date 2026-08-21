'use client'

import { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import EditorToolbar from '@/features/editor/EditorToolbar'
import type { CanvasHandle } from '@/features/editor/DiaryCanvas'
import type { ToolMode, TextOptions } from '@/features/editor/EditorToolbar'
import { getRandomBgColor } from '@/features/editor/EditorToolbar'
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
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [title, setTitle] = useState('')
  const [isEditingTitle, setIsEditingTitle] = useState(isNew)
  const [toolMode, setToolMode] = useState<ToolMode>('none')
  // 새 일기는 팔레트에서 랜덤 배경, 덧붙임은 투명 (이전 레이어 보이도록)
  const [bgColor] = useState(() => isNew ? getRandomBgColor() : 'transparent')

  // 사진 업로드 제한
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
  const MAX_IMAGE_COUNT = 5
  const photoInputRef = useRef<HTMLInputElement>(null)

  // 캔버스 콘텐츠 유무 추적
  const [hasCanvasContent, setHasCanvasContent] = useState(false)

  // ===== 휴지통 드래그 삭제 =====
  // isDragging: 드래그 중일 때 휴지통 UI 표시
  // isOverTrash: 휴지통 영역에 있을 때 강조 + 드롭 시 삭제
  const [isDragging, setIsDragging] = useState(false)
  const [isOverTrash, setIsOverTrash] = useState(false)
  const trashRef = useRef<HTMLDivElement>(null)
  // setState는 비동기라 mouse:up 시점에 stale일 수 있음 → ref로 보강
  const isOverTrashRef = useRef(false)

  const handleObjectMove = useCallback((clientX: number, clientY: number) => {
    setIsDragging(true)
    if (!trashRef.current) return
    const rect = trashRef.current.getBoundingClientRect()
    const over =
      clientX >= rect.left && clientX <= rect.right &&
      clientY >= rect.top && clientY <= rect.bottom
    isOverTrashRef.current = over
    setIsOverTrash(over)
  }, [])

  const handleObjectMoveEnd = useCallback(() => {
    if (isOverTrashRef.current) {
      canvasRef.current?.deleteActive()
    }
    isOverTrashRef.current = false
    setIsDragging(false)
    setIsOverTrash(false)
  }, [])

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

  // ===== 사진 추가 핸들러 =====
  // dataURL을 받아 캔버스에 스티커처럼 추가. 개수 제한 체크.
  const addImageToCanvas = useCallback(async (dataUrl: string) => {
    if (!canvasRef.current) return
    const currentCount = canvasRef.current.getImageCount()
    if (currentCount >= MAX_IMAGE_COUNT) {
      alert(`사진은 한 일기에 최대 ${MAX_IMAGE_COUNT}장까지 추가할 수 있어요.`)
      return
    }
    await canvasRef.current.addImage(dataUrl)
  }, [MAX_IMAGE_COUNT])

  // 파일 → dataURL 변환 + 용량 체크
  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 추가할 수 있어요.')
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1)
      alert(`사진 용량이 너무 커요 (${sizeMB}MB).\n5MB 이하 사진만 올릴 수 있어요.`)
      return
    }
    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string
      if (dataUrl) await addImageToCanvas(dataUrl)
    }
    reader.readAsDataURL(file)
  }, [addImageToCanvas, MAX_IMAGE_SIZE])

  // 사진 버튼 클릭 → 파일 선택 다이얼로그 열기
  const handlePhotoClick = useCallback(() => {
    photoInputRef.current?.click()
  }, [])

  const handlePhotoInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) await handleFile(file)
    // 같은 파일을 다시 선택할 수 있도록 input 초기화
    e.target.value = ''
  }, [handleFile])

  // ===== 클립보드 이미지 붙여넣기 =====
  // 텍스트 입력 중(textarea 포커스)에는 텍스트 붙여넣기로 동작하도록 무시
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return

      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            e.preventDefault()
            handleFile(file)
            break
          }
        }
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [handleFile])

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

    // 덧붙임 레이어는 투명 PNG라 썸네일 단독 생성 불가 — 합성 썸네일 별도 생성
    const compositeThumb = (!isNew && existingDiary)
      ? (await canvasRef.current.toThumbDataURL()) ?? undefined
      : undefined

    try {
      if (isNew) {
        await createDiary(saveTitle, imageData, user.id)
      } else if (existingDiary) {
        await appendLayer(existingDiary.id, imageData, user.id, existingDiary.layers.length, compositeThumb)
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
      <div className="theme-light-forced fixed inset-0 bg-black flex items-center justify-center">
        <p className="text-white/60 font-handwriting text-xl">불러오는 중...</p>
      </div>
    )
  }

  return (
    <div
      className="theme-light-forced fixed inset-0 bg-black flex flex-col items-center justify-center"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="relative w-full h-full max-w-[430px] max-h-[932px] flex flex-col overflow-hidden shadow-2xl">

        {/* 상단 바 */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/40 to-transparent">
          <button
            onClick={() => {
              if (hasCanvasContent) setShowExitConfirm(true)
              else router.push('/')
            }}
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
            <button onClick={() => setIsEditingTitle(true)} className="font-handwriting text-lg text-white/90 truncate max-w-[180px]">
              {title}
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving || !hasCanvasContent}
            className="text-sm font-bold px-4 py-2 rounded-full bg-white text-ink-800 hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition shrink-0 whitespace-nowrap"
          >
            {isSaving ? '저장 중…' : '완료'}
          </button>
        </div>

        {/* 숨겨진 파일 input — 사진 버튼 클릭 시 트리거 */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoInputChange}
        />

        {/* 캔버스 */}
        <div className="flex-1 relative">
          <DiaryCanvas
            ref={canvasRef}
            backgroundColor={bgColor}
            backgroundLayers={backgroundLayers}
            hiddenLayerIndices={hiddenLayers}
            onContentChange={setHasCanvasContent}
            onObjectMove={handleObjectMove}
            onObjectMoveEnd={handleObjectMoveEnd}
          />

          {/* ===== 휴지통 — 드래그 중일 때만 표시. 영역 안에 들어오면 강조 ===== */}
          <div
            ref={trashRef}
            className={`pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-20 z-30 flex flex-col items-center justify-center w-20 h-20 rounded-full transition-all duration-150 ${
              isDragging ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
            } ${
              isOverTrash
                ? 'bg-red-500/85 ring-4 ring-white/40 scale-110'
                : 'bg-black/55 backdrop-blur-sm'
            }`}
          >
            <span className="text-3xl">🗑️</span>
            <span className="text-[10px] text-white/80 mt-0.5">
              {isOverTrash ? '놓으면 삭제' : '여기로 끌기'}
            </span>
          </div>

          {/* 레이어 히스토리 패널 — 우측 하단, 밝은 반투명 */}
          {showLayerPanel && existingDiary && (
            <>
              {/* 외부 클릭 감지용 오버레이 */}
              <div className="absolute inset-0 z-20" onClick={() => setShowLayerPanel(false)} />
            <div className="absolute bottom-16 right-2 z-30 w-52 bg-white/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/40 overflow-hidden">
              <div className="px-3 py-2 border-b border-[#2a241b]/10">
                <p className="text-[11px] font-bold text-[#2a241b]/70">히스토리</p>
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
                        isOriginal ? 'cursor-default' : 'hover:bg-[#2a241b]/8'
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
                        <p className="text-[11px] font-medium truncate text-[#2a241b]">
                          {editor?.displayName || '알 수 없음'}
                          {isOriginal && <span className="text-[#2a241b]/40 ml-0.5">(오리지널)</span>}
                        </p>
                        <p className="text-[10px] text-[#2a241b]/40">{timeLabel}</p>
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
            </>
          )}

          <EditorToolbar
            mode={toolMode}
            onModeChange={handleModeChange}
            onColorChange={(color) => canvasRef.current?.setBrushColor(color)}
            onWidthChange={(width) => canvasRef.current?.setBrushWidth(width)}
            onTextSubmit={handleTextSubmit}
            onPhotoClick={handlePhotoClick}
            onUndo={() => canvasRef.current?.undo()}
            bgColor={bgColor}
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

        {/* 나가기 확인 모달 */}
        {showExitConfirm && (
          <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center px-6">
            <div className="bg-paper-50 rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden">
              <div className="px-5 pt-5 pb-3">
                <p className="font-handwriting text-lg text-ink-800 font-bold text-center mb-2">
                  나가시겠어요?
                </p>
                <p className="text-xs text-ink-700/50 text-center leading-relaxed">
                  작성 중인 내용이 저장되지 않아요.
                </p>
              </div>
              <div className="flex border-t border-paper-200">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-3.5 text-sm text-ink-700/60 hover:bg-paper-100 transition"
                >
                  계속 작성
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="flex-1 py-3.5 text-sm font-bold text-red-500 hover:bg-red-50 transition border-l border-paper-200"
                >
                  나가기
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
