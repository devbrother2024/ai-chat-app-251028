export interface Message {
    id: string
    role: 'user' | 'model'
    content: string
    timestamp: number
}

export interface ChatHistory {
    messages: Message[]
    lastUpdated: number
}

export interface ChatSession {
    id: string
    title: string
    messages: Message[]
    createdAt: number
    updatedAt: number
}

