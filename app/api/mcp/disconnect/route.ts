import { NextResponse } from 'next/server'
import { sessionStore } from '@/lib/mcp-session-store'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { sessionId, serverId } = body

        if (!sessionId) {
            return NextResponse.json(
                { error: 'Session ID is required' },
                { status: 400 }
            )
        }

        if (!serverId) {
            return NextResponse.json(
                { error: 'Server ID is required' },
                { status: 400 }
            )
        }

        await sessionStore.removeClient(sessionId, serverId)
        console.log(`Disconnected server ${serverId} from session ${sessionId}`)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('MCP disconnect error:', error)
        return NextResponse.json(
            {
                error: 'Failed to disconnect from MCP server',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

