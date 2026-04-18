import { Diary, User, WRITER_COLORS } from './types'
import type { CSSProperties } from 'react'

// ===== 테스트용 사용자 3명 =====

export const mockUsers: User[] = [
  {
    id: 'user-1',
    email: 'suhyeon@test.com',
    displayName: '레리',
    avatarUrl: '',
    createdAt: '2026-04-01T00:00:00Z',
  },
  {
    id: 'user-2',
    email: 'minji@test.com',
    displayName: '베리',
    avatarUrl: '',
    createdAt: '2026-04-01T00:00:00Z',
  },
  {
    id: 'user-3',
    email: 'junho@test.com',
    displayName: '레향',
    avatarUrl: '',
    createdAt: '2026-04-01T00:00:00Z',
  },
]

// 현재 로그인한 사용자 (개발용 — 나중에 실제 인증으로 교체)
export const currentUserId = 'user-1'

// 사용자 ID로 사용자 정보 찾기
export function getUserById(id: string): User | undefined {
  return mockUsers.find((u) => u.id === id)
}

// 대표 글자 가져오기
// 규칙: 첫 글자 사용이 기본. 먼저 가입한 사람과 첫 글자가 겹치면 두 번째 글자 사용.
// (mockUsers는 가입순으로 정렬되어 있다고 가정)
export function getInitial(userId: string): string {
  const user = getUserById(userId)
  if (!user) return '?'

  // 유저가 직접 설정한 글자가 있으면 우선 사용
  if (user.customInitial) return user.customInitial

  const firstChar = user.displayName.charAt(0)

  // 나보다 먼저 가입한 사람들 중 같은 첫 글자를 쓰는 사람이 있는지 확인
  const myIndex = mockUsers.findIndex((u) => u.id === userId)
  const isConflict = mockUsers
    .slice(0, myIndex) // 나보다 앞에 가입한 사람들만
    .some((u) => u.displayName.charAt(0) === firstChar)

  if (isConflict && user.displayName.length > 1) {
    return user.displayName.charAt(1) // 두 번째 글자 사용
  }
  return firstChar
}

// ===== SVG 기반 더미 레이어 이미지 생성 =====
// 실제로는 캔버스를 이미지로 플래튼한 결과가 들어감
// 개발 중에는 SVG를 data URL로 만들어서 미리보기용으로 사용

