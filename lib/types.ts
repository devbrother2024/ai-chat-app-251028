export interface Message {
    id: string
    role: 'user' | 'model'
    content: string
    timestamp: number
    toolCalls?: ToolCall[]
    toolResults?: ToolResult[]
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

// MCP Types
export type MCPTransportType = 'stdio' | 'sse' | 'http'

export type MCPConnectionStatus = 
    | 'disconnected' 
    | 'connecting' 
    | 'connected' 
    | 'error'

export interface MCPServerConfig {
    id: string
    name: string
    transportType: MCPTransportType
    // STDIO config
    command?: string
    args?: string[]
    env?: Record<string, string>
    // HTTP/SSE config
    url?: string
    headers?: Record<string, string>
    // Metadata
    description?: string
    createdAt: number
    updatedAt: number
}

export interface MCPConnectionState {
    serverId: string
    status: MCPConnectionStatus
    error?: string
    connectedAt?: number
}

export interface MCPTool {
    name: string
    description?: string
    inputSchema: {
        type: string
        properties?: Record<string, unknown>
        required?: string[]
    }
}

export interface MCPPrompt {
    name: string
    description?: string
    arguments?: Array<{
        name: string
        description?: string
        required?: boolean
    }>
}

export interface MCPResource {
    uri: string
    name: string
    description?: string
    mimeType?: string
}

export interface ToolCall {
    id: string
    toolName: string
    serverId: string
    arguments: Record<string, unknown>
}

export interface ToolResult {
    id: string
    toolCallId: string
    content: Array<{
        type: 'text' | 'image' | 'resource'
        text?: string
        data?: string
        mimeType?: string
    }>
    isError?: boolean
}

