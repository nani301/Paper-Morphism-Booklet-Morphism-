import { useState, useEffect } from "react"
import type { NavigateFn } from "../App"
import { loadEvaluationHistory } from "../lib/evaluation-history"

interface EvaluationJob {
  id: string
  created_at: string
  status: string
  evaluation_result?: {
    evaluationStatus?: "final" | "provisional" | "blocked"
    needsHumanReview?: boolean
    rubricVersion?: string
    scoring?: { awardedScore?: number; maxScore?: number }
    parameterEvaluations?: Record<string, { score?: number; maxScore?: number; strengths?: string[]; criticalGaps?: string[] }>
  }
  results?: {
    evaluation_result?: {
      preFlightCheck?: {
        questionText?: string
      }
      scoring?: {
        awardedScore?: number
        maxScore?: number
      }
      parameterEvaluations?: Record<
        string,
        {
          scoreOutOf10?: number
          strengths?: string[]
          weaknesses?: string[]
        }
      >
    }
    ocr_result?: {
      totalWords?: number
    }
  }
}

interface ParamScore {
  label: string
  key: string
  value: number
  color: string
}

function RadarChart({ params }: { params: ParamScore[] }) {
  const n = params.length
  const cx = 150
  const cy = 150
  const r = 110

  const gridLevels = [25, 50, 75, 100]

  const getPoint = (i: number, pct: number) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2
    const rr = r * (pct / 100)
    return { x: cx + rr * Math.cos(angle), y: cy + rr * Math.sin(angle) }
  }

  const dataPoints = params.map((p, i) => getPoint(i, p.value))

  return (
    <svg width="100%" viewBox="0 0 300 300" style={{ maxWidth: 300 }}>
      {/* Grid polygons */}
      {gridLevels.map((level) => {
        const pts = params
          .map((_, i) => {
            const pt = getPoint(i, level)
            return `${pt.x},${pt.y}`
          })
          .join(" ")
        return (
          <polygon
            key={level}
            points={pts}
            fill="none"
            stroke="rgba(245,166,35,0.1)"
            strokeWidth="1"
          />
        )
      })}

      {/* Spokes */}
      {params.map((_, i) => {
        const outer = getPoint(i, 100)
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={outer.x}
            y2={outer.y}
            stroke="rgba(245,166,35,0.12)"
            strokeWidth="1"
          />
        )
      })}


      {/* Current polygon */}
      <polygon
        points={dataPoints.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="rgba(245,166,35,0.12)"
        stroke="#F5A623"
        strokeWidth="2"
      />

      {/* Data points */}
      {dataPoints.map((pt, i) => (
        <circle
          key={i}
          cx={pt.x}
          cy={pt.y}
          r="5"
          fill={params[i].color}
          stroke="#050914"
          strokeWidth="2"
          style={{ filter: `drop-shadow(0 0 4px ${params[i].color}60)` }}
        />
      ))}

      {/* Labels */}
      {params.map((p, i) => {
        const labelPt = getPoint(i, 118)
        return (
          <text
            key={i}
            x={labelPt.x}
            y={labelPt.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#94A3B8"
            fontSize="9.5"
            fontFamily="Outfit, sans-serif"
          >
            {p.label}
          </text>
        )
      })}

      {/* Legend */}
      <g transform="translate(10, 270)">
        <line x1="0" y1="4" x2="16" y2="4" stroke="#F5A623" strokeWidth="2" />
        <text
          x="20"
          y="8"
          fill="#94A3B8"
          fontSize="9"
          fontFamily="Outfit, sans-serif"
        >
          Your Average
        </text>
      </g>
    </svg>
  )
}

