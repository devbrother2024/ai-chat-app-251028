import { useState, useRef, type KeyboardEvent } from 'react'
import { Send } from 'lucide-react'

interface ChatInputProps {
    onSend: (message: string) => void
    disabled?: boolean
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
    const [input, setInput] = useState('')
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const handleSend = () => {
        const trimmed = input.trim()
        if (trimmed && !disabled) {
            onSend(trimmed)
            setInput('')
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto'
            }
        }
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value)
        // Auto-resize textarea
        e.target.style.height = 'auto'
        e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`
    }

    return (
        <div className="border-t bg-background p-4">
            <div className="mx-auto max-w-3xl">
                <div className="flex gap-2">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                        placeholder="메시지를 입력하세요..."
                        disabled={disabled}
                        rows={1}
                        className="flex-1 resize-none rounded-lg border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ minHeight: '52px', maxHeight: '200px' }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={disabled || !input.trim()}
                        className="flex h-[52px] w-[52px] items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Send message"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                    Enter를 눌러 전송, Shift+Enter로 줄바꿈
                </p>
            </div>
        </div>
    )
}

