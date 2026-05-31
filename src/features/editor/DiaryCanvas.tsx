'use client'

import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react'
import type { TextOptions } from './EditorToolbar'

// ===== 타입 정의 =====

export type CanvasHandle = {
  setDrawingMode: (enabled: boolean) => Promise<void>
  setBrushColor: (color: string) => void
  setBrushWidth: (width: number) => void
  addText: (options: TextOptions) => void
  addImage: (dataUrl: string) => Promise<void>     // 이미지를 스티커로 캔버스에 추가
  deleteActive: () => void                         // 현재 선택된 오브젝트 삭제 (휴지통 드래그용)
  undo: () => void
  setBackgroundColor: (color: string) => void
  toJSON: () => string
  toDataURL: () => Promise<string | null>
  hasContent: () => boolean              // 캔버스에 오브젝트가 있는지 확인
  getTextContent: () => string           // 캔버스 내 텍스트 내용 추출
  getImageCount: () => number            // 캔버스에 추가된 이미지 개수
}

type DiaryCanvasProps = {
  initialData?: string
  backgroundColor?: string
  backgroundLayers?: string[]          // 이전 레이어 이미지 URL 배열 (배경으로 깔림)
  hiddenLayerIndices?: Set<number>     // 숨길 레이어 인덱스 (히스토리 패널에서 토글)
  onCanvasReady?: () => void
  onSelectionChange?: (hasSelection: boolean) => void
  onContentChange?: (hasContent: boolean) => void  // 캔버스 내용 유무 변경 시 호출
  // 드래그 시 화면(클라이언트) 좌표 알림 — 부모가 휴지통 hit-test 처리
  onObjectMove?: (clientX: number, clientY: number) => void
  // 드래그 종료 — 부모가 휴지통에 떨어졌는지 보고 deleteActive() 호출
  onObjectMoveEnd?: () => void
}

