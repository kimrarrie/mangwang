import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 구글 로그인 완료 후 Supabase가 여기로 돌아옴
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // 로그인 완료 후 메인 페이지로 이동
  return NextResponse.redirect(new URL('/', request.url))
}
