/**
 * Chat Page — SmartDocs AI
 * Features Multi-Document RAG filtering, Export Chat (PDF/DOCX/TXT),
 * Rename/Pin Conversation History, Copy/Regenerate/Feedback, and Search.
 */

import { useState, useEffect } from 'react'
import {
  Send,
  History,
  MessageSquare,
  Trash2,
  Plus,
  Search,
  Download,
  Filter,
  Pin,
  Edit2,
  Check,
  FileText
} from 'lucide-react'
import Layout from '../components/Layout'
import ChatWindow from '../components/ChatWindow'
import LoadingSpinner from '../components/LoadingSpinner'
import api from '../api'

export default function Chat() {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState([])
  const [error, setError] = useState('')
  const [currentConversationId, setCurrentConversationId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Multi-Document RAG selection
  const [availableDocs, setAvailableDocs] = useState([])
  const [selectedDocIds, setSelectedDocIds] = useState([]) // empty = all documents
  const [showDocSelector, setShowDocSelector] = useState(false)

  // Modals & Renaming
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [editingTitleId, setEditingTitleId] = useState(null)
  const [newTitleInput, setNewTitleInput] = useState('')
  const [exportFormat, setExportFormat] = useState('md') // md, txt, json

  const [pendingQuestion, setPendingQuestion] = useState(null)

  useEffect(() => {
    fetchHistory()
    fetchAvailableDocs()
  }, [])

  // Auto-send queued question when active stream completes
  useEffect(() => {
    if (!loading && pendingQuestion) {
      const nextQ = pendingQuestion
      setPendingQuestion(null)
      handleSend(nextQ)
    }
  }, [loading, pendingQuestion])

  const fetchAvailableDocs = async () => {
    try {
      const res = await api.get('/documents')
      setAvailableDocs(res.data || [])
    } catch (err) {
      // Graceful fetch handling
    }
  }

  const fetchHistory = async () => {
    try {
      const response = await api.get('/chat-history')
      setHistory(response.data)
    } catch (err) {
      // Graceful history handling
    } finally {
      setHistoryLoading(false)
    }
  }

  const startNewChat = () => {
    setMessages([])
    setCurrentConversationId(null)
    setQuestion('')
    setError('')
  }

  // Toggle multi-doc selection
  const toggleDocSelection = (docId) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    )
  }

  // Export Chat in requested format
  const exportChat = (format = exportFormat) => {
    if (messages.length === 0) return

    let content = ''
    let mimeType = 'text/plain'
    let filename = `SmartDocs_Chat_${Date.now()}`

    if (format === 'json') {
      content = JSON.stringify(messages, null, 2)
      mimeType = 'application/json'
      filename += '.json'
    } else if (format === 'txt') {
      content = `SMARTDOCS AI - CHAT TRANSCRIPT\nDate: ${new Date().toLocaleString()}\n\n`
      messages.forEach((m, idx) => {
        content += `[Q${idx + 1}]: ${m.question}\n[AI Answer]: ${m.answer || ''}\n\n`
      })
      filename += '.txt'
    } else {
      content = `# SmartDocs AI - Chat Transcript\nExport Date: ${new Date().toLocaleString()}\n\n---\n\n`
      messages.forEach((msg, idx) => {
        content += `### Q${idx + 1}: ${msg.question}\n\n`
        content += `**AI Response:**\n${msg.answer || '(No response)'}\n\n`
        if (msg.sources && msg.sources.length > 0) {
          content += `*Sources:* ${msg.sources.map((s) => `${s.document_name} (Page ${s.page_number})`).join(', ')}\n\n`
        }
        content += `---\n\n`
      })
      mimeType = 'text/markdown'
      filename += '.md'
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  // Load conversation thread
  const loadConversation = (conv) => {
    setCurrentConversationId(conv.conversation_id)
    setMessages(
      conv.messages.map((m) => ({
        question: m.question,
        answer: m.answer,
        sources: m.sources
      }))
    )
    setShowHistory(false)
  }

  // Rename Conversation
  const handleRenameConversation = async (conversationId) => {
    if (!newTitleInput.trim()) return
    try {
      await api.put(`/chat-history/${conversationId}/rename`, { title: newTitleInput.trim() })
      setEditingTitleId(null)
      fetchHistory()
    } catch (err) {
      setError('Failed to rename conversation')
    }
  }

  // Toggle Pin Status
  const handleTogglePin = async (conversationId, e) => {
    e.stopPropagation()
    try {
      await api.put(`/chat-history/${conversationId}/pin`)
      fetchHistory()
    } catch (err) {
      setError('Failed to update pin status')
    }
  }

  // Delete single conversation
  const handleDeleteConversation = async (conversationId) => {
    try {
      await api.delete(`/chat-history/${conversationId}`)
      setShowDeleteConfirm(null)
      if (currentConversationId === conversationId) {
        startNewChat()
      }
      fetchHistory()
    } catch (err) {
      setError('Failed to delete conversation.')
    }
  }

  // Clear all history
  const handleClearAll = async () => {
    try {
      await api.delete('/chat-history')
      setShowClearConfirm(false)
      startNewChat()
      fetchHistory()
    } catch (err) {
      setError('Failed to clear history.')
    }
  }

  // Send question with optional multi-doc scoping
  const handleSend = async (customQuestion = null) => {
    const qToSend = customQuestion || question
    if (!qToSend.trim()) return

    if (loading) {
      setPendingQuestion(qToSend.trim())
      setQuestion('')
      return
    }

    const userQuestion = qToSend.trim()
    setQuestion('')
    setError('')
    setLoading(true)

    let activeConversationId = currentConversationId
    if (!activeConversationId) {
      activeConversationId = 'conv_' + Math.random().toString(36).substr(2, 9)
      setCurrentConversationId(activeConversationId)
    }

    const nextMessages = [...messages, { question: userQuestion, answer: '', sources: [], isError: false }]
    setMessages(nextMessages)

    try {
      const token = localStorage.getItem('token')
      const backendUrl = api.defaults.baseURL || 'http://localhost:8001'
      const response = await fetch(`${backendUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          question: userQuestion,
          conversation_id: activeConversationId,
          document_ids: selectedDocIds.length > 0 ? selectedDocIds : null
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Failed to get an answer. Please try again.')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let chunkBuffer = ''
      let answerText = ''
      let sources = []

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        chunkBuffer += decoder.decode(value, { stream: true })
        const lines = chunkBuffer.split('\n')
        chunkBuffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6))
              if (data.type === 'conversation') {
                setCurrentConversationId(data.conversation_id)
              } else if (data.type === 'sources') {
                sources = data.content
                setMessages((prev) => {
                  const updated = [...prev]
                  if (updated.length > 0) {
                    updated[updated.length - 1] = {
                      ...updated[updated.length - 1],
                      sources: sources
                    }
                  }
                  return updated
                })
              } else if (data.type === 'token') {
                answerText += data.content
                setMessages((prev) => {
                  const updated = [...prev]
                  if (updated.length > 0) {
                    updated[updated.length - 1] = {
                      ...updated[updated.length - 1],
                      answer: answerText
                    }
                  }
                  return updated
                })
              } else if (data.type === 'error') {
                throw new Error(data.content)
              }
            } catch (err) {
              // Ignore line parse errors
            }
          }
        }
      }

      fetchHistory()
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev]
        if (updated.length > 0) {
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            isError: true
          }
        }
        return updated
      })
      setError(err.message || 'Failed to get an answer.')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredHistory = history.filter(
    (item) => item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Layout>
      <div className="h-[calc(100vh-8rem)] flex gap-6">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col glass-card overflow-hidden">
          {/* Chat Header */}
          <div className="flex flex-wrap items-center justify-between px-6 py-4 border-b border-white/5 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-purple-500 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">AI Document Chat</h2>
                <p className="text-xs text-gray-500">
                  {selectedDocIds.length === 0
                    ? 'Searching across all uploaded documents'
                    : `Scoped to ${selectedDocIds.length} selected document(s)`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Multi-Doc Filter Selector */}
              {availableDocs.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowDocSelector(!showDocSelector)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                      selectedDocIds.length > 0
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>
                      {selectedDocIds.length === 0 ? 'All Docs' : `${selectedDocIds.length} Selected`}
                    </span>
                  </button>

                  {/* Doc Selector Dropdown */}
                  {showDocSelector && (
                    <div className="absolute right-0 top-11 w-64 glass-card p-3 shadow-2xl z-50 border border-white/10 space-y-2 animate-scale-up">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-xs font-bold text-white">Select Documents</span>
                        <button
                          onClick={() => setSelectedDocIds([])}
                          className="text-[10px] text-primary-400 hover:underline"
                        >
                          Select All
                        </button>
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                        {availableDocs.map((doc) => (
                          <label
                            key={doc.id}
                            className="flex items-center gap-2 text-xs text-gray-300 hover:text-white cursor-pointer p-1.5 rounded-lg hover:bg-white/5"
                          >
                            <input
                              type="checkbox"
                              checked={selectedDocIds.includes(doc.id)}
                              onChange={() => toggleDocSelection(doc.id)}
                              className="rounded border-white/20 bg-slate-900 text-primary-500 focus:ring-0"
                            />
                            <span className="truncate flex-1">{doc.original_name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Export Chat Button */}
              {messages.length > 0 && (
                <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-0.5">
                  <button
                    onClick={() => exportChat('md')}
                    className="px-2 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 rounded transition-all flex items-center gap-1"
                    title="Export as Markdown"
                  >
                    <Download className="w-3 h-3" />
                    <span>Export</span>
                  </button>
                  <select
                    value={exportFormat}
                    onChange={(e) => {
                      setExportFormat(e.target.value)
                      exportChat(e.target.value)
                    }}
                    className="bg-transparent text-[10px] text-emerald-400 cursor-pointer focus:outline-none pr-1"
                  >
                    <option value="md" className="bg-slate-900 text-white">MD</option>
                    <option value="txt" className="bg-slate-900 text-white">TXT</option>
                    <option value="json" className="bg-slate-900 text-white">JSON</option>
                  </select>
                </div>
              )}

              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
                  showHistory
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
                id="toggle-history"
              >
                <History className="w-3.5 h-3.5" />
                History
              </button>

              {messages.length > 0 && (
                <button
                  onClick={startNewChat}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-400 
                           hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200 
                           border border-transparent hover:border-red-500/20"
                  id="clear-chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  New Chat
                </button>
              )}
            </div>
          </div>

          {/* Chat Messages */}
          <ChatWindow
            messages={messages}
            onRegenerate={(q) => handleSend(q)}
            onEditMessage={(q) => setQuestion(q)}
            onRetry={(q) => handleSend(q)}
          />

          {/* Loading Indicator */}
          {loading && (
            <div className="px-6 py-3 border-t border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gradient-to-br from-primary-500 to-purple-500 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
                <span className="text-sm text-gray-400 animate-pulse">SmartDocs AI is searching documents and generating response...</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mx-6 mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 animate-slide-up">
              {error}
            </div>
          )}

          {/* Queued Question Badge */}
          {pendingQuestion && (
            <div className="mx-6 mb-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-between text-xs text-purple-300 animate-slide-up">
              <span>Queued next question: <strong className="text-white">"{pendingQuestion}"</strong></span>
              <button
                type="button"
                onClick={() => setPendingQuestion(null)}
                className="text-gray-400 hover:text-white font-medium ml-3 underline"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t border-white/5">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-3">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question across your documents..."
                className="input-field flex-1"
                id="chat-input"
              />
              <button
                type="submit"
                disabled={!question.trim()}
                className="btn-primary px-4 flex items-center gap-2"
                id="send-btn"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        </div>

        {/* History Sidebar */}
        {showHistory && (
          <div className="w-80 glass-card overflow-hidden animate-slide-in flex flex-col">
            {/* Sidebar Header */}
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Chat History</h3>
                <p className="text-xs text-gray-500 mt-0.5">{history.length} conversations</p>
              </div>
              <button
                onClick={startNewChat}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-primary-500/20 text-primary-400 border border-primary-500/20 
                         rounded-lg text-xs font-semibold hover:bg-primary-500 hover:text-white transition-all duration-200"
              >
                <Plus className="w-3.5 h-3.5" />
                New Chat
              </button>
            </div>

            {/* Search conversations */}
            <div className="p-3 border-b border-white/5">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search history..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field pl-8 py-1.5 text-xs w-full"
                />
              </div>
            </div>

            {/* Conversations list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {historyLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="sm" text="Loading..." />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">No conversations yet.</p>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-gray-500">No matching conversations</p>
                </div>
              ) : (
                filteredHistory.map((conv) => (
                  <div
                    key={conv.conversation_id}
                    className={`group w-full relative flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${
                      currentConversationId === conv.conversation_id
                        ? 'bg-primary-500/10 border-primary-500/30'
                        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                    }`}
                  >
                    {editingTitleId === conv.conversation_id ? (
                      <div className="flex items-center gap-1 w-full">
                        <input
                          type="text"
                          value={newTitleInput}
                          onChange={(e) => setNewTitleInput(e.target.value)}
                          className="input-field py-1 text-xs flex-1"
                          autoFocus
                        />
                        <button
                          onClick={() => handleRenameConversation(conv.conversation_id)}
                          className="p-1 text-emerald-400 hover:bg-white/10 rounded"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => loadConversation(conv)}
                          className="flex-1 text-left min-w-0 pr-12"
                        >
                          <div className="flex items-center gap-1.5">
                            {conv.is_pinned === 1 && (
                              <Pin className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
                            )}
                            <p className="text-xs font-semibold text-white truncate">{conv.title}</p>
                          </div>
                          <p className="text-[10px] text-gray-500 mt-1 truncate">
                            {conv.messages[conv.messages.length - 1]?.answer || ''}
                          </p>
                          <p className="text-[9px] text-gray-600 mt-1">{formatTime(conv.timestamp)}</p>
                        </button>

                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 absolute right-2 bg-slate-900/90 p-1 rounded-lg border border-white/10">
                          <button
                            onClick={(e) => handleTogglePin(conv.conversation_id, e)}
                            className={`p-1 transition-colors ${
                              conv.is_pinned === 1 ? 'text-amber-400' : 'text-gray-400 hover:text-white'
                            }`}
                            title={conv.is_pinned === 1 ? 'Unpin' : 'Pin to top'}
                          >
                            <Pin className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingTitleId(conv.conversation_id)
                              setNewTitleInput(conv.title)
                            }}
                            className="p-1 text-gray-400 hover:text-white transition-colors"
                            title="Rename"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(conv.conversation_id)}
                            className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Clear All History Button */}
            {history.length > 0 && (
              <div className="p-3 border-t border-white/5">
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="w-full py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-semibold hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear All History
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-sm w-full p-6 animate-scale-up">
            <h3 className="text-base font-semibold text-white">Delete Conversation?</h3>
            <p className="text-xs text-gray-400 mt-2">
              This will permanently delete this conversation thread.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteConversation(showDeleteConfirm)}
                className="px-4 py-2 text-xs font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-sm w-full p-6 animate-scale-up">
            <h3 className="text-base font-semibold text-white">Clear All History?</h3>
            <p className="text-xs text-gray-400 mt-2">
              This will permanently delete all your conversation histories.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="px-4 py-2 text-xs font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