const DiaryCanvas = forwardRef<CanvasHandle, DiaryCanvasProps>(
  function DiaryCanvas({ initialData, backgroundColor = '#fefcf8', backgroundLayers, hiddenLayerIndices, onCanvasReady, onSelectionChange, onContentChange, onObjectMove, onObjectMoveEnd }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fabricRef = useRef<any>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const historyRef = useRef<string[]>([])
    const isUndoing = useRef(false)
    // ===== 그리기 세션 — 끝날 때 누적된 path들을 하나의 그룹으로 묶음 =====
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const drawingPathsRef = useRef<any[]>([])
    const isDrawingSessionRef = useRef(false)
    // 콜백을 ref에 담아서 useEffect 의존성 배열에 안 넣어도 항상 최신 함수 참조
    const onObjectMoveRef = useRef(onObjectMove)
    const onObjectMoveEndRef = useRef(onObjectMoveEnd)
    onObjectMoveRef.current = onObjectMove
    onObjectMoveEndRef.current = onObjectMoveEnd

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

        // ===== 선택한 오브젝트를 항상 최상단으로 (현재 편집 중인 캔버스 안에서만) =====
        // 이전 일기 레이어 이미지는 캔버스 외부 <img>라 영향 없음
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bringSelectedToFront = (e: any) => {
          const targets = e?.selected || (canvas.getActiveObject() ? [canvas.getActiveObject()] : [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          targets.forEach((obj: any) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const c = canvas as any
            if (typeof c.bringObjectToFront === 'function') {
              c.bringObjectToFront(obj)
            } else if (typeof c.bringToFront === 'function') {
              c.bringToFront(obj)
            }
          })
        }

        // 이벤트
        canvas.on('object:added', () => { saveHistory(); notifyContentChange() })
        canvas.on('object:modified', () => saveHistory())
        canvas.on('object:removed', () => { saveHistory(); notifyContentChange() })
        canvas.on('selection:created', (e: unknown) => { bringSelectedToFront(e); onSelectionChange?.(true) })
        canvas.on('selection:updated', (e: unknown) => { bringSelectedToFront(e); onSelectionChange?.(true) })
        canvas.on('selection:cleared', () => onSelectionChange?.(false))

        // ===== 그리기 세션 — path:created 이벤트로 새 stroke 누적 =====
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        canvas.on('path:created', (e: any) => {
          if (isDrawingSessionRef.current && e?.path) {
            drawingPathsRef.current.push(e.path)
          }
        })

        // ===== 드래그 → 휴지통 삭제용 좌표 콜백 =====
        // object:moving 이벤트는 native event(e.e)를 포함 (mouse/touch)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        canvas.on('object:moving', (opt: any) => {
          const ev = opt?.e
          if (!ev) return
          let clientX: number | undefined
          let clientY: number | undefined
          if (typeof ev.clientX === 'number') {
            clientX = ev.clientX
            clientY = ev.clientY
          } else if (ev.touches && ev.touches[0]) {
            clientX = ev.touches[0].clientX
            clientY = ev.touches[0].clientY
          }
          if (clientX !== undefined && clientY !== undefined) {
            onObjectMoveRef.current?.(clientX, clientY)
          }
        })
        canvas.on('mouse:up', () => {
          onObjectMoveEndRef.current?.()
        })

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
        const fabric = await import('fabric')

        if (enabled) {
          canvas.discardActiveObject()
          if (!canvas.freeDrawingBrush) {
            canvas.freeDrawingBrush = new fabric.PencilBrush(canvas)
            canvas.freeDrawingBrush.color = '#3d3529'
            canvas.freeDrawingBrush.width = 3
          }
          // 새 그리기 세션 시작
          drawingPathsRef.current = []
          isDrawingSessionRef.current = true
        } else {
          // 그리기 세션 종료 — 누적된 path들을 하나의 그룹으로 묶음
          isDrawingSessionRef.current = false
          const paths = drawingPathsRef.current
          drawingPathsRef.current = []

          if (paths.length > 0) {
            // 그룹화는 단일 history step으로 처리하기 위해 중간 이벤트의 history 저장 차단
            isUndoing.current = true
            try {
              paths.forEach((p) => canvas.remove(p))
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const group = new (fabric as any).Group(paths, {
                cornerColor: '#ffffff',
                cornerStrokeColor: '#aaaaaa',
                cornerSize: 12,
                transparentCorners: false,
                borderColor: '#aaaaaa',
                borderDashArray: [4, 4],
              })
              canvas.add(group)
            } finally {
              isUndoing.current = false
            }
            saveHistory() // 그룹화 결과를 한 step으로 저장
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

        // 폰트 로드 보장 — Fabric은 시스템에 폰트가 없으면 fallback으로 그림
        // 첫 폰트명만 추출해서 document.fonts.load로 실제 다운로드 완료까지 대기
        const firstFont = options.fontFamily.split(',')[0].trim().replace(/['"]/g, '')
        if (firstFont && typeof document !== 'undefined' && document.fonts?.load) {
          try { await document.fonts.load(`24px "${firstFont}"`) } catch { /* ignore */ }
        }

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

      addImage: async (dataUrl: string) => {
        const canvas = fabricRef.current
        if (!canvas) return
        const fabric = await import('fabric')

        canvas.isDrawingMode = false

        // Fabric v7: FabricImage.fromURL은 Promise 반환
        // crossOrigin은 data URL엔 무의미하지만 외부 URL 호환 위해 명시
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const img: any = await (fabric as any).FabricImage.fromURL(dataUrl, { crossOrigin: 'anonymous' })

        // 캔버스 너비/높이의 50%를 넘지 않도록 자동 스케일
        const maxW = canvas.width * 0.5
        const maxH = canvas.height * 0.5
        const scale = Math.min(maxW / img.width, maxH / img.height, 1)

        img.set({
          left: canvas.width / 2,
          top: canvas.height / 2,
          originX: 'center',
          originY: 'center',
          scaleX: scale,
          scaleY: scale,
          cornerColor: '#ffffff',
          cornerStrokeColor: '#aaaaaa',
          cornerSize: 12,
          transparentCorners: false,
          borderColor: '#aaaaaa',
          borderDashArray: [4, 4],
        })

        canvas.add(img)
        canvas.setActiveObject(img)
        canvas.renderAll()
      },

      deleteActive: () => {
        const canvas = fabricRef.current
        if (!canvas) return
        const active = canvas.getActiveObject()
        if (!active) return
        // ActiveSelection (다중 선택)인 경우 내부 오브젝트들을 모두 제거
        if (active.type === 'activeselection' || active.type === 'activeSelection') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const objs = active.getObjects ? active.getObjects() : [active]
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          objs.forEach((o: any) => canvas.remove(o))
        } else {
          canvas.remove(active)
        }
        canvas.discardActiveObject()
        canvas.renderAll()
      },

      undo: () => {
        const canvas = fabricRef.current
        if (!canvas || historyRef.current.length <= 1) return

        // 그리기 세션 중 undo → drawingPathsRef에서도 마지막 path 제거
        // 그렇지 않으면 세션 종료 시 undo된 path가 그룹에 포함되어 다시 나타남
        if (isDrawingSessionRef.current && drawingPathsRef.current.length > 0) {
          drawingPathsRef.current.pop()
        }

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

      getImageCount: () => {
        if (!fabricRef.current) return 0
        return fabricRef.current.getObjects()
          .filter((obj: { type: string }) => obj.type === 'image' || obj.type === 'FabricImage')
          .length
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
        // 1.5배 해상도로 내보내기 — 2배 대비 픽셀 수 44% 감소, 체감 화질 차이 거의 없음
        // JPEG quality 0.72 — 0.92 대비 파일 크기 40~50% 추가 감소
        // (배경이 단색이거나 이전 레이어가 깔리므로 투명도가 없어 JPEG 적용 가능)
        const EXPORT_SCALE = 1.5
        const EXPORT_FORMAT = 'image/jpeg'
        const EXPORT_QUALITY = 0.72

        if (!fabricRef.current || !hasBgLayers) {
          // 새 일기 (배경 단색) — fabric 자체 JPEG 내보내기
          return fabricRef.current?.toDataURL({ format: 'jpeg', quality: EXPORT_QUALITY, multiplier: EXPORT_SCALE }) ?? null
        }

        // 배경 레이어가 있으면: 모든 레이어 + Fabric 캔버스를 합성해서 내보내기
        // (숨김 상태와 무관하게 저장 시에는 전체 레이어 포함)
        const container = containerRef.current
        const width = container?.clientWidth || 430
        const height = container?.clientHeight || 750

        // 내보낼 캔버스는 2배 크기 (선명도 향상)
        const exportCanvas = document.createElement('canvas')
        exportCanvas.width = width * EXPORT_SCALE
        exportCanvas.height = height * EXPORT_SCALE
        const ctx = exportCanvas.getContext('2d')
        if (!ctx) return null

        // 이미지 스무딩 품질을 최대로 설정
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'

        // 이미지 로드 헬퍼 (HTTP URL도 비동기로 안전하게 로드)
        const loadImage = (src: string): Promise<HTMLImageElement> =>
          new Promise((resolve) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => resolve(img)
            img.onerror = () => resolve(img) // 실패해도 빈칸으로 계속 진행
            img.src = src
          })

        // 1) 모든 배경 레이어를 비동기로 로드 후 순서대로 그리기 (2배 크기로)
        const images = await Promise.all(backgroundLayers!.map(loadImage))
        for (const img of images) {
          ctx.drawImage(img, 0, 0, width * EXPORT_SCALE, height * EXPORT_SCALE)
        }

        // 2) Fabric 캔버스 내용을 PNG (투명도 보존)로 중간 합성 후 위에 그리기
        // 최종 exportCanvas만 JPEG로 출력하므로 중간 단계는 PNG 유지
        const fabricDataUrl = fabricRef.current.toDataURL({ format: 'png', quality: 1, multiplier: EXPORT_SCALE })
        const fabricImg = await loadImage(fabricDataUrl)
        ctx.drawImage(fabricImg, 0, 0, width * EXPORT_SCALE, height * EXPORT_SCALE)

        // 3) 최종 출력을 JPEG로 — 배경이 불투명하게 채워진 상태이므로 손실 없음
        return exportCanvas.toDataURL(EXPORT_FORMAT, EXPORT_QUALITY)
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
