'use client'

import { type ChatSession } from '@/lib/types'
import { MessageSquare, Trash2 } from 'lucide-react'
import { useState } from 'react'

interface SidebarItemProps {
    session: ChatSession
    isActive: boolean
    onSelect: (sessionId: string) => void
    onDelete: (sessionId: string) => void
}

export function SidebarItem({
    session,
    isActive,
    onSelect,
    onDelete,
}: SidebarItemProps) {
    const [showDelete, setShowDelete] = useState(false)

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (confirm(`"${session.title}" 채팅을 삭제하시겠습니까?`)) {
            onDelete(session.id)
        }
    }

    const formatTime = (timestamp: number) => {
        const now = Date.now()
        const diff = now - timestamp
        const minutes = Math.floor(diff / 60000)
        const hours = Math.floor(diff / 3600000)
        const days = Math.floor(diff / 86400000)

        if (minutes < 1) return '방금 전'
        if (minutes < 60) return `${minutes}분 전`
        if (hours < 24) return `${hours}시간 전`
        if (days < 7) return `${days}일 전`

        return new Date(timestamp).toLocaleDateString('ko-KR', {
            month: 'short',
            day: 'numeric',
        })
    }

    return (
        <div
            onMouseEnter={() => setShowDelete(true)}
            onMouseLeave={() => setShowDelete(false)}
            className="relative"
        >
            <button
                onClick={() => onSelect(session.id)}
                className={`group relative w-full rounded-lg px-3 py-2 text-left transition-colors ${
                    isActive
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
            >
                <div className="flex items-start gap-2">
                    <MessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <div className="flex-1 overflow-hidden">
                        <div className="truncate text-sm font-medium">{session.title}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                            {formatTime(session.updatedAt)}
                        </div>
                    </div>
                    {showDelete && !isActive && (
                        <div className="flex-shrink-0">
                            <div
                                onClick={handleDelete}
                                className="rounded p-1 hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                                aria-label="Delete session"
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        handleDelete(e as any)
                                    }
                                }}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </div>
                        </div>
                    )}
                </div>
            </button>
        </div>
    )
}

