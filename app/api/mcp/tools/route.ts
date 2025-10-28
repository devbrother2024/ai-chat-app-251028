import { NextResponse } from 'next/server'
import { sessionStore } from '@/lib/mcp-session-store'

// GET: 도구 목록 조회
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const sessionId = searchParams.get('sessionId')
        const serverId = searchParams.get('serverId')

        if (!sessionId || !serverId) {
            return NextResponse.json(
                { error: 'Session ID and Server ID are required' },
                { status: 400 }
            )
        }

        const clientInstance = sessionStore.getClient(sessionId, serverId)
        if (!clientInstance) {
            return NextResponse.json(
                { error: 'Client not connected' },
                { status: 404 }
            )
        }

        sessionStore.updateActivity(sessionId)

        const result = await clientInstance.client.listTools()
        const tools = result.tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            inputSchema: tool.inputSchema as any,
        }))

        return NextResponse.json({ tools })
    } catch (error) {
        console.error('MCP list tools error:', error)
        return NextResponse.json(
            {
                error: 'Failed to list tools',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

// POST: 도구 실행
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { sessionId, serverId, toolName, arguments: args } = body

        if (!sessionId || !serverId || !toolName) {
            return NextResponse.json(
                { error: 'Session ID, Server ID and tool name are required' },
                { status: 400 }
            )
        }

        const clientInstance = sessionStore.getClient(sessionId, serverId)
        if (!clientInstance) {
            return NextResponse.json(
                { error: 'Client not connected' },
                { status: 404 }
            )
        }

        sessionStore.updateActivity(sessionId)

        const result = await clientInstance.client.callTool({
            name: toolName,
            arguments: args || {},
        })

        return NextResponse.json({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            content: (result.content as any[]).map((item: any) => ({
                type: item.type,
                text: item.type === 'text' ? item.text : undefined,
                data: item.type === 'image' ? item.data : undefined,
                mimeType: item.type === 'image' ? item.mimeType : undefined,
            })),
            isError: result.isError as boolean | undefined,
        })
    } catch (error) {
        console.error('MCP call tool error:', error)
        return NextResponse.json(
            {
                error: 'Failed to call tool',
                details: error instanceof Error ? error.message : 'Unknown error',
                isError: true,
            },
            { status: 500 }
        )
    }
}

