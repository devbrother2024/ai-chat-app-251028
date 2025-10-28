import { type Message, type ChatHistory, type ChatSession } from './types'

const STORAGE_KEY = 'ai-chat-history'
const SESSIONS_STORAGE_KEY = 'ai-chat-sessions'

// Legacy function - kept for backward compatibility
export function saveChatHistory(messages: Message[]): void {
    if (typeof window === 'undefined') return

    try {
        const history: ChatHistory = {
            messages,
            lastUpdated: Date.now(),
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
    } catch (error) {
        console.error('Failed to save chat history:', error)
    }
}

// Legacy function - kept for backward compatibility
export function loadChatHistory(): Message[] {
    if (typeof window === 'undefined') return []

    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (!stored) return []

        const history: ChatHistory = JSON.parse(stored)
        return history.messages || []
    } catch (error) {
        console.error('Failed to load chat history:', error)
        return []
    }
}

// Legacy function - kept for backward compatibility
export function clearChatHistory(): void {
    if (typeof window === 'undefined') return

    try {
        localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
        console.error('Failed to clear chat history:', error)
    }
}

// New session-based functions

export function saveSessions(sessions: ChatSession[]): void {
    if (typeof window === 'undefined') return

    try {
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions))
    } catch (error) {
        console.error('Failed to save sessions:', error)
    }
}

export function loadSessions(): ChatSession[] {
    if (typeof window === 'undefined') return []

    try {
        // Check for new sessions format first
        const stored = localStorage.getItem(SESSIONS_STORAGE_KEY)
        if (stored) {
            return JSON.parse(stored)
        }

        // Migration: Check for old single chat history
        const oldHistory = loadChatHistory()
        if (oldHistory.length > 0) {
            const migratedSession: ChatSession = {
                id: `session-${Date.now()}`,
                title: generateSessionTitle(oldHistory),
                messages: oldHistory,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            }
            saveSessions([migratedSession])
            clearChatHistory() // Remove old format
            return [migratedSession]
        }

        return []
    } catch (error) {
        console.error('Failed to load sessions:', error)
        return []
    }
}

export function saveSession(session: ChatSession): void {
    if (typeof window === 'undefined') return

    try {
        const sessions = loadSessions()
        const existingIndex = sessions.findIndex((s) => s.id === session.id)

        if (existingIndex >= 0) {
            sessions[existingIndex] = session
        } else {
            sessions.unshift(session) // Add new session at the beginning
        }

        saveSessions(sessions)
    } catch (error) {
        console.error('Failed to save session:', error)
    }
}

export function deleteSession(sessionId: string): void {
    if (typeof window === 'undefined') return

    try {
        const sessions = loadSessions()
        const filtered = sessions.filter((s) => s.id !== sessionId)
        saveSessions(filtered)
    } catch (error) {
        console.error('Failed to delete session:', error)
    }
}

export function generateSessionTitle(messages: Message[]): string {
    if (messages.length === 0) return '새 채팅'

    const firstUserMessage = messages.find((m) => m.role === 'user')
    if (!firstUserMessage) return '새 채팅'

    const content = firstUserMessage.content.trim()
    const maxLength = 30

    if (content.length <= maxLength) return content

    return content.substring(0, maxLength) + '...'
}

export function createNewSession(): ChatSession {
    return {
        id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: '새 채팅',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
    }
}
