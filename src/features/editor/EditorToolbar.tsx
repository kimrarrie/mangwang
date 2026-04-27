'use client'

import { useEffect, useState } from 'react'

// ===== 색상 팔레트 (펜/텍스트 공용, 가로 스크롤 가능) =====
const COLORS = [
  '#3d3529', '#000000', '#ffffff', '#7f8c8d',
  '#c0392b', '#e74c3c', '#e67e22', '#f39c12',
  '#f1c40f', '#27ae60', '#16a085', '#1abc9c',
  '#3498db', '#2980b9', '#8e44ad', '#e84393',
]

// ===== 배경 팔레트 (새 일기 생성 시 랜덤으로 하나 선택) =====
const BG_PALETTE = [
  '#fefcf8', '#f8efd8', '#fde2d4', '#fce4ec',
  '#ece4f5', '#e3edf7', '#dff1ec', '#e6efd9',
  '#ecebe7', '#eef0f2', '#1a1610', '#222837',
  '#3a1f24', '#1f2e26', '#2a1f3d', '#2e2018',
]

export function getRandomBgColor(): string {
  return BG_PALETTE[Math.floor(Math.random() * BG_PALETTE.length)]
}

// 펜 굵기
const BRUSH_WIDTHS = [2, 5, 10]

// 폰트 스타일 옵션
const FONT_STYLES = [
  { id: 'handwriting', label: '손글씨', fontFamily: 'Gaegu, cursive' },
  { id: 'serif', label: '명조', fontFamily: '"Nanum Myeongjo", Georgia, serif' },
  { id: 'sans', label: '고딕', fontFamily: 'Arial, Helvetica, sans-serif' },
]

// ===== 도구 모드 (배경 모드 제거) =====
export type ToolMode = 'none' | 'text' | 'draw'

// 텍스트 옵션
export type TextOptions = {
  text: string
  color: string
  fontFamily: string
  textAlign: string
}

type EditorToolbarProps = {
  mode: ToolMode
  onModeChange: (mode: ToolMode) => void
  onColorChange: (color: string) => void
  onWidthChange: (width: number) => void
  onTextSubmit: (options: TextOptions) => void
  onPhotoClick: () => void           // 사진 버튼 클릭 → page에서 file input 열기
  onUndo: () => void
  showHistory?: boolean
  isHistoryOpen?: boolean
  onHistoryToggle?: () => void
}

