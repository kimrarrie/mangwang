'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import DiaryBook from '@/components/ui/DiaryBook'
import { useUser } from '@/features/auth/useUser'
import { getSortedDiaries, deleteAllData } from '@/lib/supabase/diaryService'
import { groupDiariesByBook, type DiaryBook as DiaryBookType } from '@/features/diary/seasonUtils'
import { exportAllToPDF, exportSelectedToVideo, type ExportProgress } from '@/features/diary/exportUtils'
import type { Diary } from '@/features/diary/types'

type ExportState = 'idle' | 'running' | 'done' | 'error'
type SortOrder = 'asc' | 'desc'  // asc = 오래된순, desc = 최신순

export default function ArchivePage() {
  const router = useRouter()
  const { user } = useUser()
  const [books, setBooks] = useState<DiaryBookType[]>([])
  const [allDiaries, setAllDiaries] = useState<Diary[]>([])
  const [loading, setLoading] = useState(true)

  // 선택 모드
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc') // 기본: 오래된순

  // 내보내기 상태
  const [pdfState, setPdfState] = useState<ExportState>('idle')
  const [videoState, setVideoState] = useState<ExportState>('idle')
  const [progress, setProgress] = useState<ExportProgress | null>(null)

  // 삭제 확인 모달
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setLoading(true)
      const diaries = await getSortedDiaries(user.id) // DB에서 최신순으로 옴
      setAllDiaries(diaries)
      setBooks(groupDiariesByBook(diaries))
      setLoading(false)
    }
    load()
  }, [user?.id])

  // 선택 모드에서 보여줄 정렬된 목록
  const sortedDiaries = useMemo(() => {
    const arr = [...allDiaries]
    return sortOrder === 'asc' ? arr.reverse() : arr // asc = 오래된순(역순)
  }, [allDiaries, sortOrder])

  const enterSelectMode = () => {
    setSelectMode(true)
    setSelected(new Set())
    setSortOrder('asc')
  }

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelected(new Set())
    setProgress(null)
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === sortedDiaries.length) setSelected(new Set())
    else setSelected(new Set(sortedDiaries.map((d) => d.id)))
  }

  const handleExportPDF = async () => {
    if (pdfState === 'running' || allDiaries.length === 0) return
    setPdfState('running')
    setProgress(null)
    try {
      await exportAllToPDF(allDiaries, setProgress)
      setPdfState('done')
    } catch (err) {
      console.error('PDF 내보내기 실패:', err)
      setPdfState('error')
    }
    setTimeout(() => setPdfState('idle'), 3000)
  }

  const handleExportVideo = async () => {
    if (videoState === 'running' || selected.size === 0) return
    // 선택된 일기를 sortedDiaries 순서 기준으로 정렬
    const ordered = sortedDiaries.filter((d) => selected.has(d.id))
    setVideoState('running')
    setProgress(null)
    try {
      await exportSelectedToVideo(ordered, setProgress)
      setVideoState('done')
    } catch (err) {
      console.error('영상 내보내기 실패:', err)
      setVideoState('error')
    }
    setTimeout(() => { setVideoState('idle'); setProgress(null) }, 3000)
  }

  const handleDeleteAll = async () => {
    if (deleteConfirmText !== '전체삭제') return
    setIsDeleting(true)
    try {
      await deleteAllData()
      setShowDeleteModal(false)
      setAllDiaries([])
      setBooks([])
      alert('모든 데이터가 삭제되었어요.')
    } catch (err) {
      console.error('삭제 실패:', err)
      alert('삭제에 실패했어요. 다시 시도해주세요.')
    } finally {
      setIsDeleting(false)
      setDeleteConfirmText('')
    }
  }

  const isExporting = pdfState === 'running' || videoState === 'running'

  return (
    <div className="min-h-screen">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 backdrop-blur-sm bg-paper-100/80 border-b border-paper-200">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center gap-3">
          <button
            onClick={() => selectMode ? exitSelectMode() : router.push('/')}
            className="text-ink-800/60 hover:text-ink-800 text-xl transition"
          >
            {selectMode ? '✕' : '←'}
          </button>
          <h1 className="font-handwriting text-2xl text-ink-800 font-bold flex-1">
            {selectMode ? `${selected.size}편 선택됨` : '일기장 보관함'}
          </h1>
          {/* 선택 모드에서 정렬 토글 */}
          {selectMode && (
            <button
              onClick={() => setSortOrder((v) => v === 'asc' ? 'desc' : 'asc')}
              className="text-xs text-ink-700/50 hover:text-ink-800 transition px-2 py-1 rounded-lg hover:bg-paper-200"
            >
              {sortOrder === 'asc' ? '오래된순 ↑' : '최신순 ↓'}
            </button>
          )}
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-lg mx-auto px-5 py-6 pb-52">
        {loading ? (
          <div className="text-center py-20">
            <p className="font-handwriting text-xl text-ink-700/40">불러오는 중...</p>
          </div>

        ) : selectMode ? (
          /* ===== 선택 모드 — 일기 리스트 ===== */
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-ink-700/40">영상에 담을 일기를 골라요 (오래된 순서부터 시작돼요)</p>
              <button onClick={toggleAll} className="text-xs text-ink-700/60 hover:text-ink-800 transition shrink-0 ml-3">
                {selected.size === sortedDiaries.length ? '전체 해제' : '전체 선택'}
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {sortedDiaries.map((diary) => {
                const isSelected = selected.has(diary.id)
                const lastLayer = diary.layers[diary.layers.length - 1]
                const thumbSrc = lastLayer?.thumbDataUrl ?? lastLayer?.imageDataUrl
                const date = new Date(diary.createdAt)
                const dateStr = `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`

                return (
                  <button
                    key={diary.id}
                    onClick={() => toggleSelect(diary.id)}
                    className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition text-left ${
                      isSelected
                        ? 'border-ink-800 bg-ink-800/5'
                        : 'border-paper-200 bg-paper-50 hover:border-paper-300'
                    }`}
                  >
                    {/* 체크박스 */}
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                      isSelected ? 'bg-ink-800 border-ink-800' : 'border-paper-300'
                    }`}>
                      {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                    </div>

                    {/* 썸네일 */}
                    {thumbSrc ? (
                      <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-paper-100">
                        <img src={thumbSrc} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-paper-100 shrink-0" />
                    )}

                    {/* 정보 */}
                    <div className="flex-1 min-w-0">
                      <p className="font-handwriting text-base text-ink-800 font-bold truncate">{diary.title}</p>
                      <p className="text-xs text-ink-700/40 mt-0.5">{dateStr} · 레이어 {diary.layers.length}개</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </>

        ) : books.length > 0 ? (
          /* ===== 기본 모드 — 북 그리드 ===== */
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
                  onMenuAction={() => {}}
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

        {/* ===== 내보내기 + 초기화 섹션 (기본 모드에서만) ===== */}
        {!loading && !selectMode && user && (
          <div className="mt-10 border-t border-paper-200 pt-8">
            <p className="font-handwriting text-lg text-ink-800 font-bold mb-1">전체 내보내기</p>
            <p className="text-xs text-ink-700/40 mb-5">
              모든 일기 {allDiaries.length}편을 한 번에 저장해요
            </p>

            {/* PDF 진행 상태 */}
            {pdfState === 'running' && progress && (
              <div className="mb-4 px-4 py-3 bg-paper-100 rounded-xl">
                <p className="text-xs text-ink-700/60 mb-1">
                  {progress.diaryTitle} — 레이어 {progress.layerIndex}/{progress.layerTotal}
                </p>
                <div className="w-full bg-paper-200 rounded-full h-1.5">
                  <div
                    className="bg-ink-700 h-1.5 rounded-full transition-all"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {/* PDF 버튼 */}
              <button
                onClick={handleExportPDF}
                disabled={isExporting || allDiaries.length === 0}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-paper-100 hover:bg-paper-200 transition disabled:opacity-40 disabled:cursor-not-allowed text-left"
              >
                <span className="text-2xl">📄</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-ink-800">PDF로 저장</p>
                  <p className="text-xs text-ink-700/50">모든 일기를 PDF 한 파일로 다운로드</p>
                </div>
                <span className="text-sm text-ink-700/40">
                  {pdfState === 'running' ? '...' : pdfState === 'done' ? '✓' : pdfState === 'error' ? '✗' : '→'}
                </span>
              </button>

              {/* 영상 버튼 — 클릭하면 선택 모드 진입 */}
              <button
                onClick={enterSelectMode}
                disabled={isExporting || allDiaries.length === 0}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-paper-100 hover:bg-paper-200 transition disabled:opacity-40 disabled:cursor-not-allowed text-left"
              >
                <span className="text-2xl">🎬</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-ink-800">영상으로 저장</p>
                  <p className="text-xs text-ink-700/50">담을 일기를 골라 레이어 타임랩스 영상으로 저장</p>
                </div>
                <span className="text-sm text-ink-700/40">→</span>
              </button>
            </div>

            {/* 데이터 삭제 — 관리자 계정에서만 표시 */}
            {user.email === 'kim.rarrie@gmail.com' && (
              <div className="mt-8 border-t border-paper-200 pt-6">
                <p className="font-handwriting text-base text-red-400 font-bold mb-1">위험 구역</p>
                <p className="text-xs text-ink-700/40 mb-4">
                  내보내기를 먼저 완료한 뒤 진행하세요. 삭제된 데이터는 복구할 수 없어요.
                </p>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-red-200 hover:bg-red-50 transition text-left w-full"
                >
                  <span className="text-2xl">🗑️</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-red-500">전체 데이터 삭제</p>
                    <p className="text-xs text-ink-700/40">모든 일기와 이미지를 완전히 지워요</p>
                  </div>
                  <span className="text-sm text-red-300">→</span>
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ===== 선택 모드 하단 고정 바 ===== */}
      {selectMode && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-paper-50/95 backdrop-blur-sm border-t border-paper-200 px-5 py-4">
          <div className="max-w-lg mx-auto">
            {/* 진행 상태 */}
            {videoState === 'running' && progress && (
              <div className="mb-3 px-3 py-2 bg-paper-100 rounded-xl">
                <p className="text-xs text-ink-700/60 mb-1 truncate">
                  {progress.diaryTitle} — 레이어 {progress.layerIndex}/{progress.layerTotal}
                </p>
                <div className="w-full bg-paper-200 rounded-full h-1">
                  <div
                    className="bg-ink-700 h-1 rounded-full transition-all"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleExportVideo}
              disabled={selected.size === 0 || videoState === 'running'}
              className="w-full py-4 rounded-2xl font-handwriting text-lg font-bold transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                backgroundColor: '#C47C10',
                color: '#fefcf8',
                boxShadow: selected.size > 0
                  ? '0 4px 20px rgba(196,124,16,0.45), 0 2px 6px rgba(0,0,0,0.15)'
                  : 'none',
              }}
            >
              {videoState === 'running'
                ? '영상 만드는 중...'
                : videoState === 'done'
                ? '✓ 다운로드 완료!'
                : videoState === 'error'
                ? '오류 발생 — 다시 시도'
                : selected.size > 0
                ? `🎬 ${selected.size}편으로 영상 만들기`
                : '일기를 선택해주세요'}
            </button>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-6">
          <div className="bg-paper-50 rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden">
            <div className="px-5 pt-5 pb-4">
              <p className="font-handwriting text-xl text-red-500 font-bold text-center mb-2">
                정말 전부 삭제할까요?
              </p>
              <p className="text-xs text-ink-700/50 text-center leading-relaxed mb-5">
                모든 일기, 레이어, 이미지가 영구 삭제돼요.
                <br />
                <span className="font-bold text-ink-800/70">되돌릴 수 없어요.</span>
                <br /><br />
                확인을 위해 아래에{' '}
                <span className="font-bold text-red-400">전체삭제</span>를 입력해주세요.
              </p>
              <input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="전체삭제"
                className="w-full px-4 py-2.5 rounded-xl bg-paper-100 border border-paper-200 text-center font-bold text-red-500 outline-none focus:border-red-300 transition"
              />
            </div>
            <div className="flex border-t border-paper-200">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText('') }}
                disabled={isDeleting}
                className="flex-1 py-3.5 text-sm text-ink-700/60 hover:bg-paper-100 transition disabled:opacity-40"
              >
                취소
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={isDeleting || deleteConfirmText !== '전체삭제'}
                className="flex-1 py-3.5 text-sm font-bold text-red-500 hover:bg-red-50 transition border-l border-paper-200 disabled:opacity-30"
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
