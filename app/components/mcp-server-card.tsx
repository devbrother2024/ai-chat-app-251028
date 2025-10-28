'use client'

import { useState } from 'react'
import { Server, Plug, PlugZap, Trash2, Settings } from 'lucide-react'
import type { MCPServerConfig, MCPConnectionStatus } from '@/lib/types'

interface MCPServerCardProps {
    server: MCPServerConfig
    status: MCPConnectionStatus
    onConnect: (serverId: string) => Promise<void>
    onDisconnect: (serverId: string) => Promise<void>
    onDelete: (serverId: string) => void
    onEdit: (serverId: string) => void
    onViewDetails: (serverId: string) => void
}

export function MCPServerCard({
    server,
    status,
    onConnect,
    onDisconnect,
    onDelete,
    onEdit,
    onViewDetails,
}: MCPServerCardProps) {
    const [isConnecting, setIsConnecting] = useState(false)

    const handleConnect = async () => {
        setIsConnecting(true)
        try {
            await onConnect(server.id)
        } finally {
            setIsConnecting(false)
        }
    }

    const handleDisconnect = async () => {
        setIsConnecting(true)
        try {
            await onDisconnect(server.id)
        } finally {
            setIsConnecting(false)
        }
    }

    const getStatusColor = () => {
        switch (status) {
            case 'connected':
                return 'bg-green-500'
            case 'connecting':
                return 'bg-yellow-500 animate-pulse'
            case 'error':
                return 'bg-red-500'
            default:
                return 'bg-gray-500'
        }
    }

    const getStatusText = () => {
        switch (status) {
            case 'connected':
                return '연결됨'
            case 'connecting':
                return '연결 중...'
            case 'error':
                return '오류'
            default:
                return '연결 안 됨'
        }
    }

    return (
        <div className="rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                        <Server className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold">{server.name}</h3>
                        {server.description && (
                            <p className="mt-1 text-sm text-muted-foreground">
                                {server.description}
                            </p>
                        )}
                        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="rounded-full bg-muted px-2 py-0.5">
                                {server.transportType.toUpperCase()}
                            </span>
                            <div className="flex items-center gap-1">
                                <div className={`h-2 w-2 rounded-full ${getStatusColor()}`} />
                                <span>{getStatusText()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onEdit(server.id)}
                        className="rounded-lg p-2 hover:bg-muted"
                        aria-label="설정"
                    >
                        <Settings className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => {
                            if (confirm('이 서버를 삭제하시겠습니까?')) {
                                onDelete(server.id)
                            }
                        }}
                        className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
                        aria-label="삭제"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="mt-4 flex gap-2">
                {status === 'connected' ? (
                    <button
                        onClick={handleDisconnect}
                        disabled={isConnecting}
                        className="flex items-center gap-2 rounded-lg bg-destructive px-3 py-2 text-sm text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                    >
                        <Plug className="h-4 w-4" />
                        연결 해제
                    </button>
                ) : (
                    <button
                        onClick={handleConnect}
                        disabled={isConnecting || status === 'connecting'}
                        className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                        <PlugZap className="h-4 w-4" />
                        {isConnecting ? '연결 중...' : '연결'}
                    </button>
                )}

                <button
                    onClick={() => onViewDetails(server.id)}
                    disabled={status !== 'connected'}
                    className="rounded-lg border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                >
                    상세 보기
                </button>
            </div>
        </div>
    )
}

