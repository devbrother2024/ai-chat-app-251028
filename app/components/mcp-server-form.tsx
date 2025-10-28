'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { MCPServerConfig, MCPTransportType } from '@/lib/types'

interface MCPServerFormProps {
    server?: MCPServerConfig
    onSubmit: (server: Omit<MCPServerConfig, 'id' | 'createdAt' | 'updatedAt'>) => void
    onCancel: () => void
}

export function MCPServerForm({ server, onSubmit, onCancel }: MCPServerFormProps) {
    const [name, setName] = useState(server?.name || '')
    const [description, setDescription] = useState(server?.description || '')
    const [transportType, setTransportType] = useState<MCPTransportType>(
        server?.transportType || 'http'
    )
    const [url, setUrl] = useState(server?.url || '')
    const [command, setCommand] = useState(server?.command || '')
    const [args, setArgs] = useState(server?.args?.join(' ') || '')
    const [envVars, setEnvVars] = useState(
        server?.env ? Object.entries(server.env).map(([k, v]) => `${k}=${v}`).join('\n') : ''
    )

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        const serverConfig: Omit<MCPServerConfig, 'id' | 'createdAt' | 'updatedAt'> = {
            name,
            description,
            transportType,
        }

        if (transportType === 'stdio') {
            serverConfig.command = command
            serverConfig.args = args.split(' ').filter(Boolean)
            
            // 환경 변수 파싱
            if (envVars.trim()) {
                const env: Record<string, string> = {}
                envVars.split('\n').forEach(line => {
                    const [key, ...valueParts] = line.split('=')
                    if (key && valueParts.length > 0) {
                        env[key.trim()] = valueParts.join('=').trim()
                    }
                })
                serverConfig.env = env
            }
        } else {
            serverConfig.url = url
        }

        onSubmit(serverConfig)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-2xl rounded-lg bg-background p-6 shadow-lg">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold">
                        {server ? '서버 수정' : '새 MCP 서버 추가'}
                    </h2>
                    <button
                        onClick={onCancel}
                        className="rounded-lg p-1 hover:bg-muted"
                        aria-label="닫기"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium">
                            서버 이름 *
                        </label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                            className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
                            placeholder="예: 날씨 정보 서버"
                        />
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium">
                            설명
                        </label>
                        <input
                            id="description"
                            type="text"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
                            placeholder="서버에 대한 간단한 설명"
                        />
                    </div>

                    <div>
                        <label htmlFor="transportType" className="block text-sm font-medium">
                            Transport 타입 *
                        </label>
                        <select
                            id="transportType"
                            value={transportType}
                            onChange={e => setTransportType(e.target.value as MCPTransportType)}
                            className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
                        >
                            <option value="http">HTTP (Streamable)</option>
                            <option value="sse">SSE (Server-Sent Events)</option>
                            <option value="stdio">STDIO (프로세스 실행)</option>
                        </select>
                    </div>

                    {transportType === 'stdio' ? (
                        <>
                            <div>
                                <label htmlFor="command" className="block text-sm font-medium">
                                    실행 명령어 *
                                </label>
                                <input
                                    id="command"
                                    type="text"
                                    value={command}
                                    onChange={e => setCommand(e.target.value)}
                                    required
                                    className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
                                    placeholder="예: node, python, npx"
                                />
                                <p className="mt-1 text-xs text-muted-foreground">
                                    허용된 명령어: node, python, python3, npx, uvx
                                </p>
                            </div>

                            <div>
                                <label htmlFor="args" className="block text-sm font-medium">
                                    인자 (Arguments)
                                </label>
                                <input
                                    id="args"
                                    type="text"
                                    value={args}
                                    onChange={e => setArgs(e.target.value)}
                                    className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
                                    placeholder="예: server.js --port 3000"
                                />
                                <p className="mt-1 text-xs text-muted-foreground">
                                    공백으로 구분
                                </p>
                            </div>

                            <div>
                                <label htmlFor="envVars" className="block text-sm font-medium">
                                    환경 변수 (선택)
                                </label>
                                <textarea
                                    id="envVars"
                                    value={envVars}
                                    onChange={e => setEnvVars(e.target.value)}
                                    rows={3}
                                    className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
                                    placeholder="KEY1=value1&#10;KEY2=value2"
                                />
                                <p className="mt-1 text-xs text-muted-foreground">
                                    각 줄에 KEY=VALUE 형식으로 입력
                                </p>
                            </div>
                        </>
                    ) : (
                        <div>
                            <label htmlFor="url" className="block text-sm font-medium">
                                서버 URL *
                            </label>
                            <input
                                id="url"
                                type="url"
                                value={url}
                                onChange={e => setUrl(e.target.value)}
                                required
                                className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
                                placeholder="예: http://localhost:3000/mcp"
                            />
                        </div>
                    )}

                    <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
                        <strong>보안 경고:</strong> 공용 또는 공유 PC에서는 민감한 정보를 저장하지
                        마세요. 모든 설정은 브라우저 localStorage에 저장됩니다.
                    </div>

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="rounded-lg border px-4 py-2 hover:bg-muted"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
                        >
                            {server ? '수정' : '추가'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

