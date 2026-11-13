import { useState, useRef, useEffect } from "react"
import type { NavigateFn } from "../App"
import { DEMO_REPORT_DATA } from "../types/evaluation"
import { authFetch, BACKEND_URL } from "../lib/api"
import { sameEvaluationDraft as sameDraft } from "../lib/evaluation-confirmation"
import { PAPERS, PAPER_LABELS, normalizedPaper, settingsError, stageLabel, type Paper } from "../lib/evaluation-settings"
import { publicError } from "../lib/public-error"

type EvaluationMode = "live" | "demo"

export type ProgressionStage = "queued" | "retrying" | "uploading" | "preprocessing" | "ocr" | "retrieval" | "question_analysis" | "evaluating" | "scoring" | "completed" | "failed"

interface StageInfo {
  key: ProgressionStage
  label: string
  desc: string
  progress: number
}

const STAGES: StageInfo[] = [
  {
    key: "uploading",
    label: "Uploading your answer",
    desc: "Securely uploading answer pages to evaluation server",
    progress: 10,
  },
  {
    key: "preprocessing",
    label: "Preparing your pages",
    desc: "Checking the uploaded document and preparing its pages",
    progress: 20,
  },
  {
    key: "ocr",
    label: "Reading your answer",
    desc: "Extracting handwritten UPSC text line by line",
    progress: 30,
  },
  {
    key: "retrieval",
    label: "Finding relevant references",
    desc: "Looking for relevant supporting references",
    progress: 45,
  },
  {
    key: "evaluating",
    label: "Reviewing your answer",
    desc: "Reviewing your answer against the selected paper's rubric",
    progress: 75,
  },
  {
    key: "scoring",
    label: "Checking marks and preparing feedback",
    desc: "Checking the rubric total and preparing your feedback",
    progress: 90,
  },
  {
    key: "completed",
    label: "Evaluation Complete",
    desc: "Report generated with comprehensive examiner diagnostics",
    progress: 100,
  },
]

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".pdf"]
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "application/pdf",
]
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024 // 20 MB

