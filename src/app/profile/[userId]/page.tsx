'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getInitial, getAvatarStyle } from '@/features/diary/mockData'
import { useUser } from '@/features/auth/useUser'
import { getMyProfile, getAllProfiles, getUserStats } from '@/lib/supabase/diaryService'
import type { UserStats } from '@/lib/supabase/diaryService'
import type { User } from '@/features/diary/types'

export default function MemberProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user: authUser } = useUser()
  const userId = params.userId as string

  const [profile, setProfile] = useState<User | null>(null)
  const [stats, setStats] = useState<UserStats>({ diaryCount: 0, layerCount: 0, streakDays: 0 })
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!authUser) return

    // 본인 프로필이면 마이페이지로 리다이렉트
    if (userId === authUser.id) {
      router.replace('/profile')
      return
    }

    const load = async () => {
      setLoading(true)
      // getAllProfiles()로 mockUsers/WRITER_COLORS 동기화
      await getAllProfiles()
      const [p, s] = await Promise.all([getMyProfile(userId), getUserStats(userId)])

      if (!p) {
        setNotFound(true)
      } else {
        setProfile(p)
        setStats(s)
      }
      setLoading(false)
    }

    load()
  }, [userId, authUser?.id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-handwriting text-xl text-ink-700/40">불러오는 중...</p>
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-handwriting text-xl text-ink-700/40">사용자를 찾을 수 없어요</p>
      </div>
    )
  }

  const avatar = getAvatarStyle(userId)

  return (
    <div className="min-h-screen">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 backdrop-blur-sm bg-paper-100/80 border-b border-paper-200">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-ink-800/60 hover:text-ink-800 text-xl transition"
          >
            ←
          </button>
          <h1 className="font-handwriting text-2xl text-ink-800 font-bold">
            {profile.displayName}의 프로필
          </h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6 pb-24">
        {/* 프로필 섹션 */}
        <div className="flex flex-col items-center mb-8">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold shadow-md ring-3 ring-white mb-4 ${avatar.className}`}
            style={avatar.style}
          >
            {getInitial(userId)}
          </div>

          <h2 className="font-handwriting text-2xl text-ink-800 font-bold">
            {profile.displayName}
          </h2>
          <p className="text-sm text-ink-700/50 mt-1">
            {profile.email}
          </p>
        </div>

        {/* 통계 섹션 */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard emoji="📝" label="쓴 일기" value={`${stats.diaryCount}편`} />
          <StatCard emoji="✍️" label="덧붙인 횟수" value={`${stats.layerCount}번`} />
          <StatCard emoji="🔥" label="연속 기록" value={`${stats.streakDays}일`} />
        </div>
      </main>
    </div>
  )
}

function StatCard({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-paper-200 p-4 text-center">
      <p className="text-2xl mb-1">{emoji}</p>
      <p className="font-handwriting text-xl text-ink-800 font-bold">{value}</p>
      <p className="text-xs text-ink-700/50 mt-0.5">{label}</p>
    </div>
  )
}
