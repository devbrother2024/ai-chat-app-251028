'use client'

import { useState } from 'react'
import { Wrench, ChevronDown, ChevronUp } from 'lucide-react'
import type { MCPTool } from '@/lib/types'

interface MCPToolCardProps {
    tool: MCPTool
    onTest: (toolName: string, args: Record<string, unknown>) => Promise<void>
}

export function MCPToolCard({ tool, onTest }: MCPToolCardProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [args, setArgs] = useState<Record<string, string>>({})
    const [isTesting, setIsTesting] = useState(false)

    const handleTest = async () => {
        setIsTesting(true)
        try {
            // Convert string values to appropriate types based on schema
            const typedArgs: Record<string, unknown> = {}
            Object.entries(args).forEach(([key, value]) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const propSchema = tool.inputSchema.properties?.[key] as any
                if (propSchema?.type === 'number') {
                    typedArgs[key] = parseFloat(value)
                } else if (propSchema?.type === 'boolean') {
                    typedArgs[key] = value === 'true'
                } else {
                    typedArgs[key] = value
                }
            })

            await onTest(tool.name, typedArgs)
        } finally {
            setIsTesting(false)
        }
    }

    const getInputFields = () => {
        if (!tool.inputSchema.properties) return null

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return Object.entries(tool.inputSchema.properties).map(([key, schema]: [string, any]) => {
            const isRequired = tool.inputSchema.required?.includes(key)

            return (
                <div key={key} className="space-y-1">
                    <label htmlFor={`${tool.name}-${key}`} className="block text-sm font-medium">
                        {key} {isRequired && <span className="text-red-500">*</span>}
                    </label>
                    {schema.description && (
                        <p className="text-xs text-muted-foreground">{schema.description}</p>
                    )}
                    <input
                        id={`${tool.name}-${key}`}
                        type={schema.type === 'number' ? 'number' : 'text'}
                        value={args[key] || ''}
                        onChange={e => setArgs({ ...args, [key]: e.target.value })}
                        required={isRequired}
                        className="w-full rounded border bg-background px-2 py-1 text-sm"
                        placeholder={schema.type}
                    />
                </div>
            )
        })
    }

    return (
        <div className="rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                    <Wrench className="mt-0.5 h-5 w-5 text-primary" />
                    <div>
                        <h4 className="font-medium">{tool.name}</h4>
                        {tool.description && (
                            <p className="mt-1 text-sm text-muted-foreground">{tool.description}</p>
                        )}
                    </div>
                </div>

                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="rounded p-1 hover:bg-muted"
                    aria-label={isExpanded ? '접기' : '펼치기'}
                >
                    {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                    ) : (
                        <ChevronDown className="h-4 w-4" />
                    )}
                </button>
            </div>

            {isExpanded && (
                <div className="mt-4 space-y-4 border-t pt-4">
                    <div>
                        <h5 className="mb-2 text-sm font-medium">입력 스키마</h5>
                        <pre className="overflow-auto rounded bg-muted p-2 text-xs">
                            {JSON.stringify(tool.inputSchema, null, 2)}
                        </pre>
                    </div>

                    {tool.inputSchema.properties && (
                        <div>
                            <h5 className="mb-2 text-sm font-medium">테스트 실행</h5>
                            <form
                                onSubmit={e => {
                                    e.preventDefault()
                                    handleTest()
                                }}
                                className="space-y-3"
                            >
                                {getInputFields()}

                                <button
                                    type="submit"
                                    disabled={isTesting}
                                    className="w-full rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {isTesting ? '실행 중...' : '실행'}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

