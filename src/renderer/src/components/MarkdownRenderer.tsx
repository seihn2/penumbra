import { memo, useState, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Check, Copy } from 'lucide-react'

function extractText(node: ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (node && typeof node === 'object' && 'props' in node) {
    // @ts-ignore react element children
    return extractText(node.props?.children)
  }
  return ''
}

function CodeBlock({ children, ...props }: { children?: ReactNode }) {
  const [copied, setCopied] = useState(false)
  const code = extractText(children)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code.replace(/\n$/, ''))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard can reject (denied permission / insecure context); don't
      // flash a success state when the copy didn't happen.
    }
  }

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={copy}
        className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-md border border-[var(--hairline)] bg-[var(--surface-2)] text-[var(--text-secondary)] opacity-0 transition-opacity hover:text-[var(--accent)] group-hover:opacity-100"
        aria-label="Copy code"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <pre {...props}>{children}</pre>
    </div>
  )
}

// Ref https://github.com/tailwindlabs/tailwindcss-typography to fine-tune the markdown style
function MarkdownRenderer({ children }: { children: string }) {
  return (
    <div className="workbench-markdown prose prose-sm prose-invert max-w-none prose-pre:p-0 prose-code:text-xs">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{ pre: CodeBlock }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}

// Memoized so finished chat bubbles don't re-parse markdown on every
// streaming chunk of the active message (matters for long conversations).
export default memo(MarkdownRenderer)
