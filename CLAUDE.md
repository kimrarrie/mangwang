@AGENTS.md

# mangwang

3명이 돌아가며 일기를 작성하고, 완성된 일기를 책 형태로 공유하는 교환일기 웹앱

---

## 기술 스택

| 기술 | 버전 | 역할 |
|------|------|------|
| Next.js | 16.2.3 | 웹앱 프레임워크 (React 기반, 페이지 라우팅 포함) |
| React | 19.2.4 | UI 컴포넌트 라이브러리 |
| TypeScript | ^5 | 타입 안전성을 위한 JavaScript 확장 |
| Tailwind CSS | ^4 | 클래스 기반 CSS 스타일링 도구 |
| Supabase | (설치 예정) | 백엔드: DB + 구글 로그인 + 실시간 알림 |
| Fabric.js | (설치 예정) | 캔버스 기반 그림 그리기 라이브러리 |
| jsPDF | (설치 예정) | 완성된 일기를 PDF로 내보내기 |

---

## 폴더 구조

```
src/
├── app/                      # Next.js App Router — 각 폴더가 URL 경로가 됨
│   ├── (auth)/               # 로그인/회원가입 페이지 (/login)
│   ├── diary/                # 일기 세션 목록 및 상세 페이지 (/diary, /diary/[id])
│   ├── editor/               # 일기 작성 에디터 페이지 (/editor/[sessionId])
│   └── api/                  # 서버 API 라우트 (필요 시)
│
├── features/                 # 기능별 로직 + 컴포넌트 모음
│   ├── auth/                 # 구글 로그인, 로그아웃, 사용자 상태 관리
│   ├── diary/                # 세션 생성, 작성권 넘기기, 완성 처리
│   ├── editor/               # 텍스트 입력 + 그림 그리기 에디터
│   └── notifications/        # 실시간 알림 (Supabase Realtime 기반)
│
├── lib/
│   └── supabase/             # Supabase 클라이언트 초기화 및 설정
│
└── components/               # 여러 기능에서 공통으로 쓰는 UI 컴포넌트
    ├── ui/                   # 버튼, 카드, 모달 등 기본 UI
    └── layout/               # 헤더, 네비게이션 등 레이아웃
```

---

## 개발 명령어

```bash
npm run dev       # 개발 서버 시작 (http://localhost:3000)
npm run build     # 배포용 빌드
npm run lint      # 코드 스타일 검사
```

---

## 환경변수 (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> .env.local 파일은 절대 git에 올리지 않는다 (이미 .gitignore에 포함됨)

---

## 핵심 기능 흐름

1. 사용자 A가 세션을 생성하고 일기 작성 시작
2. 작성 완료 후 B 또는 C에게 작성권 넘기기
3. 반복하여 세션 완성
4. 완성된 세션은 책 형태로 보기 + PDF 내보내기 가능
