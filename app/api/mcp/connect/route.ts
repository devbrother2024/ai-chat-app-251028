import { NextResponse } from 'next/server'
import type { MCPServerConfig } from '@/lib/types'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { sessionStore } from '@/lib/mcp-session-store'

// STDIO command 화이트리스트 (보안)
const ALLOWED_COMMANDS = ['node', 'python', 'python3', 'npx', 'uvx']

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { sessionId, serverId, config } = body

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

        if (!config) {
            return NextResponse.json(
                { error: 'Server configuration is required' },
                { status: 400 }
            )
        }

        // 서버 설정 사용
        const serverConfig = config as MCPServerConfig

        // 세션 확인/생성
        let session = sessionStore.getSession(sessionId)
        if (!session) {
            session = sessionStore.createSession(sessionId)
        }

        // 클라이언트 생성 및 연결
        const client = new Client({
            name: 'ai-chat-mcp-client',
            version: '1.0.0',
        })

        let transport

        try {
            // Transport 타입에 따라 연결
            if (serverConfig.transportType === 'stdio') {
                if (!serverConfig.command || !ALLOWED_COMMANDS.includes(serverConfig.command)) {
                    return NextResponse.json(
                        { error: 'Invalid or disallowed command for STDIO transport' },
                        { status: 400 }
                    )
                }

                transport = new StdioClientTransport({
                    command: serverConfig.command,
                    args: serverConfig.args || [],
                    env: serverConfig.env,
                })
            } else if (serverConfig.transportType === 'http') {
                if (!serverConfig.url) {
                    return NextResponse.json(
                        { error: 'HTTP transport requires URL' },
                        { status: 400 }
                    )
                }

                const { StreamableHTTPClientTransport } = await import(
                    '@modelcontextprotocol/sdk/client/streamableHttp.js'
                )
                transport = new StreamableHTTPClientTransport(new URL(serverConfig.url))
            } else if (serverConfig.transportType === 'sse') {
                if (!serverConfig.url) {
                    return NextResponse.json(
                        { error: 'SSE transport requires URL' },
                        { status: 400 }
                    )
                }

                const { SSEClientTransport } = await import(
                    '@modelcontextprotocol/sdk/client/sse.js'
                )
                transport = new SSEClientTransport(new URL(serverConfig.url))
            } else {
                return NextResponse.json(
                    { error: `Unsupported transport type: ${serverConfig.transportType}` },
                    { status: 400 }
                )
            }

            // 타임아웃 적용하여 연결
            await Promise.race([
                client.connect(transport),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Connection timeout')), 30000)
                ),
            ])

            // 세션에 클라이언트 저장
            sessionStore.addClient(sessionId, serverId, {
                client,
                status: 'connected',
                config: serverConfig,
                connectedAt: Date.now(),
            })

            // 활동 시간 갱신
            sessionStore.updateActivity(sessionId)

            console.log(`Connected ${serverConfig.transportType} client for server ${serverId} in session ${sessionId}`)

            return NextResponse.json({ success: true })
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            
            // 세션에 에러 상태 저장
            sessionStore.addClient(sessionId, serverId, {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                client: null as any,
                status: 'error',
                config: serverConfig,
                error: errorMessage,
            })

            return NextResponse.json(
                {
                    success: false,
                    error: errorMessage,
                },
                { status: 500 }
            )
        }
    } catch (error) {
        console.error('MCP connect error:', error)
        return NextResponse.json(
            {
                error: 'Failed to connect to MCP server',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

