import { GoogleGenAI } from '@google/genai'
import { type Message } from '@/lib/types'

export const runtime = 'edge'

const AI_MODEL = 'gemini-2.0-flash-001'

interface RequestBody {
    message: string
    history?: Message[]
}

export async function POST(request: Request) {
    try {
        const body: RequestBody = await request.json()
        const { message, history = [] } = body

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

        // Convert history to Gemini format
        const convertedHistory = history.map((msg) => ({
            role: msg.role,
            parts: [{ text: msg.content }],
        }))

        // Create chat session with history
        const chat = ai.chats.create({
            model: AI_MODEL,
            history: convertedHistory,
        })

        // Send message and get streaming response
        const stream = await chat.sendMessageStream({ message })

        // Create readable stream for response
        const encoder = new TextEncoder()
        const readableStream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of stream) {
                        const text = chunk.text || ''
                        if (text) {
                            controller.enqueue(encoder.encode(text))
                        }
                    }
                    controller.close()
                } catch (error) {
                    console.error('Streaming error:', error)
                    controller.error(error)
                }
            },
        })

        return new Response(readableStream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
            },
        })
    } catch (error: unknown) {
        console.error('API error:', error)

        const errorMessage =
            error instanceof Error ? error.message : 'An unknown error occurred'

        // Handle specific error cases
        if (errorMessage.includes('API key')) {
            return new Response(
                JSON.stringify({ error: 'Invalid API key' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            )
        }

        if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
            return new Response(
                JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
                { status: 429, headers: { 'Content-Type': 'application/json' } }
            )
        }

        return new Response(
            JSON.stringify({ error: 'Failed to process request' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
}

