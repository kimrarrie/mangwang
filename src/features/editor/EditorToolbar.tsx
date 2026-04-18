'use client'

import { useState } from 'react'

// ===== 색상 팔레트 =====
const COLORS = [
  '#3d3529', '#ffffff', '#c0392b', '#e67e22',
  '#f1c40f', '#27ae60', '#2980b9', '#8e44ad',
  '#e84393', '#1abc9c',
]

// 배경색 옵션 (단색 + 패턴)
// 패턴은 'pattern:' 접두사로 구분
const BG_COLORS = [
  '#fefcf8', '#1a1610', '#2a2d3d', '#f8e8d4', '#e8f4f8',
  'pattern:grid',       // 그리드 패턴 (연한 초록)
  'pattern:dots',       // 점 패턴 (연한 핑크)
  'pattern:lines',      // 가로줄 노트 패턴
]

// 패턴을 CSS background-image로 변환하는 헬퍼 (캔버스 배경용)
function getPatternCSS(patternId: string): { backgroundColor: string; backgroundImage: string; backgroundSize: string } {
  switch (patternId) {
    case 'pattern:grid':
      return {
        backgroundColor: '#f4f9f4',
        backgroundImage: `
          linear-gradient(#c8e0c8 1px, transparent 1px),
          linear-gradient(90deg, #c8e0c8 1px, transparent 1px)
        `,
        backgroundSize: '24px 24px',
      }
    case 'pattern:dots':
      return {
        backgroundColor: '#fdf2f4',
        backgroundImage: `radial-gradient(circle, #e8b4bd 1.2px, transparent 1.2px)`,
        backgroundSize: '18px 18px',
      }
    case 'pattern:lines':
      return {
        backgroundColor: '#fefcf8',
        backgroundImage: `linear-gradient(transparent 27px, #c8dbe8 27px, #c8dbe8 28px)`,
        backgroundSize: '100% 28px',
      }
    default:
      return { backgroundColor: patternId, backgroundImage: 'none', backgroundSize: 'auto' }
  }
}

// 썸네일용 패턴 CSS — 작은 원 안에서 패턴이 잘 보이도록 과장된 크기
function getPatternThumbnailCSS(patternId: string): React.CSSProperties {
  switch (patternId) {
    case 'pattern:grid':
      return {
        backgroundColor: '#f4f9f4',
        backgroundImage: `
          linear-gradient(#c8e0c8 1px, transparent 1px),
          linear-gradient(90deg, #c8e0c8 1px, transparent 1px)
        `,
        backgroundSize: '8px 8px',
        backgroundPosition: 'center center',
      }
    case 'pattern:dots':
      return {
        backgroundColor: '#fdf2f4',
        backgroundImage: `radial-gradient(circle, #e8b4bd 2px, transparent 2px)`,
        backgroundSize: '8px 8px',
        backgroundPosition: '4px 4px',
      }
    case 'pattern:lines':
      return {
        backgroundColor: '#fefcf8',
        backgroundImage: `linear-gradient(transparent 6px, #c8dbe8 6px, #c8dbe8 7px)`,
        backgroundSize: '100% 7px',
        backgroundPosition: 'center center',
      }
    default:
      return { backgroundColor: patternId }
  }
}

// 패턴인지 확인
export function isPattern(color: string): boolean {
  return color.startsWith('pattern:')
}

export { getPatternCSS }

// 펜 굵기
const BRUSH_WIDTHS = [2, 5, 10]

// 폰트 스타일 옵션
// Fabric.js는 CSS 변수(var(--font-gaegu))를 인식 못함 → 실제 폰트명 사용
const FONT_STYLES = [
  { id: 'handwriting', label: '손글씨', fontFamily: 'Gaegu, cursive' },
  { id: 'serif', label: '명조', fontFamily: 'Georgia, serif' },
  { id: 'sans', label: '고딕', fontFamily: 'Arial, Helvetica, sans-serif' },
]

// 정렬 옵션
const ALIGN_OPTIONS = ['left', 'center', 'right'] as const

// ===== 도구 모드 =====
export type ToolMode = 'none' | 'text' | 'draw' | 'background'

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
  onBackgroundChange: (color: string) => void
  onUndo: () => void
  currentBgColor: string
  showHistory?: boolean               // 히스토리 버튼 표시 여부
  isHistoryOpen?: boolean             // 히스토리 패널 열림 상태
  onHistoryToggle?: () => void        // 히스토리 패널 토글
}

