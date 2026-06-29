'use client'

import { createClient } from '@/lib/supabase/client'
import type { Diary, DiaryLayer, User } from '@/features/diary/types'
import { mockUsers } from '@/features/diary/mockData'
import { WRITER_COLORS } from '@/features/diary/types'

// ===== 색상 기본값 (가입 순서대로 배정) =====

const COLOR_DEFAULTS = [
  { bg: 'bg-amber-100', text: 'text-amber-800', ring: 'ring-amber-400' },
  { bg: 'bg-violet-200', text: 'text-violet-800', ring: 'ring-violet-400' },
  { bg: 'bg-orange-200', text: 'text-orange-800', ring: 'ring-orange-500' },
  { bg: 'bg-teal-100', text: 'text-teal-800', ring: 'ring-teal-400' },
  { bg: 'bg-pink-100', text: 'text-pink-800', ring: 'ring-pink-400' },
]

// DB에서 불러온 프로필로 mockUsers, WRITER_COLORS를 업데이트
// → getAvatarStyle, getInitial, getUserById 등 기존 헬퍼 함수들이 실제 데이터로 작동하게 됨
function syncProfilesLocally(profiles: User[]) {
  mockUsers.splice(0, mockUsers.length, ...profiles)
  profiles.forEach((user, index) => {
    if (!WRITER_COLORS[user.id]) {
      WRITER_COLORS[user.id] = COLOR_DEFAULTS[index % COLOR_DEFAULTS.length]
    }
  })
}

// ===== Signed URL 인메모리 캐시 =====
// 같은 세션 내에서 동일 이미지를 반복 다운로드하지 않도록 경로 → URL 캐싱
// TTL 50분 (Supabase signed URL 유효기간 1년이므로 충분)

const urlCache = new Map<string, { url: string; expiresAt: number }>()
const CACHE_TTL_MS = 50 * 60 * 1000 // 50분

function getCachedUrl(path: string): string | null {
  const entry = urlCache.get(path)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) { urlCache.delete(path); return null }
  return entry.url
}

function setCachedUrl(path: string, url: string) {
  urlCache.set(path, { url, expiresAt: Date.now() + CACHE_TTL_MS })
}

// ===== 이미지 처리 =====

// data URL(base64)을 Blob으로 변환
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64Data] = dataUrl.split(',')
  const mimeMatch = header.match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : 'image/png'
  const binary = atob(base64Data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: mime })
}

// 썸네일 생성 — 300px 너비 JPEG (홈 카드용 저해상도)
async function generateThumbnail(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const THUMB_W = 300
      const scale = THUMB_W / img.width
      const canvas = document.createElement('canvas')
      canvas.width = THUMB_W
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(dataUrl); return }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.6))
    }
    img.onerror = () => resolve(dataUrl) // 실패 시 원본 사용
    img.src = dataUrl
  })
}

// Canvas 이미지를 Supabase Storage에 업로드
// 반환값: 저장 경로 (예: "user-uuid/1714000000000.png")
// isThumb=true 이면 파일명에 _thumb 접미사 붙여 저장 (e.g. 1714000000000_thumb.jpg)
export async function uploadCanvasImage(dataUrl: string, userId: string, isThumb = false, timestamp?: number): Promise<string> {
  const supabase = createClient()
  const blob = dataUrlToBlob(dataUrl)
  const mimeMatch = dataUrl.match(/^data:(image\/\w+);/)
  const mime = mimeMatch ? mimeMatch[1] : 'image/png'
  const ext = mime === 'image/jpeg' ? 'jpg' : 'png'
  const suffix = isThumb ? '_thumb' : ''
  const ts = timestamp ?? Date.now()
  const path = `${userId}/${ts}${suffix}.${ext}`

  const { error } = await supabase.storage
    .from('diary-images')
    .upload(path, blob, { contentType: mime, upsert: false })

  if (error) throw new Error(`이미지 업로드 실패: ${error.message}`)
  return path
}

// 저장 경로 배열 → signed URL 맵 (1년 유효, 캐시 우선)
async function pathsToSignedUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {}

  const map: Record<string, string> = {}
  const uncached: string[] = []

  // 캐시에 있는 건 바로 사용
  for (const p of paths) {
    const cached = getCachedUrl(p)
    if (cached) map[p] = cached
    else uncached.push(p)
  }

  // 캐시 미스 항목만 Supabase에 요청
  if (uncached.length > 0) {
    const supabase = createClient()
    const { data } = await supabase.storage
      .from('diary-images')
      .createSignedUrls(uncached, 60 * 60 * 24 * 365)

    for (const item of data || []) {
      if (item.signedUrl && item.path) {
        map[item.path] = item.signedUrl
        setCachedUrl(item.path, item.signedUrl)
      }
    }
  }

  return map
}

