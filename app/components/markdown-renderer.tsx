'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { CodeBlock } from './code-block'
import type { Components } from 'react-markdown'

interface MarkdownRendererProps {
    content: string
}

// Helper function to extract text content from React nodes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getTextContent(node: any): string {
    if (typeof node === 'string') return node
    if (typeof node === 'number') return String(node)
    if (Array.isArray(node)) return node.map(getTextContent).join('')
    if (node?.props?.children) return getTextContent(node.props.children)
    return ''
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
    const components: Components = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        code(props: any) {
            const { inline, className, children } = props
            const match = /language-(\w+)/.exec(className || '')
            const language = match ? match[1] : undefined
            const code = getTextContent(children).replace(/\n$/, '')

            // Inline code
            if (inline) {
                return (
                    <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
                        {children}
                    </code>
                )
            }

            // Block code
            return (
                <CodeBlock 
                    language={language} 
                    code={code} 
                    inline={false} 
                />
            )
        },
        pre({ children }) {
            return <div className="not-prose">{children}</div>
        },
        a({ href, children }) {
            return (
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-2 hover:text-primary/80"
                >
                    {children}
                </a>
            )
        },
        blockquote({ children }) {
            return (
                <blockquote className="border-l-4 border-muted-foreground/30 pl-4 italic text-muted-foreground my-4">
                    {children}
                </blockquote>
            )
        },
        table({ children }) {
            return (
                <div className="my-4 overflow-x-auto">
                    <table className="min-w-full border-collapse border border-border">
                        {children}
                    </table>
                </div>
            )
        },
        th({ children }) {
            return (
                <th className="border border-border bg-muted px-4 py-2 text-left font-semibold">
                    {children}
                </th>
            )
        },
        td({ children }) {
            return (
                <td className="border border-border px-4 py-2">
                    {children}
                </td>
            )
        },
        ul({ children }) {
            return <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>
        },
        ol({ children }) {
            return <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>
        },
        h1({ children }) {
            return <h1 className="text-2xl font-bold mt-6 mb-3">{children}</h1>
        },
        h2({ children }) {
            return <h2 className="text-xl font-bold mt-5 mb-3">{children}</h2>
        },
        h3({ children }) {
            return <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>
        },
        h4({ children }) {
            return <h4 className="text-base font-semibold mt-3 mb-2">{children}</h4>
        },
        p({ children }) {
            return <div className="my-2 leading-7">{children}</div>
        },
        hr() {
            return <hr className="my-4 border-border" />
        },
    }

    return (
        <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={components}
            >
                {content}
            </ReactMarkdown>
        </div>
    )
}

