'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { type Message, type ChatSession } from '@/lib/types'
import {
    loadSessions,
    saveSession,
    deleteSession,
    createNewSession,
    generateSessionTitle,
} from '@/lib/chat-storage'
import { ChatHistory } from './components/chat-history'
import { ChatInput } from './components/chat-input'
import { Sidebar } from './components/sidebar'
import { MCPConnectionStatus } from './components/mcp-connection-status'
import { useMCP } from './contexts/mcp-context'
import { Menu, Trash2, Server } from 'lucide-react'

export default function Home() {
    const router = useRouter()
    const { sessionId, connections } = useMCP()
    const [sessions, setSessions] = useState<ChatSession[]>([])
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [isStreaming, setIsStreaming] = useState(false)
    const [streamingContent, setStreamingContent] = useState('')
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const handleNewChat = useCallback(() => {
        const newSession = createNewSession()
        setSessions((prev) => [newSession, ...prev])
        setCurrentSessionId(newSession.id)
        setMessages([])
        saveSession(newSession)
        setSidebarOpen(false)
    }, [])

    // Load sessions on mount
    useEffect(() => {
        const loadedSessions = loadSessions()
        setSessions(loadedSessions)

        if (loadedSessions.length > 0) {
            // Select the most recent session
            const mostRecent = loadedSessions[0]
            setCurrentSessionId(mostRecent.id)
            setMessages(mostRecent.messages)
        } else {
            // Create a new session if none exist
            handleNewChat()
        }
    }, [handleNewChat])

    // Save current session when messages change
    useEffect(() => {
        if (currentSessionId && messages.length > 0) {
            const session = sessions.find((s) => s.id === currentSessionId)
            if (session) {
                const updatedSession: ChatSession = {
                    ...session,
                    messages,
                    updatedAt: Date.now(),
                    // Update title if it's still "새 채팅"
                    title:
                        session.title === '새 채팅'
                            ? generateSessionTitle(messages)
                            : session.title,
                }
                saveSession(updatedSession)
                setSessions((prev) =>
                    prev.map((s) => (s.id === currentSessionId ? updatedSession : s))
                )
            }
        }
    }, [messages, currentSessionId, sessions])

    const handleSelectSession = (sessionId: string) => {
        const session = sessions.find((s) => s.id === sessionId)
        if (session) {
            setCurrentSessionId(session.id)
            setMessages(session.messages)
            setSidebarOpen(false)
        }
    }

    const handleDeleteSession = (sessionId: string) => {
        deleteSession(sessionId)
        const updatedSessions = sessions.filter((s) => s.id !== sessionId)
        setSessions(updatedSessions)

        // If deleting current session, switch to another or create new
        if (sessionId === currentSessionId) {
            if (updatedSessions.length > 0) {
                const nextSession = updatedSessions[0]
                setCurrentSessionId(nextSession.id)
                setMessages(nextSession.messages)
            } else {
                handleNewChat()
            }
        }
    }

    const handleClearCurrentSession = () => {
        if (
            !currentSessionId ||
            !confirm('현재 채팅의 모든 대화 내역을 삭제하시겠습니까?')
        ) {
            return
        }

        const session = sessions.find((s) => s.id === currentSessionId)
        if (session) {
            const clearedSession: ChatSession = {
                ...session,
                messages: [],
                title: '새 채팅',
                updatedAt: Date.now(),
            }
            saveSession(clearedSession)
            setSessions((prev) =>
                prev.map((s) => (s.id === currentSessionId ? clearedSession : s))
            )
            setMessages([])
        }
    }

    const handleSend = async (message: string) => {
        if (!currentSessionId) return

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: message,
            timestamp: Date.now(),
        }

        setMessages((prev) => [...prev, userMessage])
        setIsStreaming(true)
        setStreamingContent('')

        // 세션 ID 확인
        if (!sessionId) {
            console.error('Session ID is not available')
            setIsStreaming(false)
            return
        }

        // 연결된 MCP 서버 목록 수집
        const connectedServers = Array.from(connections.entries())
            .filter(([, state]) => state.status === 'connected')
            .map(([serverId]) => serverId)

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message,
                    history: messages,
                    sessionId,
                    connectedServers,
                }),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to get response')
            }

            if (!response.body) {
                throw new Error('No response body')
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let fullContent = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value, { stream: true })
                fullContent += chunk
                setStreamingContent(fullContent)
            }

            // Add AI response to messages
            const aiMessage: Message = {
                id: `model-${Date.now()}`,
                role: 'model',
                content: fullContent,
                timestamp: Date.now(),
            }

            setMessages((prev) => [...prev, aiMessage])
        } catch (error) {
            console.error('Chat error:', error)
            const errorMessage: Message = {
                id: `error-${Date.now()}`,
                role: 'model',
                content: `오류가 발생했습니다: ${
                    error instanceof Error ? error.message : '알 수 없는 오류'
                }`,
                timestamp: Date.now(),
            }
            setMessages((prev) => [...prev, errorMessage])
        } finally {
            setIsStreaming(false)
            setStreamingContent('')
        }
    }

    return (
        <div className="flex h-screen">
            {/* Sidebar */}
            <Sidebar
                sessions={sessions}
                currentSessionId={currentSessionId}
                isOpen={sidebarOpen}
                onNewChat={handleNewChat}
                onSelectSession={handleSelectSession}
                onDeleteSession={handleDeleteSession}
                onClose={() => setSidebarOpen(false)}
            />

            {/* Main Chat Area */}
            <div className="flex flex-1 flex-col">
                {/* Header */}
                <header className="border-b bg-background px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="rounded-lg p-1.5 hover:bg-muted lg:hidden"
                                aria-label="Open sidebar"
                            >
                                <Menu className="h-5 w-5" />
                            </button>
                            <h1 className="text-xl font-semibold">AI Chat</h1>
                            
                            {/* MCP 연결 상태 표시 */}
                            <MCPConnectionStatus />
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => router.push('/mcp-servers')}
                                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                                <Server className="h-4 w-4" />
                                <span className="hidden sm:inline">MCP 서버</span>
                            </button>
                            <button
                                onClick={handleClearCurrentSession}
                                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                disabled={isStreaming || messages.length === 0}
                            >
                                <Trash2 className="h-4 w-4" />
                                <span className="hidden sm:inline">대화 초기화</span>
                            </button>
                        </div>
                    </div>
                </header>

                {/* Chat History */}
                <ChatHistory
                    messages={messages}
                    isStreaming={isStreaming}
                    streamingContent={streamingContent}
                />

                {/* Input */}
                <ChatInput onSend={handleSend} disabled={isStreaming} />
            </div>
        </div>
    )
}
