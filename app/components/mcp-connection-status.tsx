'use client'

import { useState, useRef, useEffect } from 'react'
import { Server, CheckCircle, XCircle, AlertCircle, ChevronDown } from 'lucide-react'
import { useMCP } from '../contexts/mcp-context'
import type { MCPConnectionState } from '@/lib/types'

export function MCPConnectionStatus() {
    const { connections, servers } = useMCP()
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const connectedCount = Array.from(connections.values()).filter(
        s => s.status === 'connected'
    ).length

    // 외부 클릭 시 닫기
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    const getStatusIcon = (state: MCPConnectionState) => {
        switch (state.status) {
            case 'connected':
                return <CheckCircle className="h-4 w-4 text-green-600" />
            case 'connecting':
                return <AlertCircle className="h-4 w-4 text-yellow-600" />
            case 'error':
                return <XCircle className="h-4 w-4 text-red-600" />
            default:
                return <XCircle className="h-4 w-4 text-gray-400" />
        }
    }

    const getStatusText = (status: string) => {
        switch (status) {
            case 'connected': return '연결됨'
            case 'connecting': return '연결 중...'
            case 'error': return '오류'
            case 'disconnected': return '연결 안됨'
            default: return status
        }
    }

    if (connections.size === 0) {
        return null
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors hover:bg-muted"
            >
                <Server className="h-3.5 w-3.5" />
                <span>{connectedCount} MCP 연결됨</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-lg border bg-popover p-2 shadow-lg">
                    <div className="mb-2 px-2 py-1 text-xs font-medium text-muted-foreground">
                        연결된 MCP 서버
                    </div>
                    <div className="space-y-1">
                        {Array.from(connections.entries()).map(([serverId, state]) => {
                            const server = servers.find(s => s.id === serverId)
                            return (
                                <div
                                    key={serverId}
                                    className="flex items-start gap-2 rounded-md p-2 hover:bg-muted"
                                >
                                    <div className="mt-0.5">
                                        {getStatusIcon(state)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="truncate text-sm font-medium">
                                                {server?.name || serverId}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {getStatusText(state.status)}
                                            </span>
                                        </div>
                                        {server?.description && (
                                            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                                                {server.description}
                                            </p>
                                        )}
                                        {state.error && (
                                            <p className="mt-1 text-xs text-red-600">
                                                {state.error}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    {connectedCount === 0 && (
                        <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                            연결된 서버가 없습니다
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