export default function Evaluate({
  navigate,
  setReportData,
  practiceSelection,
}: {
  navigate: NavigateFn
  setReportData: (data: any) => void
  practiceSelection?: { text: string; paper: string; marks: number; challengeDay?: number } | null
}) {
  const [mode, setMode] = useState<EvaluationMode>("live")
  const [exam, setExam] = useState("UPSC CSE")
  const [paper, setPaper] = useState(practiceSelection?.paper || "GS2")
  const [marks, setMarks] = useState(String(practiceSelection?.marks || 10))
  const [wordLimit, setWordLimit] = useState(practiceSelection?.marks === 15 ? "250" : "150")
  const [question, setQuestion] = useState(practiceSelection?.text || "")
  const [isQuestionConfirmed, setIsQuestionConfirmed] = useState(false)
  const [confirmationToken, setConfirmationToken] = useState<string | null>(null)
  const [confirmationExpiresAt, setConfirmationExpiresAt] = useState<number | null>(null)
  const [isEvaluating, setIsEvaluating] = useState(false)
  useEffect(() => {
    if (!confirmationToken || !confirmationExpiresAt || mode !== "live" || isEvaluating) return
    const timer = setTimeout(() => {
      confirmedDraft.current = null
      setConfirmationToken(null)
      setIsQuestionConfirmed(false)
      setErrorMsg("Your question confirmation has expired. Check your question and settings, then click Confirm Question again.")
    }, Math.max(0, confirmationExpiresAt - Date.now()))
    return () => clearTimeout(timer)
  }, [confirmationToken, confirmationExpiresAt, mode, isEvaluating])
  const draftRef = useRef({ question, paper, marks, wordLimit, file: null as File | null })
  const confirmedDraft = useRef<typeof draftRef.current | null>(null)
  const [isConfirmingQuestion, setIsConfirmingQuestion] = useState(false)

  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  draftRef.current = { question, paper, marks, wordLimit, file }

  const [autoDetecting, setAutoDetecting] = useState(false)
  const [detectedInfo, setDetectedInfo] = useState<any>(null)
  const [currentStage, setCurrentStage] = useState<ProgressionStage | null>(
    null,
  )
  const [progressPercent, setProgressPercent] = useState<number>(0)
  const [lowOcrConfidence, setLowOcrConfidence] = useState<number | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollingTimeoutRef = useRef<any>(null)

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current)
      }
    }
  }, [])

  // Auto-adjust word limit based on marks selection
  const handleMarksSelect = (m: string) => {
    setMarks(m)
    setIsQuestionConfirmed(false)
    setConfirmationToken(null)
    if (m === "125") setWordLimit("1000")
    else if (m === "10") setWordLimit("150")
    else if (m === "15") setWordLimit("250")
    else if (m === "20") setWordLimit("250")
    else if (m === "25") setWordLimit("300")
  }

  // Switch modes: clear state or preload demo
  const handleModeSwitch = (newMode: EvaluationMode) => {
    setMode(newMode)
    setErrorMsg(null)
    setLowOcrConfidence(null)
    setIsEvaluating(false)
    setCurrentStage(null)
    setDetectedInfo(null)

    if (newMode === "demo") {
      setExam("UPSC CSE")
      setPaper("GS2")
      setMarks("10")
      setWordLimit("150")
      setQuestion(
        "Digital India is not just about digital infrastructure but a fundamental shift in governance. Examine.",
      )
      setIsQuestionConfirmed(true)
      setConfirmationToken("demo-mock-token")
    } else {
      setQuestion("")
      setFile(null)
      setIsQuestionConfirmed(false)
      setConfirmationToken(null)
    }
  }

  // Validate file
  const validateAndSetFile = (candidate: File | null) => {
    if (!candidate) return

    const lowerName = candidate.name.toLowerCase()
    const fileExt = lowerName.includes(".")
      ? lowerName.slice(lowerName.lastIndexOf("."))
      : ""
    const mimeType = candidate.type.toLowerCase()

    const isExtValid = ALLOWED_EXTENSIONS.includes(fileExt)
    const isMimeValid =
      ALLOWED_MIME_TYPES.includes(mimeType) || (!mimeType && isExtValid)

    if (!isExtValid && !isMimeValid) {
      setErrorMsg(
        "Unsupported format. Please upload a JPG, JPEG, PNG, or PDF file.",
      )
      setFile(null)
      return
    }

    if (candidate.size > MAX_FILE_SIZE_BYTES) {
      setErrorMsg(
        `File size exceeds 20MB limit (${(candidate.size / (1024 * 1024)).toFixed(1)}MB). Please upload a smaller file.`,
      )
      setFile(null)
      return
    }

    setFile(candidate)
    setIsQuestionConfirmed(false)
    setConfirmationToken(null)
    setErrorMsg(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0])
    }
    // Reset file input value so re-uploading the exact same file triggers change event
    e.target.value = ""
  }

  // Auto-detect question from uploaded file via OCR + detection pipeline
  const handleAutoDetect = async () => {
    if (!file) {
      setErrorMsg("Upload a file first to auto-detect the question.")
      return
    }

    const detectionFile = file
    const detectionDraft = { ...draftRef.current }
    setAutoDetecting(true)
    setErrorMsg(null)

    try {
      // Step 1: Run OCR preview to extract text
      const formData = new FormData()
      formData.append("file", file)

      const ocrRes = await authFetch(`${BACKEND_URL}/api/ocr/preview`, {
        method: "POST",
        body: formData,
      })

      if (!ocrRes.ok) {
        const errText = await ocrRes.text()
        throw new Error(errText || `OCR preview failed (HTTP ${ocrRes.status})`)
      }

      const ocrData = await ocrRes.json()
      const ocrText = ocrData.text || ""

      if (!ocrText.trim()) {
        throw new Error(
          "OCR extracted no text from the file. Ensure the image is clear and readable.",
        )
      }

      // Step 2: Detect question intelligence from OCR text
      const detectRes = await authFetch(`${BACKEND_URL}/api/detect/question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ocr_text: ocrText }),
      })

      if (!detectRes.ok) {
        const errText = await detectRes.text()
        throw new Error(errText || `Detection failed (HTTP ${detectRes.status})`)
      }

      const detectData = await detectRes.json()
      const intel = detectData.question_intelligence
      if (!sameDraft(detectionDraft, draftRef.current)) {
        throw new Error("The file or question changed during detection. Your latest edits were kept; retry detection if needed.")
      }

      if (!intel?.question_text?.trim()) {
        throw new Error("The question could not be separated reliably from the answer. Please enter only the question above, then confirm it.")
      }
      if (intel) {
        setDetectedInfo(intel)

        // Auto-fill form fields
        const detectedPaper = normalizedPaper(String(intel.paper || ''))
        if (detectedPaper) setPaper(detectedPaper)
        if (Number.isInteger(intel.marks_estimate) && intel.marks_estimate > 0 && intel.marks_estimate <= 250) {
          const m = String(intel.marks_estimate)
          setMarks(m)
          if (Number.isInteger(intel.word_limit_estimate) && intel.word_limit_estimate > 0 && intel.word_limit_estimate <= 5000) {
            setWordLimit(String(intel.word_limit_estimate))
          } else {
            handleMarksSelect(m)
          }
        }
        if (intel.question_text) {
          setQuestion(intel.question_text)
        }
        setIsQuestionConfirmed(false)
        setConfirmationToken(null)
      }
    } catch (err: any) {
      console.error("Auto-detect error:", err)
      setErrorMsg(publicError(err, "Auto-detection failed. Please fill in the question manually."))
    } finally {
      setAutoDetecting(false)
    }
  }

  // Map backend pipeline stages to UI progression stages
  const mapBackendStage = (
    stageStr?: string,
    statusStr?: string,
  ): ProgressionStage => {
    if (statusStr === "failed") return "failed"
    if (statusStr === "completed") return "completed"
    if (!stageStr) return "uploading"
    const s = stageStr.toLowerCase()
    if (s === "queued" || s === "claimed") return "queued"
    if (s === "retrying") return "retrying"
    if (s.includes("fail")) return "failed"
    if (s.includes("complete")) return "completed"
    if (s.includes("upload")) return "uploading"
    if (s.includes("preproc")) return "preprocessing"
    if (s.includes("ocr")) return "ocr"
    if (s.includes("retriev")) return "retrieval"
    if (s.includes("demand") || s.includes("question")) return "question_analysis"
    if (s.includes("evaluat")) return "evaluating"
    if (s.includes("scor")) return "scoring"
    return "evaluating"
  }

  // Demo evaluation simulation
  const runDemoEvaluation = async () => {
    setIsEvaluating(true)
    setErrorMsg(null)
    setLowOcrConfidence(null)

    const demoSteps: {
      stage: ProgressionStage
      progress: number
      delay: number
    }[] = [
      { stage: "uploading", progress: 10, delay: 500 },
      { stage: "preprocessing", progress: 20, delay: 600 },
      { stage: "ocr", progress: 30, delay: 700 },
      { stage: "retrieval", progress: 45, delay: 600 },
      { stage: "evaluating", progress: 75, delay: 700 },
      { stage: "scoring", progress: 90, delay: 600 },
    ]

    for (const step of demoSteps) {
      setCurrentStage(step.stage)
      setProgressPercent(step.progress)
      await new Promise((resolve) => setTimeout(resolve, step.delay))
    }

    setCurrentStage("completed")
    setProgressPercent(100)
    setReportData({
      id: "demo",
      data: { report: DEMO_REPORT_DATA, ocrData: null },
    })
    // Brief transition delay so user visually sees 100% completion in step tracker
    await new Promise((resolve) => setTimeout(resolve, 600))
    setIsEvaluating(false)
    navigate("report", { id: "demo" })
  }

  // Computes SHA-256 hex fingerprint for tamper-proof token binding
  const computeFileHash = async (fileObj: File): Promise<string> => {
    const arrayBuffer = await fileObj.arrayBuffer()
    const digestBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer)
    const hashArray = Array.from(new Uint8Array(digestBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  }

  // Explicit server-signed question confirmation
  const handleConfirmQuestion = async () => {
    const invalidSettings = settingsError(paper, marks, wordLimit)
    if (invalidSettings) { setErrorMsg(invalidSettings); return }
    if (!question.trim()) {
      setErrorMsg("Please enter question text before confirming.")
      return
    }

    const requestedDraft = { ...draftRef.current }
    setIsConfirmingQuestion(true)
    setErrorMsg(null)

    try {
      let fileHash: string | undefined = undefined
      if (file) {
        try {
          fileHash = await computeFileHash(file)
        } catch (hashErr) {
          console.warn("Could not compute file hash fingerprint:", hashErr)
        }
      }

      const res = await authFetch(`${BACKEND_URL}/api/evaluations/confirm-question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ocrDetectedQuestion: detectedInfo?.question_text || "",
          userConfirmedQuestion: question.trim(),
          wasAutoDetected: !!(
            detectedInfo?.question_text && detectedInfo.question_text.trim().length > 0
          ),
          paper,
          marksEstimate: Number(marks),
          wordLimitEstimate: Number(wordLimit),
          fileHash,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Question confirmation failed (HTTP ${res.status})`)
      }

      const data = await res.json()
      if (!data.confirmationToken) {
        throw new Error("Server confirmed question but failed to return confirmation token.")
      }

      if (!sameDraft(requestedDraft, draftRef.current)) {
        throw new Error("Your question or settings changed while confirming. Please confirm the latest details again.")
      }
      confirmedDraft.current = requestedDraft
      setConfirmationToken(data.confirmationToken)
      setConfirmationExpiresAt(Date.parse(data.expiresAt) || Date.now() + 15 * 60 * 1000)
      setIsQuestionConfirmed(true)
    } catch (err: any) {
      setErrorMsg(publicError(err, "Could not confirm your question. Please try again."))
      setIsQuestionConfirmed(false)
      setConfirmationToken(null)
    } finally {
      setIsConfirmingQuestion(false)
    }
  }

  // Live evaluation pipeline
  const handleEvaluate = async () => {
    if (mode === "demo") {
      runDemoEvaluation()
      return
    }

    const invalidSettings = settingsError(paper, marks, wordLimit)
    if (invalidSettings) { setErrorMsg(invalidSettings); return }

    if (!file) {
      setErrorMsg("Please upload an answer script before starting evaluation.")
      return
    }

    if (!question.trim()) {
      setErrorMsg(
        "Please enter the question text to ground the evaluation rubrics.",
      )
      return
    }

    if (!isQuestionConfirmed || !confirmationToken || !sameDraft(confirmedDraft.current, draftRef.current)) {
      confirmedDraft.current = null
      setConfirmationToken(null)
      setIsQuestionConfirmed(false)
      setErrorMsg(
        "Please confirm the detected or edited question before starting evaluation.",
      )
      return
    }

    setIsEvaluating(true)
    setCurrentStage("uploading")
    setProgressPercent(10)
    setErrorMsg(null)
    setLowOcrConfidence(null)

    try {
      const formData = new FormData()
      formData.append("image", file)
      formData.append("exam", exam)
      formData.append("paper", paper)
      formData.append("marks", marks)
      formData.append("maximumMarks", marks)
      formData.append("wordLimit", wordLimit)
      formData.append("word_limit", wordLimit)
      formData.append("question", question.trim())
      formData.append("mode", "strict")
      formData.append("confirmationToken", confirmationToken)

      const res = await authFetch(`${BACKEND_URL}/api/evaluations`, {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const failure = await res.json().catch(() => ({}))
        if (["MISSING_CONFIRMATION_TOKEN", "TOKEN_PAYLOAD_MISMATCH", "EXPIRED_CONFIRMATION_TOKEN", "INVALID_CONFIRMATION_TOKEN"].includes(failure.code)) {
          confirmedDraft.current = null
          setConfirmationToken(null)
          setIsQuestionConfirmed(false)
          setCurrentStage(null)
          setActiveJobId(null)
          setProgressPercent(0)
          setIsEvaluating(false)
          setErrorMsg(failure.code === "EXPIRED_CONFIRMATION_TOKEN"
            ? "Your question confirmation has expired. Check your question and settings, then click Confirm Question again."
            : "Your question confirmation was rejected. Check the selected file, question and paper, then click Confirm Question again.")
          return
        }
        throw new Error(failure.error || `Server returned error HTTP ${res.status}`)
      }

      const resData = await res.json()
      const evaluationId =
        resData.evaluationId || resData.evaluation_id || resData.id

      if (!evaluationId) {
        throw new Error(
          "Backend accepted upload but failed to generate an evaluation job ID.",
        )
      }

      setActiveJobId(evaluationId)

      // Start Polling Loop
      let consecutiveErrors = 0

      const poll = async () => {
        try {
          const statusRes = await authFetch(
            `${BACKEND_URL}/api/evaluations/${evaluationId}`,
          )
          if (!statusRes.ok) {
            throw new Error(`Polling request returned HTTP ${statusRes.status}`)
          }

          consecutiveErrors = 0
          const statusData = await statusRes.json()

          // Map progression stage (status takes precedence for terminal states)
          const mappedStage = mapBackendStage(
            statusData.stage,
            statusData.status,
          )
          setCurrentStage(mappedStage)

          // Progress percentage
          if (
            typeof statusData.progress === "number" &&
            statusData.progress > 0
          ) {
            setProgressPercent(Math.max(0, Math.min(99, statusData.progress)))
          } else {
            const foundStage = STAGES.find((s) => s.key === mappedStage)
            setProgressPercent(foundStage?.progress || 0)
          }

          // Check OCR Confidence
          const avgConfidence =
            statusData.report?.ocrData?.averageConfidence ??
            statusData.ocr_result?.averageConfidence ??
            statusData.ocrConfidence ??
            null

          if (avgConfidence !== null && avgConfidence < 0.7) {
            setLowOcrConfidence(Math.round(avgConfidence * 100))
          }

          if (statusData.status === "completed") {
            setProgressPercent(100)
            setCurrentStage("completed")
            if (practiceSelection?.challengeDay && statusData.report?.report?.evaluationStatus === "final") {
              try {
                const link = await authFetch(`${BACKEND_URL}/api/challenge/complete`, {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ dayNumber: practiceSelection.challengeDay, evaluationId }),
                })
                if (!link.ok) console.warn("Challenge day could not be linked. The evaluation remains in your history.")
              } catch { console.warn("Challenge day could not be linked. Retry from the challenge page.") }
            }
            // Deliver real evaluation report data associated with evaluation ID
            setReportData({ id: evaluationId, data: statusData.report })
            pollingTimeoutRef.current = setTimeout(() => {
              setIsEvaluating(false)
              // Navigate to report with real evaluation_id in URL
              navigate("report", { id: evaluationId })
            }, 600)
          } else if (statusData.status === "failed") {
            setCurrentStage("failed")
            setIsEvaluating(false)
            setErrorMsg(publicError(statusData.error, "Your evaluation could not finish. Please try again."))
          } else {
            // Keep polling every 1500ms
            pollingTimeoutRef.current = setTimeout(poll, 1500)
          }
        } catch (pollErr: any) {
          consecutiveErrors++
          if (consecutiveErrors >= 5) {
            setCurrentStage("failed")
            setIsEvaluating(false)
            setErrorMsg("Connection interrupted. Your evaluation may still be running. Check your evaluation history before submitting again.")
          } else {
            // Retry polling shortly
            pollingTimeoutRef.current = setTimeout(poll, 2000)
          }
        }
      }

      // Initial poll after short delay
      pollingTimeoutRef.current = setTimeout(poll, 1200)
    } catch (err: any) {
      console.error("Submission error:", err)
      setCurrentStage("failed")
      setIsEvaluating(false)
      setErrorMsg(publicError(err, "Could not start your evaluation. Please check your connection and try again."))
    }
  }

  const handleRetry = () => {
    setErrorMsg(null)
    setCurrentStage(null)
    setProgressPercent(0)
    setLowOcrConfidence(null)
    handleEvaluate()
  }

  // Get index of active stage for step indicator
  const currentStageIndex = STAGES.findIndex((s) => s.key === currentStage)

  return (
    <div className="min-h-screen bg-navy-deep pt-20">
      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-12">
        {/* Header & Mode Switcher */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="section-label mb-3">EVALUATE</div>
            <h1 className="font-display text-3xl lg:text-4xl font-semibold text-white-pure mb-3">
              Upload your answer.
            </h1>
            <p className="text-slate-med">
              Get an authentic 8-parameter evaluation powered by deterministic
              scoring & OCR.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-elevated rounded-xl border border-gold/15 shrink-0 self-start md:self-auto">
            <button
              type="button"
              onClick={() => handleModeSwitch("live")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                mode === "live"
                  ? "bg-gold text-navy-deep font-bold shadow-md"
                  : "text-slate-med hover:text-white-pure"
              }`}
            >
              ⚡ Live AI Evaluation
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch("demo")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                mode === "demo"
                  ? "bg-gold text-navy-deep font-bold shadow-md"
                  : "text-slate-med hover:text-white-pure"
              }`}
            >
              🧪 Demo Mode
            </button>
          </div>
        </div>

        {/* Mode Notification Banner */}
        {mode === "demo" ? (
          <div className="bg-gold/10 border border-gold/30 rounded-xl p-4 mb-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">🧪</span>
              <div>
                <p className="text-gold font-bold text-xs uppercase tracking-wider">
                  Demo Mode Active
                </p>
                <p className="text-slate-med text-xs mt-0.5">
                  Demonstrates the full UPSC evaluation flow using pre-loaded
                  sample GS II script. No upload required.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono bg-gold/20 text-gold px-2.5 py-1 rounded-full uppercase shrink-0">
              Offline Sample
            </span>
          </div>
        ) : (
          <div className="bg-elevated/60 border border-white/5 rounded-xl p-3.5 mb-8 flex items-center gap-3 text-xs text-slate-med">
            <span className="text-gold">⚡</span>
            <span>
              <strong className="text-white-pure font-medium">
                Evaluate your answer:
              </strong>{" "}
              Check the question, paper, marks and word limit before confirming.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left Column: Question Context Form */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-card rounded-2xl p-6 gold-border">
              <h3 className="text-sm font-semibold text-white-pure mb-5 tracking-wide">
                Question Context
              </h3>

              <div className="space-y-4">
                {/* Exam Selection */}
                <div>
                  <label className="text-[10px] font-mono text-gold tracking-widest mb-2 block">
                    EXAM
                  </label>
                  <select
                    value={exam}
                    onChange={(e) => setExam(e.target.value)}
                    disabled={isEvaluating}
                    className="w-full bg-elevated border border-gold/15 rounded-xl px-4 py-3 text-sm text-muted-white focus:border-gold/40 focus:outline-none transition-colors appearance-none cursor-pointer disabled:opacity-50"
                  >
                    <option>UPSC CSE</option>
                    <option>UPSC IFoS</option>
                    <option>State PCS</option>
                  </select>
                </div>

                {/* Paper Selection */}
                <div>
                  <label className="text-[10px] font-mono text-gold tracking-widest mb-2 block">
                    PAPER
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {PAPERS.map(
                      (p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            setPaper(p)
                            if (p === "Essay") { setMarks("125"); setWordLimit("1000") }
                            else if (paper === "Essay") { setMarks("10"); setWordLimit("150") }
                            setIsQuestionConfirmed(false)
                            setConfirmationToken(null)
                          }}
                          disabled={isEvaluating}
                          className={`py-2 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50 ${
                            paper === p
                              ? "bg-gold/15 border-gold/50 text-gold"
                              : "bg-elevated border-gold/10 text-slate-med hover:border-gold/25"
                          }`}
                        >
                          {PAPER_LABELS[p]}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                {/* Marks Selection */}
                <div>
                  <label className="text-[10px] font-mono text-gold tracking-widest mb-2 block">
                    MARKS
                  </label>
                  <div className="flex gap-2">
                    {(paper === "Essay" ? ["100", "125"] : ["10", "15", "20", "25"]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleMarksSelect(m)}
                        disabled={isEvaluating}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-mono font-bold border transition-all disabled:opacity-50 ${
                          marks === m
                            ? "bg-gold text-navy-deep border-gold"
                            : "bg-elevated border-gold/10 text-slate-med hover:border-gold/25"
                        }`}
                      >
                        {m}M
                      </button>
                    ))}
                    <input aria-label="Maximum marks" type="number" min="1" max="250" step="1" value={marks}
                      onChange={e => { setMarks(e.target.value); setIsQuestionConfirmed(false); setConfirmationToken(null) }}
                      disabled={isEvaluating} className="w-20 bg-elevated border border-gold/15 rounded-lg px-2 text-sm text-muted-white" />
                  </div>
                  <p className="text-[11px] text-slate-med mt-2">Use the marks and word limit printed on your question. Presets are suggestions.</p>
                </div>

                {/* Word Limit Input */}
                <div>
                  <label className="text-[10px] font-mono text-gold tracking-widest mb-2 block">
                    WORD LIMIT
                  </label>
                  <div className="flex gap-2">
                    {(paper === "Essay" ? ["1000", "1200"] : ["150", "250", "300"]).map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => {
                          setWordLimit(w)
                          setIsQuestionConfirmed(false)
                          setConfirmationToken(null)
                        }}
                        disabled={isEvaluating}
                        className={`flex-1 py-2 rounded-lg text-xs font-mono font-semibold border transition-all disabled:opacity-50 ${
                          wordLimit === w
                            ? "bg-gold/15 border-gold/50 text-gold"
                            : "bg-elevated border-gold/10 text-slate-med hover:border-gold/25"
                        }`}
                      >
                        {w} words
                      </button>
                    ))}
                    <input
                      type="number"
                      aria-label="Word limit" min="1" max="5000" step="1"
                      value={wordLimit}
                      onChange={(e) => {
                        setWordLimit(e.target.value)
                        setIsQuestionConfirmed(false)
                        setConfirmationToken(null)
                      }}
                      disabled={isEvaluating}
                      placeholder="Custom"
                      className="w-24 bg-elevated border border-gold/15 rounded-lg px-2.5 py-1.5 text-xs text-muted-white text-center font-mono focus:border-gold/40 focus:outline-none disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Question Input */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-mono text-gold tracking-widest">
                      QUESTION TEXT
                    </label>
                    {mode === "live" && file && !isEvaluating && (
                      <button
                        type="button"
                        onClick={handleAutoDetect}
                        disabled={autoDetecting}
                        className={`text-[10px] font-mono px-2.5 py-1 rounded-lg border transition-all ${
                          autoDetecting
                            ? "bg-gold/20 border-gold/40 text-gold cursor-wait"
                            : "bg-gold/10 border-gold/30 text-gold hover:bg-gold/20"
                        }`}
                      >
                        {autoDetecting
                          ? "⏳ Detecting..."
                          : "✨ Auto-Detect from Script"}
                      </button>
                    )}
                  </div>
                  <textarea
                    value={question}
                    onChange={(e) => {
                      setQuestion(e.target.value)
                      setIsQuestionConfirmed(false)
                      setConfirmationToken(null)
                    }}
                    disabled={isEvaluating}
                    placeholder="Paste or type the question here, or use Auto-Detect..."
                    rows={4}
                    className="w-full bg-elevated border border-gold/15 rounded-xl px-4 py-3 text-sm text-muted-white placeholder-slate-med/50 focus:border-gold/40 focus:outline-none transition-colors resize-none disabled:opacity-50"
                  />

                  {/* Explicit Question Confirmation Panel */}
                  {mode === "live" && (
                    <div className="mt-3 p-3.5 rounded-xl border transition-all bg-elevated/70 border-gold/20 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-gold tracking-widest uppercase">
                          Question Confirmation
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          isQuestionConfirmed
                            ? "bg-eka-success/15 border-eka-success/40 text-eka-success"
                            : "bg-eka-warning/15 border-eka-warning/40 text-eka-warning"
                        }`}>
                          {isQuestionConfirmed ? "✓ Confirmed" : "⚠ Pending Confirmation"}
                        </span>
                      </div>

                      {detectedInfo?.question_text && (
                        <div className="text-[11px] text-slate-med border-l-2 border-gold/40 pl-2.5 py-0.5">
                          <span className="text-gold/70 block text-[10px] uppercase font-mono">Raw OCR Detection:</span>
                          <span className="italic line-clamp-2">{detectedInfo.question_text}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-3 pt-1">
                        <p className="text-[11px] text-slate-med leading-snug">
                          {isQuestionConfirmed
                            ? `${PAPER_LABELS[paper as Paper] || paper} · ${marks} marks · ${wordLimit} words confirmed.`
                            : "Check the question, paper, marks and word limit, then confirm."}
                        </p>
                        <button
                          type="button"
                          onClick={handleConfirmQuestion}
                          disabled={isConfirmingQuestion || isEvaluating || !question.trim()}
                          className={`text-xs font-semibold px-4 py-2 rounded-lg transition-all shrink-0 border ${
                            isQuestionConfirmed
                              ? "bg-eka-success/20 border-eka-success/50 text-eka-success"
                              : "bg-gold text-navy-deep border-gold hover:bg-gold/90"
                          } disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                          {isConfirmingQuestion
                            ? "⏳ Confirming..."
                            : isQuestionConfirmed
                            ? "✓ Confirmed"
                            : "Confirm Question"}
                        </button>
                      </div>
                    </div>
                  )}

                  {detectedInfo && (
                    <div className="mt-2 bg-gold/5 border border-gold/20 rounded-lg p-2.5 text-[11px] text-slate-med space-y-1">
                      <div className="font-mono text-gold/80 tracking-wider text-[10px] mb-1.5">
                        AUTO-DETECTED
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {detectedInfo.paper && (
                          <span>
                            <span className="text-gold/70">Paper:</span>{" "}
                            {detectedInfo.paper}
                          </span>
                        )}
                        {detectedInfo.subject && (
                          <span>
                            <span className="text-gold/70">Subject:</span>{" "}
                            {detectedInfo.subject}
                          </span>
                        )}
                        {detectedInfo.directive && (
                          <span>
                            <span className="text-gold/70">Directive:</span>{" "}
                            {detectedInfo.directive}
                          </span>
                        )}
                        {detectedInfo.marks_estimate && (
                          <span>
                            <span className="text-gold/70">Marks:</span>{" "}
                            {detectedInfo.marks_estimate}
                          </span>
                        )}
                        {detectedInfo.word_limit_estimate && (
                          <span>
                            <span className="text-gold/70">Words:</span>{" "}
                            {detectedInfo.word_limit_estimate}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-med/60 pt-1">
                        You can override any field above before starting
                        evaluation.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Supported Formats Card */}
            <div className="bg-elevated rounded-xl p-4 border border-gold/8 text-xs text-slate-med space-y-1.5">
              <div className="font-mono text-gold/80 mb-2 tracking-wider">
                SUPPORTED FORMATS
              </div>
              {[
                "JPG, JPEG, PNG (handwritten answer photos)",
                "PDF (scanned multi-page answer sheets)",
                "Max file size: 20MB",
                "Automatic OCR deskewing and enhancement",
              ].map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <span className="text-gold/60">✓</span> {f}
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Upload & Live Polling Pipeline */}
          <div className="lg:col-span-3 space-y-5">
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
              className="hidden"
              onChange={handleFileChange}
              disabled={isEvaluating}
            />

            {/* Drag & Drop Upload Zone */}
            {mode === "demo" ? (
              <div className="bg-card rounded-2xl border-2 border-gold/30 p-8 text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center mx-auto text-2xl">
                  📄
                </div>
                <div>
                  <h4 className="text-white-pure font-semibold text-base">
                    Sample UPSC Script Attached
                  </h4>
                  <p className="text-slate-med text-xs mt-1">
                    Pre-calibrated 2-page GS2 answer on Digital India &
                    e-Governance
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 bg-elevated px-3 py-1.5 rounded-lg border border-gold/15 text-xs font-mono text-gold">
                  <span>gs2_digital_india_sample.pdf</span>
                  <span className="text-slate-med">· 1.8 MB</span>
                </div>
              </div>
            ) : (
              <div
                className={`bg-card rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer ${
                  dragging
                    ? "border-gold/60 bg-gold/5"
                    : "border-gold/20 hover:border-gold/40"
                } ${isEvaluating ? "opacity-50 pointer-events-none" : ""}`}
                style={{ minHeight: 260 }}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div
                  className="flex flex-col items-center justify-center p-8 text-center"
                  style={{ minHeight: 260 }}
                >
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
                      dragging ? "bg-gold/20" : "bg-gold/8"
                    }`}
                  >
                    <svg
                      className="w-8 h-8 text-gold"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                      />
                    </svg>
                  </div>
                  <div className="text-white-pure font-semibold text-lg mb-1">
                    {dragging
                      ? "Drop your answer script here"
                      : "Upload your handwritten answer"}
                  </div>
                  <div className="text-slate-med text-sm mb-3">
                    Drag and drop a JPG, JPEG, PNG, or PDF file, or click to
                    browse
                  </div>
                  <div className="text-[11px] font-mono text-gold/70 bg-gold/5 px-3 py-1 rounded-full border border-gold/15">
                    JPG · PNG · PDF (Up to 20MB)
                  </div>
                </div>
              </div>
            )}

            {/* Uploaded File Summary Card */}
            {mode === "live" && file && (
              <div className="bg-card rounded-2xl p-4 gold-border">
                <div className="flex items-center gap-3 bg-elevated rounded-xl p-3">
                  <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center text-gold text-lg shrink-0">
                    {file.type === "application/pdf" ? "📑" : "🖼️"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-muted-white truncate">
                      {file.name}
                    </div>
                    <div className="text-[11px] text-slate-med">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB ·{" "}
                      {file.type || "Document"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-eka-success text-xs font-mono font-medium">
                      ✓ Valid File
                    </span>
                    {!isEvaluating && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setFile(null)
                          setErrorMsg(null)
                          if (fileInputRef.current) {
                            fileInputRef.current.value = ""
                          }
                        }}
                        className="text-slate-med hover:text-eka-danger text-lg px-1 transition-colors"
                        aria-label="Remove file"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {errorMsg && (
              <div className="bg-eka-danger/10 border border-eka-danger/40 rounded-xl p-4 flex items-start gap-3">
                <span className="text-eka-danger text-lg leading-none mt-0.5">
                  ⚠
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-eka-danger font-bold text-xs uppercase tracking-wider mb-1">
                    {currentStage === "failed"
                      ? "Evaluation interrupted"
                      : "Validation Error"}
                  </p>
                  <p className="text-eka-danger/90 text-xs leading-relaxed">
                    {errorMsg}
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

            {/* Low OCR Confidence Banner */}
            {lowOcrConfidence !== null && (
              <div className="bg-eka-warning/10 border border-eka-warning/40 rounded-xl p-4 flex items-start gap-3">
                <span className="text-eka-warning text-lg leading-none mt-0.5">
                  ⚠️
                </span>
                <div>
                  <p className="text-eka-warning font-bold text-xs uppercase tracking-wider mb-1">
                    Low OCR Confidence Detected ({lowOcrConfidence}%)
                  </p>
                  <p className="text-eka-warning/80 text-xs leading-relaxed">
                    Some text could not be read confidently. Review the extracted text before relying on the feedback.
                  </p>
                </div>
              </div>
            )}

            {/* Real Progression Stages Tracker Card */}
            {(isEvaluating ||
              currentStage === "failed" ||
              currentStage === "completed") && (
              <div
                className={`bg-card rounded-2xl p-6 border space-y-5 transition-all ${
                  currentStage === "failed"
                    ? "border-eka-danger/40"
                    : "border-gold/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {currentStage === "failed" ? (
                      <div className="w-6 h-6 bg-eka-danger/20 text-eka-danger rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                        ✗
                      </div>
                    ) : currentStage === "completed" ? (
                      <div className="w-6 h-6 bg-eka-success/20 text-eka-success rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                        ✓
                      </div>
                    ) : (
                      <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin shrink-0"></div>
                    )}
                    <div>
                      <h4
                        className={`text-sm font-bold capitalize ${
                          currentStage === "failed"
                            ? "text-eka-danger"
                            : currentStage === "completed"
                              ? "text-eka-success"
                              : "text-white-pure"
                        }`}
                      >
                        {currentStage === "failed"
                          ? "Evaluation Failed"
                          : currentStage === "completed"
                            ? "Evaluation Complete"
                            : `${stageLabel(currentStage)}…`}
                      </h4>
                      <p className="text-[11px] text-slate-med">
                        {activeJobId
                          ? `Job ID: ${activeJobId.slice(0, 8)}...`
                          : "Preparing your evaluation"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-mono font-bold ${
                      currentStage === "failed"
                        ? "text-eka-danger"
                        : "text-gold"
                    }`}
                  >
                    {currentStage === "failed"
                      ? "FAILED"
                      : `${progressPercent}%`}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-elevated h-2 rounded-full overflow-hidden border border-white/5">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      currentStage === "failed" ? "bg-eka-danger" : "bg-gold"
                    }`}
                    style={{
                      width: `${
                        currentStage === "failed" ? 100 : progressPercent
                      }%`,
                    }}
                  ></div>
                </div>

                {/* Progression Stage List */}
                <div className="space-y-2.5 pt-2 border-t border-white/5">
                  {STAGES.map((s, index) => {
                    const isDone =
                      currentStage === "completed" ||
                      (currentStageIndex > index && currentStage !== "failed")
                    const isCurrent = currentStage === s.key
                    const isFailedAtThisStage =
                      currentStage === "failed" && currentStageIndex === index

                    return (
                      <div
                        key={s.key}
                        className={`flex items-center gap-3 text-xs p-2 rounded-lg transition-colors ${
                          isFailedAtThisStage
                            ? "bg-eka-danger/10 border border-eka-danger/30 text-white-pure"
                            : isCurrent
                              ? "bg-gold/10 border border-gold/30 text-white-pure"
                              : isDone
                                ? "text-slate-med"
                                : "text-slate-med/40"
                        }`}
                      >
                        <span className="w-5 text-center font-mono shrink-0">
                          {isFailedAtThisStage ? (
                            <span className="text-eka-danger font-bold">✗</span>
                          ) : isDone ? (
                            <span className="text-eka-success font-bold">
                              ✓
                            </span>
                          ) : isCurrent ? (
                            <span className="text-gold animate-pulse">⏳</span>
                          ) : (
                            <span className="text-slate-med/40">○</span>
                          )}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span
                            className={`font-medium ${
                              isFailedAtThisStage
                                ? "text-eka-danger font-bold"
                                : isCurrent
                                  ? "text-gold"
                                  : ""
                            }`}
                          >
                            {s.label}
                          </span>
                          {isFailedAtThisStage ? (
                            <p className="text-[10px] text-eka-danger/90 mt-0.5">
                              {errorMsg ||
                                "This step could not finish. Please try again."}
                            </p>
                          ) : isCurrent ? (
                            <p className="text-[10px] text-slate-med mt-0.5">
                              {s.desc}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                  {currentStage === "failed" && currentStageIndex === -1 && (
                    <div className="flex items-center gap-3 text-xs p-2 rounded-lg bg-eka-danger/10 border border-eka-danger/30 text-white-pure">
                      <span className="w-5 text-center font-mono shrink-0 text-eka-danger font-bold">
                        ✗
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-eka-danger font-bold">
                          Evaluation interrupted
                        </span>
                        <p className="text-[10px] text-eka-danger/90 mt-0.5">
                          {errorMsg ||
                            "Your evaluation could not finish. Please try again."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {currentStage === "failed" ? (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="btn-primary flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2"
                >
                  <span>🔄</span> RETRY EVALUATION
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentStage(null)
                    setErrorMsg(null)
                  }}
                  className="bg-elevated border border-gold/20 hover:border-gold/40 text-slate-med hover:text-white-pure px-6 py-4 rounded-xl text-xs font-semibold transition-colors"
                >
                  Edit Input
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleEvaluate}
                disabled={isEvaluating || (mode === "live" && (!file || !isQuestionConfirmed || !confirmationToken))}
                className={`btn-primary w-full text-sm py-4 flex items-center justify-center gap-2 ${
                  isEvaluating || (mode === "live" && (!file || !isQuestionConfirmed || !confirmationToken))
                    ? "opacity-40 cursor-not-allowed"
                    : ""
                }`}
              >
                {isEvaluating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-navy-deep border-t-transparent rounded-full animate-spin"></span>
                    <span>EVALUATING SCRIPT ({progressPercent}%)...</span>
                  </>
                ) : mode === "demo" ? (
                  <span>RUN DEMO EVALUATION →</span>
                ) : !isQuestionConfirmed || !confirmationToken ? (
                  <span>CONFIRM QUESTION ABOVE TO START →</span>
                ) : (
                  <span>START LIVE EVALUATION →</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
