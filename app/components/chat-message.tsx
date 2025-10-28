import { type Message } from '@/lib/types'
import { Bot, User } from 'lucide-react'
import { MarkdownRenderer } from './markdown-renderer'

interface ChatMessageProps {
    message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
    const isUser = message.role === 'user'

    return (
        <div className={`flex gap-3 p-4 ${isUser ? 'bg-background' : 'bg-muted/30'}`}>
            <div className="flex-shrink-0">
                <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        isUser
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground'
                    }`}
                >
                    {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
            </div>
            <div className="flex-1 space-y-2 overflow-hidden">
                <div className="font-semibold text-sm">
                    {isUser ? 'You' : 'AI Assistant'}
                </div>
                {isUser ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    </div>
                ) : (
                    <MarkdownRenderer content={message.content} />
                )}
            </div>
        </div>
    )
}