export default function EditorToolbar({
  mode,
  onModeChange,
  onColorChange,
  onWidthChange,
  onTextSubmit,
  onPhotoClick,
  onUndo,
  showHistory,
  isHistoryOpen,
  onHistoryToggle,
}: EditorToolbarProps) {
  const [selectedColor, setSelectedColor] = useState(COLORS[0])
  const [selectedWidth, setSelectedWidth] = useState(5)
  const [textInput, setTextInput] = useState('')
  const [textFont, setTextFont] = useState(FONT_STYLES[0])

  // ===== 모바일 키보드 높이 추적 (visualViewport API) =====
  // 키보드가 올라오면 텍스트 컨트롤이 가려지지 않도록 하단 패딩으로 보정
  const [keyboardOffset, setKeyboardOffset] = useState(0)
  useEffect(() => {
    if (mode !== 'text') {
      setKeyboardOffset(0)
      return
    }
    const vv = typeof window !== 'undefined' ? window.visualViewport : null
    if (!vv) return
    const handler = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      setKeyboardOffset(offset)
    }
    vv.addEventListener('resize', handler)
    vv.addEventListener('scroll', handler)
    handler()
    return () => {
      vv.removeEventListener('resize', handler)
      vv.removeEventListener('scroll', handler)
    }
  }, [mode])

  const handleModeToggle = (newMode: ToolMode) => {
    onModeChange(mode === newMode ? 'none' : newMode)
  }

  const handleColorSelect = (color: string) => {
    setSelectedColor(color)
    onColorChange(color)
  }

  const handleTextConfirm = () => {
    if (textInput.trim()) {
      onTextSubmit({
        text: textInput.trim(),
        color: selectedColor,
        fontFamily: textFont.fontFamily,
        textAlign: 'center', // 항상 가운데 정렬 (정렬 옵션 제거)
      })
      setTextInput('')
      onModeChange('none')
    }
  }

  return (
    <>
      {/* ===== 텍스트 입력 오버레이 — 위쪽 정렬 + 키보드만큼 아래 패딩 ===== */}
      {mode === 'text' && (
        <div
          className="absolute inset-0 z-20 bg-black/60 flex flex-col items-center px-6 overflow-y-auto"
          style={{ paddingTop: '18vh', paddingBottom: keyboardOffset + 16 }}
        >
          {/* 텍스트 입력 */}
          <textarea
            autoFocus
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="텍스트를 입력하세요"
            className="bg-transparent text-center outline-none resize-none w-full max-w-xs placeholder-white/40"
            style={{
              fontSize: 24,
              color: selectedColor === '#3d3529' ? '#ffffff' : selectedColor,
              fontFamily: textFont.fontFamily,
              textAlign: 'center',
            }}
            rows={3}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleTextConfirm()
              }
            }}
          />

          {/* 폰트 스타일 선택 */}
          <div className="flex items-center gap-2 mt-5">
            {FONT_STYLES.map((font) => (
              <button
                key={font.id}
                onClick={() => setTextFont(font)}
                className={`px-3 py-1.5 rounded-full text-sm transition ${
                  textFont.id === font.id
                    ? 'bg-white text-ink-800 font-bold'
                    : 'bg-white/15 text-white/70'
                }`}
                style={{ fontFamily: font.fontFamily }}
              >
                {font.label}
              </button>
            ))}
          </div>

          {/* 색상 선택 — 가로 스크롤만 + 우측 페이드 마스크로 더 있음을 힌트 */}
          <div
            className="w-[260px] mt-4 overflow-x-auto no-scrollbar"
            style={{
              touchAction: 'pan-x',
              overscrollBehaviorX: 'contain',
              WebkitMaskImage: 'linear-gradient(to right, black 88%, transparent)',
              maskImage: 'linear-gradient(to right, black 88%, transparent)',
            }}
          >
            <div className="flex items-center gap-2 px-1 py-1 w-max">
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorSelect(color)}
                  className={`shrink-0 w-7 h-7 rounded-full transition ${
                    selectedColor === color
                      ? 'ring-2 ring-inset ring-white'
                      : 'opacity-70'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* 확인/취소 */}
          <div className="flex gap-4 mt-5">
            <button
              onClick={() => { setTextInput(''); onModeChange('none') }}
              className="px-5 py-2 text-white/70 text-sm"
            >
              취소
            </button>
            <button
              onClick={handleTextConfirm}
              className="px-5 py-2 bg-white text-ink-800 rounded-full text-sm font-bold"
            >
              추가
            </button>
          </div>
        </div>
      )}

      {/* ===== 그리기 모드 — 색상 + 굵기 한 줄에 배치 (공간 절약) ===== */}
      {mode === 'draw' && (
        <div className="absolute bottom-16 left-0 right-0 z-10 px-3 py-2 flex justify-center">
          <div className="flex items-center gap-2 bg-black/55 backdrop-blur-sm rounded-full pl-2 pr-3 py-1.5 max-w-full">
            {/* 굵기 — 좌측 고정 */}
            <div className="flex items-center gap-1 shrink-0 pr-1.5 border-r border-white/15">
              {BRUSH_WIDTHS.map((w) => (
                <button
                  key={w}
                  onClick={() => { setSelectedWidth(w); onWidthChange(w) }}
                  className={`flex items-center justify-center w-8 h-8 rounded-full transition ${
                    selectedWidth === w ? 'bg-white/30' : ''
                  }`}
                >
                  <div className="rounded-full bg-white" style={{ width: w + 3, height: w + 3 }} />
                </button>
              ))}
            </div>
            {/* 색상 — 가로 스크롤만 + 우측 페이드 + 안쪽 링 강조 */}
            <div
              className="overflow-x-auto no-scrollbar max-w-[180px]"
              style={{
                touchAction: 'pan-x',
                overscrollBehaviorX: 'contain',
                WebkitMaskImage: 'linear-gradient(to right, black 85%, transparent)',
                maskImage: 'linear-gradient(to right, black 85%, transparent)',
              }}
            >
              <div className="flex items-center gap-1.5 py-0.5 w-max">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleColorSelect(color)}
                    className={`shrink-0 w-6 h-6 rounded-full transition ${
                      selectedColor === color
                        ? 'ring-2 ring-inset ring-white'
                        : 'opacity-70'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== 메인 하단 도구 바 ===== */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2 bg-ink-800/90 backdrop-blur-sm">
        {/* 되돌리기 */}
        <button onClick={onUndo} className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-white/10 transition">
          <span className="text-lg">↩️</span>
          <span className="text-[10px] text-white/50">되돌리기</span>
        </button>

        {/* 메인 도구 — 텍스트/그리기/사진 */}
        <div className="flex items-center gap-1">
          <ToolBtn icon="Aa" label="텍스트" active={mode === 'text'} onClick={() => handleModeToggle('text')} isText />
          <ToolBtn icon="✏️" label="그리기" active={mode === 'draw'} onClick={() => handleModeToggle('draw')} />
          <ToolBtn icon="📷" label="사진" active={false} onClick={onPhotoClick} />
        </div>

        {/* 히스토리 버튼 (기존 일기에서만 표시) */}
        {showHistory ? (
          <button
            onClick={onHistoryToggle}
            className={`flex items-center gap-1 px-3 py-2 rounded-lg transition ${
              isHistoryOpen ? 'bg-white/25' : 'hover:bg-white/10'
            }`}
          >
            <span className="text-lg">📋</span>
            <span className="text-[10px] text-white/50">히스토리</span>
          </button>
        ) : (
          <div className="w-16" />
        )}
      </div>
    </>
  )
}

function ToolBtn({ icon, label, active, onClick, isText }: {
  icon: string; label: string; active: boolean; onClick: () => void; isText?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition ${
        active ? 'bg-white/25' : 'hover:bg-white/10'
      }`}
    >
      <span className={isText ? 'text-base font-bold text-white' : 'text-lg'}>{icon}</span>
      <span className="text-[10px] text-white/50">{label}</span>
    </button>
  )
}
