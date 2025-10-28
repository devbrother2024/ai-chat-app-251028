import { type MCPServerConfig } from './types'

const MCP_SERVERS_KEY = 'mcp-servers'

/**
 * MCP 서버 설정을 localStorage에서 불러옵니다
 */
export function loadMCPServers(): MCPServerConfig[] {
    if (typeof window === 'undefined') return []

    try {
        const stored = localStorage.getItem(MCP_SERVERS_KEY)
        if (!stored) return []

        const servers = JSON.parse(stored) as MCPServerConfig[]
        return servers
    } catch (error) {
        console.error('Failed to load MCP servers:', error)
        return []
    }
}

/**
 * MCP 서버 설정 목록을 localStorage에 저장합니다
 */
export function saveMCPServers(servers: MCPServerConfig[]): void {
    if (typeof window === 'undefined') return

    try {
        localStorage.setItem(MCP_SERVERS_KEY, JSON.stringify(servers))
    } catch (error) {
        console.error('Failed to save MCP servers:', error)
    }
}

/**
 * 새로운 MCP 서버를 추가합니다
 */
export function addMCPServer(server: Omit<MCPServerConfig, 'id' | 'createdAt' | 'updatedAt'>): MCPServerConfig {
    const newServer: MCPServerConfig = {
        ...server,
        id: `mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    }

    const servers = loadMCPServers()
    servers.push(newServer)
    saveMCPServers(servers)

    return newServer
}

/**
 * 기존 MCP 서버 설정을 업데이트합니다
 */
export function updateMCPServer(serverId: string, updates: Partial<Omit<MCPServerConfig, 'id' | 'createdAt'>>): MCPServerConfig | null {
    const servers = loadMCPServers()
    const index = servers.findIndex(s => s.id === serverId)

    if (index === -1) {
        console.error('Server not found:', serverId)
        return null
    }

    const updatedServer: MCPServerConfig = {
        ...servers[index],
        ...updates,
        updatedAt: Date.now(),
    }

    servers[index] = updatedServer
    saveMCPServers(servers)

    return updatedServer
}

/**
 * MCP 서버를 삭제합니다
 */
export function deleteMCPServer(serverId: string): boolean {
    const servers = loadMCPServers()
    const filtered = servers.filter(s => s.id !== serverId)

    if (filtered.length === servers.length) {
        console.error('Server not found:', serverId)
        return false
    }

    saveMCPServers(filtered)
    return true
}

/**
 * ID로 MCP 서버를 조회합니다
 */
export function getMCPServer(serverId: string): MCPServerConfig | null {
    const servers = loadMCPServers()
    return servers.find(s => s.id === serverId) || null
}

/**
 * MCP 서버 설정을 JSON 파일로 내보냅니다
 */
export function exportMCPConfig(): string {
    const servers = loadMCPServers()
    
    // 민감한 정보를 제외한 설정만 내보내기 (선택적)
    const exportData = servers.map(server => ({
        ...server,
        // 필요시 민감한 헤더 제거
    }))

    return JSON.stringify(exportData, null, 2)
}

/**
 * JSON 파일에서 MCP 서버 설정을 가져옵니다
 */
export function importMCPConfig(jsonString: string): { success: boolean; imported: number; errors: string[] } {
    const errors: string[] = []
    let imported = 0

    try {
        const data = JSON.parse(jsonString)
        
        if (!Array.isArray(data)) {
            return { success: false, imported: 0, errors: ['Invalid format: expected an array'] }
        }

        const existingServers = loadMCPServers()

        for (const item of data) {
            try {
                // 필수 필드 검증
                if (!item.name || !item.transportType) {
                    errors.push(`Invalid server config: missing required fields`)
                    continue
                }

                // ID 중복 체크 및 새 ID 생성
                const newServer: MCPServerConfig = {
                    ...item,
                    id: `mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                }

                existingServers.push(newServer)
                imported++
            } catch (error) {
                errors.push(`Failed to import server: ${error instanceof Error ? error.message : 'unknown error'}`)
            }
        }

        saveMCPServers(existingServers)

        return {
            success: errors.length === 0,
            imported,
            errors,
        }
    } catch (error) {
        return {
            success: false,
            imported: 0,
            errors: [`Failed to parse JSON: ${error instanceof Error ? error.message : 'unknown error'}`],
        }
    }
}

/**
 * localStorage 경고 메시지를 표시해야 하는지 확인합니다
 */
export function shouldShowSecurityWarning(): boolean {
    if (typeof window === 'undefined') return false
    
    const warningKey = 'mcp-security-warning-shown'
    const shown = localStorage.getItem(warningKey)
    
    return !shown
}

/**
 * localStorage 경고를 표시했음을 기록합니다
 */
export function markSecurityWarningShown(): void {
    if (typeof window === 'undefined') return
    
    const warningKey = 'mcp-security-warning-shown'
    localStorage.setItem(warningKey, 'true')
}

