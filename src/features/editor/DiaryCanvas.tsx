'use client'

import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react'
import type { TextOptions } from './EditorToolbar'

// ===== 타입 정의 =====

export type CanvasHandle = {
  setDrawingMode: (enabled: boolean) => void
  setBrushColor: (color: string) => void
  setBrushWidth: (width: number) => void
  addText: (options: TextOptions) => void
  undo: () => void
  setBackgroundColor: (color: string) => void
  toJSON: () => string
  toDataURL: () => Promise<string | null>
  hasContent: () => boolean              // 캔버스에 오브젝트가 있는지 확인
  getTextContent: () => string           // 캔버스 내 텍스트 내용 추출
}

type DiaryCanvasProps = {
  initialData?: string
  backgroundColor?: string
  backgroundLayers?: string[]          // 이전 레이어 이미지 URL 배열 (배경으로 깔림)
  hiddenLayerIndices?: Set<number>     // 숨길 레이어 인덱스 (히스토리 패널에서 토글)
  onCanvasReady?: () => void
  onSelectionChange?: (hasSelection: boolean) => void
  onContentChange?: (hasContent: boolean) => void  // 캔버스 내용 유무 변경 시 호출
}

const DiaryCanvas = forwardRef<CanvasHandle, DiaryCanvasProps>(
  function DiaryCanvas({ initialData, backgroundColor = '#fefcf8', backgroundLayers, hiddenLayerIndices, onCanvasReady, onSelectionChange, onContentChange }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fabricRef = useRef<any>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const historyRef = useRef<string[]>([])
    const isUndoing = useRef(false)

    // 배경 레이어 존재 여부
    const hasBgLayers = backgroundLayers && backgroundLayers.length > 0

    const saveHistory = useCallback(() => {
      if (fabricRef.current && !isUndoing.current) {
        const json = JSON.stringify(fabricRef.current.toJSON())
        historyRef.current.push(json)
        if (historyRef.current.length > 50) historyRef.current.shift()
      }
    }, [])

    useEffect(() => {
      const initCanvas = async () => {
        const fabric = await import('fabric')
        if (!canvasRef.current || !containerRef.current) return

        await new Promise((r) => requestAnimationFrame(r))

        const container = containerRef.current
        if (!container) return
        const width = container.clientWidth || 430
        const height = container.clientHeight || 750

        // 배경 레이어가 있으면 Fabric 캔버스 자체는 투명
        const canvasBg = hasBgLayers ? null : backgroundColor

        const canvas = new fabric.Canvas(canvasRef.current, {
          width,
          height,
          backgroundColor: canvasBg as string,
          isDrawingMode: false,
          selection: true,
        })

        canvas.backgroundColor = canvasBg as string

        // 배경 레이어가 있으면 Fabric의 배경 렌더를 투명하게 오버라이드
        if (hasBgLayers) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const c = canvas as any
          c._originalRenderBackground = c._renderBackground
          c._renderBackground = function(ctx: CanvasRenderingContext2D) {
            ctx.clearRect(0, 0, this.width, this.height)
          }
        }

        // 기본 브러시 설정
        if (canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush.color = '#3d3529'
          canvas.freeDrawingBrush.width = 3
        } else {
          canvas.freeDrawingBrush = new fabric.PencilBrush(canvas)
          canvas.freeDrawingBrush.color = '#3d3529'
          canvas.freeDrawingBrush.width = 3
        }

        canvas.renderAll()
        fabricRef.current = canvas

        // 초기 데이터 로드
        if (initialData && initialData !== '{}') {
          try {
            await canvas.loadFromJSON(JSON.parse(initialData))
            canvas.renderAll()
          } catch {
            // 무시
          }
        }

        // 콘텐츠 변경 알림 헬퍼
        const notifyContentChange = () => {
          onContentChange?.(canvas.getObjects().length > 0)
        }

        // 이벤트
        canvas.on('object:added', () => { saveHistory(); notifyContentChange() })
        canvas.on('object:modified', () => saveHistory())
        canvas.on('object:removed', () => { saveHistory(); notifyContentChange() })
        canvas.on('selection:created', () => onSelectionChange?.(true))
        canvas.on('selection:updated', () => onSelectionChange?.(true))
        canvas.on('selection:cleared', () => onSelectionChange?.(false))

        saveHistory()
        onCanvasReady?.()
      }

      initCanvas()

      return () => {
        if (fabricRef.current) {
          fabricRef.current.dispose()
          fabricRef.current = null
        }
      }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
      if (fabricRef.current) {
        fabricRef.current.backgroundColor = backgroundColor
        fabricRef.current.renderAll()
      }
    }, [backgroundColor])

    useImperativeHandle(ref, () => ({
      setDrawingMode: async (enabled: boolean) => {
        const canvas = fabricRef.current
        if (!canvas) return

        if (enabled) {
          canvas.discardActiveObject()
          if (!canvas.freeDrawingBrush) {
            const fabric = await import('fabric')
            canvas.freeDrawingBrush = new fabric.PencilBrush(canvas)
            canvas.freeDrawingBrush.color = '#3d3529'
            canvas.freeDrawingBrush.width = 3
          }
        }

        canvas.isDrawingMode = enabled
        canvas.renderAll()
      },

      setBrushColor: (color: string) => {
        if (fabricRef.current?.freeDrawingBrush) {
          fabricRef.current.freeDrawingBrush.color = color
        }
      },

      setBrushWidth: (width: number) => {
        if (fabricRef.current?.freeDrawingBrush) {
          fabricRef.current.freeDrawingBrush.width = width
        }
      },

      addText: async (options: TextOptions) => {
        const canvas = fabricRef.current
        if (!canvas) return
        const fabric = await import('fabric')

        canvas.isDrawingMode = false

        const maxWidth = canvas.width * 0.9

        const textObj = new fabric.Textbox(options.text, {
          left: canvas.width / 2,
          top: canvas.height / 2,
          originX: 'center',
          originY: 'center',
          fontFamily: options.fontFamily,
          fontSize: 24,
          fill: options.color,
          textAlign: options.textAlign as 'left' | 'center' | 'right',
          editable: true,
          width: maxWidth, // 일단 최대 너비로 생성
          cornerColor: '#ffffff',
          cornerStrokeColor: '#aaaaaa',
          cornerSize: 12,
          transparentCorners: false,
          borderColor: '#aaaaaa',
          borderDashArray: [4, 4],
          padding: 10,
        })

        // 텍스트 실제 너비 측정 후 바운딩박스를 글 길이에 맞게 축소
        const naturalWidth = textObj.calcTextWidth()
        if (naturalWidth + 20 < maxWidth) {
          textObj.set({ width: naturalWidth + 20 })
        }

        canvas.add(textObj)
        canvas.setActiveObject(textObj)
        canvas.renderAll()
      },

      undo: () => {
        const canvas = fabricRef.current
        if (!canvas || historyRef.current.length <= 1) return

        isUndoing.current = true
        historyRef.current.pop()
        const prev = historyRef.current[historyRef.current.length - 1]

        if (prev) {
          canvas.loadFromJSON(JSON.parse(prev)).then(() => {
            canvas.renderAll()
            isUndoing.current = false
          })
        } else {
          isUndoing.current = false
        }
      },

      setBackgroundColor: (color: string) => {
        const canvas = fabricRef.current
        if (!canvas) return

        if (color === '' || color === 'transparent') {
          // 투명 배경: Fabric의 _renderBackground를 오버라이드
          canvas.backgroundColor = ''
          canvas._originalRenderBackground = canvas._originalRenderBackground || canvas._renderBackground
          canvas._renderBackground = function(ctx: CanvasRenderingContext2D) { // eslint-disable-line @typescript-eslint/no-explicit-any
            ctx.clearRect(0, 0, this.width, this.height)
          }
        } else {
          // 단색 배경: 원래 _renderBackground 복원
          if (canvas._originalRenderBackground) {
            canvas._renderBackground = canvas._originalRenderBackground
          }
          canvas.backgroundColor = color
        }
        canvas.renderAll()
        saveHistory()
      },

      hasContent: () => {
        return fabricRef.current ? fabricRef.current.getObjects().length > 0 : false
      },

      getTextContent: () => {
        if (!fabricRef.current) return ''
        // 캔버스 내 모든 텍스트 오브젝트의 내용을 합쳐서 반환
        return fabricRef.current.getObjects()
          .filter((obj: { type: string }) => obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text')
          .map((obj: { text: string }) => obj.text)
          .join(' ')
          .trim()
      },

      toJSON: () => {
        return fabricRef.current ? JSON.stringify(fabricRef.current.toJSON()) : '{}'
      },

      toDataURL: async () => {
        if (!fabricRef.current || !hasBgLayers) {
          return fabricRef.current?.toDataURL({ format: 'png', quality: 1 }) ?? null
        }

        // 배경 레이어가 있으면: 모든 레이어 + Fabric 캔버스를 합성해서 내보내기
        // (숨김 상태와 무관하게 저장 시에는 전체 레이어 포함)
        const container = containerRef.current
        const width = container?.clientWidth || 430
        const height = container?.clientHeight || 750

        const exportCanvas = document.createElement('canvas')
        exportCanvas.width = width
        exportCanvas.height = height
        const ctx = exportCanvas.getContext('2d')
        if (!ctx) return null

        // 이미지 로드 헬퍼 (HTTP URL도 비동기로 안전하게 로드)
        const loadImage = (src: string): Promise<HTMLImageElement> =>
          new Promise((resolve) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => resolve(img)
            img.onerror = () => resolve(img) // 실패해도 빈칸으로 계속 진행
            img.src = src
          })

        // 1) 모든 배경 레이어를 비동기로 로드 후 순서대로 그리기
        const images = await Promise.all(backgroundLayers!.map(loadImage))
        for (const img of images) {
          ctx.drawImage(img, 0, 0, width, height)
        }

        // 2) Fabric 캔버스 내용을 위에 그리기
        const fabricCanvas = fabricRef.current.lowerCanvasEl
        ctx.drawImage(fabricCanvas, 0, 0, width, height)

        return exportCanvas.toDataURL('image/png')
      },
    }))

    return (
      <div className="w-full h-full relative">
        {/* 이전 레이어 이미지들 — 각각 개별 표시, 프로필별 토글 가능 */}
        {backgroundLayers?.map((layerUrl, index) => (
          <img
            key={index}
            src={layerUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-fill pointer-events-none"
            style={{
              zIndex: index,
              opacity: hiddenLayerIndices?.has(index) ? 0 : 1,
              transition: 'opacity 0.2s ease',
            }}
          />
        ))}
        {/* Fabric.js 캔버스 컨테이너 — 배경 투명, 그 위에 새로 그림/글 작성 */}
        <div ref={containerRef} className="absolute inset-0" style={{ zIndex: backgroundLayers?.length || 10 }}>
          <canvas ref={canvasRef} className="touch-none" />
        </div>
      </div>
    )
  }
)

export default DiaryCanvas
