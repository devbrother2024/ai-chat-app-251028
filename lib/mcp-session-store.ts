import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import type { MCPConnectionStatus, MCPServerConfig } from './types'

export interface ClientInstance {
    client: Client
    status: MCPConnectionStatus
    config: MCPServerConfig
    error?: string
    connectedAt?: number
}

export interface Session {
    id: string
    clients: Map<string, ClientInstance>
    lastActivity: number
    createdAt: number
}

/**
 * MCP 세션 저장소
 * 사용자별로 MCP 클라이언트 연결을 격리하여 관리합니다.
 */
class MCPSessionStore {
    private sessions: Map<string, Session>
    private cleanupInterval: NodeJS.Timeout | null
    private readonly SESSION_TIMEOUT = 30 * 60 * 1000 // 30분

    constructor() {
        this.sessions = new Map()
        this.cleanupInterval = null
        this.startCleanupTimer()
    }

    /**
     * 새 세션 생성
     */
    createSession(sessionId: string): Session {
        if (this.sessions.has(sessionId)) {
            console.log(`Session ${sessionId} already exists`)
            return this.sessions.get(sessionId)!
        }

        const session: Session = {
            id: sessionId,
            clients: new Map(),
            lastActivity: Date.now(),
            createdAt: Date.now(),
        }

        this.sessions.set(sessionId, session)
        console.log(`Created new session: ${sessionId}`)
        return session
    }

    /**
     * 세션 조회
     */
    getSession(sessionId: string): Session | null {
        return this.sessions.get(sessionId) || null
    }

    /**
     * 세션에 클라이언트 추가
     */
    addClient(sessionId: string, serverId: string, clientInstance: ClientInstance): void {
        let session = this.sessions.get(sessionId)
        
        if (!session) {
            session = this.createSession(sessionId)
        }

        session.clients.set(serverId, clientInstance)
        session.lastActivity = Date.now()
        
        console.log(`Added client ${serverId} to session ${sessionId}`)
    }

    /**
     * 세션에서 클라이언트 조회
     */
    getClient(sessionId: string, serverId: string): ClientInstance | null {
        const session = this.sessions.get(sessionId)
        if (!session) {
            console.log(`Session ${sessionId} not found`)
            return null
        }

        const client = session.clients.get(serverId)
        if (!client) {
            console.log(`Client ${serverId} not found in session ${sessionId}`)
            return null
        }

        // 활동 시간 갱신
        session.lastActivity = Date.now()
        return client
    }

    /**
     * 세션에서 클라이언트 제거
     */
    async removeClient(sessionId: string, serverId: string): Promise<void> {
        const session = this.sessions.get(sessionId)
        if (!session) {
            return
        }

        const clientInstance = session.clients.get(serverId)
        if (clientInstance) {
            try {
                await clientInstance.client.close()
                console.log(`Closed client ${serverId} in session ${sessionId}`)
            } catch (error) {
                console.error(`Error closing client ${serverId}:`, error)
            }
            session.clients.delete(serverId)
        }

        session.lastActivity = Date.now()
    }

    /**
     * 세션 활동 시간 갱신
     */
    updateActivity(sessionId: string): void {
        const session = this.sessions.get(sessionId)
        if (session) {
            session.lastActivity = Date.now()
        }
    }

    /**
     * 세션 삭제 (모든 연결 해제 포함)
     */
    async deleteSession(sessionId: string): Promise<void> {
        const session = this.sessions.get(sessionId)
        if (!session) {
            return
        }

        console.log(`Deleting session ${sessionId} with ${session.clients.size} clients`)

        // 모든 클라이언트 연결 해제
        const closePromises: Promise<void>[] = []
        for (const [serverId, instance] of session.clients.entries()) {
            closePromises.push(
                instance.client.close().catch(error => {
                    console.error(`Error closing client ${serverId}:`, error)
                })
            )
        }

        await Promise.all(closePromises)
        this.sessions.delete(sessionId)
        console.log(`Session ${sessionId} deleted`)
    }

    /**
     * 비활성 세션 자동 정리
     */
    private async cleanup(): Promise<void> {
        const now = Date.now()
        const toDelete: string[] = []

        for (const [sessionId, session] of this.sessions.entries()) {
            if (now - session.lastActivity > this.SESSION_TIMEOUT) {
                toDelete.push(sessionId)
            }
        }

        if (toDelete.length > 0) {
            console.log(`Cleaning up ${toDelete.length} inactive sessions`)
            for (const sessionId of toDelete) {
                await this.deleteSession(sessionId)
            }
        }
    }

    /**
     * 정리 타이머 시작
     */
    private startCleanupTimer(): void {
        // 5분마다 정리 실행
        this.cleanupInterval = setInterval(() => {
            this.cleanup().catch(error => {
                console.error('Error during cleanup:', error)
            })
        }, 5 * 60 * 1000)

        // Node.js 프로세스 종료 시 타이머 정리
        if (typeof process !== 'undefined') {
            process.on('beforeExit', () => {
                if (this.cleanupInterval) {
                    clearInterval(this.cleanupInterval)
                }
            })
        }
    }

    /**
     * 통계 정보 조회 (디버깅용)
     */
    getStats(): {
        totalSessions: number
        totalClients: number
        sessions: Array<{
            id: string
            clientCount: number
            lastActivity: number
            age: number
        }>
    } {
        const now = Date.now()
        const sessions = Array.from(this.sessions.values()).map(session => ({
            id: session.id,
            clientCount: session.clients.size,
            lastActivity: session.lastActivity,
            age: now - session.createdAt,
        }))

        const totalClients = sessions.reduce((sum, s) => sum + s.clientCount, 0)

        return {
            totalSessions: this.sessions.size,
            totalClients,
            sessions,
        }
    }
}

// 전역 싱글톤 인스턴스
// Next.js HMR 대응을 위한 전역 캐싱
declare global {
    // eslint-disable-next-line no-var
    var mcpSessionStore: MCPSessionStore | undefined
}

if (!global.mcpSessionStore) {
    global.mcpSessionStore = new MCPSessionStore()
}

export const sessionStore = global.mcpSessionStore

