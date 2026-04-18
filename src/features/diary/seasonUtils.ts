import { Diary } from './types'

// ===== 계절 타입 =====

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export type DiaryBook = {
  bookId: string        // "2026-spring" 형태
  year: number          // 연도
  season: Season        // 계절
  label: string         // "2026년 봄" 형태
  diaries: Diary[]      // 해당 계절에 속하는 일기들 (오래된 순)
}

// ===== 계절 한글 라벨 =====

const SEASON_LABELS: Record<Season, string> = {
  spring: '봄',
  summer: '여름',
  autumn: '가을',
  winter: '겨울',
}

// 계절별 정렬 순서 (같은 연도 내에서 비교할 때)
const SEASON_ORDER: Record<Season, number> = {
  spring: 1,
  summer: 2,
  autumn: 3,
  winter: 4,
}

// ===== 날짜 → 계절 변환 =====
// 3~5월: 봄, 6~8월: 여름, 9~11월: 가을, 12~2월: 겨울
// 겨울 연도 규칙: 12월 → 해당 연도, 1~2월 → year - 1

export function getSeasonFromDate(dateStr: string): { year: number; season: Season } {
  const date = new Date(dateStr)
  const month = date.getMonth() + 1 // 1~12
  const year = date.getFullYear()

  if (month >= 3 && month <= 5) return { year, season: 'spring' }
  if (month >= 6 && month <= 8) return { year, season: 'summer' }
  if (month >= 9 && month <= 11) return { year, season: 'autumn' }
  // 겨울: 12월은 해당 연도, 1~2월은 전년도
  if (month === 12) return { year, season: 'winter' }
  return { year: year - 1, season: 'winter' } // 1월, 2월
}

// ===== 계절 라벨 생성 =====

export function getSeasonLabel(year: number, season: Season): string {
  return `${year}년 ${SEASON_LABELS[season]}`
}

// ===== bookId 생성 =====

function makeBookId(year: number, season: Season): string {
  return `${year}-${season}`
}

// ===== 일기를 계절별로 묶기 =====

export function groupDiariesByBook(diaries: Diary[]): DiaryBook[] {
  const bookMap = new Map<string, DiaryBook>()

  for (const diary of diaries) {
    const { year, season } = getSeasonFromDate(diary.createdAt)
    const bookId = makeBookId(year, season)

    if (!bookMap.has(bookId)) {
      bookMap.set(bookId, {
        bookId,
        year,
        season,
        label: getSeasonLabel(year, season),
        diaries: [],
      })
    }

    bookMap.get(bookId)!.diaries.push(diary)
  }

  // 각 책 내 일기: 오래된 순 정렬 (슬라이드쇼에서 오래된 것부터 보여줌)
  for (const book of bookMap.values()) {
    book.diaries.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
  }

  // 책 목록: 최신 계절이 먼저 (연도 내림차순 → 같은 연도면 계절 내림차순)
  return Array.from(bookMap.values()).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year
    return SEASON_ORDER[b.season] - SEASON_ORDER[a.season]
  })
}

// ===== bookId로 특정 책 찾기 =====

export function getBookById(bookId: string, diaries: Diary[]): DiaryBook | undefined {
  const books = groupDiariesByBook(diaries)
  return books.find((b) => b.bookId === bookId)
}
