import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// 서버(Server Components, Server Actions, Route Handlers)에서 사용하는 Supabase 클라이언트
// 쿠키로 로그인 세션을 유지함
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component에서 호출 시 무시 (미들웨어가 처리함)
          }
        },
      },
    }
  )
}
