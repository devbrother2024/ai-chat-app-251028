import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import type {
    MCPServerConfig,
    MCPConnectionStatus,
    MCPTool,
    MCPPrompt,
    MCPResource,
} from './types'

interface ClientInstance {
    client: Client
    status: MCPConnectionStatus
    error?: string
    connectedAt?: number
}

/**
 * MCP Client Manager - 싱글톤 패턴
 * 서버 사이드에서 MCP 클라이언트 인스턴스를 관리합니다
 */
class MCPClientManager {
    private static instance: MCPClientManager
    private clients: Map<string, ClientInstance>

    private constructor() {
        this.clients = new Map()
    }

    public static getInstance(): MCPClientManager {
        if (!MCPClientManager.instance) {
            MCPClientManager.instance = new MCPClientManager()
        }
        return MCPClientManager.instance
    }

    /**
     * 서버에 연결합니다
     * 주의: STDIO transport는 서버 사이드에서만 사용 가능합니다
     */
    public async connect(
        serverId: string,
        config: MCPServerConfig,
        onStatusChange?: (status: MCPConnectionStatus, error?: string) => void
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // 이미 연결된 경우 기존 연결 사용
            const existing = this.clients.get(serverId)
            if (existing && existing.status === 'connected') {
                return { success: true }
            }

            onStatusChange?.('connecting')

            // 클라이언트 생성
            const client = new Client({
                name: 'ai-chat-mcp-client',
                version: '1.0.0',
            })

            // Transport 타입에 따라 연결
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let transport: any

            if (config.transportType === 'http') {
                if (!config.url) {
                    throw new Error('HTTP transport requires URL')
                }
                
                const { StreamableHTTPClientTransport } = await import(
                    '@modelcontextprotocol/sdk/client/streamableHttp.js'
                )
                transport = new StreamableHTTPClientTransport(new URL(config.url))
            } else if (config.transportType === 'sse') {
                if (!config.url) {
                    throw new Error('SSE transport requires URL')
                }
                
                const { SSEClientTransport } = await import(
                    '@modelcontextprotocol/sdk/client/sse.js'
                )
                transport = new SSEClientTransport(new URL(config.url))
            } else if (config.transportType === 'stdio') {
                // STDIO는 서버 사이드 API Route에서 처리됨
                throw new Error('STDIO transport must be handled through API route')
            } else {
                throw new Error(`Unsupported transport type: ${config.transportType}`)
            }

            // 연결 시도 (타임아웃 30초)
            await Promise.race([
                client.connect(transport),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Connection timeout')), 30000)
                ),
            ])

            // 연결 성공
            this.clients.set(serverId, {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                client: client as any,
                status: 'connected',
                connectedAt: Date.now(),
            })

            onStatusChange?.('connected')

            return { success: true }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            
            this.clients.set(serverId, {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                client: null as any,
                status: 'error',
                error: errorMessage,
            })

            onStatusChange?.('error', errorMessage)

