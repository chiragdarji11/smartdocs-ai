/**
 * SourceCitation Component
 * Displays source document name and page number for AI answers.
 * Shows which documents were used to generate the response.
 */

import { FileText, BookOpen } from 'lucide-react'

export default function SourceCitation({ sources }) {
  if (!sources || sources.length === 0) return null

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider font-medium">
        <BookOpen className="w-3 h-3" />
        Sources
      </div>
      <div className="flex flex-wrap gap-2">
        {sources.map((source, index) => (
          <div
            key={index}
            className="flex items-center gap-2 px-3 py-2 bg-primary-500/5 border border-primary-500/10 
                       rounded-lg text-xs transition-all hover:bg-primary-500/10 hover:border-primary-500/20"
          >
            <FileText className="w-3.5 h-3.5 text-primary-400" />
            <div>
              <span className="text-primary-300 font-medium">{source.document_name}</span>
              <span className="text-gray-500 ml-2">Page {source.page_number}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
