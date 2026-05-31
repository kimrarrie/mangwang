import type { Diary } from './types'
import { getUserById } from './mockData'

export type ExportProgress = {
  current: number   // 현재 처리 중인 레이어 (전체 기준)
  total: number     // 전체 레이어 수
  diaryTitle: string
  layerIndex: number
  layerTotal: number
}

// ===== 공통: 여러 이미지를 캔버스에 누적해서 그리기 =====

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(img)
    img.src = src
  })
}

// ===== PDF 내보내기 =====

// PDF용 오버레이 — 영상 오버레이와 동일한 스타일, 캔버스에 직접 그려서 한글 정상 렌더링
function drawPdfOverlay(ctx: CanvasRenderingContext2D, diary: Diary, W: number, H: number) {
  const creator = diary.layers[0] ? getUserById(diary.layers[0].editorId) : null
  const lastEditor = diary.layers.length > 1
    ? getUserById(diary.layers[diary.layers.length - 1].editorId)
    : null
  const date = new Date(diary.createdAt)
  const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`

  // 하단 그라디언트
  const grad = ctx.createLinearGradient(0, H - 220, 0, H)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(0.35, 'rgba(0,0,0,0.55)')
  grad.addColorStop(1, 'rgba(0,0,0,0.78)')
  ctx.fillStyle = grad
  ctx.fillRect(0, H - 220, W, 220)

  ctx.textAlign = 'left'

  // 제목
  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.font = `bold 22px sans-serif`
  ctx.fillText(diary.title, 20, H - 110, W - 40)

  // 날짜
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.font = `14px sans-serif`
  ctx.fillText(dateStr, 20, H - 80)

  // 작성자 정보
  const authorParts: string[] = []
  if (creator) authorParts.push(`✍️ ${creator.displayName} 시작`)
  if (lastEditor && lastEditor.id !== creator?.id) authorParts.push(`${lastEditor.displayName} 덧붙임`)
  if (diary.layers.length > 1) authorParts.push(`총 ${diary.layers.length}레이어`)

  ctx.fillStyle = 'rgba(255,255,255,0.65)'
  ctx.font = `13px sans-serif`
  ctx.fillText(authorParts.join('  ·  '), 20, H - 52)
}

export async function exportSelectedToPDF(
  diaries: Diary[],
  onProgress?: (p: ExportProgress) => void
): Promise<void> {
  const { default: jsPDF } = await import('jspdf')

  const W = 430
  const H = 932
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [W, H], compress: true })

  let globalLayer = 0
  const totalLayers = diaries.reduce((s, d) => s + Math.max(d.layers.length, 1), 0)

  for (let i = 0; i < diaries.length; i++) {
    const diary = diaries[i]
    onProgress?.({ current: ++globalLayer, total: totalLayers, diaryTitle: diary.title, layerIndex: 1, layerTotal: 1 })

    if (i > 0) pdf.addPage()

    // 캔버스에 레이어 + 오버레이를 통째로 그려서 이미지로 PDF에 삽입
    // → jsPDF 폰트 의존 없이 브라우저 기본 렌더링으로 한글 정확하게 표시
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fefcf8'
    ctx.fillRect(0, 0, W, H)

    const images = await Promise.all(diary.layers.map((l) => loadImage(l.imageDataUrl)))
    for (const img of images) ctx.drawImage(img, 0, 0, W, H)

    // 오버레이 (제목, 날짜, 작성자) — 캔버스 2D로 직접 그리기
    drawPdfOverlay(ctx, diary, W, H)

    pdf.addImage(canvas.toDataURL('image/jpeg', 0.88), 'JPEG', 0, 0, W, H)
  }

  pdf.save('mangwang-diary.pdf')
}

// ===== 영상 내보내기 (MP4, WebCodecs + mp4-muxer) =====
// 레이어를 1초씩 즉시 전환으로 쌓아가며, 하단에 정보 오버레이 표시

const VIDEO_W = 1080
const VIDEO_H = 1920
const FPS = 30

// 오버레이 — 하단 영역에 제목/날짜/작성자 표시
function drawOverlay(
  ctx: CanvasRenderingContext2D,
  diary: Diary,
  layerIndex: number   // 0-based, 현재 보이는 마지막 레이어
) {
  const layer = diary.layers[layerIndex]
  const creator = diary.layers[0] ? getUserById(diary.layers[0].editorId) : null
  const currentEditor = layer ? getUserById(layer.editorId) : null
  const date = new Date(diary.createdAt)
  const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`

  // 반투명 그라디언트 배경
  const grad = ctx.createLinearGradient(0, VIDEO_H - 420, 0, VIDEO_H)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(0.4, 'rgba(0,0,0,0.55)')
  grad.addColorStop(1, 'rgba(0,0,0,0.78)')
  ctx.fillStyle = grad
  ctx.fillRect(0, VIDEO_H - 420, VIDEO_W, 420)

  // 레이어 인디케이터 (점으로 표시)
  const dotR = 10
  const dotGap = 28
  const totalDots = diary.layers.length
  const dotsTotalW = totalDots * dotR * 2 + (totalDots - 1) * (dotGap - dotR * 2)
  const dotsX = (VIDEO_W - dotsTotalW) / 2
  const dotsY = VIDEO_H - 300
  for (let i = 0; i < totalDots; i++) {
    ctx.beginPath()
    ctx.arc(dotsX + i * dotGap + dotR, dotsY, dotR, 0, Math.PI * 2)
    ctx.fillStyle = i <= layerIndex ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.25)'
    ctx.fill()
  }

  ctx.textAlign = 'left'

  // 제목
  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.font = `bold ${72}px sans-serif`
  ctx.fillText(diary.title, 60, VIDEO_H - 220, VIDEO_W - 120)

  // 날짜
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.font = `${42}px sans-serif`
  ctx.fillText(dateStr, 60, VIDEO_H - 148)

  // 작성자 정보
  const authorLine = layerIndex === 0
    ? `✍️  ${creator?.displayName ?? '알 수 없음'} 시작`
    : `✍️  ${currentEditor?.displayName ?? '알 수 없음'} 덧붙임`
  ctx.fillStyle = 'rgba(255,255,255,0.70)'
  ctx.font = `${40}px sans-serif`
  ctx.fillText(authorLine, 60, VIDEO_H - 86)
}

