'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DiaryBook from '@/components/ui/DiaryBook'
import { useUser } from '@/features/auth/useUser'
import { getSortedDiaries } from '@/lib/supabase/diaryService'
import { groupDiariesByBook, type DiaryBook as DiaryBookType } from '@/features/diary/seasonUtils'

export default function ArchivePage() {
  const router = useRouter()
  const { user } = useUser()
  const [books, setBooks] = useState<DiaryBookType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setLoading(true)
      const diaries = await getSortedDiaries(user.id)
      setBooks(groupDiariesByBook(diaries))
      setLoading(false)
    }
    load()
  }, [user?.id])

  const handleMenuAction = (action: 'customize' | 'pdf') => {
    if (action === 'customize') {
      alert('표지 꾸미기 기능은 준비 중입니다 🎨')
    } else {
      alert('PDF 다운로드 기능은 준비 중입니다 📄')
    }
  }

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
            일기장 보관함
          </h1>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-lg mx-auto px-5 py-6 pb-24">
        {loading ? (
          <div className="text-center py-20">
            <p className="font-handwriting text-xl text-ink-700/40">불러오는 중...</p>
          </div>
        ) : books.length > 0 ? (
          <>
            <p className="font-handwriting text-lg text-ink-700/50 mb-5">
              {books.length}권의 일기장
            </p>
            <div className="grid grid-cols-2 gap-4">
              {books.map((book) => (
                <DiaryBook
                  key={book.bookId}
                  book={book}
                  onClick={() => router.push(`/archive/${book.bookId}`)}
                  onMenuAction={handleMenuAction}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <p className="font-handwriting text-2xl text-ink-700/40 mb-2">
              아직 보관된 일기장이 없어요
            </p>
            <p className="text-sm text-ink-700/30">
              일기를 쓰면 계절별로 자동으로 묶여요
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
