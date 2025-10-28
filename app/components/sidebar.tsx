'use client'

import { type ChatSession } from '@/lib/types'
import { PlusCircle, X } from 'lucide-react'
import { SidebarItem } from './sidebar-item'

interface SidebarProps {
    sessions: ChatSession[]
    currentSessionId: string | null
    isOpen: boolean
    onNewChat: () => void
    onSelectSession: (sessionId: string) => void
    onDeleteSession: (sessionId: string) => void
    onClose: () => void
}

export function Sidebar({
    sessions,
    currentSessionId,
    isOpen,
    onNewChat,
    onSelectSession,
    onDeleteSession,
    onClose,
}: SidebarProps) {
    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r bg-background transition-transform duration-300 lg:static lg:translate-x-0 ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <h2 className="text-lg font-semibold">채팅</h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 hover:bg-muted lg:hidden"
                        aria-label="Close sidebar"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* New Chat Button */}
                <div className="border-b p-3">
                    <button
                        onClick={onNewChat}
                        className="flex w-full items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                        <PlusCircle className="h-4 w-4" />
                        <span>새 채팅</span>
                    </button>
                </div>

                {/* Session List */}
                <div className="flex-1 overflow-y-auto p-3">
                    {sessions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
                            <p>채팅이 없습니다</p>
                            <p className="mt-1">새 채팅을 시작해보세요</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {sessions.map((session) => (
                                <SidebarItem
                                    key={session.id}
                                    session={session}
                                    isActive={session.id === currentSessionId}
                                    onSelect={onSelectSession}
                                    onDelete={onDeleteSession}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </aside>
        </>
    )
}