export async function exportSelectedToVideo(
  diaries: Diary[],
  onProgress?: (p: ExportProgress) => void
): Promise<void> {
  // WebCodecs 지원 체크
  if (typeof VideoEncoder === 'undefined') {
    alert('이 브라우저는 영상 내보내기를 지원하지 않아요.\nChrome 94+ 또는 Safari 16.4+ 를 사용해주세요.')
    return
  }

  // 지원하는 H.264 코덱 프로파일 순서대로 시도
  const CODEC_CANDIDATES = [
    'avc1.640034',  // H.264 High Profile Level 5.2
    'avc1.4D0034',  // H.264 Main Profile Level 5.2
    'avc1.42E034',  // H.264 Baseline Level 5.2
    'avc1.42001E',  // H.264 Baseline Level 3.0 (가장 넓은 호환성)
  ]

  let supportedCodec = ''
  for (const codec of CODEC_CANDIDATES) {
    const support = await VideoEncoder.isConfigSupported({
      codec,
      width: VIDEO_W,
      height: VIDEO_H,
      bitrate: 8_000_000,
      framerate: FPS,
    })
    if (support.supported) { supportedCodec = codec; break }
  }

  if (!supportedCodec) {
    alert('이 브라우저에서 지원하는 H.264 코덱을 찾지 못했어요.\nChrome 최신 버전을 사용해주세요.')
    return
  }

  const { Muxer, ArrayBufferTarget } = await import('mp4-muxer')

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width: VIDEO_W, height: VIDEO_H },
    fastStart: 'in-memory',
  })

  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => { throw e },
  })

  encoder.configure({
    codec: supportedCodec,
    width: VIDEO_W,
    height: VIDEO_H,
    bitrate: 8_000_000,
    framerate: FPS,
  })

  // 합성용 오프스크린 캔버스
  const canvas = document.createElement('canvas')
  canvas.width = VIDEO_W
  canvas.height = VIDEO_H
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!

  const totalLayers = diaries.reduce((s, d) => s + Math.max(d.layers.length, 1), 0)
  let globalLayer = 0
  let frameTimestamp = 0                    // microseconds
  const frameDuration = 1_000_000 / FPS    // µs per frame

  const encodeFrame = async (keyFrame: boolean) => {
    const frame = new VideoFrame(canvas, { timestamp: Math.round(frameTimestamp) })
    encoder.encode(frame, { keyFrame })
    frame.close()
    frameTimestamp += frameDuration
  }

  for (const diary of diaries) {
    // 이미지 미리 로드 (레이어 전체)
    const layerImgs = await Promise.all(diary.layers.map((l) => loadImage(l.imageDataUrl)))

    const layerCount = Math.max(diary.layers.length, 1)

    for (let li = 0; li < layerCount; li++) {
      onProgress?.({
        current: ++globalLayer,
        total: totalLayers,
        diaryTitle: diary.title,
        layerIndex: li + 1,
        layerTotal: layerCount,
      })

      // 캔버스 초기화 + 레이어 0..li 누적 그리기
      ctx.fillStyle = '#fefcf8'
      ctx.fillRect(0, 0, VIDEO_W, VIDEO_H)
      for (let i = 0; i <= li && i < layerImgs.length; i++) {
        ctx.drawImage(layerImgs[i], 0, 0, VIDEO_W, VIDEO_H)
      }

      // 오버레이
      drawOverlay(ctx, diary, Math.min(li, diary.layers.length - 1))

      // 1초 = FPS frames
      for (let f = 0; f < FPS; f++) {
        await encodeFrame(globalLayer === 1 && f === 0)
      }
    }
  }

  await encoder.flush()
  muxer.finalize()

  // 다운로드
  const { buffer } = (muxer.target as InstanceType<typeof ArrayBufferTarget>)
  const blob = new Blob([buffer], { type: 'video/mp4' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'mangwang-diary.mp4'
  a.click()
  URL.revokeObjectURL(url)
}
