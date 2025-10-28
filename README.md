# AI Chat Application

Google Gemini API를 사용한 간단한 AI 채팅 애플리케이션입니다. 스트리밍 방식으로 실시간 응답을 제공하며, 대화 내역은 브라우저의 localStorage에 저장됩니다.

## 주요 기능

- ✅ 텍스트 입력 및 전송
- ✅ 스트리밍 방식의 실시간 응답 표시
- ✅ Google Gemini SDK 연동 (`gemini-2.0-flash-001` 모델)
- ✅ 채팅 내역 localStorage 저장/복원
- ✅ ChatGPT 스타일 UI (왼쪽 정렬, 전체 너비)
- ✅ 대화 초기화 기능
- ✅ 반응형 디자인
- ✅ **마크다운 렌더링** (제목, 리스트, 테이블, 링크 등)
- ✅ **코드 구문 강조** (Highlight.js)
- ✅ **코드 블록 복사 버튼**
- ✅ **스트리밍 중 실시간 마크다운 파싱**

## 기술 스택

- **Framework**: Next.js 15 (App Router)
- **UI**: Tailwind CSS, shadcn/ui
- **Icons**: Lucide React
- **LLM**: Google Gemini API (`@google/genai`)
- **Markdown**: react-markdown, remark-gfm, rehype-highlight
- **Language**: TypeScript

## 시작하기

### 1. 환경 설정

먼저 의존성을 설치합니다:

```bash
pnpm install
```

### 2. API 키 설정

`.env.example` 파일을 `.env.local`로 복사하고 Google Gemini API 키를 입력합니다:

```bash
cp .env.example .env.local
```

`.env.local` 파일을 열고 API 키를 입력합니다:

```env
GEMINI_API_KEY=your_actual_api_key_here
```

> API 키는 [Google AI Studio](https://ai.google.dev/)에서 발급받을 수 있습니다.

### 3. 개발 서버 실행

```bash
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인합니다.

## 프로젝트 구조

```
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts          # Gemini API 스트리밍 엔드포인트
│   ├── components/
│   │   ├── chat-history.tsx      # 채팅 히스토리 표시
│   │   ├── chat-input.tsx        # 메시지 입력창
│   │   ├── chat-message.tsx      # 개별 메시지 컴포넌트
│   │   ├── code-block.tsx        # 코드 블록 (복사 버튼 포함)
│   │   └── markdown-renderer.tsx # 마크다운 렌더러
│   ├── globals.css               # 전역 스타일 (마크다운 스타일 포함)
│   ├── layout.tsx
│   └── page.tsx                  # 메인 채팅 페이지
├── lib/
│   ├── chat-storage.ts           # localStorage 유틸리티
│   └── types.ts                  # TypeScript 타입 정의
└── .env.example                  # 환경 변수 템플릿
```

## 주요 컴포넌트

### API Route (`app/api/chat/route.ts`)

- Gemini API와 통신하는 서버사이드 엔드포인트
- 스트리밍 응답을 위한 ReadableStream 반환
- 에러 핸들링 (401/403/429/5xx)

### Chat Components

- **ChatHistory**: 메시지 리스트 렌더링 및 자동 스크롤
- **ChatInput**: 텍스트 입력, Enter 전송, Shift+Enter 줄바꿈
- **ChatMessage**: 유저/AI 메시지 버블 UI
- **MarkdownRenderer**: AI 응답을 마크다운으로 렌더링
- **CodeBlock**: 코드 블록 표시 및 복사 기능

### Storage (`lib/chat-storage.ts`)

- localStorage 기반 채팅 히스토리 관리
- 브라우저 환경 체크 포함

## 사용 방법

1. 입력창에 메시지를 입력합니다
2. Enter 키를 눌러 전송합니다 (Shift+Enter로 줄바꿈 가능)
3. AI의 응답이 스트리밍 방식으로 실시간 표시됩니다
4. 대화 내역은 자동으로 저장되며, 페이지를 새로고침해도 유지됩니다
5. 우측 상단의 "대화 초기화" 버튼으로 모든 대화를 삭제할 수 있습니다

### 마크다운 지원

AI 응답은 다음과 같은 마크다운 문법을 지원합니다:

- **제목** (`# H1`, `## H2`, `### H3` 등)
- **강조** (`**굵게**`, `*기울임*`)
- **코드 블록** (``` 로 감싸기, 언어 지정 가능)
- **인라인 코드** (`` `code` ``)
- **리스트** (순서 있는/없는 리스트)
- **테이블**
- **링크** (새 탭에서 열림)
- **인용구** (`>`)
- **수평선** (`---`)

코드 블록에는 자동으로 구문 강조가 적용되며, 우측 상단의 "복사" 버튼을 클릭하여 코드를 클립보드에 복사할 수 있습니다.

## 빌드 및 배포

### 프로덕션 빌드

```bash
pnpm build
```

### 프로덕션 서버 실행

```bash
pnpm start
```

### Vercel 배포

이 프로젝트는 Vercel에 최적화되어 있습니다:

1. GitHub 리포지토리에 푸시
2. Vercel에서 프로젝트 가져오기
3. 환경 변수 `GEMINI_API_KEY` 설정
4. 배포

## 보안 주의사항

- ⚠️ API 키는 절대 클라이언트에 노출되지 않습니다 (서버 사이드에서만 사용)
- ⚠️ localStorage는 공용 PC에서 사용 시 주의가 필요합니다
- ⚠️ `.env.local` 파일은 Git에 커밋되지 않도록 `.gitignore`에 포함되어 있습니다

## 라이선스

MIT
