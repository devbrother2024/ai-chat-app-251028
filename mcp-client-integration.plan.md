<!-- 0f925409-112c-4b6c-848b-a753c9a86d4e 288ed6cf-3c37-4dd3-a8ed-9121fef74a18 -->
# MCP 서버 세션 저장소 구현 계획

## 상태: ✅ 완료

모든 구현이 완료되었습니다. MCP Client 연결이 서버 사이드 세션 저장소를 통해 유지됩니다.

## 문제 분석

현재 `mcpClientManager` 싱글톤이 Next.js 서버리스 환경에서 각 API 호출마다 초기화되어 연결 상태가 유지되지 않음.

## 해결 방안: 별도 세션 저장소

사용자별 세션 ID를 기반으로 In-memory 세션 저장소를 구현하여 MCP 연결을 격리 관리

### 핵심 아키텍처

```
Client (Browser)                  Server (API Routes)
┌─────────────────┐              ┌──────────────────────┐
│  Session ID     │─────────────→│  Session Store       │
│  (localStorage) │              │  ┌─────────────────┐ │
└─────────────────┘              │  │ Session 1       │ │
                                 │  │  - Client Map   │ │
                                 │  │  - lastActivity │ │
                                 │  └─────────────────┘ │
                                 │  ┌─────────────────┐ │
                                 │  │ Session 2       │ │
                                 │  │  - Client Map   │ │
                                 │  │  - lastActivity │ │
                                 │  └─────────────────┘ │
                                 └──────────────────────┘
```

## 구현된 파일

### 1. ✅ `lib/mcp-session-store.ts`

세션 저장소 핵심 구현:

```typescript
class MCPSessionStore {
    private sessions: Map<string, Session>
    private cleanupInterval: NodeJS.Timeout | null
    private readonly SESSION_TIMEOUT = 30 * 60 * 1000  // 30분
    
    createSession(sessionId: string): Session
    getSession(sessionId: string): Session | null
    addClient(sessionId: string, serverId: string, client: ClientInstance): void
    getClient(sessionId: string, serverId: string): ClientInstance | null
    removeClient(sessionId: string, serverId: string): Promise<void>
    updateActivity(sessionId: string): void
    deleteSession(sessionId: string): Promise<void>
    private cleanup(): Promise<void>
    private startCleanupTimer(): void
    getStats(): StatsInfo
}

export const sessionStore = new MCPSessionStore()
```

**주요 기능:**
- 세션별 MCP 클라이언트 관리
- 30분 비활성 시 자동 정리
- 전역 싱글톤 인스턴스 (HMR 대응)

### 2. ✅ `app/contexts/mcp-context.tsx`

세션 ID 관리 추가:

```typescript
interface MCPContextType {
    sessionId: string  // 추가됨
    servers: MCPServerConfig[]
    connections: Map<string, MCPConnectionState>
    // ... 기타 메서드
}

// 세션 ID 초기화 로직
useEffect(() => {
    const stored = localStorage.getItem('mcp-session-id')
    if (stored) {
        setSessionId(stored)
    } else {
        const newId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        setSessionId(newId)
        localStorage.setItem('mcp-session-id', newId)
    }
}, [])
```

### 3. ✅ API Routes 수정

모든 MCP API Routes가 세션 ID를 사용하도록 수정됨:

#### `/app/api/mcp/connect/route.ts`
- `sessionId` 파라미터 추가 및 검증
- 세션 확인/생성 로직
- 클라이언트 연결 후 세션 저장소에 추가
- STDIO, HTTP, SSE 모든 transport 지원

#### `/app/api/mcp/disconnect/route.ts`
- `sessionId` 파라미터 추가
- `sessionStore.removeClient()`로 연결 해제

#### `/app/api/mcp/tools/route.ts`
- GET: `sessionId` + `serverId`로 클라이언트 조회 및 도구 목록 반환
- POST: 세션에서 클라이언트 조회 후 도구 실행

#### `/app/api/mcp/prompts/route.ts`
- `sessionId` 파라미터 추가
- 세션에서 클라이언트 조회 후 프롬프트 목록/조회

