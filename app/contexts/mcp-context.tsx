'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { MCPServerConfig, MCPConnectionState } from '@/lib/types'
import { loadMCPServers } from '@/lib/mcp-storage'

interface MCPContextType {
    sessionId: string
    servers: MCPServerConfig[]
    connections: Map<string, MCPConnectionState>
    refreshServers: () => void
    updateConnectionState: (serverId: string, state: Partial<MCPConnectionState>) => void
    isConnected: (serverId: string) => boolean
    getConnectionStatus: (serverId: string) => MCPConnectionState | undefined
}

const MCPContext = createContext<MCPContextType | undefined>(undefined)

export function MCPProvider({ children }: { children: React.ReactNode }) {
    const [sessionId, setSessionId] = useState<string>('')
    const [servers, setServers] = useState<MCPServerConfig[]>([])
    const [connections, setConnections] = useState<Map<string, MCPConnectionState>>(new Map())

    // 서버 목록 로드
    const refreshServers = useCallback(() => {
        const loadedServers = loadMCPServers()
        setServers(loadedServers)
    }, [])

    // 서버에서 연결 상태 동기화
    const syncConnectionsFromServer = useCallback(async (sessionId: string) => {
        if (!sessionId) return

        try {
            const response = await fetch(`/api/mcp/sessions?sessionId=${sessionId}`)
            
            if (!response.ok) {
                console.error('Failed to sync connections')
                return
            }

            const data = await response.json()
            const { connectedServers } = data

            if (connectedServers && connectedServers.length > 0) {
                console.log(`Syncing ${connectedServers.length} server connections from server`)
                
                setConnections(prev => {
                    const newMap = new Map(prev)
                    
                    for (const server of connectedServers) {
                        newMap.set(server.serverId, {
                            serverId: server.serverId,
                            status: server.status,
                            connectedAt: server.connectedAt,
                            error: server.error,
                        })
                    }
                    
                    return newMap
                })
            }
        } catch (error) {
            console.error('Error syncing connections:', error)
        }
    }, [])

    // 세션 ID 초기화 및 연결 상태 동기화
    useEffect(() => {
        const initSession = async () => {
            const stored = localStorage.getItem('mcp-session-id')
            let currentSessionId: string
            
            if (stored) {
                currentSessionId = stored
                setSessionId(stored)
                console.log('Restored session ID:', stored)
            } else {
                currentSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                setSessionId(currentSessionId)
                localStorage.setItem('mcp-session-id', currentSessionId)
                console.log('Created new session ID:', currentSessionId)
            }

            // 서버에서 연결 상태 동기화
            await syncConnectionsFromServer(currentSessionId)
        }

        initSession()
    }, [syncConnectionsFromServer])

    // 초기 로드
    useEffect(() => {
        refreshServers()
    }, [refreshServers])

    // 연결 상태 업데이트
    const updateConnectionState = useCallback(
        (serverId: string, state: Partial<MCPConnectionState>) => {
            setConnections(prev => {
                const newMap = new Map(prev)
                const existing = newMap.get(serverId)
                newMap.set(serverId, {
                    serverId,
                    status: 'disconnected',
                    ...existing,
                    ...state,
                })
                return newMap
            })
        },
        []
    )

    // 서버 연결 여부 확인
    const isConnected = useCallback(
        (serverId: string) => {
            const state = connections.get(serverId)
            return state?.status === 'connected'
        },
        [connections]
    )

    // 연결 상태 가져오기
    const getConnectionStatus = useCallback(
        (serverId: string) => {
            return connections.get(serverId)
        },
        [connections]
    )

    const value: MCPContextType = {
        sessionId,
        servers,
        connections,
        refreshServers,
        updateConnectionState,
        isConnected,
        getConnectionStatus,
    }

    return <MCPContext.Provider value={value}>{children}</MCPContext.Provider>
}

export function useMCP() {
    const context = useContext(MCPContext)
    if (context === undefined) {
        throw new Error('useMCP must be used within an MCPProvider')
    }
    return context
}
