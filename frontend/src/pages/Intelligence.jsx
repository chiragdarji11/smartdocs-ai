/**
 * Intelligence Page — SmartDocs AI
 * Complete AI Document Intelligence Studio featuring:
 * 1. AI Document Summarizer (Short, Medium, Detailed, Bullet, Executive)
 * 2. AI Document Comparison (Select 2 docs -> Similarities, Differences, Missing Info, Comparison)
 * 3. AI Notes Generator (Study, Revision, Interview, Bullet, Key Concepts)
 * 4. AI Quiz Generator (MCQs, True/False, Short Qs, Difficulty levels, Interactive Quiz Player)
 * 5. Smart Insights (Topics, Keywords, Entities, Reading time, Complexity)
 */

import { useState, useEffect } from 'react'
import {
  Sparkles,
  FileText,
  GitCompare,
  BookOpen,
  HelpCircle,
  BarChart3,
  Copy,
  Check,
  Download,
  Clock,
  Tag,
  Cpu,
  Layers,
  Award,
  AlertCircle
} from 'lucide-react'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'
import api from '../api'

export default function Intelligence() {
  const [activeTab, setActiveTab] = useState('summary')
  const [documents, setDocuments] = useState([])
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  // Selected Documents
  const [selectedDocId, setSelectedDocId] = useState('')
  const [selectedDocId2, setSelectedDocId2] = useState('')

  // State outputs
  const [summaryType, setSummaryType] = useState('medium')
  const [summaryOutput, setSummaryOutput] = useState(null)

  const [comparisonOutput, setComparisonOutput] = useState(null)

  const [noteType, setNoteType] = useState('study')
  const [notesOutput, setNotesOutput] = useState(null)

  const [difficulty, setDifficulty] = useState('medium')
  const [quizOutput, setQuizOutput] = useState(null)
  const [userAnswers, setUserAnswers] = useState({})
  const [submittedQuiz, setSubmittedQuiz] = useState(false)

  const [insightsOutput, setInsightsOutput] = useState(null)

  useEffect(() => {
    fetchDocs()
  }, [])

  const fetchDocs = async () => {
    try {
      const res = await api.get('/documents')
      const docs = res.data || []
      setDocuments(docs)
      if (docs.length > 0) {
        setSelectedDocId(docs[0].id)
        if (docs.length > 1) {
          setSelectedDocId2(docs[1].id)
        }
      }
      setError('')
    } catch (err) {
      if (!err.response || err.code === 'ERR_NETWORK') {
        setError('Backend server is offline. Please start the backend on port 8001.')
      } else if (err.response?.status !== 404) {
        setError(err.response?.data?.detail || 'Failed to fetch documents')
      }
    } finally {
      setLoadingDocs(false)
    }
  }

  const copyText = (text) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadText = (text, filename) => {
    if (!text) return
    const blob = new Blob([text], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  // 1. Generate Summary
  const handleGenerateSummary = async () => {
    if (!selectedDocId) return
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/intelligence/summary', {
        document_id: parseInt(selectedDocId),
        summary_type: summaryType
      })
      setSummaryOutput(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate summary')
    } finally {
      setLoading(false)
    }
  }

  // 2. Generate Comparison
  const handleCompareDocs = async () => {
    if (!selectedDocId || !selectedDocId2) {
      setError('Please select two different documents to compare')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/intelligence/compare', {
        document_id_1: parseInt(selectedDocId),
        document_id_2: parseInt(selectedDocId2)
      })
      setComparisonOutput(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to compare documents')
    } finally {
      setLoading(false)
    }
  }

  // 3. Generate Notes
  const handleGenerateNotes = async () => {
    if (!selectedDocId) return
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/intelligence/notes', {
        document_id: parseInt(selectedDocId),
        note_type: noteType
      })
      setNotesOutput(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate notes')
    } finally {
      setLoading(false)
    }
  }

  // 4. Generate Quiz
  const handleGenerateQuiz = async () => {
    if (!selectedDocId) return
    setLoading(true)
    setError('')
    setSubmittedQuiz(false)
    setUserAnswers({})
    try {
      const res = await api.post('/intelligence/quiz', {
        document_id: parseInt(selectedDocId),
        difficulty: difficulty
      })
      setQuizOutput(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate quiz')
    } finally {
      setLoading(false)
    }
  }

  // 5. Fetch Insights
  const handleFetchInsights = async () => {
    if (!selectedDocId) return
    setLoading(true)
    setError('')
    try {
      const res = await api.get(`/intelligence/insights/${selectedDocId}`)
      setInsightsOutput(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch insights')
    } finally {
      setLoading(false)
    }
  }

  if (loadingDocs) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner text="Loading AI Studio..." />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">AI Document Intelligence Studio</h1>
            <p className="text-xs text-gray-400 mt-0.5">Summaries, Comparison, Study Notes, Quiz Generator & Smart Insights</p>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="glass-card p-1.5 mb-6 flex flex-wrap items-center gap-1">
        {[
          { id: 'summary', label: 'Summary', icon: FileText },
          { id: 'compare', label: 'Compare Docs', icon: GitCompare },
          { id: 'notes', label: 'AI Notes', icon: BookOpen },
          { id: 'quiz', label: 'Quiz Generator', icon: HelpCircle },
          { id: 'insights', label: 'Smart Insights', icon: BarChart3 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setError(''); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2 animate-slide-up">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Document Selector Header (for single-doc tabs) */}
      {activeTab !== 'compare' && (
        <div className="glass-card p-4 mb-6 flex flex-col sm:flex-row items-center gap-4 justify-between">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <FileText className="w-5 h-5 text-primary-400" />
            <label className="text-xs font-semibold text-gray-300 whitespace-nowrap">Select Target Document:</label>
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="bg-slate-900 border border-white/10 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-primary-500 flex-1 sm:w-64"
            >
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.original_name} ({d.file_type.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {documents.length === 0 && (
            <div className="flex items-center gap-2 text-xs text-amber-400">
              <span>No documents uploaded yet.</span>
              <a href="/upload" className="underline hover:text-white font-medium">Upload a document</a>
            </div>
          )}
        </div>
      )}

      {/* TAB 1: SUMMARY */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Choose Summary Format</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
              {[
                { id: 'short', label: 'Short', desc: '2-3 sentences' },
                { id: 'medium', label: 'Medium', desc: 'Standard overview' },
                { id: 'detailed', label: 'Detailed', desc: 'In-depth analysis' },
                { id: 'bullet', label: 'Bullet Points', desc: 'Key takeaways' },
                { id: 'executive', label: 'Executive', desc: 'Strategic summary' },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setSummaryType(st.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    summaryType === st.id
                      ? 'bg-primary-500/20 border-primary-500 text-white'
                      : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <p className="text-xs font-semibold">{st.label}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{st.desc}</p>
                </button>
              ))}
            </div>

            <button
              onClick={handleGenerateSummary}
              disabled={loading || !selectedDocId}
              className="btn-primary flex items-center gap-2 text-xs"
            >
              {loading ? <LoadingSpinner size="sm" /> : <Sparkles className="w-4 h-4" />}
              Generate Summary
            </button>
          </div>

          {summaryOutput && (
            <div className="glass-card p-6 animate-slide-up">
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white">{summaryOutput.original_name}</h3>
                  <span className="text-[10px] text-primary-400 uppercase font-semibold">
                    {summaryOutput.summary_type} Summary
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyText(summaryOutput.summary)}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 text-xs flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={() => downloadText(summaryOutput.summary, `${summaryOutput.original_name}_Summary.md`)}
                    className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg text-emerald-400 text-xs flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              </div>

              <div className="text-xs text-gray-200 leading-relaxed whitespace-pre-wrap">
                {summaryOutput.summary}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COMPARE DOCS */}
      {activeTab === 'compare' && (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Select 2 Documents to Compare</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs text-gray-400 mb-2">First Document:</label>
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 text-white text-xs rounded-xl p-3"
                >
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>{d.original_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-2">Second Document:</label>
                <select
                  value={selectedDocId2}
                  onChange={(e) => setSelectedDocId2(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 text-white text-xs rounded-xl p-3"
                >
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>{d.original_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleCompareDocs}
              disabled={loading || !selectedDocId || !selectedDocId2 || selectedDocId === selectedDocId2}
              className="btn-primary flex items-center gap-2 text-xs"
            >
              {loading ? <LoadingSpinner size="sm" /> : <GitCompare className="w-4 h-4" />}
              Compare Documents
            </button>
          </div>

          {comparisonOutput && (
            <div className="glass-card p-6 animate-slide-up">
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                <h3 className="text-sm font-bold text-white">
                  Comparison: {comparisonOutput.document_1} vs {comparisonOutput.document_2}
                </h3>
                <button
                  onClick={() => downloadText(comparisonOutput.comparison, 'Document_Comparison.md')}
                  className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg text-emerald-400 text-xs flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>
              </div>

              <div className="text-xs text-gray-200 leading-relaxed whitespace-pre-wrap">
                {comparisonOutput.comparison}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: NOTES GENERATOR */}
      {activeTab === 'notes' && (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Select Note Style</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
              {[
                { id: 'study', label: 'Study Notes', desc: 'Structured learning' },
                { id: 'revision', label: 'Quick Revision', desc: 'Exam/Memory sheet' },
                { id: 'interview', label: 'Interview Q&A', desc: 'Technical questions' },
                { id: 'bullet', label: 'Bullet Notes', desc: 'Key facts list' },
                { id: 'key_concepts', label: 'Key Concepts', desc: 'Definitions & terms' },
              ].map((nt) => (
                <button
                  key={nt.id}
                  onClick={() => setNoteType(nt.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    noteType === nt.id
                      ? 'bg-purple-500/20 border-purple-500 text-white'
                      : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <p className="text-xs font-semibold">{nt.label}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{nt.desc}</p>
                </button>
              ))}
            </div>

            <button
              onClick={handleGenerateNotes}
              disabled={loading || !selectedDocId}
              className="btn-primary flex items-center gap-2 text-xs"
            >
              {loading ? <LoadingSpinner size="sm" /> : <BookOpen className="w-4 h-4" />}
              Generate Notes
            </button>
          </div>

          {notesOutput && (
            <div className="glass-card p-6 animate-slide-up">
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white">{notesOutput.original_name}</h3>
                  <span className="text-[10px] text-purple-400 uppercase font-semibold">
                    {notesOutput.note_type} Notes
                  </span>
                </div>
                <button
                  onClick={() => downloadText(notesOutput.notes, `${notesOutput.original_name}_Notes.md`)}
                  className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg text-emerald-400 text-xs flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Notes</span>
                </button>
              </div>

              <div className="text-xs text-gray-200 leading-relaxed whitespace-pre-wrap">
                {notesOutput.notes}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: QUIZ GENERATOR & PLAYER */}
      {activeTab === 'quiz' && (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Select Quiz Difficulty</h3>
            <div className="flex gap-4 mb-6">
              {['easy', 'medium', 'hard'].map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-semibold uppercase transition-all ${
                    difficulty === d
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            <button
              onClick={handleGenerateQuiz}
              disabled={loading || !selectedDocId}
              className="btn-primary flex items-center gap-2 text-xs"
            >
              {loading ? <LoadingSpinner size="sm" /> : <HelpCircle className="w-4 h-4" />}
              Generate Quiz
            </button>
          </div>

          {quizOutput && (
            <div className="glass-card p-6 space-y-6 animate-slide-up">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-white">{quizOutput.original_name} — Quiz</h3>
                  <span className="text-[10px] text-amber-400 uppercase font-semibold">
                    Difficulty: {quizOutput.difficulty}
                  </span>
                </div>
              </div>

              {/* MCQs Section */}
              {quizOutput.quiz.mcqs && quizOutput.quiz.mcqs.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Multiple Choice Questions</h4>
                  {quizOutput.quiz.mcqs.map((q, idx) => (
                    <div key={q.id || idx} className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-3">
                      <p className="text-xs font-semibold text-white">Q{idx + 1}. {q.question}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt) => {
                          const isSelected = userAnswers[`mcq_${q.id}`] === opt
                          const isCorrect = opt === q.answer
                          let btnStyle = 'bg-white/5 border-white/10 text-gray-300'
                          if (submittedQuiz) {
                            if (isCorrect) btnStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold'
                            else if (isSelected) btnStyle = 'bg-rose-500/20 border-rose-500 text-rose-400'
                          } else if (isSelected) {
                            btnStyle = 'bg-primary-500/20 border-primary-500 text-white font-semibold'
                          }

                          return (
                            <button
                              key={opt}
                              disabled={submittedQuiz}
                              onClick={() => setUserAnswers({ ...userAnswers, [`mcq_${q.id}`]: opt })}
                              className={`p-2.5 rounded-lg border text-xs text-left transition-all ${btnStyle}`}
                            >
                              {opt}
                            </button>
                          )
                        })}
                      </div>
                      {submittedQuiz && (
                        <p className="text-[10px] text-emerald-400 mt-2 bg-emerald-500/10 p-2 rounded-lg">
                          <strong>Explanation:</strong> {q.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Submit Quiz Action */}
              <div className="pt-4 border-t border-white/5 flex justify-end">
                {!submittedQuiz ? (
                  <button
                    onClick={() => setSubmittedQuiz(true)}
                    className="btn-primary text-xs flex items-center gap-1.5"
                  >
                    <Award className="w-4 h-4" />
                    Submit Answers & Review Score
                  </button>
                ) : (
                  <button
                    onClick={() => setSubmittedQuiz(false)}
                    className="btn-secondary text-xs"
                  >
                    Reset Quiz
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: SMART INSIGHTS */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
          <div className="glass-card p-6 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Smart Document Analysis</h3>
              <p className="text-xs text-gray-400 mt-1">Automatically extract key entities, topics, reading time, and complexity.</p>
            </div>
            <button
              onClick={handleFetchInsights}
              disabled={loading || !selectedDocId}
              className="btn-primary flex items-center gap-2 text-xs"
            >
              {loading ? <LoadingSpinner size="sm" /> : <BarChart3 className="w-4 h-4" />}
              Fetch Insights
            </button>
          </div>

          {insightsOutput && (
            <div className="space-y-6 animate-slide-up">
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-card p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Reading Time</p>
                      <p className="text-lg font-bold text-white">{insightsOutput.reading_time_mins} Mins</p>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                      <Layers className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Total Word Count</p>
                      <p className="text-lg font-bold text-white">{insightsOutput.word_count} Words</p>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                      <Award className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Complexity Level</p>
                      <p className="text-lg font-bold text-emerald-400">{insightsOutput.complexity_level}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Topics & Keywords */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card p-6 space-y-4">
                  <div className="flex items-center gap-2 text-primary-400 text-xs font-bold uppercase tracking-wider">
                    <Tag className="w-4 h-4" />
                    <span>Main Topics</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {insightsOutput.main_topics.map((t) => (
                      <span key={t} className="px-3 py-1 bg-primary-500/10 border border-primary-500/20 text-primary-300 rounded-lg text-xs font-medium">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="glass-card p-6 space-y-4">
                  <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider">
                    <Cpu className="w-4 h-4" />
                    <span>Technologies & Tools</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {insightsOutput.technologies.map((tech) => (
                      <span key={tech} className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded-lg text-xs font-medium">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}
