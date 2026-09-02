/**
 * ChatWindow Component — SmartDocs AI
 * Features executive message bubbles, rich markdown formatting, copy-to-clipboard,
 * regenerate response, like/dislike feedback, edit user question, and retry controls.
 */

import { useEffect, useRef, useState, useMemo } from 'react'
import {
  User,
  Bot,
  Copy,
  Check,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Edit3,
  AlertCircle,
  Code,
  CheckCheck
} from 'lucide-react'
import SourceCitation from './SourceCitation'

/**
 * Simple, resilient Markdown & structured text renderer for AI responses
 */
function MarkdownRenderer({ content }) {
  if (!content) return null

  // Parse markdown lines and blocks
  const formattedElements = useMemo(() => {
    const lines = content.split('\n')
    const elements = []
    let inCodeBlock = false
    let codeLanguage = ''
    let codeBuffer = []
    let inList = false
    let listItems = []
    let isOrderedList = false

    const flushList = () => {
      if (listItems.length > 0) {
        if (isOrderedList) {
          elements.push(
            <ol key={`ol-${elements.length}`} className="list-decimal list-outside ml-5 space-y-1.5 my-2 text-gray-200">
              {listItems.map((item, idx) => (
                <li key={idx} className="leading-relaxed">
                  {renderInlineFormatting(item)}
                </li>
              ))}
            </ol>
          )
        } else {
          elements.push(
            <ul key={`ul-${elements.length}`} className="space-y-1.5 my-2 text-gray-200">
              {listItems.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-primary-400 mt-1 flex-shrink-0 text-xs">◆</span>
                  <div>{renderInlineFormatting(item)}</div>
                </li>
              ))}
            </ul>
          )
        }
        listItems = []
        inList = false
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()

      // Handle Code Blocks
      if (trimmed.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <div key={`code-${elements.length}`} className="my-3 rounded-lg overflow-hidden border border-white/10 bg-black/40">
              <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/10 text-xs text-gray-400 font-mono">
                <span>{codeLanguage || 'code'}</span>
              </div>
              <pre className="p-3 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre">
                {codeBuffer.join('\n')}
              </pre>
            </div>
          )
          codeBuffer = []
          inCodeBlock = false
          codeLanguage = ''
        } else {
          flushList()
          inCodeBlock = true
          codeLanguage = trimmed.slice(3).trim()
        }
        continue
      }

      if (inCodeBlock) {
        codeBuffer.push(line)
        continue
      }

      // Handle Headings
      if (trimmed.startsWith('#### ')) {
        flushList()
        elements.push(
          <h5 key={`h5-${elements.length}`} className="text-sm font-semibold text-primary-300 mt-3 mb-1">
            {renderInlineFormatting(trimmed.slice(5))}
          </h5>
        )
        continue
      }
      if (trimmed.startsWith('### ')) {
        flushList()
        elements.push(
          <h4 key={`h4-${elements.length}`} className="text-base font-semibold text-white mt-4 mb-2 flex items-center gap-2 border-b border-white/10 pb-1">
            {renderInlineFormatting(trimmed.slice(4))}
          </h4>
        )
        continue
      }
      if (trimmed.startsWith('## ')) {
        flushList()
        elements.push(
          <h3 key={`h3-${elements.length}`} className="text-lg font-bold text-white mt-5 mb-2">
            {renderInlineFormatting(trimmed.slice(3))}
          </h3>
        )
        continue
      }
      if (trimmed.startsWith('# ')) {
        flushList()
        elements.push(
          <h2 key={`h2-${elements.length}`} className="text-xl font-bold text-primary-400 mt-5 mb-3">
            {renderInlineFormatting(trimmed.slice(2))}
          </h2>
        )
        continue
      }

      // Handle Horizontal Rule
      if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
        flushList()
        elements.push(<hr key={`hr-${elements.length}`} className="my-4 border-white/10" />)
        continue
      }

      // Handle Blockquotes
      if (trimmed.startsWith('> ')) {
        flushList()
        elements.push(
          <blockquote key={`quote-${elements.length}`} className="border-l-2 border-primary-500/60 pl-3 my-2 text-gray-300 italic bg-primary-500/5 py-1 rounded-r">
            {renderInlineFormatting(trimmed.slice(2))}
          </blockquote>
        )
        continue
      }

      // Handle Bullet Lists
      const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/)
      if (bulletMatch) {
        if (inList && isOrderedList) flushList()
        inList = true
        isOrderedList = false
        listItems.push(bulletMatch[1])
        continue
      }

      // Handle Numbered Lists
      const numberMatch = trimmed.match(/^(\d+)\.\s+(.*)$/)
      if (numberMatch) {
        if (inList && !isOrderedList) flushList()
        inList = true
        isOrderedList = true
        listItems.push(numberMatch[2])
        continue
      }

      // Normal text or empty line
      flushList()
      if (trimmed === '') {
        elements.push(<div key={`space-${elements.length}`} className="h-2" />)
      } else {
        elements.push(
          <p key={`p-${elements.length}`} className="text-sm text-gray-200 leading-relaxed my-1">
            {renderInlineFormatting(trimmed)}
          </p>
        )
      }
    }

    flushList()
    if (inCodeBlock && codeBuffer.length > 0) {
      elements.push(
        <div key={`code-${elements.length}`} className="my-3 rounded-lg overflow-hidden border border-white/10 bg-black/40">
          <pre className="p-3 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre">
            {codeBuffer.join('\n')}
          </pre>
        </div>
      )
    }

    return elements
  }, [content])

  return <div className="space-y-1">{formattedElements}</div>
}

