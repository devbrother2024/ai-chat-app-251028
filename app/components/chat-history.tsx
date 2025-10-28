import { useEffect, useRef } from 'react'
import { type Message } from '@/lib/types'
import { ChatMessage } from './chat-message'
import { MarkdownRenderer } from './markdown-renderer'
import { Loader2, Bot } from 'lucide-react'

interface ChatHistoryProps {
    messages: Message[]
    isStreaming: boolean
    streamingContent?: string
}

export function ChatHistory({
    messages,
    isStreaming,
    streamingContent,
}: ChatHistoryProps) {
    const bottomRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, streamingContent])

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl">
                {messages.length === 0 && !isStreaming && (
                    <div className="flex h-full items-center justify-center p-8">
                        <div className="text-center">
                            <h2 className="text-2xl font-semibold mb-2">
                                AI 채팅에 오신 것을 환영합니다
                            </h2>
                            <p className="text-muted-foreground">
                                무엇이든 물어보세요. 대화를 시작해보세요!
                            </p>
                        </div>
                    </div>
                )}

                {messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                ))}

                {isStreaming && streamingContent && (
                    <div className="flex gap-3 p-4 bg-muted/30">
                        <div className="flex-shrink-0">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                                <Bot className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="flex-1 space-y-2 overflow-hidden">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm">AI Assistant</span>
                                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                            </div>
                            <MarkdownRenderer content={streamingContent} />
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>
        </div>
    )
}

