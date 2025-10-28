import { type Message } from '@/lib/types'
import { Bot, User, Wrench } from 'lucide-react'
import { MarkdownRenderer } from './markdown-renderer'

interface ChatMessageProps {
    message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
    const isUser = message.role === 'user'

    // MCP 도구 호출 감지 (메시지 내용에서 [MCP Tool: ...] 패턴 찾기)
    const mcpToolPattern = /\[MCP Tool: ([^\]]+)\]\n([\s\S]*?)(?=\n\[MCP Tool:|$)/g
    const mcpErrorPattern = /\[MCP Tool Error: ([^\]]+)\]\n([\s\S]*?)(?=\n\[MCP Tool:|$)/g
    
    const parseMCPResults = (content: string) => {
        const results: Array<{type: 'tool' | 'error', name: string, content: string}> = []
        let remainingContent = content
        
        // 도구 결과 추출
        let match
        while ((match = mcpToolPattern.exec(content)) !== null) {
            results.push({
                type: 'tool',
                name: match[1],
                content: match[2].trim()
            })
            remainingContent = remainingContent.replace(match[0], '')
        }
        
        // 에러 추출
        while ((match = mcpErrorPattern.exec(content)) !== null) {
            results.push({
                type: 'error',
                name: match[1],
                content: match[2].trim()
            })
            remainingContent = remainingContent.replace(match[0], '')
        }
        
        return { results, remainingContent: remainingContent.trim() }
    }

    const { results: mcpResults, remainingContent } = !isUser 
        ? parseMCPResults(message.content)
        : { results: [], remainingContent: message.content }

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
                
                {/* MCP 도구 결과 표시 */}
                {mcpResults.length > 0 && (
                    <div className="space-y-2">
                        {mcpResults.map((result, index) => (
                            <div
                                key={index}
                                className={`rounded-lg border p-3 text-sm ${
                                    result.type === 'tool'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                }`}
                            >
                                <div className="mb-2 flex items-center gap-2 font-medium">
                                    <Wrench className="h-4 w-4" />
                                    <span>
                                        {result.type === 'tool' ? 'MCP Tool' : 'MCP Tool Error'}: {result.name}
                                    </span>
                                </div>
                                <pre className="overflow-auto whitespace-pre-wrap break-words text-xs">
                                    {result.content}
                                </pre>
                            </div>
                        ))}
                    </div>
                )}
                
                {/* 일반 메시지 내용 */}
                {isUser ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    </div>
                ) : (
                    remainingContent && <MarkdownRenderer content={remainingContent} />
                )}
            </div>
        </div>
    )
}

