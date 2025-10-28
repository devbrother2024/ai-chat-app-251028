# MCP Client 통합 가이드

이 문서는 AI 채팅 애플리케이션에 통합된 MCP (Model Context Protocol) Client 기능에 대한 설명입니다.

## 주요 기능

### 1. MCP 서버 관리
- **서버 등록**: STDIO, SSE, HTTP 전송 방식 지원
- **서버 연결/해제**: 실시간 연결 상태 모니터링
- **설정 관리**: JSON 형식으로 가져오기/내보내기
- **보안**: localStorage 사용, 민감 정보 저장 시 경고

### 2. MCP 기능
- **Tools**: 등록된 도구 목록 조회 및 테스트 실행
- **Prompts**: 프롬프트 목록 및 상세 정보 조회
- **Resources**: 리소스 목록 조회 및 읽기

### 3. AI 채팅 통합
- **자동 도구 호출**: AI가 필요 시 MCP 도구를 자동으로 선택하고 실행
- **도구 결과 표시**: 채팅 화면에 MCP 도구 실행 결과를 구분하여 표시
- **연결 상태 표시**: 헤더에 현재 연결된 MCP 서버 수 표시

## 사용 방법

### MCP 서버 추가

1. 메인 채팅 화면 상단의 "MCP 서버" 버튼 클릭
2. "서버 추가" 버튼 클릭
3. 서버 정보 입력:
   - **이름**: 서버 식별 이름
   - **설명**: 서버에 대한 간단한 설명
   - **Transport 타입**: 
     - `HTTP`: Streamable HTTP (권장)
     - `SSE`: Server-Sent Events
     - `STDIO`: 로컬 프로세스 실행
   - 타입별 추가 정보:
     - HTTP/SSE: 서버 URL
     - STDIO: 실행 명령어, 인자, 환경 변수

### MCP 서버 연결

1. MCP 서버 목록에서 "연결" 버튼 클릭
2. 연결 성공 시 상태가 "연결됨"으로 변경
3. "상세 보기" 버튼으로 Tools, Prompts, Resources 확인

### 채팅에서 MCP 도구 사용

1. MCP 서버를 하나 이상 연결
2. 메인 채팅 화면으로 이동
3. 일반적으로 대화하면 AI가 필요 시 자동으로 MCP 도구 사용
4. 도구 실행 결과는 채팅 화면에 표시됨

## 파일 구조

```
├── app/
│   ├── api/
│   │   ├── chat/route.ts              # MCP tool calling 통합된 채팅 API
│   │   └── mcp/                       # MCP API Routes
│   │       ├── connect/route.ts       # 서버 연결
│   │       ├── disconnect/route.ts    # 서버 연결 해제
│   │       ├── tools/route.ts         # 도구 목록/실행
│   │       ├── prompts/route.ts       # 프롬프트 조회
│   │       └── resources/route.ts     # 리소스 조회/읽기
│   ├── components/
│   │   ├── mcp-server-card.tsx        # 서버 카드 컴포넌트
│   │   ├── mcp-server-form.tsx        # 서버 추가/수정 폼
│   │   ├── mcp-tool-card.tsx          # 도구 카드 컴포넌트
│   │   ├── mcp-test-panel.tsx         # 도구 테스트 패널
│   │   └── chat-message.tsx           # MCP 결과 표시 기능 추가
│   ├── contexts/
│   │   └── mcp-context.tsx            # MCP 전역 상태 관리
│   ├── mcp-servers/
│   │   └── page.tsx                   # MCP 서버 관리 페이지
│   └── page.tsx                       # 메인 채팅 페이지 (MCP 버튼 추가)
├── lib/
│   ├── types.ts                       # MCP 타입 정의
│   ├── mcp-storage.ts                 # localStorage 저장소
│   └── mcp-client-manager.ts          # MCP Client 싱글톤
```

## 보안 고려사항

- **localStorage 사용**: 모든 MCP 서버 설정은 브라우저 localStorage에 저장됩니다
- **민감 정보 경고**: 공용/공유 PC에서 민감한 정보 저장 시 경고 표시
- **STDIO 명령어 제한**: node, python, python3, npx, uvx만 허용
- **서버 사이드 실행**: 모든 MCP 연결 및 도구 실행은 서버 사이드에서만 처리

## Transport 타입별 특징

### HTTP (Streamable HTTP)
- **권장 사용**: 가장 현대적이고 안정적
- **장점**: 세션 관리, 에러 처리 우수
- **용도**: 원격 MCP 서버 연결

### SSE (Server-Sent Events)
- **레거시**: 구 버전 호환성
- **장점**: 간단한 구현
- **용도**: 오래된 MCP 서버와의 호환

### STDIO
- **로컬 전용**: 프로세스 spawn 필요
- **장점**: 로컬 도구 직접 실행 가능
- **제한**: 서버 환경에서만 실행 가능
- **보안**: 허용된 명령어만 실행

## 문제 해결

### 연결 실패
- URL이 올바른지 확인
- 서버가 실행 중인지 확인
- CORS 설정 확인 (HTTP/SSE)
- 방화벽 설정 확인

### STDIO 연결 실패
- 명령어가 허용 목록에 있는지 확인
- 경로가 올바른지 확인
- 실행 권한 확인

### 도구 실행 실패
- 서버가 연결되어 있는지 확인
- 도구 인자가 올바른지 확인
- 서버 로그 확인

## 개발 정보

### 기술 스택
- **MCP SDK**: @modelcontextprotocol/sdk v1.20.2+
- **Next.js**: 15.5.6 (App Router)
- **TypeScript**: 타입 안전성 보장
- **React Context**: 전역 상태 관리

### 주요 클래스
- `MCPClientManager`: 싱글톤 패턴으로 MCP 클라이언트 관리
- `MCPContext`: React Context로 연결 상태 공유

### API 엔드포인트
- `POST /api/mcp/connect`: 서버 연결
- `POST /api/mcp/disconnect`: 연결 해제
- `GET /api/mcp/tools`: 도구 목록
- `POST /api/mcp/tools`: 도구 실행
- `GET /api/mcp/prompts`: 프롬프트 조회
- `GET /api/mcp/resources`: 리소스 목록
- `POST /api/mcp/resources`: 리소스 읽기

## 향후 계획

- [ ] 데이터베이스 기반 저장소 마이그레이션
- [ ] 서버별 인증 기능 추가
- [ ] 도구 실행 히스토리 관리
- [ ] 프롬프트 즐겨찾기 기능
- [ ] 리소스 캐싱
- [ ] WebSocket 기반 실시간 통신

