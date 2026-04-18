'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// 구글 로그인 시작 — 구글 로그인 페이지로 이동시킴
export async function signInWithGoogle() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) throw error
  if (data.url) redirect(data.url)
}

// 로그아웃
export async function signOut() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  redirect('/login')
}
