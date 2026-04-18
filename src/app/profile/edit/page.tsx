'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getInitial } from '@/features/diary/mockData'
import { WRITER_COLORS } from '@/features/diary/types'
import { useUser } from '@/features/auth/useUser'
import { getMyProfile, getAllProfiles, updateProfile } from '@/lib/supabase/diaryService'
import type { User } from '@/features/diary/types'

// 선택 가능한 색상 팔레트 — 라이트 & 다크
const COLOR_PALETTE = [
  // 라이트 톤
  { bg: '#fef3c7', text: '#92400e', label: '노란색' },
  { bg: '#fce7f3', text: '#9d174d', label: '분홍색' },
  { bg: '#dbeafe', text: '#1e40af', label: '파란색' },
  { bg: '#d1fae5', text: '#065f46', label: '초록색' },
  { bg: '#ede9fe', text: '#5b21b6', label: '보라색' },
  // 다크 톤
  { bg: '#1e293b', text: '#e2e8f0', label: '슬레이트' },
  { bg: '#312e81', text: '#c7d2fe', label: '인디고' },
  { bg: '#7f1d1d', text: '#fecaca', label: '와인' },
  { bg: '#064e3b', text: '#a7f3d0', label: '포레스트' },
  { bg: '#7c2d12', text: '#fed7aa', label: '갈색' },
]

export default function ProfileEditPage() {
  const router = useRouter()
  const { user: authUser } = useUser()

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [userProfile, setUserProfile] = useState<User | null>(null)

  // 편집 상태
  const [displayName, setDisplayName] = useState('')
  const [customInitial, setCustomInitial] = useState('')
  const [selectedColor, setSelectedColor] = useState<{ bg: string; text: string } | null>(null)

  useEffect(() => {
    if (!authUser) return
    const load = async () => {
      // getAllProfiles로 WRITER_COLORS도 초기화
      await getAllProfiles()
      const p = await getMyProfile(authUser.id)
      if (p) {
        setUserProfile(p)
        setDisplayName(p.displayName)
        setCustomInitial(p.customInitial || '')
        setSelectedColor(p.customColor || null)
      }
      setIsLoading(false)
    }
    load()
  }, [authUser?.id])

  if (isLoading || !authUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-handwriting text-xl text-ink-700/40">불러오는 중...</p>
      </div>
    )
  }

  if (!userProfile) return null

  // 기본 색상 (가입 순서 기반으로 WRITER_COLORS에서)
  const defaultColors = WRITER_COLORS[authUser.id]

  // 미리보기에 표시할 글자
  const previewInitial = customInitial || displayName.charAt(0) || '?'

  // 미리보기 색상
  const useDefaultColor = !selectedColor

  const handleSave = async () => {
    if (!authUser) return
    setIsSaving(true)
    try {
      await updateProfile(authUser.id, {
        displayName: displayName.trim() || userProfile.displayName,
        customInitial: customInitial.trim() || undefined,
        customColor: selectedColor || null,
      })
      router.push('/profile')
    } catch (err) {
      console.error('프로필 저장 실패:', err)
      alert('저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 backdrop-blur-sm bg-paper-100/80 border-b border-paper-200">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="text-ink-800/60 hover:text-ink-800 text-xl transition"
            >
              ←
            </button>
            <h1 className="font-handwriting text-2xl text-ink-800 font-bold">
              프로필 편집
            </h1>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="font-handwriting text-base text-amber-700 hover:text-amber-900 font-bold transition disabled:opacity-40"
          >
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6 pb-24">
        {/* 미리보기 */}
        <div className="flex flex-col items-center mb-8">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold shadow-md ring-3 ring-white mb-3 transition-all ${useDefaultColor ? `${defaultColors?.bg || 'bg-amber-100'} ${defaultColors?.text || 'text-amber-800'}` : ''}`}
            style={!useDefaultColor ? { backgroundColor: selectedColor?.bg, color: selectedColor?.text } : undefined}
          >
            {previewInitial}
          </div>
          <p className="text-xs text-ink-700/40">미리보기</p>
        </div>

        {/* 이름 변경 */}
        <section className="mb-6">
          <label className="font-handwriting text-base text-ink-700/70 block mb-2">
            이름
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="이름을 입력하세요"
            maxLength={10}
            className="w-full px-4 py-3 rounded-xl border border-paper-300 bg-white text-ink-800 font-handwriting text-lg focus:outline-none focus:ring-2 focus:ring-amber-300 transition"
          />
        </section>

        {/* 표시 글자 변경 */}
        <section className="mb-6">
          <label className="font-handwriting text-base text-ink-700/70 block mb-2">
            표시 글자
          </label>
          <p className="text-xs text-ink-700/40 mb-2">
            아바타에 보여질 글자예요. 비워두면 이름에서 자동으로 가져와요.
          </p>
          <input
            type="text"
            value={customInitial}
            onChange={(e) => setCustomInitial(e.target.value.slice(0, 1))}
            placeholder={getInitial(authUser.id)}
            maxLength={1}
            className="w-20 px-4 py-3 rounded-xl border border-paper-300 bg-white text-ink-800 font-handwriting text-2xl text-center focus:outline-none focus:ring-2 focus:ring-amber-300 transition"
          />
        </section>

        {/* 아바타 색상 변경 */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <label className="font-handwriting text-base text-ink-700/70">
              아바타 색상
            </label>
            {selectedColor && (
              <button
                onClick={() => setSelectedColor(null)}
                className="text-xs text-ink-700/40 hover:text-ink-700/70 transition"
              >
                기본 색상으로
              </button>
            )}
          </div>
          <p className="text-xs text-ink-700/40 mb-3">원하는 색상을 골라보세요.</p>
          <div className="grid grid-cols-5 gap-3">
            {COLOR_PALETTE.map((color) => {
              const isSelected =
                selectedColor?.bg === color.bg && selectedColor?.text === color.text
              return (
                <button
                  key={color.label}
                  onClick={() => setSelectedColor({ bg: color.bg, text: color.text })}
                  className={`aspect-square rounded-xl flex items-center justify-center text-lg font-bold transition-all ${
                    isSelected
                      ? 'ring-3 ring-ink-800 scale-110'
                      : 'ring-1 ring-paper-300 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.bg, color: color.text }}
                  title={color.label}
                >
                  {isSelected ? '✓' : previewInitial}
                </button>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}
