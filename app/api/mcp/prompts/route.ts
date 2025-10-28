import { NextResponse } from 'next/server'
import { sessionStore } from '@/lib/mcp-session-store'

// GET: 프롬프트 목록 또는 특정 프롬프트 조회
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const sessionId = searchParams.get('sessionId')
        const serverId = searchParams.get('serverId')
        const promptName = searchParams.get('promptName')

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

        // 특정 프롬프트 조회
        if (promptName) {
            const argsString = searchParams.get('arguments')
            const args = argsString ? JSON.parse(argsString) : undefined

            const result = await clientInstance.client.getPrompt({
                name: promptName,
                arguments: args
            })

            return NextResponse.json({
                prompt: {
                    description: result.description,
                    messages: result.messages.map(msg => ({
                        role: msg.role,
                        content: msg.content
                    }))
                }
            })
        }

        // 프롬프트 목록 조회
        const result = await clientInstance.client.listPrompts()
        const prompts = result.prompts.map(prompt => ({
            name: prompt.name,
            description: prompt.description,
            arguments: prompt.arguments
        }))

        return NextResponse.json({ prompts })
    } catch (error) {
        console.error('MCP prompts error:', error)
        return NextResponse.json(
            {
                error: 'Failed to get prompts',
                details:
                    error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}
