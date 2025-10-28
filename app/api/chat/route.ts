import { GoogleGenAI } from '@google/genai'
import { type Message } from '@/lib/types'
import { sessionStore } from '@/lib/mcp-session-store'

export const runtime = 'nodejs'

const AI_MODEL = 'gemini-2.0-flash-001'

interface RequestBody {
    message: string
    history?: Message[]
    sessionId: string
    connectedServers?: string[] // MCP 서버 ID 목록
}

export async function POST(request: Request) {
    try {
        const body: RequestBody = await request.json()
        const { message, history = [], sessionId, connectedServers = [] } = body

        if (!sessionId) {
            return new Response(
                JSON.stringify({ error: 'Session ID is required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        if (!message || message.trim().length === 0) {
            return new Response(
                JSON.stringify({ error: 'Message is required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) {
            return new Response(
                JSON.stringify({ error: 'GEMINI_API_KEY is not configured' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            )
        }

        const ai = new GoogleGenAI({ apiKey })

        // 연결된 MCP 서버의 도구 목록 수집
        console.log('=== MCP Tool Collection Debug ===')
        console.log('Session ID:', sessionId)
        console.log('Connected Servers:', connectedServers)

        const toolDeclarations = []
        const toolServerMap = new Map<string, string>() // toolName -> serverId

        for (const serverId of connectedServers) {
            try {
                console.log(`\nProcessing server: ${serverId}`)
                const clientInstance = sessionStore.getClient(
                    sessionId,
                    serverId
                )
                if (!clientInstance) {
                    console.warn(`Client not connected for server ${serverId}`)
                    continue
                }

                console.log(
                    `Client found for server ${serverId}, fetching tools...`
                )
                sessionStore.updateActivity(sessionId)
                const result = await clientInstance.client.listTools()
                console.log(
                    `Tools received from ${serverId}:`,
                    result.tools.length,
                    'tools'
                )

                for (const tool of result.tools) {
                    console.log(`  - Tool: ${tool.name}`)
                    console.log(`    Description: ${tool.description}`)
                    console.log(
                        `    Input Schema:`,
                        JSON.stringify(tool.inputSchema, null, 2)
                    )

                    toolServerMap.set(tool.name, serverId)

                    // Gemini function declaration 형식으로 변환
                    toolDeclarations.push({
                        name: tool.name,
                        description:
                            tool.description || `MCP tool: ${tool.name}`,
                        parameters: tool.inputSchema as Record<string, unknown>
                    })
                }
            } catch (error) {
                console.error(
                    `Failed to load tools from server ${serverId}:`,
                    error
                )
            }
        }

        console.log('\n=== Tool Declarations Summary ===')
        console.log(`Total tools collected: ${toolDeclarations.length}`)
        console.log(
            'Tool declarations:',
            JSON.stringify(toolDeclarations, null, 2)
        )
        console.log('=================================\n')

        // Convert history to Gemini format
        const convertedHistory = history.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.content }]
        }))

        // Create chat session with history and tools
        const chatConfig: {
            model: string
            history: typeof convertedHistory
            config?: {
                tools?: Array<{ functionDeclarations: typeof toolDeclarations }>
                toolConfig?: {
                    functionCallingConfig: {
                        mode: string
                    }
                }
            }
        } = {
            model: AI_MODEL,
            history: convertedHistory
        }

        if (toolDeclarations.length > 0) {
            // Gemini API 올바른 형식: tools를 config 안에 functionDeclarations로 래핑
            chatConfig.config = {
                tools: [{ functionDeclarations: toolDeclarations }],
                toolConfig: {
                    functionCallingConfig: {
                        mode: 'AUTO' // AUTO 모드로 자동 도구 호출 활성화
                    }
                }
            }
            console.log('✓ Tools added to chat config with AUTO mode')
            console.log(
                'Full config:',
                JSON.stringify(chatConfig.config, null, 2)
            )
        } else {
            console.log('✗ No tools to add to chat config')
        }

        console.log('\n=== Creating Chat Session ===')
        console.log(
            'Chat config summary:',
            JSON.stringify(
                {
                    model: chatConfig.model,
                    historyLength: chatConfig.history.length,
                    hasConfig: !!chatConfig.config,
                    toolsCount:
                        chatConfig.config?.tools?.[0]?.functionDeclarations
                            ?.length || 0
                },
                null,
                2
            )
        )

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chat = ai.chats.create(chatConfig as any)

        console.log('\n=== Sending Message ===')
        console.log('User message:', message)

        // Send message and get streaming response
        const stream = await chat.sendMessageStream({ message })

        console.log('✓ Stream started')

        const encoder = new TextEncoder()
        const readableStream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of stream) {
                        const text = chunk.text

                        // MCP 함수 호출 처리
                        const functionCalls = (
                            chunk as {
                                functionCalls?: Array<{
                                    name: string
                                    args: Record<string, unknown>
                                }>
                            }
                        ).functionCalls

                        if (functionCalls && functionCalls.length > 0) {
                            console.log(
                                '\n🔧 Function calls detected:',
                                functionCalls.length
                            )
                            for (const fnCall of functionCalls) {
                                console.log(`  - Calling tool: ${fnCall.name}`)
                                console.log(
                                    `    Arguments:`,
                                    JSON.stringify(fnCall.args, null, 2)
                                )
                                const toolName = fnCall.name
                                const args = fnCall.args || {}
                                const serverId = toolServerMap.get(toolName)

                                if (!serverId) {
                                    const errorText = `\n\n[MCP Tool Error: ${toolName}]\nServer not found for tool\n`
                                    controller.enqueue(
                                        encoder.encode(errorText)
                                    )
                                    continue
                                }

                                try {
                                    console.log(
                                        `    → Getting client for server: ${serverId}`
                                    )
                                    const clientInstance =
                                        sessionStore.getClient(
                                            sessionId,
                                            serverId
                                        )
                                    if (!clientInstance) {
                                        console.error(
                                            `    ✗ Client not connected for ${serverId}`
                                        )
                                        const errorText = `\n\n[MCP Tool Error: ${toolName}]\nClient not connected\n`
                                        controller.enqueue(
                                            encoder.encode(errorText)
                                        )
                                        continue
                                    }

                                    console.log(
                                        `    → Calling MCP tool: ${toolName}`
                                    )
                                    sessionStore.updateActivity(sessionId)
                                    const toolResult =
                                        await clientInstance.client.callTool({
                                            name: toolName,
                                            arguments: args
                                        })

                                    console.log(
                                        `    ✓ Tool result received:`,
                                        toolResult.content
                                    )

                                    // 도구 결과를 사용자에게 표시
                                    const toolResultText = `\n\n[MCP Tool: ${toolName}]\n${
                                        Array.isArray(toolResult.content)
                                            ? (
                                                  toolResult.content as Array<{
                                                      text?: string
                                                  }>
                                              )
                                                  .map(c => c.text || '')
                                                  .join('\n')
                                            : ''
                                    }\n`

                                    controller.enqueue(
                                        encoder.encode(toolResultText)
                                    )

                                    // 도구 결과를 바탕으로 자연스러운 응답 생성
                                    console.log(
                                        '    → Generating natural response based on tool result...'
                                    )

                                    try {
                                        const toolResultData = Array.isArray(
                                            toolResult.content
                                        )
                                            ? (
                                                  toolResult.content as Array<{
                                                      text?: string
                                                  }>
                                              )
                                                  .map(c => c.text || '')
                                                  .join('\n')
                                            : ''

                                        // 도구 결과를 포함한 명확한 한국어 프롬프트 생성
                                        const followUpPrompt = `다음은 ${toolName} 도구의 실행 결과입니다:\n\n${toolResultData}\n\n이 정보를 바탕으로 사용자의 질문에 대해 자연스럽고 친절한 한국어로 답변해주세요.`

                                        const followUpStream =
                                            await chat.sendMessageStream({
                                                message: followUpPrompt
                                            })

                                        controller.enqueue(
                                            encoder.encode('\n\n')
                                        )

                                        for await (const followUpChunk of followUpStream) {
                                            if (followUpChunk.text) {
                                                controller.enqueue(
                                                    encoder.encode(
                                                        followUpChunk.text
                                                    )
                                                )
                                            }
                                        }

                                        console.log(
                                            '    ✓ Natural response generated'
                                        )
                                    } catch (followUpError) {
                                        console.error(
                                            '    ✗ Failed to generate natural response:',
                                            followUpError
                                        )
                                    }
                                } catch (error) {
                                    console.error(
                                        `    ✗ Tool call failed:`,
                                        error
                                    )
                                    const errorText = `\n\n[MCP Tool Error: ${toolName}]\n${
                                        error instanceof Error
                                            ? error.message
                                            : 'Unknown error'
                                    }\n`
                                    controller.enqueue(
                                        encoder.encode(errorText)
                                    )
                                }
                            }
                        } else if (text) {
                            // Log text chunks
                            console.log(
                                '📝 Text chunk:',
                                text.substring(0, 50) +
                                    (text.length > 50 ? '...' : '')
                            )
                        }

                        if (text) {
                            controller.enqueue(encoder.encode(text))
                        }
                    }

                    console.log('\n✓ Stream completed successfully')
                    controller.close()
                } catch (error) {
                    console.error('\n✗ Stream error:', error)
                    controller.error(error)
                }
            }
        })

        return new Response(readableStream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive'
            }
        })
    } catch (error: unknown) {
        console.error('API error:', error)

        const errorMessage =
            error instanceof Error ? error.message : 'An unknown error occurred'

        // Handle specific error cases
        if (errorMessage.includes('API key')) {
            return new Response(JSON.stringify({ error: 'Invalid API key' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        if (
            errorMessage.includes('quota') ||
            errorMessage.includes('rate limit')
        ) {
            return new Response(
                JSON.stringify({
                    error: 'Rate limit exceeded. Please try again later.'
                }),
                { status: 429, headers: { 'Content-Type': 'application/json' } }
            )
        }

        return new Response(
            JSON.stringify({ error: 'Failed to process request' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
}
