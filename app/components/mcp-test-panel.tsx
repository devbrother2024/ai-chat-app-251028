'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface TestResult {
    success: boolean
    content?: Array<{
        type: string
        text?: string
        data?: string
        mimeType?: string
    }>
    error?: string
    timestamp: number
}

interface MCPTestPanelProps {
    serverId: string
    serverName: string
}

export function MCPTestPanel({ serverId, serverName }: MCPTestPanelProps) {
    const [testResults, setTestResults] = useState<TestResult[]>([])
    const [isLoading, setIsLoading] = useState(false)

    const addTestResult = (result: TestResult) => {
        setTestResults(prev => [result, ...prev].slice(0, 10)) // 최근 10개만 유지
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleToolTest = async (toolName: string, args: Record<string, unknown>) => {
        setIsLoading(true)
        try {
            const response = await fetch('/api/mcp/tools', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    serverId,
                    toolName,
                    arguments: args,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                addTestResult({
                    success: false,
                    error: data.error || data.details || 'Unknown error',
                    timestamp: Date.now(),
                })
                return
            }

            addTestResult({
                success: true,
                content: data.content,
                timestamp: Date.now(),
            })
        } catch (error) {
            addTestResult({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: Date.now(),
            })
        } finally {
            setIsLoading(false)
        }
    }

    const clearResults = () => {
        setTestResults([])
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold">테스트 패널</h3>
                    <p className="text-sm text-muted-foreground">
                        {serverName}에서 도구 실행 결과를 확인합니다
                    </p>
                </div>
                {testResults.length > 0 && (
                    <button
                        onClick={clearResults}
                        className="text-sm text-muted-foreground hover:text-foreground"
                    >
                        결과 지우기
                    </button>
                )}
            </div>

            {isLoading && (
                <div className="flex items-center gap-2 rounded-lg border border-blue-500 bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>도구 실행 중...</span>
                </div>
            )}

            <div className="space-y-3">
                {testResults.map((result, index) => (
                    <div
                        key={index}
                        className={`rounded-lg border p-4 ${
                            result.success
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        }`}
                    >
                        <div className="flex items-start gap-2">
                            {result.success ? (
                                <CheckCircle className="mt-0.5 h-5 w-5 text-green-600" />
                            ) : (
                                <XCircle className="mt-0.5 h-5 w-5 text-red-600" />
                            )}
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">
                                        {result.success ? '성공' : '실패'}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(result.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>

                                {result.error && (
                                    <p className="mt-2 text-sm text-red-700 dark:text-red-300">
                                        {result.error}
                                    </p>
                                )}

                                {result.content && result.content.length > 0 && (
                                    <div className="mt-2 space-y-2">
                                        {result.content.map((item, i) => (
                                            <div key={i}>
                                                {item.type === 'text' && item.text && (
                                                    <pre className="overflow-auto rounded bg-muted p-2 text-xs">
                                                        {item.text}
                                                    </pre>
                                                )}
                                                {item.type === 'image' && item.data && (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={`data:${item.mimeType};base64,${item.data}`}
                                                        alt="Result"
                                                        className="max-h-64 rounded"
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {testResults.length === 0 && !isLoading && (
                    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                        아직 테스트 결과가 없습니다. 도구를 실행해 보세요.
                    </div>
                )}
            </div>
        </div>
    )
}

