'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

// 현재 로그인한 사용자 정보를 가져오는 훅
// 훅(hook)이란? 컴포넌트에서 데이터나 기능을 쉽게 재사용하기 위한 함수예요
export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // 현재 로그인 상태 확인
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })

    // 로그인/로그아웃 변화 감지
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  return { user, loading }
}
