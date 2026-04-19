import { Diary, User, WRITER_COLORS } from './types'
import type { CSSProperties } from 'react'

// ===== 사용자 캐시 =====
// Supabase에서 불러온 프로필이 syncProfilesLocally()를 통해 여기에 채워짐
// (getUserById, getInitial, getAvatarStyle 등 헬퍼 함수가 빠르게 동기적으로 작동하도록)

export const mockUsers: User[] = []

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

// ===== 일기 캐시 (현재 미사용 — 모든 일기는 Supabase에서 직접 로드) =====
// 호환성을 위해 빈 배열로 남겨둠

export const mockDiaries: Diary[] = []

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