/**
 * Parses inline formatting like **bold**, *italic*, and `code`
 */
function renderInlineFormatting(text) {
  if (!text) return ''

  // Split by inline code first
  const codeParts = text.split(/(`[^`]+`)/g)

  return codeParts.map((part, pIdx) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 1) {
      return (
        <code key={pIdx} className="bg-white/10 text-primary-300 px-1.5 py-0.5 rounded text-xs font-mono">
          {part.slice(1, -1)}
        </code>
      )
    }

    // Split by bold (**text**)
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g)
    return (
      <span key={pIdx}>
        {boldParts.map((bPart, bIdx) => {
          if (bPart.startsWith('**') && bPart.endsWith('**') && bPart.length > 3) {
            return (
              <strong key={bIdx} className="font-semibold text-white">
                {renderItalic(bPart.slice(2, -2))}
              </strong>
            )
          }
          return renderItalic(bPart, bIdx)
        })}
      </span>
    )
  })
}

function renderItalic(text, key) {
  if (!text) return ''
  const italicParts = text.split(/(\*[^*]+\*)/g)
  return italicParts.map((iPart, iIdx) => {
    if (iPart.startsWith('*') && iPart.endsWith('*') && iPart.length > 1) {
      return <em key={`${key}-${iIdx}`} className="italic text-gray-200">{iPart.slice(1, -1)}</em>
    }
    return iPart
  })
}

export default function ChatWindow({
  messages,
  onRegenerate,
  onEditMessage,
  onRetry
}) {
  const chatEndRef = useRef(null)
  const [copiedIndex, setCopiedIndex] = useState(null)
  const [feedback, setFeedback] = useState({})

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const copyToClipboard = (text, index) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const handleFeedback = (index, type) => {
    setFeedback((prev) => ({
      ...prev,
      [index]: prev[index] === type ? null : type
    }))
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <div className="w-20 h-20 bg-primary-500/10 rounded-3xl flex items-center justify-center mb-4 animate-float border border-primary-500/20 shadow-lg shadow-primary-500/10">
          <Bot className="w-10 h-10 text-primary-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">SmartDocs AI Assistant 👋</h3>
        <p className="text-gray-400 max-w-md text-sm leading-relaxed">
          Powered by Llama 3.2 for intelligent document retrieval, comprehensive summaries, analytical risk assessment, and precise question-answering.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {messages.map((msg, index) => (
        <div key={index} className="space-y-4 animate-slide-up">
          {/* User Question */}
          <div className="flex gap-3 justify-end">
            <div className="max-w-[80%] group relative">
              <div className="bg-primary-600/20 border border-primary-500/30 rounded-2xl rounded-tr-md px-4 py-3 shadow-md shadow-primary-950/30">
                <p className="text-sm text-white whitespace-pre-wrap leading-relaxed">{msg.question}</p>
              </div>
              {/* Edit Question Shortcut */}
              <button
                onClick={() => onEditMessage && onEditMessage(msg.question)}
                className="opacity-0 group-hover:opacity-100 absolute -left-8 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-white transition-all"
                title="Edit message"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="w-8 h-8 bg-primary-500/20 border border-primary-500/30 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-primary-400" />
            </div>
          </div>

          {/* AI Answer */}
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-500/25">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="max-w-[85%] space-y-2">
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl rounded-tl-md p-4 relative shadow-xl backdrop-blur-sm">
                {msg.answer ? (
                  <MarkdownRenderer content={msg.answer} />
                ) : (
                  <div className="flex items-center gap-2 text-sm text-primary-400 py-1">
                    <span className="w-2 h-2 rounded-full bg-primary-400 animate-ping" />
                    <span className="italic">Generating professional analysis...</span>
                  </div>
                )}

                {/* Source Citations */}
                <SourceCitation sources={msg.sources} />

                {/* Action Bar for AI response */}
                {msg.answer && (
                  <div className="flex items-center gap-3 mt-4 pt-2.5 border-t border-white/5 text-xs text-gray-400">
                    <button
                      onClick={() => copyToClipboard(msg.answer, index)}
                      className="flex items-center gap-1 hover:text-white transition-colors"
                      title="Copy response"
                    >
                      {copiedIndex === index ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedIndex === index ? 'Copied' : 'Copy'}</span>
                    </button>

                    <div className="flex items-center gap-1.5 ml-auto">
                      <button
                        onClick={() => handleFeedback(index, 'like')}
                        className={`p-1 rounded hover:bg-white/10 transition-colors ${
                          feedback[index] === 'like' ? 'text-emerald-400' : 'text-gray-500'
                        }`}
                        title="Like response"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleFeedback(index, 'dislike')}
                        className={`p-1 rounded hover:bg-white/10 transition-colors ${
                          feedback[index] === 'dislike' ? 'text-rose-400' : 'text-gray-500'
                        }`}
                        title="Dislike response"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Retry button if answer failed */}
              {msg.isError && (
                <div className="flex items-center gap-2 text-xs text-rose-400">
                  <AlertCircle className="w-4 h-4" />
                  <span>Failed to generate answer.</span>
                  <button
                    onClick={() => onRetry && onRetry(msg.question)}
                    className="underline hover:text-white font-medium ml-1"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      <div ref={chatEndRef} />
    </div>
  )
}
