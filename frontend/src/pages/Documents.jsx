/**
 * Documents Page — SmartDocs AI
 * Lists uploaded documents with live search, file type filters, sorting controls,
 * re-indexing, and deletion capabilities.
 */

import { useState, useEffect, useMemo } from 'react'
import { FileText, Trash2, RefreshCw, AlertCircle, CheckCircle, Search, Filter, ArrowUpDown } from 'lucide-react'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'
import api from '../api'

export default function Documents() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [message, setMessage] = useState(null)

  // Search, Filter, and Sort states
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const response = await api.get('/documents')
      const docsData = Array.isArray(response.data) ? response.data : []
      setDocuments(docsData)
      // Clear any leftover error message banner on successful HTTP 200 response
      setMessage(null)
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setMessage({
          type: 'error',
          text: 'Authentication session expired. Please log in again.'
        })
        setTimeout(() => {
          localStorage.removeItem('token')
          localStorage.removeItem('username')
          window.location.href = '/login'
        }, 1500)
      } else if (!err.response || err.code === 'ERR_NETWORK') {
        setMessage({
          type: 'error',
          text: 'Unable to connect to the server. Please verify backend connection.'
        })
      } else {
        setMessage({
          type: 'error',
          text: err.response?.data?.detail || 'Server error occurred while loading documents.'
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.original_name}"? This will remove the file and all its embeddings.`)) {
      return
    }

    setActionLoading(doc.id)
    setMessage(null)

    try {
      await api.delete(`/documents/${doc.id}`)
      setDocuments(documents.filter(d => d.id !== doc.id))
      setMessage({ type: 'success', text: `"${doc.original_name}" deleted successfully` })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Delete failed' })
    } finally {
      setActionLoading(null)
    }
  }

  const handleReindex = async (doc) => {
    setActionLoading(doc.id)
    setMessage(null)

    try {
      const response = await api.post(`/documents/${doc.id}/reindex`)
      setMessage({
        type: 'success',
        text: `"${doc.original_name}" re-indexed successfully (${response.data.chunks_created} chunks)`
      })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Re-index failed' })
    } finally {
      setActionLoading(null)
    }
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    })
  }

  const getTypeBadge = (type) => {
    const colors = {
      pdf: 'bg-red-500/10 text-red-400 border border-red-500/20',
      docx: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      txt: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    }
    return colors[type] || 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
  }

  // Filtered & Sorted Documents list calculation
  const filteredDocuments = useMemo(() => {
    return documents
      .filter((doc) => {
        const matchesQuery = doc.original_name.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesType = typeFilter === 'all' || doc.file_type === typeFilter
        return matchesQuery && matchesType
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.upload_date) - new Date(a.upload_date)
        if (sortBy === 'oldest') return new Date(a.upload_date) - new Date(b.upload_date)
        if (sortBy === 'name') return a.original_name.localeCompare(b.original_name)
        if (sortBy === 'size') return b.file_size - a.file_size
        return 0
      })
  }, [documents, searchQuery, typeFilter, sortBy])

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner text="Loading documents..." />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      {/* Page Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">My Documents</h1>
          <p className="text-gray-400 mt-1">
            {filteredDocuments.length} of {documents.length} document{documents.length !== 1 ? 's' : ''} shown
          </p>
        </div>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`mb-6 glass-card p-4 animate-slide-up ${
          message.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-rose-500/30 bg-rose-500/10'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400" />
            )}
            <p className={`text-sm ${message.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
              {message.text}
            </p>
          </div>
        </div>
      )}

      {/* Controls: Search, Type Filter, Sort */}
      {documents.length > 0 && (
        <div className="glass-card p-4 mb-6 flex flex-col md:flex-row items-center gap-4 justify-between animate-slide-up">
          {/* Search Bar */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="input-field pl-9 py-2 text-sm"
            />
          </div>

          {/* Filters & Sort */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Type Filters */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
              <Filter className="w-3.5 h-3.5 text-gray-400 ml-2 mr-1" />
              {['all', 'pdf', 'docx', 'txt'].map((type) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`px-2.5 py-1 rounded-lg uppercase font-medium transition-all ${
                    typeFilter === type
                      ? 'bg-primary-500 text-white shadow-md'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-1 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 text-xs text-gray-300">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-white focus:outline-none cursor-pointer pr-1"
              >
                <option value="newest" className="bg-slate-900 text-white">Newest First</option>
                <option value="oldest" className="bg-slate-900 text-white">Oldest First</option>
                <option value="name" className="bg-slate-900 text-white">Name (A-Z)</option>
                <option value="size" className="bg-slate-900 text-white">File Size</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Documents List / Empty States */}
      {documents.length === 0 ? (
        <div className="glass-card p-12 text-center animate-slide-up">
          <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Documents Yet</h3>
          <p className="text-gray-400">Upload your first document to get started</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="glass-card p-12 text-center animate-slide-up">
          <Search className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-1">No Matching Documents</h3>
          <p className="text-gray-400 text-sm">No documents found matching "{searchQuery}"</p>
          <button
            onClick={() => { setSearchQuery(''); setTypeFilter('all') }}
            className="mt-4 text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDocuments.map((doc, index) => (
            <div
              key={doc.id}
              className={`glass-card-hover p-5 animate-slide-up stagger-${Math.min(index + 1, 5)}`}
            >
              <div className="flex items-center justify-between">
                {/* Document Info */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-500/10 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{doc.original_name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-md font-medium uppercase ${getTypeBadge(doc.file_type)}`}>
                        {doc.file_type}
                      </span>
                      <span className="text-xs text-gray-500">{formatSize(doc.file_size)}</span>
                      <span className="text-xs text-gray-500">{formatDate(doc.upload_date)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReindex(doc)}
                    disabled={actionLoading === doc.id}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-primary-400 
                             bg-primary-500/10 border border-primary-500/20 rounded-lg 
                             hover:bg-primary-500/20 transition-all duration-200 disabled:opacity-50"
                    title="Re-index document"
                    id={`reindex-${doc.id}`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${actionLoading === doc.id ? 'animate-spin' : ''}`} />
                    Re-index
                  </button>
                  <button
                    onClick={() => handleDelete(doc)}
                    disabled={actionLoading === doc.id}
                    className="btn-danger flex items-center gap-1.5 text-xs"
                    title="Delete document"
                    id={`delete-${doc.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
