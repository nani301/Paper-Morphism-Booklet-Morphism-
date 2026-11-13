import { useState, useEffect } from "react"
import type { NavigateFn } from "../App"
import { loadEvaluationHistory } from "../lib/evaluation-history"

interface EvaluationSummary {
  id: string
  created_at: string
  status: string
  question?: string
  exam?: string
  paper?: string
  maximum_marks?: number
  evaluation_result?: {
    evaluationStatus?: "final" | "provisional" | "blocked"
    needsHumanReview?: boolean
    rubricVersion?: string
    scoring?: { awardedScore?: number; maxScore?: number }
  }
}

export default function Progress({
  navigate,
  user,
}: {
  navigate: NavigateFn
  user?: any
}) {
  const [evaluations, setEvaluations] = useState<EvaluationSummary[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<"7D" | "30D" | "90D" | "All">("All")
  const [hovered, setHovered] = useState<number | null>(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      setEvaluations([])
      return
    }

    let isMounted = true
    setLoading(true)
    setError(null)

    loadEvaluationHistory<EvaluationSummary>()
      .then((list) => { if (isMounted) setEvaluations(list) })
      .catch((err: any) => {
        if (isMounted) {
          console.warn("Could not load user evaluation history:", err)
          setError(err.message || "Failed to load evaluation history.")
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [user])

  if (!user) {
    return (
      <div className="min-h-screen bg-navy-deep pt-16 lg:pt-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-10 py-16 text-center">
          <div className="section-label mb-3">YOUR JOURNEY</div>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold text-white-pure mb-4">
            Progress Dashboard
          </h1>
          <p className="text-slate-med max-w-xl mx-auto mb-8">
            Track your score trajectories, parameter mastery, and writing evolution over time.
          </p>
          <div className="bg-card rounded-2xl p-8 border border-gold/20 max-w-md mx-auto gold-border">
            <div className="text-3xl mb-4">📈</div>
            <h3 className="text-lg font-semibold text-white-pure mb-2">
              Sign In to View Your Progress
            </h3>
            <p className="text-xs text-slate-med mb-6">
              Evaluation history and progress metrics are tied to your authenticated candidate profile.
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

  // Filter completed evaluations with scores
  const finalEvals = evaluations
    .filter((e) => e.status === "completed" && e.evaluation_result?.evaluationStatus === "final" && !e.evaluation_result?.needsHumanReview && Number.isFinite(e.evaluation_result?.scoring?.awardedScore) && (e.evaluation_result?.scoring?.maxScore || 0) > 0)
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )
  const latestRubric = finalEvals.at(-1)?.evaluation_result?.rubricVersion || "unversioned"
  const days = filter === "All" ? null : Number.parseInt(filter, 10)
  const cutoff = days === null ? 0 : Date.now() - days * 86_400_000
  const completedEvals = finalEvals.filter(e => (e.evaluation_result?.rubricVersion || "unversioned") === latestRubric && new Date(e.created_at).getTime() >= cutoff)

  // Derived KPIs
  const totalCount = completedEvals.length
  const scores = completedEvals.map(
    (e) => ((e.evaluation_result?.scoring?.awardedScore || 0) / (e.evaluation_result?.scoring?.maxScore || 10)) * 10,
  )
  const avgScore =
    totalCount > 0
      ? (scores.reduce((a, b) => a + b, 0) / totalCount).toFixed(1)
      : "0.0"
  const bestScore = totalCount > 0 ? Math.max(...scores).toFixed(1) : "0.0"
  const delta =
    totalCount >= 2 ? (scores[scores.length - 1] - scores[0]).toFixed(1) : "0.0"

  // Dimensions
  const provisionalCount = evaluations.filter(e => e.status === "completed" && e.evaluation_result?.evaluationStatus !== "final").length

  const chartH = 180
  const chartW = 600
  const minScore = 0
  const maxScore = 10

  const toY = (s: number) =>
    chartH - ((Math.min(10, Math.max(0, s)) - minScore) / (maxScore - minScore)) * chartH
  const toX = (i: number) =>
    scores.length > 1 ? (i / (scores.length - 1)) * chartW : chartW / 2

  const pathD =
    scores.length > 1
      ? scores.map((s, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(s)}`).join(" ")
      : ""
  const areaD =
    scores.length > 1
      ? `${pathD} L${chartW},${chartH} L0,${chartH} Z`
      : ""

  return (
    <div className="min-h-screen bg-navy-deep pt-16 lg:pt-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12">
        <div className="mb-10">
          <div className="section-label mb-3">YOUR JOURNEY</div>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold text-white-pure">
            Progress Dashboard
          </h1>
          <p className="text-slate-med text-sm mt-1">
            Real evaluation metrics derived from your submitted UPSC answer scripts.
          </p>
        </div>

        {error && (
          <div className="bg-eka-danger/10 border border-eka-danger/30 rounded-xl p-4 mb-6 text-eka-danger text-xs">
            {error} <button type="button" onClick={() => window.location.reload()} className="underline ml-2">Retry</button>
          </div>
        )}

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mb-8 lg:mb-10">
          <div className="bg-card rounded-xl p-4 gold-border text-center">
            <div className="text-xl font-mono font-bold text-white-pure">
              {loading ? "..." : totalCount}
            </div>
            <div className="text-[10px] text-slate-med mt-1 leading-tight">
              Answers Evaluated
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 gold-border text-center">
            <div className="text-xl font-mono font-bold text-gold">
              {loading ? "..." : totalCount > 0 ? `${avgScore}/10` : "—"}
            </div>
            <div className="text-[10px] text-slate-med mt-1 leading-tight">
              Average Score
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 gold-border text-center">
            <div className="text-xl font-mono font-bold text-eka-success">
              {loading ? "..." : totalCount > 0 ? `${bestScore}/10` : "—"}
            </div>
            <div className="text-[10px] text-slate-med mt-1 leading-tight">
              Best Score
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 gold-border text-center">
            <div className="text-xl font-mono font-bold text-eka-success">
              {loading ? "..." : totalCount >= 3 ? `${Number(delta) >= 0 ? "+" : ""}${delta}` : "—"}
            </div>
            <div className="text-[10px] text-slate-med mt-1 leading-tight">
              First-to-last change (3+ comparable reports)
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 gold-border text-center">
            <div className="text-xl font-mono font-bold text-gold">
              {loading ? "..." : provisionalCount}
            </div>
            <div className="text-[10px] text-slate-med mt-1 leading-tight">
              Provisional or blocked
            </div>
          </div>
        </div>
        {!loading && finalEvals.length > 0 && <p className="text-xs text-slate-med mb-6">Showing {totalCount} final report{totalCount === 1 ? "" : "s"} under rubric {latestRubric} for {filter === "All" ? "all available dates" : `the last ${days} days`}. Earlier rubrics are excluded from these comparisons.</p>}

        {totalCount === 0 && !loading ? (
          <div className="bg-card rounded-2xl p-12 text-center gold-border mb-8">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="font-display text-xl font-semibold text-white-pure mb-2">
              No Evaluations Yet
            </h3>
            <p className="text-slate-med text-sm max-w-md mx-auto mb-6">
              You haven't submitted any answers for AI evaluation yet. Submit your handwritten or typed UPSC answers to unlock trajectory analytics.
            </p>
            <button
              onClick={() => navigate("evaluate")}
              className="bg-gold hover:bg-gold-bright text-navy-deep font-bold py-3 px-6 rounded-xl transition-all shadow-md font-mono text-xs uppercase"
            >
              Evaluate Your First Answer
            </button>
          </div>
        ) : (
          <>
            {/* Score trend chart */}
            <div className="bg-card rounded-2xl p-6 gold-border mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="text-xs font-mono text-gold tracking-wider">
                  SCORE TREND · CHRONOLOGICAL
                </div>
                <div className="flex gap-1">
                  {(["7D", "30D", "90D", "All"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                        filter === f
                          ? "bg-gold text-navy-deep font-bold"
                          : "text-slate-med hover:text-white-pure bg-elevated"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {scores.length > 1 ? (
                <div className="relative overflow-x-auto">
                  <svg
                    width="100%"
                    viewBox={`0 0 ${chartW} ${chartH + 30}`}
                    style={{ minWidth: 400 }}
                  >
                    {/* Grid lines */}
                    {[2, 4, 6, 8, 10].map((v) => (
                      <g key={v}>
                        <line
                          x1="0"
                          y1={toY(v)}
                          x2={chartW}
                          y2={toY(v)}
                          stroke="rgba(245,166,35,0.08)"
                          strokeWidth="1"
                        />
                        <text
                          x="10"
                          y={toY(v) - 4}
                          fill="#94A3B8"
                          fontSize="9"
                          fontFamily="JetBrains Mono"
                        >
                          {v}/10
                        </text>
                      </g>
                    ))}

                    {/* Area fill */}
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F5A623" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#F5A623" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d={areaD} fill="url(#areaGrad)" />

                    {/* Line */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#F5A623"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      style={{ filter: "drop-shadow(0 0 4px rgba(245,166,35,0.4))" }}
                    />

                    {/* Points */}
                    {scores.map((s, i) => (
                      <g key={i}>
                        <circle
                          cx={toX(i)}
                          cy={toY(s)}
                          r={hovered === i ? 6 : 4}
                          fill={hovered === i ? "#FFD166" : "#F5A623"}
                          stroke="#050914"
                          strokeWidth="2"
                          style={{
                            cursor: "pointer",
                            transition: "r 0.2s, fill 0.2s",
                          }}
                          onMouseEnter={() => setHovered(i)}
                          onMouseLeave={() => setHovered(null)}
                        />
                        {hovered === i && (
                          <g>
                            <rect
                              x={toX(i) - 30}
                              y={toY(s) - 26}
                              width="60"
                              height="20"
                              rx="4"
                              fill="#0B1626"
                              stroke="rgba(245,166,35,0.4)"
                              strokeWidth="1"
                            />
                            <text
                              x={toX(i)}
                              y={toY(s) - 13}
                              textAnchor="middle"
                              fill="#FFD166"
                              fontSize="10"
                              fontFamily="JetBrains Mono"
                              fontWeight="600"
                            >
                              {s}/10
                            </text>
                          </g>
                        )}
                      </g>
                    ))}

                    {/* Date labels */}
                    {completedEvals.map((ev, i) => {
                      const d = new Date(ev.created_at).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                      })
                      return (
                        <text
                          key={i}
                          x={toX(i)}
                          y={chartH + 20}
                          textAnchor="middle"
                          fill="#94A3B8"
                          fontSize="8.5"
                          fontFamily="JetBrains Mono"
                        >
                          {d}
                        </text>
                      )
                    })}
                  </svg>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-med text-xs">
                  {totalCount === 1
                    ? "Single evaluation recorded. Submit additional answers to render your progression curve."
                    : "No evaluations to display."}
                </div>
              )}
            </div>

          </>
        )}

        {/* Evaluation History */}
        {evaluations.length > 0 && (
          <div className="bg-card rounded-2xl gold-border overflow-hidden">
            <div className="px-6 py-4 border-b border-gold/10">
              <div className="text-xs font-mono text-gold tracking-wider">
                EVALUATION HISTORY
              </div>
            </div>
            <div className="divide-y divide-gold/5">
              {evaluations.map((item) => {
                const questionText =
                  item.question ||
                  "Answer evaluation"
                const awarded = item.evaluation_result?.evaluationStatus === "final" &&
                  Number.isFinite(item.evaluation_result?.scoring?.awardedScore) &&
                  (item.evaluation_result?.scoring?.maxScore || 0) > 0
                    ? ((item.evaluation_result?.scoring?.awardedScore || 0) /
                        (item.evaluation_result?.scoring?.maxScore || 10) * 10).toFixed(1)
                    : null
                const dateStr = new Date(item.created_at).toLocaleDateString(
                  "en-IN",
                  {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  },
                )
                return (
                  <div
                    key={item.id}
                    className="px-6 py-4 hover:bg-elevated transition-colors"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-mono text-slate-med mb-1">
                          {item.paper || "GS"} · {dateStr}
                        </div>
                        <p className="text-sm text-muted-white truncate">
                          {questionText}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase ${
                              item.status === "completed"
                                ? "bg-eka-success/10 text-eka-success border-eka-success/20"
                                : item.status === "failed"
                                  ? "bg-eka-danger/10 text-eka-danger border-eka-danger/20"
                                  : "bg-gold/10 text-gold border-gold/20"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        {awarded !== null && (
                          <div className="text-right">
                            <div className="text-lg font-mono font-bold text-gold">
                              {awarded}/10
                            </div>
                          </div>
                        )}
                        <button
                          onClick={() => navigate("report", { id: item.id })}
                          disabled={item.status !== "completed"}
                          className="text-xs bg-gold text-navy-deep px-3 py-1.5 rounded-lg font-bold hover:bg-gold-bright transition-colors"
                        >
                          VIEW REPORT
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
