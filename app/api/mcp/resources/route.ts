import { NextResponse } from 'next/server'
import { sessionStore } from '@/lib/mcp-session-store'

// GET: 리소스 목록 조회
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

        const result = await clientInstance.client.listResources()
        const resources = result.resources.map(resource => ({
            uri: resource.uri,
            name: resource.name,
            description: resource.description,
            mimeType: resource.mimeType,
        }))

        return NextResponse.json({ resources })
    } catch (error) {
        console.error('MCP list resources error:', error)
        return NextResponse.json(
            {
                error: 'Failed to list resources',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

// POST: 리소스 읽기
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { sessionId, serverId, uri } = body

        if (!sessionId || !serverId || !uri) {
            return NextResponse.json(
                { error: 'Session ID, Server ID and URI are required' },
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

        const result = await clientInstance.client.readResource({ uri })
        
        return NextResponse.json({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            contents: (result.contents as any[]).map((content: any) => ({
                uri: content.uri,
                mimeType: content.mimeType,
                text: 'text' in content ? content.text : undefined,
                blob: 'blob' in content ? content.blob : undefined,
            })),
        })
    } catch (error) {
        console.error('MCP read resource error:', error)
        return NextResponse.json(
            {
                error: 'Failed to read resource',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

