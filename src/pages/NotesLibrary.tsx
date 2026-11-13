import { useState, useEffect, useRef } from "react"
import type { NavigateFn } from "../App"
import { authFetch, BACKEND_URL } from "../lib/api"
import { publicError } from "../lib/public-error"
import RevisionDeck from '../components/RevisionDeck'

interface NoteMeta {
  document_id: string
  original_filename: string
  paper: string
  subject: string
  topic: string
  pages: number
  total_chunks: number
  total_words: number
  avg_confidence: number
  upload_date: string
  processing_status: string
  tags: string[]
}

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-eka-success/15 text-eka-success border-eka-success/30",
  processing: "bg-gold/15 text-gold border-gold/30",
  pending: "bg-gold/10 text-gold/80 border-gold/20",
  failed: "bg-eka-danger/15 text-eka-danger border-eka-danger/30",
}

export default function NotesLibrary({
  navigate,
  user,
}: {
  navigate: NavigateFn
  user?: any
}) {
  const [notes, setNotes] = useState<NoteMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Array<{ id?: string; content?: string; payload?: { content?: string } }>>([])
  const [searched, setSearched] = useState(false)
  const [searching, setSearching] = useState(false)

  const [paperFilter, setPaperFilter] = useState("")
  const [subjectFilter, setSubjectFilter] = useState("")

  const [dragging, setDragging] = useState(false)
  const [uploadPaper, setUploadPaper] = useState("")
  const [uploadSubject, setUploadSubject] = useState("")
  const [uploadTopic, setUploadTopic] = useState("")

  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollTimeoutRef = useRef<any>(null)

  const fetchNotes = async () => {
    if (!user) {
      setNotes([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (paperFilter) params.append("paper", paperFilter)
      if (subjectFilter) params.append("subject", subjectFilter)

      const res = await authFetch(`${BACKEND_URL}/api/notes?${params.toString()}`)
      if (!res.ok) throw new Error(`Failed to load notes (HTTP ${res.status})`)
      const data = await res.json()
      setNotes(Array.isArray(data) ? data : [])
      setErrorMsg(null)
    } catch (err: any) {
      setNotes([])
      setErrorMsg(publicError(err, "Could not load your notes. Please try again."))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotes()
    return () => {
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current)
    }
  }, [user, paperFilter, subjectFilter])

  const handleUpload = async (file: File) => {
    if (!user) {
      setErrorMsg("Please sign in to upload and index personal notes.")
      return
    }

    if (file.size > 20 * 1024 * 1024) {
      setErrorMsg("File exceeds 20MB limit.")
      return
    }

    setUploading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      if (uploadPaper) formData.append("paper", uploadPaper)
      if (uploadSubject) formData.append("subject", uploadSubject)
      if (uploadTopic) formData.append("topic", uploadTopic)

      const res = await authFetch(`${BACKEND_URL}/api/notes/upload`, {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(errText || `Upload failed (HTTP ${res.status})`)
      }

      const data = await res.json()
      setSuccessMsg(
        `${file.name} uploaded. Processing started${data.file_id ? ` (ref ${String(data.file_id).slice(0, 8)})` : ""}.`,
      )

      // Poll for processing completion then refresh list
      if (data.file_id) {
        pollStatus(data.file_id, 0)
      } else {
        fetchNotes()
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Upload failed.")
    } finally {
      setUploading(false)
    }
  }

  const pollStatus = (fileId: string, attempt: number) => {
    if (attempt > 60) {
      fetchNotes()
      return
    }
    pollTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await authFetch(
          `${BACKEND_URL}/api/notes/upload/status/${fileId}`,
        )
        if (res.ok) {
          const status = await res.json()
          if (status.status === "completed" || status.status === "failed") {
            if (status.status === "completed") {
              setSuccessMsg(
                (prev) => prev || "Document processed and indexed.",
              )
            } else {
              setErrorMsg(status.error || "Processing failed.")
            }
            fetchNotes()
            return
          }
        }
      } catch {
        // retry
      }
      pollStatus(fileId, attempt + 1)
    }, 3000)
  }

  const handleDelete = async (noteId: string) => {
    if (!confirm("Delete this note and all its indexed chunks?")) return
    try {
      const res = await authFetch(`${BACKEND_URL}/api/notes/${noteId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error(`Delete failed (HTTP ${res.status})`)
      setNotes((prev) => prev.filter((n) => n.document_id !== noteId))
    } catch (err: any) {
      setErrorMsg(err?.message || "Delete failed.")
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true); setErrorMsg(null)
    try {
      const response = await authFetch(`${BACKEND_URL}/api/notes/search`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: searchQuery.trim(), top_k: 10, paper: paperFilter || undefined, subject: subjectFilter || undefined }) })
      if (!response.ok) throw new Error(`Search failed (HTTP ${response.status})`)
      const result = await response.json()
      if (!Array.isArray(result)) throw new Error("Unexpected search response")
      setSearchResults(result); setSearched(true)
    } catch (error) { setErrorMsg(publicError(error, "Could not search your notes.")) }
    finally { setSearching(false) }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files?.[0]) handleUpload(e.dataTransfer.files[0])
  }

  const papers = ["GS1", "GS2", "GS3", "GS4", "Essay"]
  const subjects = [
    "Governance",
    "Polity",
    "Economy",
    "Environment",
    "Technology",
    "Security",
    "Social Justice",
    "International Relations",
    "History",
    "Geography",
    "Society",
    "Culture",
    "Ethics",
    "General",
  ]

  if (!user) {
    return (
      <div className="min-h-screen bg-navy-deep pt-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-10 py-16 text-center">
          <div className="section-label mb-3">NOTES LIBRARY</div>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold text-white-pure mb-4">
            Your Private Knowledge Base
          </h1>
          <p className="text-slate-med max-w-xl mx-auto mb-8">
            Upload handwritten notes and syllabus materials. They are securely OCR'd,
            chunked, and indexed to ground your AI evaluations against your own notes.
          </p>
          <div className="bg-card rounded-2xl p-8 border border-gold/20 max-w-md mx-auto gold-border">
            <div className="text-3xl mb-4">🔐</div>
            <h3 className="text-lg font-semibold text-white-pure mb-2">
              Sign In to Access Your Notes
            </h3>
            <p className="text-xs text-slate-med mb-6">
              Create an account or sign in to upload, organize, and query your personal study materials.
            </p>
            <button
              onClick={() => navigate("login")}
              className="w-full bg-gold hover:bg-gold-bright text-navy-deep font-bold py-3 px-6 rounded-xl transition-all shadow-md font-mono text-sm"
            >
              SIGN IN / REGISTER
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-navy-deep pt-20">
      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="section-label mb-3">NOTES LIBRARY</div>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold text-white-pure mb-3">
            Your knowledge base.
          </h1>
          <p className="text-slate-med">
            Upload handwritten notes and PDFs. They are OCR'd, chunked, and
            indexed so evaluations can cite your own material.
          </p>
        </div>

        <RevisionDeck key={user.id} userId={user.id} />
        {/* Messages */}
        {errorMsg && (
          <div className="bg-eka-danger/10 border border-eka-danger/40 rounded-xl p-4 mb-6 flex items-start gap-3">
            <span className="text-eka-danger text-lg leading-none mt-0.5">⚠</span>
            <div className="flex-1">
              <p className="text-eka-danger font-bold text-xs uppercase tracking-wider mb-1">
                Error
              </p>
              <p className="text-eka-danger/90 text-xs leading-relaxed">
                {publicError(errorMsg, "Could not complete the notes request. Please try again.")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-eka-danger/60 hover:text-eka-danger text-lg leading-none"
            >
              ×
            </button>
          </div>
        )}
        {successMsg && (
          <div className="bg-eka-success/10 border border-eka-success/40 rounded-xl p-4 mb-6 flex items-start gap-3">
            <span className="text-eka-success text-lg leading-none mt-0.5">✓</span>
            <div className="flex-1">
              <p className="text-eka-success font-bold text-xs uppercase tracking-wider mb-1">
                Success
              </p>
              <p className="text-eka-success/90 text-xs leading-relaxed">
                {successMsg}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMsg(null)}
              className="text-eka-success/60 hover:text-eka-success text-lg leading-none"
            >
              ×
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Panel */}
          <div className="space-y-5">
            <div className="bg-card rounded-2xl p-6 gold-border">
              <h3 className="text-sm font-semibold text-white-pure mb-5 tracking-wide">
                Upload Notes
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-mono text-gold tracking-widest mb-2 block">
                    PAPER (OPTIONAL)
                  </label>
                  <select
                    value={uploadPaper}
                    onChange={(e) => setUploadPaper(e.target.value)}
                    disabled={uploading}
                    className="w-full bg-elevated border border-gold/15 rounded-xl px-4 py-3 text-sm text-muted-white focus:border-gold/40 focus:outline-none transition-colors appearance-none cursor-pointer disabled:opacity-50"
                  >
                    <option value="">Auto-detect</option>
                    {papers.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-gold tracking-widest mb-2 block">
                    SUBJECT (OPTIONAL)
                  </label>
                  <select
                    value={uploadSubject}
                    onChange={(e) => setUploadSubject(e.target.value)}
                    disabled={uploading}
                    className="w-full bg-elevated border border-gold/15 rounded-xl px-4 py-3 text-sm text-muted-white focus:border-gold/40 focus:outline-none transition-colors appearance-none cursor-pointer disabled:opacity-50"
                  >
                    <option value="">Auto-detect</option>
                    {subjects.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-gold tracking-widest mb-2 block">
                    TOPIC (OPTIONAL)
                  </label>
                  <input
                    type="text"
                    value={uploadTopic}
                    onChange={(e) => setUploadTopic(e.target.value)}
                    disabled={uploading}
                    placeholder="e.g. Federalism, Budget 2024..."
                    className="w-full bg-elevated border border-gold/15 rounded-xl px-4 py-3 text-sm text-muted-white placeholder-slate-med/50 focus:border-gold/40 focus:outline-none transition-colors disabled:opacity-50"
                  />
                </div>

                {/* Drop zone */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleUpload(e.target.files[0])
                    e.target.value = ""
                  }}
                  disabled={uploading}
                />
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                    dragging
                      ? "border-gold/60 bg-gold/5"
                      : "border-gold/20 hover:border-gold/40"
                  } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragging(true)
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <span className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin"></span>
                      <span className="text-xs text-slate-med">
                        Uploading & indexing...
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="text-gold text-2xl mb-2">📤</div>
                      <div className="text-white-pure text-sm font-semibold mb-1">
                        Drop notes here
                      </div>
                      <div className="text-slate-med text-xs">
                        JPG, PNG, or PDF (up to 20MB)
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Notes List */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-card rounded-2xl p-4 border border-gold/15">
              <label htmlFor="note-search" className="text-xs text-gold block mb-2">SEARCH YOUR NOTES</label>
              <div className="flex gap-2"><input id="note-search" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter") handleSearch() }} placeholder="Search indexed content" className="bg-elevated border border-gold/15 rounded-lg px-3 py-2 text-sm text-white-pure flex-1" /><button type="button" className="btn-secondary" onClick={handleSearch} disabled={searching}>{searching ? "Searching…" : "Search"}</button></div>
              {searched && <div className="mt-4 space-y-2">{searchResults.length === 0 ? <p className="text-sm text-slate-med">No matching passages.</p> : searchResults.map((result, index) => <p key={result.id || index} className="text-sm text-muted-white border-t border-gold/10 pt-2 whitespace-pre-wrap">{result.content || result.payload?.content || "Passage text unavailable"}</p>)}</div>}
            </div>
            {/* Filters */}
            <div className="bg-card rounded-2xl p-4 border border-gold/15 flex flex-wrap items-center gap-3">
              <span className="text-[10px] font-mono text-gold tracking-widest">
                FILTER
              </span>
              <select
                value={paperFilter}
                onChange={(e) => setPaperFilter(e.target.value)}
                className="bg-elevated border border-gold/15 rounded-lg px-3 py-2 text-xs text-muted-white focus:border-gold/40 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="">All Papers</option>
                {papers.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="bg-elevated border border-gold/15 rounded-lg px-3 py-2 text-xs text-muted-white focus:border-gold/40 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={fetchNotes}
                className="ml-auto text-xs text-gold hover:text-gold/80 font-mono"
              >
                ↻ Refresh
              </button>
            </div>

            {/* Notes Grid */}
            {loading ? (
              <div className="bg-card rounded-2xl border border-gold/15 p-10 text-center">
                <span className="inline-block w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin"></span>
                <p className="text-slate-med text-xs mt-3">Loading notes...</p>
              </div>
            ) : notes.length === 0 ? (
              <div className="bg-card rounded-2xl border border-gold/15 p-10 text-center">
                <div className="text-3xl mb-3">📚</div>
                <p className="text-white-pure font-semibold mb-1">
                  No notes indexed yet
                </p>
                <p className="text-slate-med text-xs">
                  Upload your handwritten notes or summaries to build your personal
                  knowledge base.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map((note) => (
                  <div
                    key={note.document_id}
                    className="bg-card rounded-xl p-4 border border-gold/10 hover:border-gold/25 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center text-gold text-lg shrink-0">
                        {note.original_filename?.toLowerCase().endsWith(".pdf")
                          ? "📑"
                          : "🖼️"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-muted-white truncate">
                            {note.original_filename}
                          </span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase ${
                              STATUS_COLORS[note.processing_status] ||
                              "bg-elevated text-slate-med border-white/10"
                            }`}
                          >
                            {note.processing_status}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[11px] text-slate-med">
                          {note.paper && note.paper !== "Unknown" && (
                            <span className="text-gold/80">{note.paper}</span>
                          )}
                          {note.subject && note.subject !== "General" && (
                            <span>{note.subject}</span>
                          )}
                          {note.topic && note.topic !== "General" && (
                            <span>{note.topic}</span>
                          )}
                          <span>{note.pages} page(s)</span>
                          <span>{note.total_chunks} chunks</span>
                          <span>{note.total_words} words</span>
                          {note.avg_confidence > 0 && (
                            <span>
                              OCR{" "}
                              {Math.round(note.avg_confidence * 100)}%
                            </span>
                          )}
                        </div>
                        {note.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {note.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] bg-gold/10 text-gold/80 px-2 py-0.5 rounded-full border border-gold/20"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(note.document_id)}
                        className="text-slate-med hover:text-eka-danger text-sm px-2 py-1 transition-colors shrink-0"
                        aria-label="Delete note"
                        title="Delete note"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
