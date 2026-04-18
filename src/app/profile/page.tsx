'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getInitial, getAvatarStyle } from '@/features/diary/mockData'
import { signOut } from '@/features/auth/actions'
import { useUser } from '@/features/auth/useUser'
import { getMyProfile, getAllProfiles, getUserStats } from '@/lib/supabase/diaryService'
import type { UserStats } from '@/lib/supabase/diaryService'
import type { User } from '@/features/diary/types'

export default function ProfilePage() {
  const router = useRouter()
  const { user: authUser } = useUser()
  const [profile, setProfile] = useState<User | null>(null)
  const [stats, setStats] = useState<UserStats>({ diaryCount: 0, layerCount: 0, streakDays: 0 })
  const [otherMembers, setOtherMembers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authUser) return
    const load = async () => {
      setLoading(true)
      // getAllProfiles()는 mockUsers/WRITER_COLORS도 동기화함
      const [p, s, allProfiles] = await Promise.all([
        getMyProfile(authUser.id),
        getUserStats(authUser.id),
        getAllProfiles(),
      ])
      setProfile(p)
      setStats(s)
      setOtherMembers(allProfiles.filter((u) => u.id !== authUser.id))
      setLoading(false)
    }
    load()
  }, [authUser?.id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-handwriting text-xl text-ink-700/40">불러오는 중...</p>
      </div>
    )
  }

  if (!profile || !authUser) return null

  const myAvatar = getAvatarStyle(authUser.id)

  return (
    <div className="min-h-screen">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 backdrop-blur-sm bg-paper-100/80 border-b border-paper-200">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="text-ink-800/60 hover:text-ink-800 text-xl transition"
          >
            ←
          </button>
          <h1 className="font-handwriting text-2xl text-ink-800 font-bold">
            마이페이지
          </h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6 pb-24">
        {/* 프로필 섹션 */}
        <div className="flex flex-col items-center mb-8">
          {/* 큰 아바타 */}
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold shadow-md ring-3 ring-white mb-4 ${myAvatar.className}`}
            style={myAvatar.style}
          >
            {getInitial(authUser.id)}
          </div>

          <h2 className="font-handwriting text-2xl text-ink-800 font-bold">
            {profile.displayName}
          </h2>
          <p className="text-sm text-ink-700/50 mt-1">
            {profile.email}
          </p>

          {/* 프로필 편집 버튼 */}
          <button
            onClick={() => router.push('/profile/edit')}
            className="mt-4 px-5 py-2 rounded-full border border-paper-300 text-sm text-ink-700/70 hover:bg-paper-200 transition font-handwriting"
          >
            프로필 편집
          </button>
        </div>

        {/* 통계 섹션 */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <StatCard emoji="📝" label="쓴 일기" value={`${stats.diaryCount}편`} />
          <StatCard emoji="✍️" label="덧붙인 횟수" value={`${stats.layerCount}번`} />
          <StatCard emoji="🔥" label="연속 기록" value={`${stats.streakDays}일`} />
        </div>

        {/* 멤버 목록 */}
        {otherMembers.length > 0 && (
          <section className="mb-8">
            <h3 className="font-handwriting text-lg text-ink-700/70 mb-3">
              함께 쓰는 사람들
            </h3>
            <div className="flex flex-col gap-2">
              {otherMembers.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  onClick={() => router.push(`/profile/${member.id}`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* 계정 섹션 */}
        <section>
          <h3 className="font-handwriting text-lg text-ink-700/70 mb-3">
            계정
          </h3>
          <div className="bg-white rounded-xl border border-paper-200 overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-ink-800 font-medium">연결된 계정</p>
                <p className="text-xs text-ink-700/50 mt-0.5">Google · {profile.email}</p>
              </div>
              <span className="text-lg">🔗</span>
            </div>
            <div className="border-t border-paper-200">
              <button
                onClick={() => signOut()}
                className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-red-50 transition"
              >
                로그아웃
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

// ===== 통계 카드 =====

function StatCard({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-paper-200 p-4 text-center">
      <p className="text-2xl mb-1">{emoji}</p>
      <p className="font-handwriting text-xl text-ink-800 font-bold">{value}</p>
      <p className="text-xs text-ink-700/50 mt-0.5">{label}</p>
    </div>
  )
}

// ===== 멤버 행 =====

function MemberRow({ member, onClick }: { member: User; onClick: () => void }) {
  const avatar = getAvatarStyle(member.id)

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-paper-200 hover:bg-paper-100 transition text-left"
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ring-2 ring-white ${avatar.className}`}
        style={avatar.style}
      >
        {getInitial(member.id)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-handwriting text-base text-ink-800 font-bold truncate">
          {member.displayName}
        </p>
        <p className="text-xs text-ink-700/40 truncate">{member.email}</p>
      </div>
      <span className="text-ink-700/30 text-sm">›</span>
    </button>
  )
}