export default function AnswerDNA({
  navigate,
  user,
}: {
  navigate: NavigateFn
  user?: any
}) {
  const [evaluations, setEvaluations] = useState<EvaluationJob[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState("")
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      setEvaluations([])
      return
    }

    let isMounted = true
    setLoading(true)
    setError("")

    loadEvaluationHistory<EvaluationJob>()
      .then(list => { if (isMounted) setEvaluations(list) })
      .catch((err) => {
        if (isMounted) setError(err instanceof Error ? err.message : "Could not load Answer DNA.")
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [user, reload])

  if (!user) {
    return (
      <div className="min-h-screen bg-navy-deep pt-16 lg:pt-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-10 py-16 text-center">
          <div className="section-label mb-3">WRITING INTELLIGENCE</div>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold text-white-pure mb-4">
            Your Answer DNA
          </h1>
          <p className="text-slate-med max-w-xl mx-auto mb-8">
            Your unique writing patterns, structural tendencies, and parameter mastery — synthesised across your UPSC answer evaluations.
          </p>
          <div className="bg-card rounded-2xl p-8 border border-gold/20 max-w-md mx-auto gold-border">
            <div className="text-3xl mb-4">🧬</div>
            <h3 className="text-lg font-semibold text-white-pure mb-2">
              Sign In to Unlock Answer DNA
            </h3>
            <p className="text-xs text-slate-med mb-6">
              Answer DNA analyzes your real handwritten scripts and tracks your personal writing profile.
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

  const completed = evaluations.filter(
    (e) => e.status === "completed" && e.evaluation_result?.evaluationStatus === "final" && !e.evaluation_result?.needsHumanReview && e.evaluation_result?.scoring,
  )

  if (error) return <div className="min-h-screen bg-navy-deep pt-24 text-center text-white-pure"><p role="alert">{error}</p><button className="btn-secondary mt-4" onClick={() => setReload(value => value + 1)}>Retry</button></div>
  if (completed.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-navy-deep pt-16 lg:pt-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-10 py-16 text-center">
          <div className="section-label mb-3">WRITING INTELLIGENCE</div>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold text-white-pure mb-4">
            Your Answer DNA
          </h1>
          <div className="bg-card rounded-2xl p-12 text-center gold-border max-w-xl mx-auto">
            <div className="text-4xl mb-4">🧬</div>
            <h3 className="font-display text-xl font-semibold text-white-pure mb-2">
              No Evaluation Data Available
            </h3>
            <p className="text-slate-med text-sm max-w-md mx-auto mb-6">
              Answer DNA is generated dynamically from your evaluated answer scripts. Evaluate an answer to unlock your multi-dimensional performance map.
            </p>
            <button
              onClick={() => navigate("evaluate")}
              className="bg-gold hover:bg-gold-bright text-navy-deep font-bold py-3 px-6 rounded-xl transition-all shadow-md font-mono text-xs uppercase"
            >
              Evaluate an Answer Script
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Calculate real average parameter scores
  const rawParams = [
    { label: "Understanding", key: "understandingAndDemand" },
    { label: "Content", key: "contentKnowledge" },
    { label: "Analysis", key: "analysisAndDepth" },
    { label: "Structure", key: "structureAndLogicalFlow" },
    { label: "Multi-dim", key: "multiDimensionality" },
    { label: "Examples", key: "examplesAndCurrentAffairs" },
    { label: "Conclusion", key: "conclusionAndWayForward" },
    { label: "Presentation", key: "presentationAndReadability" },
  ]

  const newestRubric = [...completed].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.evaluation_result?.rubricVersion
  const comparable = completed.filter(ev => ev.evaluation_result?.rubricVersion === newestRubric)
  const params: ParamScore[] = rawParams.flatMap((rp) => {
    let sum = 0
    let count = 0
    comparable.forEach((ev) => {
      const pe = ev.evaluation_result?.parameterEvaluations
      if (pe && Number.isFinite(pe[rp.key]?.score) && (pe[rp.key]?.maxScore || 0) > 0) {
        sum += ((pe[rp.key].score || 0) / (pe[rp.key].maxScore || 10)) * 100
        count++
      }
    })
    if (!count) return []
    const value = Math.round(sum / count)
    const color = value >= 75 ? "#4ADE80" : value >= 60 ? "#F5A623" : "#FB7185"
    return [{ label: rp.label, key: rp.key, value, color }]
  })

  // Sort to identify top strengths and weaknesses
  const sorted = [...params].sort((a, b) => b.value - a.value)
  const strengths = sorted.slice(0, 3)
  const opportunities = sorted.slice(-3).reverse()
  if (loading) return <div className="min-h-screen bg-navy-deep pt-24 text-center text-slate-med" role="status">Loading Answer DNA…</div>
  if (params.length < 3 || comparable.length < 3) return <div className="min-h-screen bg-navy-deep pt-24 text-center text-white-pure"><h1 className="text-2xl">Answer DNA</h1><p className="text-slate-med mt-4">A reliable profile needs three comparable final reports with scored dimensions. You have {comparable.length} under the current rubric.</p><button className="btn-primary mt-5" onClick={() => navigate("evaluate")}>Evaluate an answer</button></div>

  return (
    <div className="min-h-screen bg-navy-deep pt-16 lg:pt-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12">
        <div className="mb-10">
          <div className="section-label mb-3">WRITING INTELLIGENCE</div>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold text-white-pure mb-3">
            Your Answer DNA
          </h1>
          <p className="text-slate-med text-lg max-w-2xl">
            Writing patterns and parameter mastery derived from{" "}
            {comparable.length} comparable final script{comparable.length === 1 ? "" : "s"} under rubric {newestRubric || "unversioned"}.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          {/* Radar chart */}
          <div className="bg-card rounded-2xl p-6 gold-border flex flex-col items-center">
            <div className="text-xs font-mono text-gold tracking-wider mb-4 self-start">
              PERFORMANCE MAP
            </div>
            <RadarChart params={params} />
            <div className="text-xs text-slate-med text-center mt-2">
              Based on {comparable.length} evaluation{comparable.length === 1 ? "" : "s"}. Updated with each answer.
            </div>
          </div>

          {/* DNA profile */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-card rounded-2xl p-6 gold-border">
              <div className="text-xs font-mono text-gold tracking-wider mb-1">
                EVALUATED WRITING PROFILE
              </div>
              <p className="text-lg text-white-pure font-semibold mt-2">
                {strengths[0]?.label} &amp; {strengths[1]?.label} Leading Profile
              </p>
              <p className="text-sm text-slate-med mt-2 leading-relaxed">
                Examiner analysis indicates strongest execution in {strengths[0]?.label} ({strengths[0]?.value}%) and {strengths[1]?.label} ({strengths[1]?.value}%). Focus additional answer preparation on {opportunities[0]?.label} ({opportunities[0]?.value}%) for maximum incremental score gains.
              </p>
              <p className="text-xs text-slate-med/60 mt-3 italic">
                Derived from {comparable.length} final evaluations under one rubric. Small samples may be unstable.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-card rounded-2xl p-5 gold-border">
                <div className="text-[10px] font-mono text-eka-success tracking-wider mb-3">
                  YOUR CORE STRENGTHS
                </div>
                <div className="space-y-2">
                  {strengths.map((s) => (
                    <div key={s.label} className="flex items-center gap-2">
                      <span className="text-eka-success text-xs shrink-0">🟢</span>
                      <span className="text-xs text-muted-white flex-1">
                        {s.label}
                      </span>
                      <span className="text-[10px] font-mono text-eka-success font-bold">
                        {s.value}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card rounded-2xl p-5 gold-border">
                <div className="text-[10px] font-mono text-eka-warning tracking-wider mb-3">
                  HIGH-LEVERAGE OPPORTUNITIES
                </div>
                <div className="space-y-2">
                  {opportunities.map((w) => (
                    <div key={w.label} className="flex items-center gap-2">
                      <span className="text-eka-warning text-xs shrink-0">🟡</span>
                      <span className="text-xs text-muted-white flex-1">
                        {w.label}
                      </span>
                      <span className="text-[10px] font-mono text-eka-warning font-bold">
                        {w.value}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