// ===== DB row 타입 → User 타입 변환 =====

type ProfileRow = {
  id: string
  email: string
  display_name: string
  custom_initial: string | null
  custom_color_bg: string | null
  custom_color_text: string | null
  created_at: string
}

function rowToUser(row: ProfileRow): User {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: '',
    createdAt: row.created_at,
    customInitial: row.custom_initial || undefined,
    customColor:
      row.custom_color_bg && row.custom_color_text
        ? { bg: row.custom_color_bg, text: row.custom_color_text }
        : undefined,
  }
}

// ===== 프로필 =====

export async function getMyProfile(userId: string): Promise<User | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !data) return null
  return rowToUser(data as ProfileRow)
}

export async function getAllProfiles(): Promise<User[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })

  if (error || !data) return []
  const profiles = (data as ProfileRow[]).map(rowToUser)
  syncProfilesLocally(profiles)
  return profiles
}

export async function updateProfile(
  userId: string,
  updates: {
    displayName?: string
    customInitial?: string
    customColor?: { bg: string; text: string } | null
  }
): Promise<void> {
  const supabase = createClient()
  const patch: Record<string, string | null> = {}

  if (updates.displayName !== undefined) patch.display_name = updates.displayName
  if ('customInitial' in updates) patch.custom_initial = updates.customInitial || null
  if ('customColor' in updates) {
    patch.custom_color_bg = updates.customColor?.bg ?? null
    patch.custom_color_text = updates.customColor?.text ?? null
  }

  const { error } = await supabase.from('profiles').update(patch).eq('id', userId)
  if (error) throw new Error(`프로필 업데이트 실패: ${error.message}`)
}

// ===== 일기 목록 =====

export async function getSortedDiaries(userId: string): Promise<Diary[]> {
  const supabase = createClient()

  // 프로필 동기화 (getAvatarStyle 등이 실제 데이터로 작동하도록)
  await getAllProfiles()

  const { data: diaryRows, error: diaryError } = await supabase
    .from('diaries')
    .select('*')
    .order('last_edited_at', { ascending: false })

  if (diaryError || !diaryRows || diaryRows.length === 0) return []

  const diaryIds = diaryRows.map((d) => d.id)

  const [{ data: layerRows }, { data: readRows }] = await Promise.all([
    supabase
      .from('diary_layers')
      .select('*')
      .in('diary_id', diaryIds)
      .order('layer_order', { ascending: true }),
    supabase
      .from('diary_reads')
      .select('diary_id, read_layer_count, last_read_at')
      .eq('user_id', userId),
  ])

  const readMap: Record<string, number> = {}
  const lastReadAtMap: Record<string, string> = {}
  for (const row of readRows || []) {
    readMap[row.diary_id] = row.read_layer_count
    if (row.last_read_at) lastReadAtMap[row.diary_id] = row.last_read_at
  }

  // 원본 + 썸네일 경로 모두 signed URL 요청 (썸네일이 없으면 조용히 스킵)
  const allPaths = (layerRows || []).flatMap((l) => {
    const thumbPath = l.image_url.replace(/(\.\w+)$/, '_thumb.jpg')
    return [l.image_url, thumbPath]
  })
  const signedUrlMap = await pathsToSignedUrls(allPaths)

  // 일기별 레이어 그룹화
  type LayerRow = { diary_id: string; image_url: string; editor_id: string; edited_at: string }
  const layersByDiary: Record<string, LayerRow[]> = {}
  for (const layer of (layerRows || []) as LayerRow[]) {
    if (!layersByDiary[layer.diary_id]) layersByDiary[layer.diary_id] = []
    layersByDiary[layer.diary_id].push(layer)
  }

  return diaryRows.map((d) => {
    const layers = layersByDiary[d.id] || []
    const totalLayers = layers.length
    const unreadEdits = Math.max(0, totalLayers - (readMap[d.id] || 0))

    const diaryLayers: DiaryLayer[] = layers.map((l) => {
      const thumbPath = l.image_url.replace(/(\.\w+)$/, '_thumb.jpg')
      return {
        imageDataUrl: signedUrlMap[l.image_url] || l.image_url,
        thumbDataUrl: signedUrlMap[thumbPath] || undefined,
        editorId: l.editor_id,
        editedAt: l.edited_at,
      }
    })

    const editors: string[] = []
    for (const l of layers) {
      if (!editors.includes(l.editor_id)) editors.push(l.editor_id)
    }

    return {
      id: d.id,
      title: d.title,
      layers: diaryLayers,
      createdBy: d.created_by,
      lastEditedBy: d.last_edited_by,
      editors,
      unreadEdits,
      isPinned: d.is_pinned ?? false,
      pinnedAt: d.pinned_at ?? undefined,
      isPinnedUnread: !!d.is_pinned && !!d.pinned_at && (
        !lastReadAtMap[d.id] || lastReadAtMap[d.id] < d.pinned_at
      ),
      createdAt: d.created_at,
      lastEditedAt: d.last_edited_at,
    }
  })
}