#### `/app/api/mcp/resources/route.ts`
- `sessionId` 파라미터 추가
- 세션에서 클라이언트 조회 후 리소스 목록/읽기

### 4. ✅ 클라이언트 측 수정

#### `app/mcp-servers/page.tsx`
- `useMCP()`에서 `sessionId` 추출
- 모든 API 호출에 `sessionId` 포함:
  - `handleConnect()`: sessionId 전송
  - `handleDisconnect()`: sessionId 전송
  - `loadServerFeatures()`: URL 쿼리에 sessionId 추가

#### `app/page.tsx`
- `useMCP()`에서 `sessionId` 추출
- `handleSend()`에서 sessionId 검증 및 전송

#### `app/api/chat/route.ts`
- `RequestBody`에 `sessionId` 필드 추가
- 세션 ID 검증
- `sessionStore.getClient()`로 연결된 클라이언트 조회
- MCP 도구 목록 수집 시 세션 사용
- 도구 실행 시 세션에서 클라이언트 조회

### 5. ✅ 타임아웃 및 정리 로직

```typescript
class MCPSessionStore {
    private startCleanupTimer() {
        // 5분마다 정리 실행
        this.cleanupInterval = setInterval(() => {
            this.cleanup()
        }, 5 * 60 * 1000)
    }
    
    private async cleanup() {
        const now = Date.now()
        const toDelete: string[] = []
        
        for (const [sessionId, session] of this.sessions.entries()) {
            if (now - session.lastActivity > this.SESSION_TIMEOUT) {
                toDelete.push(sessionId)
            }
        }
        
        for (const sessionId of toDelete) {
            await this.deleteSession(sessionId)
        }
    }
}
```

## 장점

1. ✅ **사용자별 격리**: 각 사용자의 MCP 연결이 독립적으로 관리됨
2. ✅ **상태 유지**: API 호출 간 연결 상태 유지
3. ✅ **자동 정리**: 비활성 세션 자동 정리로 메모리 누수 방지
4. ✅ **확장 가능**: 향후 Redis 등 외부 저장소로 쉽게 전환 가능

## 단점 (주의사항)

1. ⚠️ **서버 재시작**: 서버 재시작 시 모든 세션 소실 (재연결 필요)
2. ⚠️ **메모리 사용**: 동시 사용자 증가 시 메모리 사용 증가
3. ⚠️ **서버리스 제약**: Vercel 등에서 함수 타임아웃 고려 필요

## 구현 결과

모든 구현이 완료되었으며 타입 체크와 린트를 통과했습니다:
- ✅ TypeScript 타입 체크: 통과
- ✅ ESLint: 3개 경고만 존재 (에러 없음)

### 구현 순서 (완료)

1. ✅ `lib/mcp-session-store.ts` 세션 저장소 클래스 생성
2. ✅ `app/contexts/mcp-context.tsx` 세션 ID 관리 추가
3. ✅ `app/api/mcp/connect/route.ts` 세션 기반 연결 처리
4. ✅ `app/api/mcp/disconnect/route.ts` 세션 기반 해제 처리
5. ✅ `app/api/mcp/tools/route.ts` 세션 ID로 클라이언트 조회
6. ✅ `app/api/mcp/prompts/route.ts` 세션 ID 처리 추가
7. ✅ `app/api/mcp/resources/route.ts` 세션 ID 처리 추가
8. ✅ `app/mcp-servers/page.tsx` 모든 API 호출에 세션 ID 추가
9. ✅ `app/page.tsx` 채팅 API 호출에 세션 ID 추가
10. ✅ `app/api/chat/route.ts` 세션 기반 MCP tool calling 통합
11. ✅ 에러 처리 개선 (세션 만료, 세션 없음 등)
12. ✅ 로깅 추가 및 테스트

## 다음 단계

애플리케이션을 실행하고 다음을 테스트할 수 있습니다:

1. MCP 서버 등록 및 연결
2. 도구, 프롬프트, 리소스 조회
3. 채팅에서 MCP 도구 자동 호출
4. 서버 재시작 후 재연결
5. 세션 타임아웃 동작 확인

