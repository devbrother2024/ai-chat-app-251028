'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    Plus,
    Download,
    Upload,
    Server,
    ArrowLeft,
    AlertCircle,
    Wrench,
    FileText,
    Database,
} from 'lucide-react'
import { useMCP } from '../contexts/mcp-context'
import { MCPServerCard } from '../components/mcp-server-card'
import { MCPServerForm } from '../components/mcp-server-form'
import { MCPToolCard } from '../components/mcp-tool-card'
import { MCPTestPanel } from '../components/mcp-test-panel'
import {
    addMCPServer,
    updateMCPServer,
    deleteMCPServer,
    exportMCPConfig,
    importMCPConfig,
    shouldShowSecurityWarning,
    markSecurityWarningShown,
} from '@/lib/mcp-storage'
import type { MCPServerConfig, MCPTool, MCPPrompt, MCPResource } from '@/lib/types'

type TabType = 'tools' | 'prompts' | 'resources'

export default function MCPServersPage() {
    const router = useRouter()
    const { sessionId, servers, refreshServers, updateConnectionState, getConnectionStatus } = useMCP()

    const [showForm, setShowForm] = useState(false)
    const [editingServer, setEditingServer] = useState<MCPServerConfig | undefined>()
    const [selectedServerId, setSelectedServerId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<TabType>('tools')
    const [showSecurityWarning, setShowSecurityWarning] = useState(false)

    // 서버 기능 상태
    const [tools, setTools] = useState<MCPTool[]>([])
    const [prompts, setPrompts] = useState<MCPPrompt[]>([])
    const [resources, setResources] = useState<MCPResource[]>([])
    const [isLoading, setIsLoading] = useState(false)
    
    // 도구 테스트 결과 상태
    const [testResults, setTestResults] = useState<Array<{
        toolName: string
        success: boolean
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        content?: any[]
        error?: string
        timestamp: number
    }>>([])

    useEffect(() => {
        setShowSecurityWarning(shouldShowSecurityWarning())
    }, [])

    useEffect(() => {
        if (selectedServerId) {
            loadServerFeatures(selectedServerId)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedServerId, activeTab])

    const loadServerFeatures = async (serverId: string) => {
        const status = getConnectionStatus(serverId)
        if (status?.status !== 'connected' || !sessionId) return

        setIsLoading(true)
        try {
            if (activeTab === 'tools') {
                const response = await fetch(`/api/mcp/tools?sessionId=${sessionId}&serverId=${serverId}`)
                const data = await response.json()
                setTools(data.tools || [])
            } else if (activeTab === 'prompts') {
                const response = await fetch(`/api/mcp/prompts?sessionId=${sessionId}&serverId=${serverId}`)
                const data = await response.json()
                setPrompts(data.prompts || [])
            } else if (activeTab === 'resources') {
                const response = await fetch(`/api/mcp/resources?sessionId=${sessionId}&serverId=${serverId}`)
                const data = await response.json()
                setResources(data.resources || [])
            }
        } catch (error) {
            console.error('Failed to load server features:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleConnect = async (serverId: string) => {
        if (!sessionId) {
            alert('세션 ID가 초기화되지 않았습니다. 페이지를 새로고침해주세요.')
            return
        }

        updateConnectionState(serverId, { status: 'connecting' })

        try {
            // 서버 설정 찾기
            const serverConfig = servers.find(s => s.id === serverId)
            if (!serverConfig) {
                throw new Error('Server configuration not found')
            }

            const response = await fetch('/api/mcp/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    sessionId,
                    serverId,
                    config: serverConfig 
                }),
            })

            const data = await response.json()

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Connection failed')
            }

            updateConnectionState(serverId, {
                status: 'connected',
                connectedAt: Date.now(),
            })
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            updateConnectionState(serverId, {
                status: 'error',
                error: errorMessage,
            })
            alert(`연결 실패: ${errorMessage}`)
        }
    }

    const handleDisconnect = async (serverId: string) => {
        if (!sessionId) return

        try {
            await fetch('/api/mcp/disconnect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, serverId }),
            })

            updateConnectionState(serverId, { status: 'disconnected' })
            if (selectedServerId === serverId) {
                setSelectedServerId(null)
            }
        } catch (error) {
            console.error('Failed to disconnect:', error)
        }
    }

    const handleAddServer = (serverConfig: Omit<MCPServerConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
        addMCPServer(serverConfig)
        refreshServers()
        setShowForm(false)
    }

    const handleUpdateServer = (serverConfig: Omit<MCPServerConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
        if (editingServer) {
            updateMCPServer(editingServer.id, serverConfig)
            refreshServers()
            setEditingServer(undefined)
            setShowForm(false)
        }
    }

    const handleDeleteServer = (serverId: string) => {
        deleteMCPServer(serverId)
        refreshServers()
        if (selectedServerId === serverId) {
            setSelectedServerId(null)
        }
    }

    const handleEdit = (serverId: string) => {
        const server = servers.find(s => s.id === serverId)
        if (server) {
            setEditingServer(server)
            setShowForm(true)
        }
    }

    const handleExport = () => {
        const config = exportMCPConfig()
        const blob = new Blob([config], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `mcp-servers-${Date.now()}.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    const handleImport = () => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'application/json'
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (!file) return

            try {
                const text = await file.text()
                const result = importMCPConfig(text)

                if (result.success) {
                    alert(`성공적으로 ${result.imported}개 서버를 가져왔습니다.`)
                    refreshServers()
                } else {
                    alert(`가져오기 실패:\n${result.errors.join('\n')}`)
                }
            } catch {
                alert('파일을 읽는 중 오류가 발생했습니다.')
            }
        }
        input.click()
    }

    const handleToolTest = async (toolName: string, args: Record<string, unknown>) => {
        if (!selectedServerId || !sessionId) return

        try {
            const response = await fetch('/api/mcp/tools', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    serverId: selectedServerId,
                    toolName,
                    arguments: args,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                setTestResults(prev => [{
                    toolName,
                    success: false,
                    error: data.error || data.details || 'Unknown error',
                    timestamp: Date.now(),
                }, ...prev].slice(0, 10))
                return
            }

            setTestResults(prev => [{
                toolName,
                success: true,
                content: data.content,
                timestamp: Date.now(),
            }, ...prev].slice(0, 10))
        } catch (error) {
            setTestResults(prev => [{
                toolName,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: Date.now(),
            }, ...prev].slice(0, 10))
        }
    }

    const selectedServer = servers.find(s => s.id === selectedServerId)

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b bg-background">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.push('/')}
                                className="rounded-lg p-2 hover:bg-muted"
                                aria-label="뒤로 가기"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold">MCP 서버 관리</h1>
                                <p className="text-sm text-muted-foreground">
                                    Model Context Protocol 서버를 관리합니다
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleImport}
                                className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                            >
                                <Upload className="h-4 w-4" />
                                가져오기
                            </button>
                            <button
                                onClick={handleExport}
                                className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                                disabled={servers.length === 0}
                            >
                                <Download className="h-4 w-4" />
                                내보내기
                            </button>
                            <button
                                onClick={() => {
                                    setEditingServer(undefined)
                                    setShowForm(true)
                                }}
                                className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90"
                            >
                                <Plus className="h-4 w-4" />
                                서버 추가
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Security Warning */}
            {showSecurityWarning && (
                <div className="border-b bg-yellow-50 dark:bg-yellow-900/20">
                    <div className="container mx-auto px-4 py-3">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="mt-0.5 h-5 w-5 text-yellow-600" />
                            <div className="flex-1">
                                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                    <strong>보안 경고:</strong> 이 애플리케이션은 브라우저
                                    localStorage를 사용하여 MCP 서버 설정을 저장합니다. 공용 또는 공유
                                    PC에서는 민감한 정보(API 키, 비밀번호 등)를 저장하지 마세요.
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    markSecurityWarningShown()
                                    setShowSecurityWarning(false)
                                }}
                                className="text-sm text-yellow-800 hover:underline dark:text-yellow-200"
                            >
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="container mx-auto px-4 py-8">
                {!selectedServerId ? (
                    // Server List View
                    <div>
                        {servers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16">
                                <Server className="h-16 w-16 text-muted-foreground" />
                                <h2 className="mt-4 text-xl font-semibold">MCP 서버가 없습니다</h2>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    새 서버를 추가하여 시작하세요
                                </p>
                                <button
                                    onClick={() => setShowForm(true)}
                                    className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
                                >
                                    <Plus className="h-4 w-4" />
                                    서버 추가
                                </button>
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {servers.map(server => (
                                    <MCPServerCard
                                        key={server.id}
                                        server={server}
                                        status={
                                            getConnectionStatus(server.id)?.status || 'disconnected'
                                        }
                                        onConnect={handleConnect}
                                        onDisconnect={handleDisconnect}
                                        onDelete={handleDeleteServer}
                                        onEdit={handleEdit}
                                        onViewDetails={setSelectedServerId}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    // Server Detail View
                    <div>
                        <button
                            onClick={() => setSelectedServerId(null)}
                            className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            서버 목록으로 돌아가기
                        </button>

                        <div className="mb-6">
                            <h2 className="text-2xl font-bold">{selectedServer?.name}</h2>
                            {selectedServer?.description && (
                                <p className="text-muted-foreground">{selectedServer.description}</p>
                            )}
                        </div>

                        {/* Tabs */}
                        <div className="mb-6 border-b">
                            <div className="flex gap-6">
                                <button
                                    onClick={() => setActiveTab('tools')}
                                    className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                                        activeTab === 'tools'
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <Wrench className="h-4 w-4" />
                                    Tools
                                </button>
                                <button
                                    onClick={() => setActiveTab('prompts')}
                                    className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                                        activeTab === 'prompts'
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <FileText className="h-4 w-4" />
                                    Prompts
                                </button>
                                <button
                                    onClick={() => setActiveTab('resources')}
                                    className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                                        activeTab === 'resources'
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <Database className="h-4 w-4" />
                                    Resources
                                </button>
                            </div>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-2">
                            {/* Left: List */}
                            <div>
                                {isLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {activeTab === 'tools' && (
                                            <>
                                                {tools.map(tool => (
                                                    <MCPToolCard
                                                        key={tool.name}
                                                        tool={tool}
                                                        onTest={handleToolTest}
                                                    />
                                                ))}

                                                {testResults.length > 0 && (
                                                    <div className="mt-6 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="font-medium">테스트 결과</h4>
                                                            <button
                                                                onClick={() => setTestResults([])}
                                                                className="text-sm text-muted-foreground hover:text-foreground"
                                                            >
                                                                결과 지우기
                                                            </button>
                                                        </div>
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
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-sm font-medium">
                                                                                {result.toolName} - {result.success ? '성공' : '실패'}
                                                                            </span>
                                                                            <span className="text-xs text-muted-foreground">
                                                                                {new Date(result.timestamp).toLocaleTimeString()}
                                                                            </span>
                                                                        </div>
                                                                        {result.error && (
                                                                            <p className="mt-2 text-sm">{result.error}</p>
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
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {activeTab === 'prompts' &&
                                            prompts.map(prompt => (
                                                <div
                                                    key={prompt.name}
                                                    className="rounded-lg border bg-card p-4"
                                                >
                                                    <h4 className="font-medium">{prompt.name}</h4>
                                                    {prompt.description && (
                                                        <p className="mt-1 text-sm text-muted-foreground">
                                                            {prompt.description}
                                                        </p>
                                                    )}
                                                    {prompt.arguments && prompt.arguments.length > 0 && (
                                                        <div className="mt-2">
                                                            <p className="text-xs font-medium">
                                                                Arguments:
                                                            </p>
                                                            <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                                                                {prompt.arguments.map(arg => (
                                                                    <li key={arg.name}>
                                                                        {arg.name}
                                                                        {arg.required && ' *'} -{' '}
                                                                        {arg.description}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}

                                        {activeTab === 'resources' &&
                                            resources.map(resource => (
                                                <div
                                                    key={resource.uri}
                                                    className="rounded-lg border bg-card p-4"
                                                >
                                                    <h4 className="font-medium">{resource.name}</h4>
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        {resource.uri}
                                                    </p>
                                                    {resource.description && (
                                                        <p className="mt-1 text-sm text-muted-foreground">
                                                            {resource.description}
                                                        </p>
                                                    )}
                                                    {resource.mimeType && (
                                                        <span className="mt-2 inline-block rounded bg-muted px-2 py-0.5 text-xs">
                                                            {resource.mimeType}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}

                                        {((activeTab === 'tools' && tools.length === 0) ||
                                            (activeTab === 'prompts' && prompts.length === 0) ||
                                            (activeTab === 'resources' && resources.length === 0)) && (
                                            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                                                {activeTab === 'tools' && '도구가 없습니다'}
                                                {activeTab === 'prompts' && '프롬프트가 없습니다'}
                                                {activeTab === 'resources' && '리소스가 없습니다'}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Right: Test Panel (Tools only) */}
                            {activeTab === 'tools' && (
                                <div>
                                    <MCPTestPanel
                                        serverId={selectedServerId}
                                        serverName={selectedServer?.name || ''}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Form Modal */}
            {showForm && (
                <MCPServerForm
                    server={editingServer}
                    onSubmit={editingServer ? handleUpdateServer : handleAddServer}
                    onCancel={() => {
                        setShowForm(false)
                        setEditingServer(undefined)
                    }}
                />
            )}
        </div>
    )
}