export async function getDiaryById(diaryId: string, userId: string): Promise<Diary | null> {
  const supabase = createClient()

  // 프로필 동기화
  await getAllProfiles()

  const { data: d, error } = await supabase
    .from('diaries')
    .select('*')
    .eq('id', diaryId)
    .single()

  if (error || !d) return null

  const [{ data: layerRows }, { data: readRow }] = await Promise.all([
    supabase
      .from('diary_layers')
      .select('*')
      .eq('diary_id', diaryId)
      .order('layer_order', { ascending: true }),
    supabase
      .from('diary_reads')
      .select('read_layer_count, last_read_at')
      .eq('diary_id', diaryId)
      .eq('user_id', userId)
      .single(),
  ])

  type LayerRow = { image_url: string; editor_id: string; edited_at: string }
  const layers = (layerRows || []) as LayerRow[]
  const paths = layers.flatMap((l) => {
    const thumbPath = l.image_url.replace(/(\.\w+)$/, '_thumb.jpg')
    return [l.image_url, thumbPath]
  })
  const signedUrlMap = await pathsToSignedUrls(paths)

  const diaryLayers: DiaryLayer[] = layers.map((l) => {
    const thumbPath = l.image_url.replace(/(\.\w+)$/, '_thumb.jpg')
    return {
      imageDataUrl: signedUrlMap[l.image_url] || l.image_url,
      thumbDataUrl: signedUrlMap[thumbPath] || undefined,
      editorId: l.editor_id,
      editedAt: l.edited_at,
    }
  })

  const editors: string[] = []
  for (const l of layers) {
    if (!editors.includes(l.editor_id)) editors.push(l.editor_id)
  }

  return {
    id: d.id,
    title: d.title,
    layers: diaryLayers,
    createdBy: d.created_by,
    lastEditedBy: d.last_edited_by,
    editors,
    unreadEdits: Math.max(0, layers.length - ((readRow as { read_layer_count: number } | null)?.read_layer_count || 0)),
    isPinned: d.is_pinned ?? false,
    pinnedAt: d.pinned_at ?? undefined,
    isPinnedUnread: !!d.is_pinned && !!d.pinned_at && (
      !(readRow as { last_read_at?: string } | null)?.last_read_at ||
      (readRow as { last_read_at?: string }).last_read_at! < d.pinned_at
    ),
    createdAt: d.created_at,
    lastEditedAt: d.last_edited_at,
  }
}

// ===== 핀 고정/해제 =====

export async function togglePin(diaryId: string, isPinned: boolean): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('diaries')
    .update({
      is_pinned: isPinned,
      pinned_at: isPinned ? new Date().toISOString() : null,
    })
    .eq('id', diaryId)
  if (error) throw new Error(`핀 변경 실패: ${error.message}`)
}

// ===== 일기 저장 =====

export async function createDiary(
  title: string,
  imageDataUrl: string,
  userId: string
): Promise<string | null> {
  const supabase = createClient()

  // 원본 + 썸네일 병렬 업로드 — 같은 타임스탬프로 경로 일치 보장
  const thumbDataUrl = await generateThumbnail(imageDataUrl)
  const ts = Date.now()
  const [imagePath] = await Promise.all([
    uploadCanvasImage(imageDataUrl, userId, false, ts),
    uploadCanvasImage(thumbDataUrl, userId, true, ts),
  ])

  const { data: diary, error: diaryError } = await supabase
    .from('diaries')
    .insert({ title, created_by: userId, last_edited_by: userId })
    .select('id')
    .single()

  if (diaryError || !diary) return null

  const { error: layerError } = await supabase
    .from('diary_layers')
    .insert({ diary_id: diary.id, editor_id: userId, image_url: imagePath, layer_order: 0 })

  if (layerError) return null
  return diary.id
}

