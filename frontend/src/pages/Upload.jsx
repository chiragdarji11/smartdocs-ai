/**
 * Upload Page
 * Document upload page with drag-and-drop support.
 * Processes documents through the RAG pipeline on the backend.
 */

import { useState } from 'react'
import { Upload as UploadIcon, CheckCircle, AlertCircle } from 'lucide-react'
import Layout from '../components/Layout'
import UploadCard from '../components/UploadCard'
import api from '../api'

export default function Upload() {
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null) // { type: 'success' | 'error', message: '' }

  const handleUpload = async (file) => {
    setUploading(true)
    setResult(null)

    // Create FormData to send the file
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await api.post('/upload', formData)

      setResult({
        type: 'success',
        message: `"${response.data.original_name}" uploaded successfully! ${response.data.chunks_created} text chunks created and indexed.`
      })
    } catch (err) {
      const detail = err.response?.data?.detail
      let errorMsg = 'Upload failed. Please try again.'
      if (typeof detail === 'string') {
        errorMsg = detail
      } else if (Array.isArray(detail) && detail.length > 0) {
        errorMsg = detail.map((d) => d.msg || d.detail).join(', ')
      } else if (err.message) {
        errorMsg = err.message
      }

      setResult({
        type: 'error',
        message: errorMsg
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Layout>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Upload Document</h1>
        <p className="text-gray-400 mt-1">Upload documents for AI analysis</p>
      </div>

      {/* Upload Area */}
      <div className="max-w-2xl mx-auto">
        <div className="glass-card p-8 animate-slide-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-500 rounded-xl flex items-center justify-center">
              <UploadIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Upload a Document</h2>
              <p className="text-xs text-gray-400">The document will be processed and indexed for AI queries</p>
            </div>
          </div>

          <UploadCard onUpload={handleUpload} uploading={uploading} />
        </div>

        {/* Result Message */}
        {result && (
          <div className={`mt-6 glass-card p-4 animate-slide-up ${
            result.type === 'success' ? 'border-green-500/20' : 'border-red-500/20'
          }`}>
            <div className="flex items-start gap-3">
              {result.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <p className={`text-sm ${result.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                {result.message}
              </p>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-8 glass-card p-6 animate-slide-up stagger-2">
          <h3 className="text-sm font-semibold text-white mb-3">How it works</h3>
          <div className="space-y-3">
            {[
              'Document text is extracted from the uploaded file',
              'Text is split into smaller overlapping chunks',
              'Each chunk is converted into a vector embedding',
              'Embeddings are stored in ChromaDB for fast retrieval',
              'You can now ask questions about this document in AI Chat'
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 bg-primary-500/10 text-primary-400 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {i + 1}
                </span>
                <p className="text-sm text-gray-400">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
