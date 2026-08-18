import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import { Check, Copy } from 'lucide-react'

function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { }
  }
  return (
    <div className="codeblock">
      <div className="codeblock-head">
        <span>{lang}</span>
        <button className="icon-btn small" onClick={copy} title="Copiar">
          {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <pre><code>{code}</code></pre>
    </div>
  )
}

export default React.memo(function Markdown({ text }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeHighlight, rehypeKatex]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '')
          const code = String(children).replace(/\n$/, '')
          if (match) return <CodeBlock lang={match[1]} code={code} />
          return <code className={className} {...props}>{children}</code>
        },
        a({ children, ...props }) {
          return <a {...props} target="_blank" rel="noreferrer">{children}</a>
        }
      }}
    >
      {text}
    </ReactMarkdown>
  )
})