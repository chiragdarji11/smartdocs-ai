/**
 * UploadCard Component — SmartDocs AI
 * Drag-and-drop file upload area with file type validation, size checking,
 * duplicate file detection warning, and animated progress bar.
 */

import { useState, useRef, useEffect } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, X, AlertTriangle } from 'lucide-react'
import api from '../api'

const MAX_SIZE = 25 * 1024 * 1024 // 25 MB

export default function UploadCard({ onUpload, uploading }) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [error, setError] = useState('')
  const [duplicateWarning, setDuplicateWarning] = useState('')
  const [existingDocNames, setExistingDocNames] = useState([])
  const [progress, setProgress] = useState(0)

  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchExistingDocNames()
  }, [])

  // Fetch list of existing documents for duplicate detection
  const fetchExistingDocNames = async () => {
    try {
      const res = await api.get('/documents')
      if (res.data) {
        setExistingDocNames(res.data.map(d => d.original_name.toLowerCase()))
      }
    } catch (err) {
      // Silent catch
    }
  }

  // Simulate progress bar during upload
  useEffect(() => {
    let interval = null
    if (uploading) {
      setProgress(10)
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval)
            return 90
          }
          return prev + 15
        })
      }, 300)
    } else {
      setProgress(0)
    }
    return () => clearInterval(interval)
  }, [uploading])

  const validateFile = (file) => {
    setError('')
    setDuplicateWarning('')

    const ext = '.' + file.name.split('.').pop().toLowerCase()
    if (!['.pdf', '.docx', '.txt'].includes(ext)) {
      setError('Unsupported file type. Please upload PDF, DOCX, or TXT files.')
      return false
    }

    if (file.size > MAX_SIZE) {
      setError('File too large. Maximum size is 25 MB.')
      return false
    }

    // Check duplicate
    if (existingDocNames.includes(file.name.toLowerCase())) {
      setDuplicateWarning(`"${file.name}" has already been uploaded. Re-uploading will create a duplicate document.`)
    }

    return true
  }

  const handleFileSelect = (file) => {
    if (validateFile(file)) {
      setSelectedFile(file)
    } else {
      setSelectedFile(null)
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const handleUpload = () => {
    if (selectedFile && onUpload) {
      onUpload(selectedFile)
    }
  }

  const clearFile = () => {
    setSelectedFile(null)
    setError('')
    setDuplicateWarning('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 cursor-pointer ${
          dragActive
            ? 'border-primary-500 bg-primary-500/10'
            : 'border-white/10 hover:border-primary-500/50 hover:bg-white/5'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        id="upload-dropzone"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={handleInputChange}
          className="hidden"
          id="file-input"
        />

        <div className="flex flex-col items-center gap-4">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
              dragActive ? 'bg-primary-500/20 scale-110' : 'bg-white/5'
            }`}
          >
            <Upload className={`w-8 h-8 ${dragActive ? 'text-primary-400' : 'text-gray-400'}`} />
          </div>
          <div>
            <p className="text-lg font-medium text-white">
              {dragActive ? 'Drop your document here' : 'Drag & drop your document'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              or <span className="text-primary-400 hover:underline">browse files</span>
            </p>
          </div>
          <p className="text-xs text-gray-500">Supported: PDF, DOCX, TXT • Max size: 25 MB</p>
        </div>
      </div>

      {/* Validation Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl animate-slide-up">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Duplicate Warning Message */}
      {duplicateWarning && (
        <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl animate-slide-up">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-300">{duplicateWarning}</p>
        </div>
      )}

      {/* Selected File Preview */}
      {selectedFile && !error && (
        <div className="glass-card p-4 animate-slide-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{selectedFile.name}</p>
                <p className="text-xs text-gray-400">{formatSize(selectedFile.size)}</p>
              </div>
            </div>
            {!uploading && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  clearFile()
                }}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Upload Progress Bar */}
          {uploading && (
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Processing & Vectorizing Document...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
            id="upload-btn"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing Document...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Upload & Process
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