function createMockLayerImage(
  bgColor: string,
  texts: { content: string; x: number; y: number; size: number; color: string }[],
  doodles?: string // SVG path 데이터 (선 그리기 흉내)
): string {
  const width = 430
  const height = 750

  const textElements = texts.map(
    (t) => `<text x="${t.x}" y="${t.y}" font-size="${t.size}" fill="${t.color}" font-family="sans-serif">${t.content}</text>`
  ).join('\n    ')

  const doodleElement = doodles
    ? `<path d="${doodles}" stroke="#3d3529" stroke-width="3" fill="none" stroke-linecap="round"/>`
    : ''

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="${bgColor}"/>
    ${textElements}
    ${doodleElement}
  </svg>`

  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
}

// ===== 테스트용 일기 =====

export const mockDiaries: Diary[] = [
  {
    id: 'diary-1',
    title: '바다에 갔다',
    layers: [
      {
        imageDataUrl: createMockLayerImage(
          '#e0f2fe', // 하늘색 배경
          [
            { content: '오늘 바다에 갔다 🌊', x: 40, y: 120, size: 28, color: '#1e3a5f' },
            { content: '파도 소리가 너무 좋았어', x: 60, y: 200, size: 22, color: '#1e3a5f' },
            { content: '모래사장에 발자국을 남기면서', x: 50, y: 280, size: 20, color: '#4a6d8c' },
            { content: '걸었는데, 파도가 금방', x: 70, y: 340, size: 20, color: '#4a6d8c' },
            { content: '지워버렸다.', x: 90, y: 400, size: 20, color: '#4a6d8c' },
          ],
          'M 50 500 Q 100 480 150 510 Q 200 540 250 500 Q 300 460 350 500 Q 380 520 400 500' // 파도 모양
        ),
        editorId: 'user-2',
        editedAt: '2026-04-05T15:00:00Z',
      },
      {
        imageDataUrl: createMockLayerImage(
          'transparent',
          [
            { content: '나도 바다 가고 싶다!! 🏖️', x: 60, y: 500, size: 24, color: '#f97316' },
            { content: '다음에 같이 가자~', x: 80, y: 560, size: 20, color: '#f97316' },
          ],
          'M 320 100 L 350 70 L 380 100 M 340 85 L 360 65 L 380 85' // 갈매기 모양
        ),
        editorId: 'user-3',
        editedAt: '2026-04-06T10:30:00Z',
      },
    ],
    createdBy: 'user-2',
    lastEditedBy: 'user-3',
    editors: ['user-2', 'user-3'],
    unreadEdits: 3,
    createdAt: '2026-04-05T15:00:00Z',
    lastEditedAt: '2026-04-11T10:30:00Z',
  },
  {
    id: 'diary-2',
    title: '벚꽃이 피었다',
    layers: [
      {
        imageDataUrl: createMockLayerImage(
          '#fce7f3', // 연분홍 배경
          [
            { content: '벚꽃이 피기 시작했다 🌸', x: 40, y: 150, size: 28, color: '#831843' },
            { content: '올해는 꼭 같이', x: 80, y: 240, size: 22, color: '#9d174d' },
            { content: '꽃구경 가자.', x: 100, y: 300, size: 22, color: '#9d174d' },
            { content: '창밖을 봤더니', x: 60, y: 400, size: 20, color: '#be185d' },
            { content: '진짜 피어있었다.', x: 80, y: 460, size: 20, color: '#be185d' },
          ]
        ),
        editorId: 'user-1',
        editedAt: '2026-04-07T09:00:00Z',
      },
    ],
    createdBy: 'user-1',
    lastEditedBy: 'user-1',
    editors: ['user-1'],
    unreadEdits: 0,
    createdAt: '2026-04-07T09:00:00Z',
    lastEditedAt: '2026-04-07T09:00:00Z',
  },
  {
    id: 'diary-3',
    title: '라면 끓여 먹음',
    layers: [
      {
        imageDataUrl: createMockLayerImage(
          '#fef3c7', // 노란 배경
          [
            { content: '새벽 2시에 라면이', x: 40, y: 130, size: 26, color: '#92400e' },
            { content: '너무 먹고 싶어서', x: 60, y: 190, size: 26, color: '#92400e' },
            { content: '끓여 먹었다 🍜', x: 80, y: 250, size: 26, color: '#92400e' },
            { content: '계란이랑 치즈도 넣었는데', x: 50, y: 340, size: 20, color: '#78350f' },
            { content: '미쳤다.', x: 160, y: 400, size: 32, color: '#dc2626' },
          ]
        ),
        editorId: 'user-3',
        editedAt: '2026-04-08T02:00:00Z',
      },
      {
        imageDataUrl: createMockLayerImage(
          'transparent',
          [
            { content: '치즈라면 최고... 🧀', x: 40, y: 480, size: 22, color: '#b45309' },
          ]
        ),
        editorId: 'user-1',
        editedAt: '2026-04-08T14:00:00Z',
      },
      {
        imageDataUrl: createMockLayerImage(
          'transparent',
          [
            { content: '나는 신라면파 🔥', x: 200, y: 550, size: 20, color: '#7c3aed' },
            { content: '근데 새벽에 라면은 좀..ㅋㅋ', x: 50, y: 620, size: 18, color: '#7c3aed' },
          ]
        ),
        editorId: 'user-2',
        editedAt: '2026-04-09T18:00:00Z',
      },
    ],
    createdBy: 'user-3',
    lastEditedBy: 'user-2',
    editors: ['user-3', 'user-1', 'user-2'],
    unreadEdits: 1,
    createdAt: '2026-04-08T02:00:00Z',
    lastEditedAt: '2026-04-09T18:00:00Z',
  },
  {
    id: 'diary-4',
    title: '오늘의 노래',
    layers: [
      {
        imageDataUrl: createMockLayerImage(
          '#fefcf8', // 기본 종이색
          [
            { content: '아이유 노래를 들었는데', x: 40, y: 150, size: 24, color: '#3d3529' },
            { content: '가사가 너무 좋았다.', x: 60, y: 210, size: 24, color: '#3d3529' },
            { content: '', x: 40, y: 300, size: 18, color: '#6b5c4d' },
            { content: '"나의 이름은', x: 80, y: 350, size: 22, color: '#8b5cf6' },
            { content: '너의 마음에 적어둔', x: 70, y: 410, size: 22, color: '#8b5cf6' },
            { content: '그 이름"', x: 150, y: 470, size: 22, color: '#8b5cf6' },
            { content: '🎵', x: 200, y: 540, size: 40, color: '#000' },
          ]
        ),
        editorId: 'user-1',
        editedAt: '2026-04-10T20:00:00Z',
      },
    ],
    createdBy: 'user-1',
    lastEditedBy: 'user-1',
    editors: ['user-1'],
    unreadEdits: 0,
    createdAt: '2026-04-10T20:00:00Z',
    lastEditedAt: '2026-04-10T20:00:00Z',
  },
  // ===== 다른 계절 더미 일기 =====

  // 2025년 여름 (7월)
  {
    id: 'diary-5',
    title: '수박 파티',
    layers: [
      {
        imageDataUrl: createMockLayerImage(
          '#dcfce7',
          [
            { content: '수박 한 통을 샀다 🍉', x: 40, y: 130, size: 26, color: '#166534' },
            { content: '셋이서 나눠 먹었는데', x: 60, y: 200, size: 22, color: '#166534' },
            { content: '진짜 달았다', x: 80, y: 260, size: 22, color: '#15803d' },
          ]
        ),
        editorId: 'user-1',
        editedAt: '2025-07-15T14:00:00Z',
      },
      {
        imageDataUrl: createMockLayerImage(
          'transparent',
          [
            { content: '씨 뱉기 대회도 함 ㅋㅋ', x: 50, y: 400, size: 20, color: '#7c3aed' },
          ]
        ),
        editorId: 'user-2',
        editedAt: '2025-07-15T18:00:00Z',
      },
    ],
    createdBy: 'user-1',
    lastEditedBy: 'user-2',
    editors: ['user-1', 'user-2'],
    unreadEdits: 0,
    createdAt: '2025-07-15T14:00:00Z',
    lastEditedAt: '2025-07-15T18:00:00Z',
  },
  {
    id: 'diary-6',
    title: '에어컨 고장남',
    layers: [
      {
        imageDataUrl: createMockLayerImage(
          '#fef9c3',
          [
            { content: '에어컨이 고장났다 🥵', x: 40, y: 130, size: 26, color: '#854d0e' },
            { content: '선풍기로 버티는 중...', x: 60, y: 200, size: 22, color: '#92400e' },
            { content: '너무 덥다', x: 150, y: 280, size: 28, color: '#dc2626' },
          ]
        ),
        editorId: 'user-3',
        editedAt: '2025-07-22T11:00:00Z',
      },
    ],
    createdBy: 'user-3',
    lastEditedBy: 'user-3',
    editors: ['user-3'],
    unreadEdits: 0,
    createdAt: '2025-07-22T11:00:00Z',
    lastEditedAt: '2025-07-22T11:00:00Z',
  },

  // 2025년 가을 (10월)
  {
    id: 'diary-7',
    title: '단풍 구경',
    layers: [
      {
        imageDataUrl: createMockLayerImage(
          '#fef3c7',
          [
            { content: '단풍이 너무 예뻤다 🍁', x: 40, y: 130, size: 26, color: '#9a3412' },
            { content: '빨간색 노란색 섞여서', x: 60, y: 200, size: 22, color: '#92400e' },
            { content: '진짜 그림 같았어', x: 80, y: 260, size: 22, color: '#78350f' },
          ]
        ),
        editorId: 'user-2',
        editedAt: '2025-10-12T10:00:00Z',
      },
      {
        imageDataUrl: createMockLayerImage(
          'transparent',
          [
            { content: '나도 가고 싶다 ㅠㅠ', x: 60, y: 400, size: 20, color: '#f97316' },
            { content: '사진 더 보여줘!!', x: 80, y: 460, size: 18, color: '#f97316' },
          ]
        ),
        editorId: 'user-1',
        editedAt: '2025-10-13T09:00:00Z',
      },
    ],
    createdBy: 'user-2',
    lastEditedBy: 'user-1',
    editors: ['user-2', 'user-1'],
    unreadEdits: 0,
    createdAt: '2025-10-12T10:00:00Z',
    lastEditedAt: '2025-10-13T09:00:00Z',
  },

  // 2025년 겨울 (2026년 1월 → year - 1 = 2025-winter)
  {
    id: 'diary-8',
    title: '눈이 왔다',
    layers: [
      {
        imageDataUrl: createMockLayerImage(
          '#e0f2fe',
          [
            { content: '첫눈이다!! ❄️', x: 40, y: 130, size: 28, color: '#1e3a5f' },
            { content: '밖에 나가서', x: 80, y: 210, size: 22, color: '#1e3a5f' },
            { content: '눈사람 만들었다 ⛄', x: 60, y: 280, size: 22, color: '#1e3a5f' },
          ]
        ),
        editorId: 'user-1',
        editedAt: '2026-01-10T08:00:00Z',
      },
      {
        imageDataUrl: createMockLayerImage(
          'transparent',
          [
            { content: '나는 이불 속에서 봄 ㅋ', x: 50, y: 420, size: 20, color: '#7c3aed' },
          ]
        ),
        editorId: 'user-2',
        editedAt: '2026-01-10T12:00:00Z',
      },
    ],
    createdBy: 'user-1',
    lastEditedBy: 'user-2',
    editors: ['user-1', 'user-2'],
    unreadEdits: 0,
    createdAt: '2026-01-10T08:00:00Z',
    lastEditedAt: '2026-01-10T12:00:00Z',
  },
  {
    id: 'diary-9',
    title: '떡국 먹음',
    layers: [
      {
        imageDataUrl: createMockLayerImage(
          '#fefcf8',
          [
            { content: '새해라서 떡국 끓임 🍲', x: 40, y: 130, size: 24, color: '#3d3529' },
            { content: '만두도 넣었다', x: 80, y: 200, size: 22, color: '#3d3529' },
            { content: '한 살 더 먹었네...', x: 60, y: 280, size: 20, color: '#6b5c4d' },
          ]
        ),
        editorId: 'user-3',
        editedAt: '2026-01-01T12:00:00Z',
      },
    ],
    createdBy: 'user-3',
    lastEditedBy: 'user-3',
    editors: ['user-3'],
    unreadEdits: 0,
    createdAt: '2026-01-01T12:00:00Z',
    lastEditedAt: '2026-01-01T12:00:00Z',
  },
]

// 생성 순서로 정렬 (최신이 위)
export function getSortedDiaries(): Diary[] {
  return [...mockDiaries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

// ID로 일기 찾기
export function getDiaryById(id: string): Diary | undefined {
  return mockDiaries.find((d) => d.id === id)
}

// 읽음 처리 — 해당 일기의 unreadEdits를 0으로 리셋
// (나중에 Supabase에서는 유저별 읽음 상태를 별도 테이블로 관리)
export function markDiaryAsRead(diaryId: string): void {
  const diary = getDiaryById(diaryId)
  if (diary) {
    diary.unreadEdits = 0
  }
}

// ===== 유저 통계 =====

export type UserStats = {
  diaryCount: number    // 내가 최초 작성한 일기 수
  layerCount: number    // 내가 덧붙인 레이어 수 (첫 레이어 제외)
  streakDays: number    // 연속 기록 일수
}

export function getUserStats(userId: string): UserStats {
  // 1) 내가 최초 작성한 일기 수
  const diaryCount = mockDiaries.filter((d) => d.createdBy === userId).length

  // 2) 내가 덧붙인 레이어 수 (각 일기의 첫 레이어는 "생성"이므로 제외)
  let layerCount = 0
  for (const diary of mockDiaries) {
    for (let i = 1; i < diary.layers.length; i++) {
      if (diary.layers[i].editorId === userId) {
        layerCount++
      }
    }
  }

  // 3) 연속 기록 일수 — 내가 활동한 날짜들을 모아서 오늘부터 연속인 일수 계산
  const activeDates = new Set<string>()
  for (const diary of mockDiaries) {
    // 내가 만든 일기의 생성일
    if (diary.createdBy === userId) {
      activeDates.add(diary.createdAt.slice(0, 10)) // 'YYYY-MM-DD'
    }
    // 내가 덧붙인 레이어의 편집일
    for (const layer of diary.layers) {
      if (layer.editorId === userId) {
        activeDates.add(layer.editedAt.slice(0, 10))
      }
    }
  }

  // 오늘부터 거꾸로 연속 일수 세기
  let streakDays = 0
  const today = new Date()
  const checkDate = new Date(today)

  while (true) {
    const dateStr = checkDate.toISOString().slice(0, 10)
    if (activeDates.has(dateStr)) {
      streakDays++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  return { diaryCount, layerCount, streakDays }
}

// ===== 프로필 업데이트 (mock용) =====

export function updateUserProfile(
  userId: string,
  updates: {
    displayName?: string
    customInitial?: string
    customColor?: { bg: string; text: string }
  }
): boolean {
  const user = mockUsers.find((u) => u.id === userId)
  if (!user) return false

  if (updates.displayName !== undefined) user.displayName = updates.displayName
  if (updates.customInitial !== undefined) user.customInitial = updates.customInitial || undefined
  if (updates.customColor !== undefined) user.customColor = updates.customColor

  return true
}

// ===== 아바타 색상 헬퍼 =====
// customColor가 있으면 inline style, 없으면 Tailwind 클래스 반환
// 모든 컴포넌트에서 이 함수를 사용하면 프로필 색상 변경이 자동 반영됨

export function getAvatarStyle(userId: string): {
  className: string
  style?: CSSProperties
  ringClass: string
} {
  const user = getUserById(userId)
  const defaultColor = WRITER_COLORS[userId]

  if (user?.customColor) {
    return {
      className: '',
      style: { backgroundColor: user.customColor.bg, color: user.customColor.text },
      ringClass: 'ring-gray-400',
    }
  }

  return {
    className: `${defaultColor?.bg || 'bg-gray-100'} ${defaultColor?.text || 'text-gray-800'}`,
    style: undefined,
    ringClass: defaultColor?.ring || 'ring-gray-400',
  }
}
