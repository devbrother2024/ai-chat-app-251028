import { NextResponse } from 'next/server'
import { sessionStore } from '@/lib/mcp-session-store'

// GET: 세션의 연결된 서버 목록 조회
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const sessionId = searchParams.get('sessionId')

        if (!sessionId) {
            return NextResponse.json(
                { error: 'Session ID is required' },
                { status: 400 }
            )
        }

        const session = sessionStore.getSession(sessionId)
        
        if (!session) {
            // 세션이 없으면 빈 배열 반환
            return NextResponse.json({ connectedServers: [] })
        }

        // 활동 시간 갱신
        sessionStore.updateActivity(sessionId)

        // 연결된 서버 목록 반환
        const connectedServers = Array.from(session.clients.entries()).map(([serverId, instance]) => ({
            serverId,
            status: instance.status,
            connectedAt: instance.connectedAt,
            error: instance.error,
        }))

        return NextResponse.json({ connectedServers })
    } catch (error) {
        console.error('Get session error:', error)
        return NextResponse.json(
            {
                error: 'Failed to get session',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

