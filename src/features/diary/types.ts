// ===== 레이어 (한 번의 작성 = 하나의 이미지 레이어) =====

export type DiaryLayer = {
  imageDataUrl: string        // 캔버스를 이미지로 플래튼한 결과 (PNG data URL)
  thumbDataUrl?: string       // 홈 카드용 저해상도 썸네일 URL (없으면 imageDataUrl 사용)
  editorId: string            // 이 레이어를 작성한 사람의 userId
  editedAt: string            // 작성 시각
}

// ===== 일기 한 장 =====

export type Diary = {
  id: string
  title: string
  layers: DiaryLayer[]        // 쌓인 레이어들 (각 작성마다 하나씩 추가됨)
  createdBy: string           // 최초 작성자 userId
  lastEditedBy: string        // 마지막 편집자 userId
  editors: string[]           // 편집한 사람들의 userId 목록
  unreadEdits: number         // 안 읽은 편집 건수
  isPinned: boolean           // 상단 고정 여부 (모든 유저 공유)
  createdAt: string
  lastEditedAt: string
}

// ===== 사용자 =====

export type User = {
  id: string
  email: string
  displayName: string
  avatarUrl: string
  createdAt: string
  customInitial?: string                          // 유저가 직접 설정한 표시 글자 (미설정 시 자동)
  customColor?: { bg: string; text: string }      // 유저가 직접 설정한 아바타 색상 (미설정 시 WRITER_COLORS 사용)
}

// ===== 작성자별 고유 색상 =====

export const WRITER_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  'user-1': { bg: 'bg-amber-100', text: 'text-amber-800', ring: 'ring-amber-400' },       // 레 — 연한 갈색
  'user-2': { bg: 'bg-violet-200', text: 'text-violet-800', ring: 'ring-violet-400' },     // 베 — 청보라
  'user-3': { bg: 'bg-orange-200', text: 'text-orange-800', ring: 'ring-orange-500' },     // 향 — 빨간 주황
}