export async function appendLayer(
  diaryId: string,
  imageDataUrl: string,
  userId: string,
  currentLayerCount: number,
  compositeThumbDataUrl?: string  // 덧붙임은 투명 PNG라 에디터에서 합성 썸네일을 별도 전달
): Promise<void> {
  const supabase = createClient()

  // 썸네일: 합성본이 있으면 그걸 사용, 없으면 원본에서 생성 (새 일기 fallback)
  // 같은 타임스탬프로 경로 일치 보장 — getSortedDiaries의 _thumb.jpg 파생 로직과 맞춤
  const thumbDataUrl = compositeThumbDataUrl ?? await generateThumbnail(imageDataUrl)
  const ts = Date.now()
  const [imagePath] = await Promise.all([
    uploadCanvasImage(imageDataUrl, userId, false, ts),
    uploadCanvasImage(thumbDataUrl, userId, true, ts),
  ])

  const { error: layerError } = await supabase.from('diary_layers').insert({
    diary_id: diaryId,
    editor_id: userId,
    image_url: imagePath,
    layer_order: currentLayerCount,
  })

  if (layerError) throw new Error(`레이어 추가 실패: ${layerError.message}`)

  const { error: diaryError } = await supabase
    .from('diaries')
    .update({ last_edited_by: userId, last_edited_at: new Date().toISOString() })
    .eq('id', diaryId)

  if (diaryError) throw new Error(`일기 업데이트 실패: ${diaryError.message}`)
}

// 일기 삭제 — 일기 + 모든 레이어 + Storage 이미지 + 읽음 기록까지 모두 정리
export async function deleteDiary(diaryId: string): Promise<void> {
  const supabase = createClient()

  // 1) 이 일기에 속한 모든 레이어의 이미지 경로 수집
  const { data: layers } = await supabase
    .from('diary_layers')
    .select('image_url')
    .eq('diary_id', diaryId)

  const imagePaths = (layers || []).map((l) => l.image_url)

  // 2) Storage에서 이미지 파일 삭제
  if (imagePaths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from('diary-images')
      .remove(imagePaths)
    if (storageError) {
      console.warn('이미지 삭제 일부 실패 (계속 진행):', storageError.message)
    }
  }

  // 3) diary_reads 정리 (읽음 기록)
  await supabase.from('diary_reads').delete().eq('diary_id', diaryId)

  // 4) diary_layers 정리 (레이어들)
  await supabase.from('diary_layers').delete().eq('diary_id', diaryId)

  // 5) 마지막으로 diaries 본체 삭제
  const { error } = await supabase.from('diaries').delete().eq('id', diaryId)
  if (error) throw new Error(`일기 삭제 실패: ${error.message}`)
}

// ===== 전체 데이터 삭제 (보관 후 초기화용) =====
export async function deleteAllData(): Promise<void> {
  const supabase = createClient()

  // 1) 모든 레이어 이미지 경로 수집
  const { data: layers } = await supabase.from('diary_layers').select('image_url')
  const imagePaths = (layers || []).map((l) => l.image_url)

  // 썸네일 경로도 파생
  const thumbPaths = imagePaths.map((p) => p.replace(/(\.\w+)$/, '_thumb.jpg'))
  const allPaths = [...imagePaths, ...thumbPaths]

  // 2) Storage 이미지 삭제 (50개씩 나눠서)
  for (let i = 0; i < allPaths.length; i += 50) {
    const chunk = allPaths.slice(i, i + 50)
    await supabase.storage.from('diary-images').remove(chunk)
  }

  // 3) DB 데이터 삭제 (의존성 순서 역순)
  await supabase.from('diary_reads').delete().neq('diary_id', '')
  await supabase.from('diary_layers').delete().neq('diary_id', '')
  await supabase.from('diaries').delete().neq('id', '')

  // 4) 캐시 초기화
  urlCache.clear()
}

export async function markDiaryAsRead(
  diaryId: string,
  userId: string,
  layerCount: number
): Promise<void> {
  const supabase = createClient()
  await supabase
    .from('diary_reads')
    .upsert({
      diary_id: diaryId,
      user_id: userId,
      read_layer_count: layerCount,
      last_read_at: new Date().toISOString(),
    })
}

// ===== 통계 =====

export type UserStats = {
  diaryCount: number
  layerCount: number
  streakDays: number
}

export async function getUserStats(userId: string): Promise<UserStats> {
  const supabase = createClient()

  const [{ count: diaryCount }, { count: layerCount }, { data: myLayers }] = await Promise.all([
    supabase
      .from('diaries')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', userId),
    supabase
      .from('diary_layers')
      .select('id', { count: 'exact', head: true })
      .eq('editor_id', userId)
      .gt('layer_order', 0),
    supabase.from('diary_layers').select('edited_at').eq('editor_id', userId),
  ])

  // 연속 기록 일수 계산
  const activeDates = new Set<string>()
  for (const layer of myLayers || []) {
    activeDates.add((layer.edited_at as string).slice(0, 10))
  }

  let streakDays = 0
  const checkDate = new Date()
  while (true) {
    const dateStr = checkDate.toISOString().slice(0, 10)
    if (activeDates.has(dateStr)) {
      streakDays++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  return { diaryCount: diaryCount || 0, layerCount: layerCount || 0, streakDays }
}
