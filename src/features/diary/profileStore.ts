import { useSyncExternalStore } from 'react'

// 프로필 변경 시 구독 중인 모든 컴포넌트를 다시 렌더링시키는 간단한 스토어
// (나중에 Supabase 실시간 연동으로 교체 예정)

let version = 0
const listeners = new Set<() => void>()

// 프로필이 변경되었음을 알림 → 구독 중인 컴포넌트가 다시 렌더링됨
export function notifyProfileChange() {
  version++
  listeners.forEach((l) => l())
}

// 컴포넌트에서 사용: 프로필 변경 시 자동으로 re-render
export function useProfileVersion(): number {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback)
      return () => listeners.delete(callback)
    },
    () => version,
    () => version
  )
}
