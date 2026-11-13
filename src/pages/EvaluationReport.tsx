import { useState, useEffect, useCallback, useRef } from "react"
import type { NavigateFn } from "../App"
import {
  DEMO_REPORT_DATA,
  type UpscEvaluationReport,
  type OCRResultData,
  type KnowledgeSource,
} from "../types/evaluation"
import { authFetch, BACKEND_URL } from "../lib/api"
import { stageLabel } from "../lib/evaluation-settings"
import { publicError } from "../lib/public-error"
import { SaveRevisionCards } from '../components/RevisionDeck'
import AspirantDiagnosis from "../components/AspirantDiagnosis"
import VirtualAnswerBooklet from "../components/VirtualAnswerBooklet"

interface Props {
  navigate: NavigateFn
  reportData?: any
  evaluationId?: string | null
}

function getEvaluationIdFromRoute(): string | null {
  if (typeof window === "undefined") return null

  // 1. Check query parameters: ?id=... or ?evaluation_id=... or ?eval_id=...
  const searchParams = new URLSearchParams(window.location.search)
  const searchId =
    searchParams.get("id") ||
    searchParams.get("evaluation_id") ||
    searchParams.get("eval_id")
  if (searchId) return searchId

  // 2. Check hash route: #/report/:id or #report?id=...
  if (window.location.hash) {
    const rawHash = window.location.hash.replace(/^#\/?/, "")
    const [hPath, hQuery] = rawHash.split("?")
    if (hQuery) {
      const hParams = new URLSearchParams(hQuery)
      const hId = hParams.get("id") || hParams.get("evaluation_id")
      if (hId) return hId
    }
    const hParts = hPath.split("/")
    if (hParts[0] === "report" && hParts[1]) {
      return hParts[1]
    }
  }

  // 3. Check pathname: /report/:id or /evaluations/:id
  const pathname = window.location.pathname
  const pathMatch = pathname.match(/\/(?:report|evaluations)\/([^/?#]+)/)
  if (pathMatch && pathMatch[1]) {
    return pathMatch[1]
  }

  return null
}

function extractEvaluationData(
  raw: any,
): { report: UpscEvaluationReport | null; ocr: OCRResultData | null } {
  if (!raw) return { report: null, ocr: null }
  const report =
    raw.report?.report ||
    raw.report?.evaluationResult ||
    (raw.report?.preFlightCheck ? raw.report : null) ||
    raw.data?.report?.report ||
    raw.data?.report ||
    (raw.data?.preFlightCheck ? raw.data : null) ||
    (raw.preFlightCheck ? raw : null) ||
    raw.evaluation_result ||
    null

  const ocr =
    raw.report?.ocrData ||
    raw.ocr_result ||
    raw.ocrData ||
    raw.data?.report?.ocrData ||
    raw.data?.ocrData ||
    null

  return { report, ocr }
}

export default function EvaluationReport({
  navigate,
  reportData,
  evaluationId,
}: Props) {
  const activeId = evaluationId || getEvaluationIdFromRoute()

  const [loading, setLoading] = useState<boolean>(false)
  const [inProgressStage, setInProgressStage] = useState<string | null>(null)
  const [inProgressProgress, setInProgressProgress] = useState<number | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)
  const [fetchedReport, setFetchedReport] =
    useState<UpscEvaluationReport | null>(null)
  const [ocrData, setOcrData] = useState<OCRResultData | null>(null)
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([])
  const [isDemo, setIsDemo] = useState<boolean>(false)

  const pollingRef = useRef<any>(null)

  // Cleanup polling timeout on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearTimeout(pollingRef.current)
      }
    }
  }, [])

  const fetchReportById = useCallback(
    async (id: string) => {
      if (id === "demo") {
        setFetchedReport(DEMO_REPORT_DATA)
        setOcrData(null)
        setIsDemo(true)
        setLoading(false)
        setError(null)
        setInProgressStage(null)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const res = await authFetch(`${BACKEND_URL}/api/evaluations/${id}`)
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error(
              "Evaluation not found. Please check your evaluation history.",
            )
          }
          throw new Error(`Failed to load evaluation (HTTP ${res.status}).`)
        }

        const jobData = await res.json()

        if (jobData.status === "failed") {
          throw new Error(
            jobData.error || "Evaluation job failed in the backend pipeline.",
          )
        }

        // If job is still running in background, continue polling without showing false empty state
        if (jobData.status !== "completed" && !jobData.report) {
          setInProgressStage(stageLabel(jobData.stage || jobData.status))
          setInProgressProgress(
            Number.isFinite(jobData.progress) ? Math.max(0, Math.min(99, jobData.progress)) : null,
          )
          pollingRef.current = setTimeout(() => {
            fetchReportById(id)
          }, 1500)
          return
        }

        const { report: evalData, ocr: ocrResultData } =
          extractEvaluationData(jobData)

        if (!evalData) {
          throw new Error(
            "Report data is malformed or not yet finalized by the scoring engine.",
          )
        }

        setFetchedReport(evalData)
        setOcrData(ocrResultData)
        
        // Show the persisted evaluation evidence rather than running a fresh search.
        setKnowledgeSources((evalData.sourceCitations || []).map(source => ({
          documentId: source.id, title: source.title, paper: '', subject: '', topic: '', chapter: '',
          section: source.sourceType, page: Number(source.page) || 0, content: source.excerpt,
        })))

        setIsDemo(false)
        setInProgressStage(null)
        setLoading(false)
      } catch (err: any) {
        console.error("Error fetching evaluation report:", err)
        setError(publicError(err, "Could not load this evaluation. Please try again."))
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current)
    }

    // 1. If activeId is 'demo', load demo benchmark
    if (activeId === "demo") {
      setFetchedReport(DEMO_REPORT_DATA)
      setOcrData(null)
      setIsDemo(true)
      setLoading(false)
      setError(null)
      setInProgressStage(null)
      return
    }

    // 2. If matching reportData is passed in props for current activeId
    if (
      activeId &&
      reportData &&
      (reportData.id === activeId || (!reportData.id && activeId))
    ) {
      const { report: evalData, ocr: ocrObj } = extractEvaluationData(
        reportData.data || reportData,
      )
      if (evalData) {
        setFetchedReport(evalData)
        setOcrData(ocrObj)
        setIsDemo(false)
        setLoading(false)
        setError(null)
        setInProgressStage(null)
        return
      }
    }

    // 3. Otherwise fetch from backend if activeId is present
    if (activeId) {
      fetchReportById(activeId)
      return
    }

    // 4. If no activeId but generic reportData exists
    if (!activeId && reportData) {
      const { report: evalData, ocr: ocrObj } = extractEvaluationData(
        reportData.data || reportData,
      )
      if (evalData) {
        setFetchedReport(evalData)
        setOcrData(ocrObj)
        setIsDemo(reportData.id === "demo")
        setLoading(false)
        setError(null)
        setInProgressStage(null)
        return
      }
    }

    // No ID and no report data
    setFetchedReport(null)
    setOcrData(null)
    setLoading(false)
  }, [activeId, reportData, fetchReportById])

  // Extract data to render
  const data: UpscEvaluationReport | null =
    fetchedReport ||
    (reportData?.report?.report
      ? reportData.report.report
      : reportData?.report) ||
    null

  // 1. Loading / Polling State
  if (loading) {
    return (
      <div className="min-h-screen bg-navy-deep pt-16 lg:pt-20 text-white-pure flex items-center justify-center">
        <div className="bg-card border border-gold/20 p-8 rounded-2xl max-w-md w-full text-center space-y-4 gold-border">
          <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div>
            <h3 className="text-lg font-bold text-white-pure">
              {inProgressStage
                ? "Evaluation In Progress"
                : "Fetching Evaluation Report"}
            </h3>
            <p className="text-slate-med text-xs mt-1">
              {inProgressStage
                ? `${inProgressStage} ${
                    inProgressProgress !== null
                      ? `(${inProgressProgress}%)`
                      : ""
                  }`
                : `Retrieving evaluated script and examiner diagnostics ${
                    activeId ? `(#${activeId.slice(0, 8)})` : ""
                  }...`}
            </p>
          </div>
          {inProgressProgress !== null && (
            <div className="w-full bg-elevated h-2 rounded-full overflow-hidden border border-white/5 mt-2">
              <div
                className="bg-gold h-full transition-all duration-500 rounded-full"
                style={{ width: `${inProgressProgress}%` }}
              ></div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // 2. Error State
  if (error) {
    return (
      <div className="min-h-screen bg-navy-deep pt-16 lg:pt-20 text-white-pure flex items-center justify-center p-6">
        <div className="bg-eka-danger/10 border border-eka-danger/40 p-8 rounded-2xl max-w-lg w-full text-center space-y-4">
          <div className="w-12 h-12 bg-eka-danger/20 text-eka-danger rounded-xl flex items-center justify-center mx-auto text-2xl font-bold">
            ⚠
          </div>
          <div>
            <h3 className="text-lg font-bold text-white-pure">
              Unable to Load Report
            </h3>
            <p className="text-eka-danger/90 text-sm mt-1 leading-relaxed">
              {error}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {activeId && (
              <button
                className="btn-primary text-xs py-2.5 px-5 font-bold"
                onClick={() => fetchReportById(activeId)}
              >
                Retry Loading
              </button>
            )}
            <button
              className="bg-elevated border border-gold/20 hover:border-gold/40 text-slate-med hover:text-white-pure text-xs py-2.5 px-5 rounded-xl transition-colors"
              onClick={() => navigate("evaluate")}
            >
              Evaluate Another Script
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 3. Empty State (no report data)
  if (!data) {
    return (
      <div className="min-h-screen bg-navy-deep pt-16 lg:pt-20 text-white-pure flex items-center justify-center">
        <div className="bg-eka-warning/10 border border-eka-warning/30 p-8 rounded-2xl max-w-lg text-center space-y-4">
          <p className="text-eka-warning text-lg font-semibold">
            No real report data found.
          </p>
          <p className="text-slate-med text-xs">
            Submit an answer script for evaluation or load the sample demo
            evaluation.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              className="px-6 py-3 bg-gold text-navy-deep font-bold rounded-lg hover:bg-white transition-colors text-sm"
              onClick={() => navigate("evaluate")}
            >
              Evaluate an Answer Script
            </button>
            <button
              className="px-6 py-3 bg-elevated border border-gold/30 text-gold font-bold rounded-lg hover:border-gold transition-colors text-sm"
              onClick={() => {
                navigate("report", { id: "demo" })
              }}
            >
              View Sample Demo Report
            </button>
          </div>
        </div>
      </div>
    )
  }

  const preFlightCheck = data?.preFlightCheck || {
    totalPagesReceived: 1,
    firstSentence: "",
    lastSentence: "",
    detectedPaperMode: "MODE_GS_GENERAL",
    questionText: "",
    totalMarksPossible: 10,
    isCompleteScript: true,
  }

  const scoring = data?.scoring || {
    awardedScore: 0,
    maxScore: 10,
    percentileEstimate: "N/A",
    examinerVerdict: "Evaluation complete.",
  }

  const parameterEvaluations = data?.parameterEvaluations || {}
  const presentationAndMechanics = data?.presentationAndMechanics || {
    handwritingLegibility: "Legible with Effort",
    structuralFormatting: "Standard formatting",
    spellingAndGrammarErrors: [],
  }
  const topperDeltaPack = data?.topperDeltaPack || {
    missedDimensions: [],
    exactValueAdditions: [],
    modelParagraphRewrite: "",
  }

  const examinerVerdict = scoring.examinerVerdict || "Evaluation complete."
  const isInvalid = examinerVerdict.includes("INVALID_DOCUMENT")
  const detectedPaperModeStr = data?.confirmedSettings?.paper || (
    preFlightCheck.detectedPaperMode || "MODE_GS_GENERAL"
  )
    .replace("MODE_", "")
    .replace(/_/g, " ")

  const hasLowOcrConfidence =
    ocrData?.averageConfidence !== null &&
    ocrData?.averageConfidence !== undefined &&
    ocrData.averageConfidence < 0.7

  const openOriginal = activeId && activeId !== "demo" ? async () => {
    try {
      const response = await authFetch(`${BACKEND_URL}/api/evaluations/${activeId}/file`)
      if (!response.ok) throw new Error("The original upload is unavailable.")
      const file = await response.json()
      if (!file?.url) throw new Error("The original upload is unavailable.")
      window.open(file.url, "_blank", "noopener,noreferrer")
    } catch (cause) { window.alert(publicError(cause, "Could not open the original upload.")) }
  } : undefined

  return (
    <div className="min-h-screen bg-navy-deep pt-16 lg:pt-20 text-white-pure">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
        {/* Navigation & Mode Badges */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-white/5">
          <button
            onClick={() => navigate("evaluate")}
            className="flex items-center gap-2 text-xs font-mono text-slate-med hover:text-gold transition-colors"
          >
            ← EVALUATE ANOTHER SCRIPT
          </button>
          <div className="flex items-center gap-2">
            {activeId && activeId !== "demo" && (
              <button
                type="button"
                onClick={openOriginal}
                className="bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30 px-3 py-1 rounded-full text-xs font-mono transition-colors"
              >
                📄 VIEW UPLOADED SCRIPT
              </button>
            )}
            {isDemo && (
              <span className="bg-gold/15 text-gold border border-gold/40 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wide">
                🧪 DEMO EVALUATION
              </span>
            )}
            {activeId && activeId !== "demo" && (
              <span className="bg-white/5 text-slate-med border border-white/10 px-3 py-1 rounded-full text-xs font-mono">
                ID: {activeId.slice(0, 8)}
              </span>
            )}
          </div>
        </div>

        {/* Invalid Document Alert */}
        {isInvalid && (
          <div className="bg-eka-danger/10 border border-eka-danger/30 p-4 rounded-xl mb-8">
            <p className="text-eka-danger font-bold text-lg">
              ⚠️ Invalid Document Detected
            </p>
            <p className="text-eka-danger text-sm mt-1">
              {scoring.examinerVerdict}
            </p>
          </div>
        )}

        {/* Low OCR Confidence Warning Banner */}
        {hasLowOcrConfidence && !isInvalid && (
          <div className="bg-eka-warning/10 border border-eka-warning/40 p-4 rounded-xl mb-8 flex items-start gap-3">
            <span className="text-eka-warning text-lg leading-none mt-0.5">
              ⚠️
            </span>
            <div>
              <p className="text-eka-warning font-bold text-sm">
                Moderate / Low OCR Confidence (
                {(ocrData!.averageConfidence! * 100).toFixed(0)}%)
              </p>
              <p className="text-eka-warning/80 text-xs mt-1 leading-relaxed">
                Handwriting contrast or scan clarity was low in parts of this
                answer sheet. The examiner diagnostics below reflect best-effort
                transcription.
              </p>
            </div>
          </div>
        )}

        {/* PRE-FLIGHT DASHBOARD */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Evaluation Report</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="bg-white/10 px-3 py-1 rounded-full text-gold font-semibold">
                {detectedPaperModeStr}
              </span>
              <span className="text-slate-med">
                {ocrData?.pages?.length ?? preFlightCheck.totalPagesReceived ?? 1}{" "}
                {(ocrData?.pages?.length ?? preFlightCheck.totalPagesReceived ?? 1) === 1 ? "Page" : "Pages"}{" "}
                Scanned
              </span>
              {data?.evaluationStatus === "provisional" && (
                <span className="bg-eka-warning/15 text-eka-warning border border-eka-warning/30 px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
                  <span>⚠️</span> Provisional Marks
                </span>
              )}
              {data?.extractionStatus === "needs_review" && (
                <span className="bg-eka-warning/15 text-eka-warning border border-eka-warning/30 px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
                  <span>⚠️</span> OCR Needs Review
                </span>
              )}
              {data?.extractionStatus === "incomplete" && (
                <span className="bg-eka-danger/15 text-eka-danger border border-eka-danger/30 px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
                  <span>✗</span> Incomplete Extraction
                </span>
              )}
              {data?.needsHumanReview && (
                <span className="bg-eka-info/15 text-eka-info border border-eka-info/30 px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
                  <span>🔍</span> Needs Expert Human Review
                </span>
              )}
              {!preFlightCheck.isCompleteScript && (
                <span className="text-eka-danger font-semibold flex items-center">
                  <span className="mr-1">⚠️</span> Incomplete/Truncated Script
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-card p-4 rounded-xl border border-gold/20 text-center min-w-[120px]">
              <div className="text-xs text-slate-med uppercase tracking-wider">
                {data.evaluationStatus === "blocked" ? "Scoring status" : "Marks Awarded"}
              </div>
              <div className="text-4xl font-bold text-gold">
                {data.evaluationStatus === "blocked" ? "Review needed" : scoring.awardedScore}{" "}
                <span className="text-lg text-slate-med font-normal">
                  {data.evaluationStatus === "blocked" ? "" : `/ ${scoring.maxScore}`}
                </span>
              </div>
            </div>
            
          </div>
        </div>

        {/* EXAMINER VERDICT */}
        {!isInvalid && (
          <div className="bg-gold/10 border-l-4 border-gold p-5 rounded-r-xl mb-8">
            <h3 className="text-sm font-bold text-gold uppercase tracking-widest mb-1">
              Examiner Verdict
            </h3>
            <p className="text-lg text-white-pure italic">
              "{scoring.examinerVerdict}"
            </p>
          </div>
        )}

        {!isInvalid && <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.12fr)_minmax(360px,.88fr)] gap-6 mb-8 items-start">
          <VirtualAnswerBooklet ocr={ocrData} report={data} onOpenOriginal={openOriginal} />
          <aside className="space-y-4" aria-label="Your next steps">
            <section className="rounded-2xl border border-gold/25 bg-card p-5 sm:p-6">
              <div className="text-xs font-mono tracking-widest text-gold">01 · UNDERSTAND THE QUESTION</div>
              <h2 className="font-display text-2xl mt-3">What was asked</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-white">{data?.questionConfirmation?.userConfirmedQuestion || preFlightCheck.questionText || "Question text unavailable."}</p>
              {(data.questionBreakdown?.directiveExpectation || data.aspirantDiagnosis?.directiveAudit) && <p className="mt-4 border-t border-white/10 pt-4 text-sm leading-relaxed text-slate-med"><strong className="text-white-pure">The demand: </strong>{data.questionBreakdown?.directiveExpectation || data.aspirantDiagnosis?.directiveAudit}</p>}
              {data.confirmedSettings?.paper?.toLowerCase().includes("optional") && !data.rubricWeights && <p className="mt-3 text-sm text-eka-warning">An optional-specific rubric was not saved. Review this score with a subject expert.</p>}
            </section>
            {data.aspirantDiagnosis && <section className="rounded-2xl border border-gold/20 bg-card p-5 sm:p-6">
              <div className="text-xs font-mono tracking-widest text-gold">02 · YOUR NEXT ATTEMPT</div>
              <h2 className="font-display text-2xl mt-3">Keep. Improve. Practise.</h2>
              <div className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-400/20 p-4"><h3 className="text-sm font-semibold text-emerald-300">Keep this strength</h3><p className="mt-2 text-sm leading-relaxed text-muted-white">{data.aspirantDiagnosis.strength.whyItWorks}</p></div>
              <ol className="mt-4 space-y-3">{data.aspirantDiagnosis.priorities.slice(0, 3).map((priority, i) => <li key={i} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold text-xs font-bold">{i + 1}</span><div><h3 className="text-sm font-semibold text-white-pure">{priority.gap}</h3><p className="mt-1 text-sm leading-relaxed text-slate-med">{priority.nextAttemptAction}</p></div></li>)}</ol>
            </section>}
            {data.aspirantDiagnosis?.dimensions?.length ? <section className="rounded-2xl border border-white/10 bg-card p-5 sm:p-6"><h2 className="font-display text-xl">Question demand</h2><div className="mt-4 flex flex-wrap gap-2">{data.aspirantDiagnosis.dimensions.map((dimension, i) => <span key={i} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-muted-white">{dimension.name} <strong className="ml-1 text-gold">{dimension.status === "HIT" ? "Covered" : dimension.status === "PARTIAL" ? "Partial" : "Missing"}</strong></span>)}</div><p className="mt-3 text-xs text-slate-med">Open the detailed diagnosis below for evidence and examples.</p></section> : null}
            <section className="rounded-2xl border border-white/10 bg-card p-5 sm:p-6"><h2 className="font-display text-xl">Learn from an example</h2><p className="mt-2 text-sm text-slate-med">Compare your answer with a generated teaching example.</p>{data.modelAnswer ? <details className="mt-4"><summary className="cursor-pointer text-sm font-semibold text-gold">Read the model answer</summary><p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-white mt-4">{data.modelAnswer}</p></details> : <p className="mt-3 text-sm text-slate-med">A model answer was not saved for this report.</p>}</section>
          </aside>
        </div>}

        {/* QUESTION PROVENANCE & DIRECTIVE COMPLIANCE */}
        {!isInvalid && data?.handwritingAudit && <section className="bg-card rounded-2xl p-6 gold-border mb-8"><div className="section-label mb-3">ONE-PAGE HANDWRITING CHECK · PAGE {data.handwritingAudit.pageNumber}</div><h2 className="text-xl text-white-pure mb-3">{data.handwritingAudit.status === "assessed" ? data.handwritingAudit.legibility.replace(/_/g, " ") : "Visual assessment unavailable"}</h2><p className="text-sm text-slate-med mb-4">{data.handwritingAudit.limitation}</p>{data.handwritingAudit.observations.map((item, i) => <div key={i} className="border-t border-gold/10 py-3"><h3 className="text-gold text-sm capitalize">{item.area.replace(/_/g, " ")}</h3><p className="text-sm text-muted-white mt-1">{item.observation}</p><p className="text-sm text-slate-med mt-2">Try next: {item.action}</p></div>)}</section>}
        {!isInvalid && data?.aspirantDiagnosis && <details className="my-8 rounded-2xl border border-gold/20 bg-card p-5 sm:p-6"><summary className="cursor-pointer text-lg font-semibold text-white-pure">Explore the detailed diagnosis and revision plan</summary><AspirantDiagnosis diagnosis={data.aspirantDiagnosis} /></details>}
        {!isInvalid && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* Question Provenance Card */}
            <div className="bg-card rounded-xl border border-white/10 p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-gold tracking-widest uppercase">
                  Confirmed Question Grounding
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  data?.questionConfirmation?.wasUserConfirmed
                    ? "bg-eka-success/15 border-eka-success/30 text-eka-success"
                    : "bg-eka-warning/15 border-eka-warning/30 text-eka-warning"
                }`}>
                  {data?.questionConfirmation?.wasUserConfirmed
                    ? "✓ Human Confirmed"
                    : "Confirmation not recorded"}
                </span>
              </div>
              <p className="text-sm font-medium text-white-pure leading-relaxed">
                {data?.questionConfirmation?.userConfirmedQuestion ||
                  preFlightCheck.questionText ||
                  "No question recorded"}
              </p>
              {data?.confirmedSettings && <p className="text-xs text-slate-med mt-2">
                {data.confirmedSettings.paper} · {data.confirmedSettings.maximumMarks} marks · {data.confirmedSettings.wordLimit} word limit
                {typeof presentationAndMechanics.wordCountEstimate === 'number' && ` · ${presentationAndMechanics.wordCountEstimate} words in extracted answer (estimate)`}
              </p>}
              {data?.questionConfirmation?.ocrDetectedQuestion &&
                data?.questionConfirmation?.ocrDetectedQuestion !== (data?.questionConfirmation?.userConfirmedQuestion || preFlightCheck.questionText) && (
                <div className="pt-1.5 border-t border-white/5 text-[11px] text-slate-med">
                  <span className="text-gold/70 block text-[10px] uppercase font-mono">Raw OCR Detection:</span>
                  <span className="italic line-clamp-2">{data.questionConfirmation.ocrDetectedQuestion}</span>
                </div>
              )}
            </div>

            {/* Directive Word Compliance Card */}
            {data?.directiveCompliance?.directiveWord && (
              <div className="bg-card rounded-xl border border-white/10 p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-gold tracking-widest uppercase">
                    Directive Compliance
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${
                    data.directiveCompliance.complianceVerdict === "COMPLIANT"
                      ? "bg-eka-success/15 border-eka-success/30 text-eka-success"
                      : data.directiveCompliance.complianceVerdict === "PARTIAL"
                        ? "bg-eka-warning/15 border-eka-warning/30 text-eka-warning"
                        : "bg-eka-danger/15 border-eka-danger/30 text-eka-danger"
                  }`}>
                    {data.directiveCompliance.complianceVerdict}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-med">Directive Verb:</span>
                  <span className="font-mono font-bold text-sm text-gold uppercase px-2 py-0.5 rounded bg-gold/10">
                    {data.directiveCompliance.directiveWord}
                  </span>
                </div>
                <p className="text-xs text-slate-med leading-relaxed">
                  {data.directiveCompliance.complianceNote || "Candidate addressed the prompt directive."}
                </p>
              </div>
            )}
          </div>
        )}

        {!isInvalid && (
          <details className="mt-8 rounded-2xl border border-white/10 bg-card p-5 sm:p-6"><summary className="cursor-pointer text-lg font-semibold text-white-pure">Explore parameter scores and examiner notes</summary>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
            {/* LEFT COLUMN: Parameters & Mechanics */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-card rounded-xl border border-white/10 p-6">
                <h2 className="text-xl font-bold mb-6 flex items-center">
                  <span className="bg-white/10 w-8 h-8 rounded flex items-center justify-center mr-3 text-sm">
                    📊
                  </span>
                  Parameter Diagnostics
                </h2>
                {data.rubricWeights && data.evaluationStatus !== "blocked" && <div className="mb-6 space-y-3">
                  {data.questionBreakdown && <div className="text-sm space-y-2"><p>{data.questionBreakdown.coreTheme}</p><p>{data.questionBreakdown.directiveExpectation}</p><ul className="list-disc pl-5">{data.questionBreakdown.subparts.map((part, i) => <li key={i}>{part}</li>)}</ul></div>}
                  <p className="text-sm text-slate-med">{data.rubricCategory} coaching rubric · Raw: {data.scoring.rawCalculatedScore} / {data.scoring.maxScore} · Rounded: {data.scoring.awardedScore} / {data.scoring.maxScore} · {data.scoring.performanceBand}</p>
                  <div className="overflow-x-auto"><table className="w-full text-sm text-left">
                    <thead><tr><th>Parameter</th><th>Weight</th><th>Max marks</th><th>Awarded</th></tr></thead>
                    <tbody>{Object.entries(data.rubricWeights).map(([key, weight]) => {
                      const param = parameterEvaluations[key];
                      const maxMarks = weight * data.scoring.maxScore;
                      return <tr key={key} className="border-t border-white/10"><td className="py-2 capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</td><td>{Number((weight * 100).toFixed(2))}%</td><td>{Number(maxMarks.toFixed(3))}</td><td>{param ? Number((maxMarks * Math.max(0, Math.min(param.score / (param.maxScore || 10), 1))).toFixed(3)) : "Missing — review"}</td></tr>;
                    })}</tbody>
                  </table></div>
                  {data.teachingAdditions && <div className="text-sm space-y-2">
                    {data.teachingAdditions.improvedIntroduction && <p><strong>Improved introduction: </strong>{data.teachingAdditions.improvedIntroduction}</p>}
                    {data.teachingAdditions.improvedConclusion && <p><strong>Improved conclusion: </strong>{data.teachingAdditions.improvedConclusion}</p>}
                    {data.teachingAdditions.diagramSuggestion && <p className="whitespace-pre-wrap"><strong>Diagram to practise: </strong>{data.teachingAdditions.diagramSuggestion}</p>}
                  </div>}
                </div>}
                <details className="group">
                  <summary className="cursor-pointer text-sm text-gold mb-4">View detailed parameter feedback</summary>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(parameterEvaluations).map(
                    ([key, param]: [string, any]) => (
                      <div
                        key={key}
                        className="bg-navy-deep p-4 rounded-lg border border-white/5"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold capitalize">
                            {key.replace(/([A-Z])/g, " $1").trim()}
                          </span>
                          <span className="bg-white/10 px-2 py-1 rounded text-xs font-bold text-gold">
                            {data.evaluationStatus === "blocked" ? "Withheld" : `${param.score} / ${param.maxScore}`}
                          </span>
                        </div>

                        {param.strengths?.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs text-slate-med mb-1 uppercase tracking-wider">
                              Strengths
                            </p>
                            <ul className="text-sm text-eka-success space-y-1">
                              {param.strengths.map((s: string, i: number) => (
                                <li key={i}>✓ {s}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {param.criticalGaps?.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs text-slate-med mb-1 uppercase tracking-wider">
                              Critical Gaps
                            </p>
                            <ul className="text-sm text-eka-danger space-y-1">
                              {param.criticalGaps.map(
                                (g: string, i: number) => (
                                  <li key={i}>✗ {g}</li>
                                ),
                              )}
                            </ul>
                          </div>
                        )}

                        {param.directEvidence && (
                          <div className="mt-4 pt-3 border-t border-white/5">
                            <p className="text-xs text-slate-med italic">
                              "{param.directEvidence}"
                            </p>
                          </div>
                        )}
                      </div>
                    ),
                  )}
                </div>
                </details>
              </div>

              {!isDemo && <SaveRevisionCards key={activeId || 'report'} report={data} evaluationId={activeId} />}
              {/* REWRITE CARD */}
              {topperDeltaPack.modelParagraphRewrite && (
                <div className="bg-gradient-to-br from-[#1a2235] to-[#0f172a] rounded-xl border border-eka-success/30 p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-eka-success/5 rounded-bl-full pointer-events-none"></div>
                  <h2 className="text-xl font-bold mb-2 text-eka-success flex items-center">
                    <span className="bg-eka-success/20 w-8 h-8 rounded flex items-center justify-center mr-3 text-sm">
                      ✍️
                    </span>
                    Suggested Paragraph Rewrite
                  </h2>
                  <p className="text-sm text-slate-med mb-4">
                    How a topper would have articulated your weakest paragraph:
                  </p>

                  <div className="bg-black/30 border-l-4 border-eka-success p-4 rounded-r text-muted-white italic font-serif leading-relaxed">
                    {topperDeltaPack.modelParagraphRewrite}
                  </div>
                </div>
              )}

              {/* ACTIONABLE IMPROVEMENT PLAN */}
              {data?.improvementPlan && data.improvementPlan.length > 0 && (
                <div className="bg-card rounded-xl border border-white/10 p-6 space-y-4">
                  <h2 className="text-xl font-bold flex items-center text-white-pure">
                    <span className="bg-white/10 w-8 h-8 rounded flex items-center justify-center mr-3 text-sm">
                      🎯
                    </span>
                    Actionable Improvement Plan
                  </h2>
                  <p className="text-xs text-slate-med">
                    Concrete, non-generic rewrite actions to elevate this answer to top-percentile UPSC quality:
                  </p>
                  <div className="space-y-3">
                    {data.improvementPlan.map((item: any, idx: number) => (
                      <div key={idx} className="bg-navy-deep p-4 rounded-lg border border-white/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase font-bold text-gold bg-gold/10 px-2 py-0.5 rounded">
                            {item.dimension}
                          </span>
                          <span className="text-[10px] text-slate-med font-mono">Step {idx + 1}</span>
                        </div>
                        <p className="text-sm text-muted-white font-medium">{item.action}</p>
                        {item.exampleContent && (
                          <div className="bg-white/5 p-2.5 rounded text-xs text-slate-med italic border-l-2 border-gold/40">
                            <span className="text-[10px] uppercase font-mono text-gold/70 block not-italic mb-0.5">Recommended Value Addition:</span>
                            "{item.exampleContent}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TOPPER-STYLE ANSWER FRAMEWORK */}
              {data?.topperFramework?.suggestedIntroApproach && (
                <div className="bg-card rounded-xl border border-gold/25 p-6 space-y-4">
                  <h2 className="text-xl font-bold flex items-center text-gold">
                    <span className="bg-gold/15 w-8 h-8 rounded flex items-center justify-center mr-3 text-sm">
                      🏛️
                    </span>
                    Topper-Style Answer Framework
                  </h2>
                  <p className="text-xs text-slate-med">
                    Structural blueprint (not copied content) showing how high-scoring candidates frame this demand:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="bg-navy-deep p-3 rounded-lg border border-white/5 space-y-1">
                      <span className="text-gold font-mono uppercase text-[10px] block">Intro Approach</span>
                      <p className="text-muted-white">{data.topperFramework.suggestedIntroApproach}</p>
                    </div>
                    <div className="bg-navy-deep p-3 rounded-lg border border-white/5 space-y-1">
                      <span className="text-gold font-mono uppercase text-[10px] block">Conclusion Synthesis</span>
                      <p className="text-muted-white">{data.topperFramework.conclusionType || "Vision / Way forward"}</p>
                    </div>
                    {data.topperFramework.recommendedSubheadings?.length > 0 && (
                      <div className="bg-navy-deep p-3 rounded-lg border border-white/5 space-y-1.5 md:col-span-2">
                        <span className="text-gold font-mono uppercase text-[10px] block">Recommended Subheadings</span>
                        <div className="flex flex-wrap gap-1.5">
                          {data.topperFramework.recommendedSubheadings.map((h: string, i: number) => (
                            <span key={i} className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[11px] text-muted-white">
                              {h}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {data.topperFramework.wordBudgetAllocation && (
                      <div className="bg-navy-deep p-3 rounded-lg border border-white/5 space-y-1 md:col-span-2">
                        <span className="text-gold font-mono uppercase text-[10px] block">Word Budget Discipline</span>
                        <p className="text-muted-white">{data.topperFramework.wordBudgetAllocation}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Topper Delta & Mechanics */}
            <div className="space-y-8">
              {/* TOPPER DELTA SECTION */}
              <div className="bg-card rounded-xl border border-gold/30 p-6">
                <h2 className="text-xl font-bold mb-4 text-gold flex items-center">
                  <span className="bg-gold/20 w-8 h-8 rounded flex items-center justify-center mr-3 text-sm">
                    🏆
                  </span>
                  The Topper Delta
                </h2>

                {topperDeltaPack.missedDimensions?.length > 0 && (
                  <div className="mb-6">
                    <p className="text-xs text-slate-med uppercase tracking-wider mb-2">
                      Missed Dimensions
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {topperDeltaPack.missedDimensions.map(
                        (dim: string, i: number) => (
                          <span
                            key={i}
                            className="bg-eka-danger/10 text-eka-danger border border-eka-danger/20 px-2 py-1 rounded text-xs"
                          >
                            {dim}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {topperDeltaPack.exactValueAdditions?.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-med uppercase tracking-wider mb-3">
                      Exact Value Additions Missed
                    </p>
                    <div className="space-y-3">
                      {topperDeltaPack.exactValueAdditions.map(
                        (addition: any, i: number) => (
                          <div
                            key={i}
                            className="bg-white/5 border border-white/10 rounded p-3 text-sm"
                          >
                            <span className="text-[10px] font-bold text-gold uppercase bg-gold/10 px-1.5 py-0.5 rounded mb-1 inline-block">
                              {addition.type}
                            </span>
                            <p className="text-muted-white mt-1">
                              {addition.recommendation}
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* KNOWLEDGE SOURCES */}
              {knowledgeSources.length > 0 && (
                <div className="bg-card rounded-xl border border-eka-info/30 p-6">
                  <h2 className="text-lg font-bold mb-4 flex items-center">
                    <span className="bg-eka-info/20 w-8 h-8 rounded flex items-center justify-center mr-3 text-sm">
                      📚
                    </span>
                    Knowledge Sources (RAG)
                  </h2>
                  <p className="text-xs text-slate-med mb-4">
                    {knowledgeSources.length} cited sources saved with this evaluation
                  </p>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {knowledgeSources.map((src: KnowledgeSource, i: number) => (
                      <div
                        key={`${src.documentId}-${src.section}-${i}`}
                        className="bg-white/5 border border-white/10 rounded p-3 text-sm hover:border-eka-info/30 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-[10px] font-bold text-eka-info uppercase bg-eka-info/10 px-1.5 py-0.5 rounded">
                            {src.paper}
                          </span>
                          <span className="text-[10px] text-gold/80 uppercase bg-gold/10 px-1.5 py-0.5 rounded">
                            {src.subject}
                          </span>
                          <span className="text-[10px] text-slate-med bg-white/5 px-1.5 py-0.5 rounded">
                            {src.topic}
                          </span>
                          {src.scoreHybrid !== undefined && (
                            <span className="text-[10px] font-mono text-eka-success ml-auto">
                              Relevance: {(src.scoreHybrid * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                        <p className="text-muted-white text-xs line-clamp-3 leading-relaxed">
                          {src.content.substring(0, 400)}{src.content.length > 400 ? "..." : ""}
                        </p>
                        <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-med">
                          <span>📄 {src.title}</span>
                          <span>·</span>
                          <span>Ch.{src.chapter} Sec.{src.section}</span>
                          <span>·</span>
                          <span>p.{src.page}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PRESENTATION */}
              <div className="bg-card rounded-xl border border-white/10 p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center">
                  <span className="bg-white/10 w-8 h-8 rounded flex items-center justify-center mr-3 text-sm">
                    📝
                  </span>
                  Presentation & Mechanics
                </h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-slate-med uppercase">
                      Handwriting Legibility
                    </p>
                    <p className="font-semibold mt-1 text-white">
                      {presentationAndMechanics.handwritingLegibility}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-med uppercase">
                      Structural Formatting
                    </p>
                    <p className="text-sm mt-1 text-muted-white">
                      {presentationAndMechanics.structuralFormatting}
                    </p>
                  </div>

                  {presentationAndMechanics.spellingAndGrammarErrors?.length >
                    0 && (
                    <div className="pt-3 border-t border-white/10">
                      <p className="text-xs text-slate-med uppercase mb-2">
                        Noted Errors
                      </p>
                      <ul className="text-sm space-y-2">
                        {presentationAndMechanics.spellingAndGrammarErrors
                          .slice(0, 3)
                          .map((err: any, i: number) => (
                            <li
                              key={i}
                              className="flex justify-between items-center bg-white/5 px-2 py-1 rounded"
                            >
                              <span className="text-eka-danger line-through text-xs">
                                {err.foundText}
                              </span>
                              <span className="text-slate-med mx-2">→</span>
                              <span className="text-eka-success text-xs">
                                {err.correctedText}
                              </span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div></details>
        )}

        {!isInvalid && data?.qualityAudit && (
          <details className="mt-8 rounded-xl border border-gold/20 bg-elevated/40 p-6 space-y-4">
            <summary className="cursor-pointer text-lg font-bold text-gold">Evidence and report limitations</summary>
            <p className="text-sm text-slate-med">{data.qualityAudit.retrievedSources} sources retrieved · {data.qualityAudit.citedSources} cited. Citations show supporting excerpts; they do not establish official examiner calibration.</p>
            {data.qualityAudit.warnings.length > 0 && <ul className="list-disc pl-5 space-y-2 text-sm text-eka-warning">{data.qualityAudit.warnings.map((warning: string, i: number) => <li key={i}>{warning}</li>)}</ul>}
            {data.modelAnswer && <div className="border-t border-white/10 pt-4">
              <h3 className="text-lg font-semibold text-white-pure">Complete suggested answer</h3>
              <p className="text-xs text-slate-med mt-1">{data.qualityAudit.modelAnswerWordCount} words · Original teaching example, not an actual topper script</p>
              <p className="whitespace-pre-wrap text-muted-white leading-relaxed mt-4">{data.modelAnswer}</p>
            </div>}
            {data.sourceCitations?.map((source: NonNullable<UpscEvaluationReport["sourceCitations"]>[number]) => <details key={source.id} className="rounded-lg bg-black/20 p-3">
              <summary className="cursor-pointer text-sm text-gold">{source.title.replace(/https?:\/\/\S+|\b\S+\.(?:pdf|docx?|txt|md|json|csv)\b/gi, "Reference knowledge")}</summary>
              <p className="whitespace-pre-wrap mt-3 text-sm text-slate-med">{source.excerpt}</p>
            </details>)}
          </details>
        )}

        {/* EVIDENCE & CALIBRATION AUDIT TRAIL */}
        {!isInvalid && (
          <div className="mt-10 pt-6 border-t border-white/10 text-xs text-slate-med space-y-3">

            <div className="bg-elevated/40 border border-white/5 rounded-lg p-3 text-[11px] text-slate-med flex items-start gap-2.5">
              <span className="text-gold mt-0.5">ℹ️</span>
              <p className="leading-relaxed">
                <strong className="text-muted-white">Calibration Notice:</strong> This AI evaluation uses Ekalavya's internal coaching rubric, not an official UPSC marking scheme. Human-expert score calibration is pending. Use this report as diagnostic guidance alongside mentor review.
              </p>
            </div>

            {/* Collapsible Raw OCR Transcription */}
            {ocrData?.fullText && (
              <details className="bg-card rounded-xl border border-white/5 p-4 group">
                <summary className="cursor-pointer text-xs font-mono text-gold flex items-center justify-between select-none">
                  <span>📄 View Immutable Raw OCR Transcription</span>
                  <span className="text-slate-med group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="mt-3 pt-3 border-t border-white/5">
                  <p className="text-[10px] text-slate-med mb-2 font-mono">
                    Extracted answer text, preserved without edits:
                  </p>
                  <pre className="text-[11px] text-muted-white font-mono bg-navy-deep p-3 rounded-lg overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {ocrData.fullText}
                  </pre>
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