export default function EditorToolbar({
  mode,
  onModeChange,
  onColorChange,
  onWidthChange,
  onTextSubmit,
  onBackgroundChange,
  onUndo,
  currentBgColor,
  showHistory,
  isHistoryOpen,
  onHistoryToggle,
}: EditorToolbarProps) {
  const [selectedColor, setSelectedColor] = useState(COLORS[0])
  const [selectedWidth, setSelectedWidth] = useState(5)
  const [textInput, setTextInput] = useState('')
  const [textFont, setTextFont] = useState(FONT_STYLES[0])
  const [textAlign, setTextAlign] = useState('center')

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
        textAlign,
      })
      setTextInput('')
      onModeChange('none')
    }
  }

  return (
    <>
      {/* ===== 텍스트 입력 오버레이 ===== */}
      {mode === 'text' && (
        <div className="absolute inset-0 z-20 bg-black/60 flex flex-col items-center justify-center px-6">

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
              textAlign: textAlign as 'left' | 'center' | 'right',
            }}
            rows={4}
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

          {/* 정렬 선택 */}
          <div className="flex items-center gap-1 mt-3">
            {ALIGN_OPTIONS.map((align) => (
              <button
                key={align}
                onClick={() => setTextAlign(align)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition ${
                  textAlign === align ? 'bg-white/25' : 'bg-white/10'
                }`}
              >
                {/* 정렬을 나타내는 막대 아이콘 — 긴 줄과 짧은 줄의 정렬 방향으로 구분 */}
                <div className={`flex flex-col gap-[3px] ${
                  align === 'left' ? 'items-start' : align === 'right' ? 'items-end' : 'items-center'
                }`}>
                  <div className="h-[2px] w-[16px] bg-white/80 rounded" />
                  <div className="h-[2px] w-[10px] bg-white/80 rounded" />
                  <div className="h-[2px] w-[14px] bg-white/80 rounded" />
                  <div className="h-[2px] w-[8px] bg-white/80 rounded" />
                </div>
              </button>
            ))}
          </div>

          {/* 색상 선택 */}
          <div className="flex items-center gap-2 mt-4">
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => handleColorSelect(color)}
                className={`w-7 h-7 rounded-full border-2 transition-transform ${
                  selectedColor === color ? 'border-white scale-125' : 'border-white/30'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
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

      {/* ===== 그리기 모드 — 색상 + 굵기 패널 ===== */}
      {mode === 'draw' && (
        <div className="absolute bottom-16 left-0 right-0 z-10 flex flex-col items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => handleColorSelect(color)}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${
                  selectedColor === color ? 'border-white scale-125' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="flex items-center gap-3 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
            {BRUSH_WIDTHS.map((w) => (
              <button
                key={w}
                onClick={() => { setSelectedWidth(w); onWidthChange(w) }}
                className={`flex items-center justify-center w-9 h-9 rounded-full transition ${
                  selectedWidth === w ? 'bg-white/30' : ''
                }`}
              >
                <div className="rounded-full bg-white" style={{ width: w + 4, height: w + 4 }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ===== 배경색/패턴 선택 패널 ===== */}
      {mode === 'background' && (
        <div className="absolute bottom-16 left-0 right-0 z-10 flex justify-center px-4 py-3">
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2.5">
            {BG_COLORS.map((color) => {
              const thumbStyle = isPattern(color)
                ? getPatternThumbnailCSS(color)
                : { backgroundColor: color }
              return (
                <button
                  key={color}
                  onClick={() => onBackgroundChange(color)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform overflow-hidden ${
                    currentBgColor === color ? 'border-white scale-125' : 'border-white/20'
                  }`}
                  style={thumbStyle}
                />
              )
            })}
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

        {/* 메인 도구 */}
        <div className="flex items-center gap-1">
          <ToolBtn icon="Aa" label="텍스트" active={mode === 'text'} onClick={() => handleModeToggle('text')} isText />
          <ToolBtn icon="✏️" label="그리기" active={mode === 'draw'} onClick={() => handleModeToggle('draw')} />
          <ToolBtn icon="🎨" label="배경" active={mode === 'background'} onClick={() => handleModeToggle('background')} />
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
