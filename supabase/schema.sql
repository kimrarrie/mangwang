-- =============================================
-- 만남의 광장 (mangwang) — Supabase 스키마
-- 기존 테이블이 있으면 지우고 다시 만들기
-- =============================================


-- 기존 테이블/트리거/함수 정리 (있으면 삭제)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists public.get_unread_count(uuid, uuid);
drop table if exists public.diary_reads;
drop table if exists public.diary_layers;
drop table if exists public.diaries;
drop table if exists public.profiles;


-- =============================================
-- 1. profiles 테이블 — 유저 프로필 정보
-- =============================================

create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  email             text not null,
  display_name      text not null default '',
  custom_initial    text,
  custom_color_bg   text,
  custom_color_text text,
  created_at        timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "프로필 읽기: 로그인 유저 전체 허용"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "프로필 수정: 본인만 가능"
  on public.profiles for update
  using (auth.uid() = id);


-- =============================================
-- 2. diaries 테이블 — 일기 한 편
-- =============================================

create table public.diaries (
  id             uuid primary key default gen_random_uuid(),
  title          text not null default '제목 없음',
  created_by     uuid not null references public.profiles(id),
  last_edited_by uuid not null references public.profiles(id),
  created_at     timestamptz default now(),
  last_edited_at timestamptz default now()
);

alter table public.diaries enable row level security;

create policy "일기 읽기: 로그인 유저 전체 허용"
  on public.diaries for select
  using (auth.role() = 'authenticated');

create policy "일기 생성: 로그인 유저 허용"
  on public.diaries for insert
  with check (auth.uid() = created_by);

create policy "일기 수정: 로그인 유저 허용"
  on public.diaries for update
  using (auth.role() = 'authenticated');


-- =============================================
-- 3. diary_layers 테이블 — 일기에 쌓인 레이어
-- =============================================

create table public.diary_layers (
  id          uuid primary key default gen_random_uuid(),
  diary_id    uuid not null references public.diaries(id) on delete cascade,
  editor_id   uuid not null references public.profiles(id),
  image_url   text not null,
  layer_order integer not null default 0,
  edited_at   timestamptz default now()
);

alter table public.diary_layers enable row level security;

create policy "레이어 읽기: 로그인 유저 전체 허용"
  on public.diary_layers for select
  using (auth.role() = 'authenticated');

create policy "레이어 생성: 본인만 가능"
  on public.diary_layers for insert
  with check (auth.uid() = editor_id);


-- =============================================
-- 4. diary_reads 테이블 — 읽음 상태 추적
-- =============================================

create table public.diary_reads (
  diary_id         uuid not null references public.diaries(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  read_layer_count integer not null default 0,
  primary key (diary_id, user_id)
);

alter table public.diary_reads enable row level security;

create policy "읽음 읽기: 본인 것만"
  on public.diary_reads for select
  using (auth.uid() = user_id);

create policy "읽음 생성: 본인만 가능"
  on public.diary_reads for insert
  with check (auth.uid() = user_id);

create policy "읽음 업데이트: 본인만 가능"
  on public.diary_reads for update
  using (auth.uid() = user_id);


-- =============================================
-- 5. 로그인 시 profiles 자동 생성 트리거
-- =============================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- =============================================
-- 6. Storage 버킷 — 레이어 이미지 저장
-- =============================================

insert into storage.buckets (id, name, public)
values ('diary-images', 'diary-images', false)
on conflict (id) do nothing;

create policy "이미지 업로드: 로그인 유저 허용"
  on storage.objects for insert
  with check (bucket_id = 'diary-images' and auth.role() = 'authenticated');

create policy "이미지 읽기: 로그인 유저 허용"
  on storage.objects for select
  using (bucket_id = 'diary-images' and auth.role() = 'authenticated');
