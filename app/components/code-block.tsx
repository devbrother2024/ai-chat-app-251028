'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

interface CodeBlockProps {
    language?: string
    code: string
    inline?: boolean
}

export function CodeBlock({ language, code }: CodeBlockProps) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        await navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="group relative my-4 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                    {language || 'text'}
                </span>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors hover:bg-muted"
                    aria-label="Copy code"
                >
                    {copied ? (
                        <>
                            <Check className="h-3 w-3" />
                            <span>복사됨</span>
                        </>
                    ) : (
                        <>
                            <Copy className="h-3 w-3" />
                            <span>복사</span>
                        </>
                    )}
                </button>
            </div>
            <div className="overflow-x-auto">
                <pre className="p-4 m-0">
                    <code className="text-sm font-mono">{code}</code>
                </pre>
            </div>
        </div>
    )
}