            return { success: false, error: errorMessage }
        }
    }

    /**
     * 서버 연결을 해제합니다
     */
    public async disconnect(serverId: string): Promise<void> {
        const instance = this.clients.get(serverId)
        if (!instance) return

        try {
            if (instance.client) {
                await instance.client.close()
            }
        } catch (error) {
            console.error('Error disconnecting client:', error)
        } finally {
            this.clients.delete(serverId)
        }
    }

    /**
     * 모든 서버 연결을 해제합니다
     */
    public async disconnectAll(): Promise<void> {
        const disconnectPromises = Array.from(this.clients.keys()).map(serverId =>
            this.disconnect(serverId)
        )
        await Promise.all(disconnectPromises)
    }

    /**
     * 서버 연결 상태를 확인합니다
     */
    public getConnectionStatus(serverId: string): MCPConnectionStatus {
        const instance = this.clients.get(serverId)
        return instance?.status || 'disconnected'
    }

    /**
     * 연결된 클라이언트 인스턴스를 가져옵니다
     */
    private getClient(serverId: string): Client | null {
        const instance = this.clients.get(serverId)
        if (!instance || instance.status !== 'connected') {
            return null
        }
        return instance.client
    }

    /**
     * 도구 목록을 가져옵니다
     */
    public async listTools(serverId: string): Promise<MCPTool[]> {
        const client = this.getClient(serverId)
        if (!client) {
            throw new Error('Client not connected')
        }

        try {
            const result = await client.listTools()
            return result.tools.map(tool => ({
                name: tool.name,
                description: tool.description,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                inputSchema: tool.inputSchema as any,
            }))
        } catch (error) {
            console.error('Error listing tools:', error)
            throw error
        }
    }

    /**
     * 도구를 실행합니다
     */
    public async callTool(
        serverId: string,
        toolName: string,
        args: Record<string, unknown>
    ): Promise<{
        content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>
        isError?: boolean
    }> {
        const client = this.getClient(serverId)
        if (!client) {
            throw new Error('Client not connected')
        }

        try {
            const result = await client.callTool({
                name: toolName,
                arguments: args,
            })

            return {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                content: (result.content as any[]).map((item: any) => ({
                    type: item.type,
                    text: item.type === 'text' ? item.text : undefined,
                    data: item.type === 'image' ? item.data : undefined,
                    mimeType: item.type === 'image' ? item.mimeType : undefined,
                })),
                isError: result.isError as boolean | undefined,
            }
        } catch (error) {
            console.error('Error calling tool:', error)
            throw error
        }
    }

    /**
     * 프롬프트 목록을 가져옵니다
     */
    public async listPrompts(serverId: string): Promise<MCPPrompt[]> {
        const client = this.getClient(serverId)
        if (!client) {
            throw new Error('Client not connected')
        }

        try {
            const result = await client.listPrompts()
            return result.prompts.map(prompt => ({
                name: prompt.name,
                description: prompt.description,
                arguments: prompt.arguments,
            }))
        } catch (error) {
            console.error('Error listing prompts:', error)
            throw error
        }
    }

    /**
     * 프롬프트를 가져옵니다
     */
    public async getPrompt(
        serverId: string,
        promptName: string,
        args?: Record<string, string>
    ): Promise<{
        description?: string
        messages: Array<{
            role: string
            content: { type: string; text?: string }
        }>
    }> {
        const client = this.getClient(serverId)
        if (!client) {
            throw new Error('Client not connected')
        }

        try {
            const result = await client.getPrompt({
                name: promptName,
                arguments: args,
            })

            return {
                description: result.description,
                messages: result.messages.map(msg => ({
                    role: msg.role,
                    content: msg.content,
                })),
            }
        } catch (error) {
            console.error('Error getting prompt:', error)
            throw error
        }
    }

    /**
     * 리소스 목록을 가져옵니다
     */
    public async listResources(serverId: string): Promise<MCPResource[]> {
        const client = this.getClient(serverId)
        if (!client) {
            throw new Error('Client not connected')
        }

        try {
            const result = await client.listResources()
            return result.resources.map(resource => ({
                uri: resource.uri,
                name: resource.name,
                description: resource.description,
                mimeType: resource.mimeType,
            }))
        } catch (error) {
            console.error('Error listing resources:', error)
            throw error
        }
    }

    /**
     * 리소스를 읽습니다
     */
    public async readResource(
        serverId: string,
        uri: string
    ): Promise<{
        contents: Array<{
            uri: string
            mimeType?: string
            text?: string
            blob?: string
        }>
    }> {
        const client = this.getClient(serverId)
        if (!client) {
            throw new Error('Client not connected')
        }

        try {
            const result = await client.readResource({ uri })
            return {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                contents: (result.contents as any[]).map((content: any) => ({
                    uri: content.uri,
                    mimeType: content.mimeType,
                    text: 'text' in content ? content.text : undefined,
                    blob: 'blob' in content ? content.blob : undefined,
                })),
            }
        } catch (error) {
            console.error('Error reading resource:', error)
            throw error
        }
    }

    /**
     * 연결된 모든 서버 ID 목록을 가져옵니다
     */
    public getConnectedServerIds(): string[] {
        return Array.from(this.clients.entries())
            .filter(([, instance]) => instance.status === 'connected')
            .map(([serverId]) => serverId)
    }
}

// 싱글톤 인스턴스 내보내기
export const mcpClientManager = MCPClientManager.getInstance()

