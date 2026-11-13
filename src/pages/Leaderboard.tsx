import { useEffect, useState, useRef } from "react"
import type { NavigateFn } from "../App"
import { authFetch, BACKEND_URL } from "../lib/api"

export type LeaderboardEntry = {
  rank: number
  label: string
  evaluations: number
  average: number
}

export type LeaderboardData = {
  optedIn: boolean
  periodDays?: number
  minimumEvaluations?: number
  minimumParticipants?: number
  entries: LeaderboardEntry[]
}

/* ── Defensive formatting helper ── */
function formatScore(score: unknown): string {
  if (typeof score === "number" && Number.isFinite(score)) {
    return score.toFixed(2)
  }
  if (typeof score === "string" && score.trim() !== "") {
    const parsed = Number(score)
    if (Number.isFinite(parsed)) return parsed.toFixed(2)
  }
  return "—"
}

/* ── Inline SVG Icons for Visual Direction reflecting top 50.png ── */

function ArcherIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 3c4 3 6 6 6 9s-2 6-6 9" />
      <line x1="4" y1="3" x2="4" y2="21" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <polyline points="16 8 20 12 16 16" />
    </svg>
  )
}

function TrophyIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  )
}

function CrownIcon({ rank, className = "w-5 h-5" }: { rank: number; className?: string }) {
  if (rank === 1) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="#F5A623" stroke="#D89B28" strokeWidth="1.5" aria-label="Rank 1 Gold Crown">
        <path d="M2 19h20v2H2z" />
        <path d="m2 17 3-11 5 6 4-9 4 9 5-6 3 11H2z" />
        <circle cx="5" cy="5" r="1.5" fill="#FFE27A" />
        <circle cx="12" cy="3" r="1.5" fill="#FFE27A" />
        <circle cx="19" cy="5" r="1.5" fill="#FFE27A" />
      </svg>
    )
  }
  if (rank === 2) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="1.5" aria-label="Rank 2 Silver Crown">
        <path d="M2 19h20v2H2z" />
        <path d="m2 17 3-11 5 6 4-9 4 9 5-6 3 11H2z" />
        <circle cx="5" cy="5" r="1.5" fill="#F8FAFC" />
        <circle cx="12" cy="3" r="1.5" fill="#F8FAFC" />
        <circle cx="19" cy="5" r="1.5" fill="#F8FAFC" />
      </svg>
    )
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#CD7F32" stroke="#B45309" strokeWidth="1.5" aria-label="Rank 3 Bronze Crown">
      <path d="M2 19h20v2H2z" />
      <path d="m2 17 3-11 5 6 4-9 4 9 5-6 3 11H2z" />
      <circle cx="5" cy="5" r="1.5" fill="#FDE68A" />
      <circle cx="12" cy="3" r="1.5" fill="#FDE68A" />
      <circle cx="19" cy="5" r="1.5" fill="#FDE68A" />
    </svg>
  )
}

function ShieldCheckIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function BarChartIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function CalendarCheckIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="m9 16 2 2 4-4" />
    </svg>
  )
}

function UsersIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function TrendingUpIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  )
}

/* ── Main Leaderboard Component ── */

export default function Leaderboard({ navigate }: { navigate: NavigateFn }) {
  const [board, setBoard] = useState<LeaderboardData | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [reload, setReload] = useState(0)
  const [optInBusy, setOptInBusy] = useState(false)
  const [optInError, setOptInError] = useState("")

  const isMutatingRef = useRef(false)
  const isMountedRef = useRef(true)

  const rawEntries = Array.isArray(board?.entries) ? board.entries : []
  const entries = rawEntries.filter((e): e is LeaderboardEntry => e != null)
  const minimumParticipants = board?.minimumParticipants ?? 3
  const minimumEvaluations = board?.minimumEvaluations ?? 3
  const periodDays = board?.periodDays ?? 30

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    let active = true
    const abortController = new AbortController()

    if (!board) {
      setLoading(true)
    }
    setError("")

    authFetch(`${BACKEND_URL}/api/leaderboard`, { signal: abortController.signal })
      .then(async response => {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `Leaderboard unavailable (HTTP ${response.status}).`)
        }
        return response.json() as Promise<LeaderboardData>
      })
      .then(result => {
        if (active && isMountedRef.current) {
          setBoard({
            ...result,
            entries: Array.isArray(result?.entries) ? result.entries.filter(Boolean) : [],
          })
        }
      })
      .catch(cause => {
        if (!active || cause?.name === "AbortError") return
        if (isMountedRef.current) {
          setError(cause instanceof Error ? cause.message : "Leaderboard unavailable.")
        }
      })
      .finally(() => {
        if (active && isMountedRef.current) setLoading(false)
      })

    return () => {
      active = false
      abortController.abort()
    }
  }, [reload])

  async function handleToggleOptIn() {
    if (!board || optInBusy || isMutatingRef.current) return
    isMutatingRef.current = true
    setOptInBusy(true)
    setOptInError("")

    try {
      const nextOptedIn = !board.optedIn
      const response = await authFetch(`${BACKEND_URL}/api/leaderboard/opt-in`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optedIn: nextOptedIn }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Could not update preference.")
      }
      const data = await response.json().catch(() => null)
      const confirmedOptedIn = typeof data?.optedIn === "boolean" ? data.optedIn : nextOptedIn
      if (isMountedRef.current) {
        setBoard(prev => (prev ? { ...prev, optedIn: confirmedOptedIn } : null))
        setReload(value => value + 1)
      }
    } catch (cause) {
      if (isMountedRef.current) {
        setOptInError(cause instanceof Error ? cause.message : "Could not update preference.")
      }
    } finally {
      isMutatingRef.current = false
      if (isMountedRef.current) {
        setOptInBusy(false)
      }
    }
  }

  return (
    <div className="min-h-screen bg-navy-deep pt-16 lg:pt-20 text-white-pure">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
        {/* Hero Section reflecting visual direction of top 50.png */}
        <section aria-labelledby="leaderboard-heading" className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-elevated to-navy border border-gold/20 p-6 sm:p-8 lg:p-10 mb-8 shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gold/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex-1 text-center md:text-left">
              <div className="section-label mb-2">COMMUNITY · TOP 50 LEADERBOARD</div>
              <h1 id="leaderboard-heading" className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white-pure mb-2 leading-none">
                TOP 50{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-bright via-gold to-gold-dark">
                  LEADERBOARD
                </span>
              </h1>
              <p className="text-xs sm:text-sm font-mono tracking-widest text-gold uppercase mb-3 font-semibold">
                WHERE CONSISTENCY MEETS EXCELLENCE
              </p>
              <p className="text-slate-med text-sm sm:text-base max-w-xl leading-relaxed mb-4">
                Your rank. Your journey. Your place among dedicated UPSC mains aspirants. Averages reflect qualifying answers evaluated in the last {periodDays} days under the current rubric.
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold/10 border border-gold/25 text-gold text-xs font-mono">
                <TrophyIcon className="w-3.5 h-3.5" />
                <span>RANK UP · STAY CONSISTENT · BENCHMARK ANONYMOUSLY</span>
              </div>
            </div>

            {/* Stylized Archer & Trophy Medallion reflecting top 50.png */}
            <div className="w-36 h-36 sm:w-44 sm:h-44 flex-shrink-0 flex items-center justify-center relative" aria-hidden="true">
              <div className="absolute inset-0 rounded-full border border-gold/20 animate-pulse" />
              <div className="absolute inset-2 rounded-full border border-dashed border-gold/30" />
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-b from-gold/20 to-navy-deep border-2 border-gold/50 flex flex-col items-center justify-center shadow-lg shadow-gold/10">
                <div className="flex items-center gap-1.5 text-gold drop-shadow-[0_0_12px_rgba(245,166,35,0.4)]">
                  <ArcherIcon className="w-7 h-7 sm:w-8 sm:h-8" />
                  <TrophyIcon className="w-9 h-9 sm:w-11 sm:h-11" />
                </div>
                <span className="text-[10px] sm:text-xs font-mono font-bold text-gold tracking-widest mt-1">TOP 50</span>
              </div>
            </div>
          </div>
        </section>

        {/* Reversible Opt-In Privacy Control */}
        <section aria-label="Privacy and opt-in settings" className="bg-card border border-gold/20 rounded-2xl p-5 sm:p-6 mb-8 transition-colors hover:border-gold/30 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/25 flex items-center justify-center text-gold flex-shrink-0 mt-0.5">
                <ShieldCheckIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-semibold text-white-pure">Your Privacy Choice</h2>
                  {board && (
                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${board.optedIn ? "bg-eka-success/10 border-eka-success/30 text-eka-success" : "bg-slate-med/10 border-slate-med/30 text-slate-med"}`}>
                      {board.optedIn ? "Opted In" : "Not Included"}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-med mt-1 max-w-xl leading-relaxed">
                  {board?.optedIn
                    ? `You opted into anonymous ranking. Only your anonymized ID and ${periodDays}-day average are visible to others.`
                    : "You are not included in the ranking. Opt in to bench-test your consistency with the community."}
                </p>
              </div>
            </div>

            <button
              type="button"
              className={`min-h-[44px] px-5 py-2 rounded-xl text-sm font-semibold tracking-wide transition-all self-stretch sm:self-auto flex items-center justify-center ${board?.optedIn
                ? "btn-secondary text-slate-med hover:text-white-pure hover:border-eka-danger/50"
                : "btn-primary"
                }`}
              onClick={handleToggleOptIn}
              disabled={loading || optInBusy || !board}
              aria-busy={optInBusy}
            >
              {optInBusy ? "Saving…" : board?.optedIn ? "Leave leaderboard" : "Opt into leaderboard"}
            </button>
          </div>

          {optInError && (
            <div role="alert" className="mt-3 text-xs text-eka-danger bg-eka-danger/10 border border-eka-danger/25 rounded-lg px-3 py-2">
              {optInError}
            </div>
          )}
        </section>

        {/* Dedicated Error State with Retry Action */}
        {error && (
          <div role="alert" className="bg-eka-danger/10 border border-eka-danger/30 rounded-2xl p-6 mb-8 text-center shadow-lg">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-eka-danger/20 text-eka-danger mb-3 text-xl">
              !
            </div>
            <h3 className="text-lg font-semibold text-white-pure mb-1">Leaderboard Unavailable</h3>
            <p className="text-sm text-eka-danger max-w-md mx-auto mb-5">{error}</p>
            <button
              type="button"
              className="btn-primary min-h-[44px] px-6 text-sm font-semibold tracking-wide inline-flex items-center gap-2"
              onClick={() => setReload(value => value + 1)}
            >
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Dedicated Loading State */}
        {loading && (
          <div role="status" aria-live="polite" className="space-y-4 py-8">
            <div className="text-center mb-6">
              <div className="w-8 h-8 border-2 border-gold/20 border-t-gold rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-med font-mono text-xs tracking-wider uppercase">Loading leaderboard…</p>
            </div>
            {/* Shimmer Placeholder Skeletons */}
            {[1, 2, 3, 4, 5].map(idx => (
              <div key={idx} className="h-16 bg-card/60 border border-gold/10 rounded-xl animate-pulse flex items-center px-5 justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-white/5 rounded-full" />
                  <div className="w-32 h-4 bg-white/5 rounded" />
                </div>
                <div className="w-16 h-4 bg-white/5 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Active Content: Populated Leaderboard OR Strong Honest Empty State */}
        {!loading && !error && board && (
          entries.length === 0 ? (
            /* Strong Honest Empty State */
            <section aria-label="Empty leaderboard notice" className="bg-card border border-gold/20 rounded-2xl p-8 sm:p-12 text-center shadow-2xl">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold mx-auto mb-5 shadow-lg shadow-gold/5">
                <TrophyIcon className="w-8 h-8 sm:w-10 sm:h-10 text-gold" />
              </div>
              <h2 className="font-display text-2xl sm:text-3xl text-white-pure font-bold mb-3">
                Leaderboard Forming
              </h2>
              <p className="text-slate-med max-w-xl mx-auto mb-8 leading-relaxed text-sm sm:text-base">
                The Top 50 leaderboard activates when at least {minimumParticipants} opted-in aspirants each complete {minimumEvaluations} or more eligible final evaluations within the last {periodDays} days under the current rubric. Currently, this qualifying threshold has not yet been reached across the platform.
              </p>

              {/* Honest Qualification Criteria Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-8 text-left">
                <div className="bg-elevated/70 border border-gold/15 rounded-xl p-4">
                  <div className="text-xs font-mono text-gold mb-1 font-semibold">PARTICIPANTS</div>
                  <div className="text-sm font-semibold text-white-pure">At least {minimumParticipants} opted-in</div>
                  <p className="text-xs text-slate-med mt-1">Aspirants choose whether to participate anonymously.</p>
                </div>
                <div className="bg-elevated/70 border border-gold/15 rounded-xl p-4">
                  <div className="text-xs font-mono text-gold mb-1 font-semibold">EVALUATIONS</div>
                  <div className="text-sm font-semibold text-white-pure">Minimum {minimumEvaluations} {minimumEvaluations === 1 ? "answer" : "answers"}</div>
                  <p className="text-xs text-slate-med mt-1">Evaluations must be completed and finalized.</p>
                </div>
                <div className="bg-elevated/70 border border-gold/15 rounded-xl p-4">
                  <div className="text-xs font-mono text-gold mb-1 font-semibold">TIME WINDOW</div>
                  <div className="text-sm font-semibold text-white-pure">Rolling {periodDays} days</div>
                  <p className="text-xs text-slate-med mt-1">Rankings update automatically based on recent consistency.</p>
                </div>
              </div>

              <button
                type="button"
                className="btn-primary min-h-[44px] px-8 text-sm font-semibold tracking-wide inline-flex items-center gap-2"
                onClick={() => navigate("evaluate")}
              >
                <span>Evaluate an answer</span>
              </button>
            </section>
          ) : (
            /* Populated Leaderboard Table reflecting top 50.png */
            <section aria-label="Top 50 rankings" className="bg-card border border-gold/25 rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-5 sm:p-6 border-b border-gold/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-white-pure">
                    TOP 50 ASPIRANTS
                  </h2>
                  <p className="text-xs text-slate-med mt-0.5">
                    Real anonymous rankings based on {periodDays}-day evaluation averages under the current rubric.
                  </p>
                </div>
                <div className="text-xs font-mono text-gold bg-gold/10 px-3 py-1 rounded-full border border-gold/20 self-start sm:self-auto">
                  {entries.length} QUALIFYING {entries.length === 1 ? "ASPIRANT" : "ASPIRANTS"}
                </div>
              </div>

              {/* Table Header */}
              <div className="hidden sm:grid grid-cols-12 text-xs font-mono text-slate-med tracking-wider px-6 py-3 border-b border-gold/10 bg-navy/40">
                <span className="col-span-2">RANK</span>
                <span className="col-span-6">ASPIRANT</span>
                <span className="col-span-2 text-right">EVALUATIONS</span>
                <span className="col-span-2 text-right">AVERAGE SCORE</span>
              </div>

              {/* Entry Rows */}
              <div className="divide-y divide-gold/10">
                {entries.map((entry, idx) => {
                  const rank = typeof entry.rank === "number" && Number.isFinite(entry.rank) && entry.rank > 0 ? entry.rank : idx + 1
                  const isTop1 = rank === 1
                  const isTop2 = rank === 2
                  const isTop3 = rank === 3

                  const label = entry.label?.trim() || `Aspirant #${rank}`
                  const initials = label.replace(/^Aspirant\s*/i, "").slice(0, 2) || "AS"
                  const evalCount = typeof entry.evaluations === "number" && Number.isFinite(entry.evaluations) ? Math.max(0, Math.floor(entry.evaluations)) : 0

                  const rowBgClass = isTop1
                    ? "bg-gradient-to-r from-gold/15 via-gold/5 to-transparent border-l-4 border-l-gold"
                    : isTop2
                      ? "bg-gradient-to-r from-slate-400/15 via-slate-500/5 to-transparent border-l-4 border-l-slate-400"
                      : isTop3
                        ? "bg-gradient-to-r from-amber-700/15 via-amber-800/5 to-transparent border-l-4 border-l-amber-600"
                        : "hover:bg-elevated/50 transition-colors"

                  return (
                    <div
                      key={`${rank}-${label}-${idx}`}
                      className={`flex flex-col sm:grid sm:grid-cols-12 items-start sm:items-center px-4 sm:px-6 py-4 gap-2 sm:gap-0 ${rowBgClass}`}
                    >
                      {/* Mobile Header grouping Rank and Aspirant */}
                      <div className="w-full sm:w-auto col-span-8 flex items-center gap-3 sm:contents">
                        {/* Rank Column */}
                        <div className="col-span-2 flex items-center gap-2">
                          {rank <= 3 ? (
                            <div className="flex items-center gap-1.5">
                              <CrownIcon rank={rank} className="w-5 h-5 flex-shrink-0" />
                              <span
                                className={`font-mono text-base font-bold ${isTop1 ? "text-gold-bright" : isTop2 ? "text-white-pure" : "text-amber-400"
                                  }`}
                              >
                                #{rank}
                              </span>
                            </div>
                          ) : (
                            <span className="font-mono text-sm font-semibold text-slate-med pl-1">
                              #{rank}
                            </span>
                          )}
                        </div>

                        {/* Aspirant Column (Anonymous Avatar + Real Anonymized Label) */}
                        <div className="col-span-6 flex items-center gap-3 w-full sm:w-auto">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-mono font-bold flex-shrink-0 border ${isTop1
                              ? "bg-gold/20 border-gold text-gold-bright shadow-sm shadow-gold/30"
                              : isTop2
                                ? "bg-slate-400/20 border-slate-400 text-white-pure"
                                : isTop3
                                  ? "bg-amber-700/20 border-amber-600 text-amber-300"
                                  : "bg-card border-gold/20 text-slate-med"
                              }`}
                            aria-hidden="true"
                          >
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold text-sm sm:text-base text-white-pure block truncate">
                              {label}
                            </span>
                            <span className="sm:hidden text-xs text-slate-med block">
                              {evalCount} {evalCount === 1 ? "evaluation" : "evaluations"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Evaluations Count Column (Desktop) */}
                      <div className="hidden sm:block col-span-2 text-right font-mono text-xs text-slate-med">
                        {evalCount} {evalCount === 1 ? "answer" : "answers"}
                      </div>

                      {/* Score Column */}
                      <div className="col-span-4 sm:col-span-2 text-left sm:text-right w-full sm:w-auto flex sm:block items-center justify-between pt-2 sm:pt-0 border-t border-gold/10 sm:border-t-0">
                        <span className="sm:hidden text-xs font-mono text-slate-med">SCORE</span>
                        <div>
                          <span
                            className={`font-mono text-base sm:text-lg font-bold ${isTop1 ? "text-gold-bright" : isTop2 ? "text-white-pure" : isTop3 ? "text-amber-300" : "text-gold"
                              }`}
                          >
                            {formatScore(entry.average)}
                          </span>
                          <span className="text-xs font-mono text-slate-med">/10</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        )}

        {/* Four Honest Feature Pillars from visual direction of top 50.png */}
        <section aria-labelledby="pillars-heading" className="mt-12 mb-8">
          <h2 id="pillars-heading" className="sr-only">Leaderboard Principles</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-gold/15 rounded-2xl p-5 transition-colors hover:border-gold/30 shadow-md">
              <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/25 flex items-center justify-center text-gold mb-3">
                <BarChartIcon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white-pure text-sm mb-1 tracking-wide">REAL SCORES</h3>
              <p className="text-xs text-slate-med leading-relaxed">
                Averages derived strictly from verified final evaluations under transparent UPSC rubrics.
              </p>
            </div>

            <div className="bg-card border border-gold/15 rounded-2xl p-5 transition-colors hover:border-gold/30 shadow-md">
              <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/25 flex items-center justify-center text-gold mb-3">
                <CalendarCheckIcon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white-pure text-sm mb-1 tracking-wide">CONSISTENCY MATTERS</h3>
              <p className="text-xs text-slate-med leading-relaxed">
                Daily writing practice and ongoing evaluation build and maintain your standing over time.
              </p>
            </div>

            <div className="bg-card border border-gold/15 rounded-2xl p-5 transition-colors hover:border-gold/30 shadow-md">
              <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/25 flex items-center justify-center text-gold mb-3">
                <UsersIcon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white-pure text-sm mb-1 tracking-wide">PEER BENCHMARKING</h3>
              <p className="text-xs text-slate-med leading-relaxed">
                Compare your performance with peer aspirants across the country completely anonymously.
              </p>
            </div>

            <div className="bg-card border border-gold/15 rounded-2xl p-5 transition-colors hover:border-gold/30 shadow-md">
              <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/25 flex items-center justify-center text-gold mb-3">
                <TrendingUpIcon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white-pure text-sm mb-1 tracking-wide">CONTINUOUS PROGRESS</h3>
              <p className="text-xs text-slate-med leading-relaxed">
                Evaluate answers, absorb diagnostic feedback, and steadily elevate your average score.
              </p>
            </div>
          </div>
        </section>

        {/* Motivational Banner reflecting top 50.png */}
        <div className="rounded-2xl bg-gradient-to-r from-gold/15 via-card to-gold/10 border border-gold/30 p-5 sm:p-6 text-center flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <span className="text-gold text-xl" aria-hidden="true">★</span>
            <span className="text-xs sm:text-sm font-medium tracking-wide text-white-pure text-left">
              EVERY ANSWER YOU EVALUATE TAKES YOU CLOSER TO THE TOP.
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <span className="text-xs sm:text-sm font-mono text-gold tracking-wider font-semibold">
              BE CONSISTENT · BE BETTER · BE IN THE TOP 50.
            </span>
            <button
              type="button"
              className="btn-primary min-h-[44px] px-4 py-2 text-xs font-semibold tracking-wide inline-flex items-center gap-1.5 flex-shrink-0"
              onClick={() => navigate("evaluate")}
            >
              <span>Evaluate</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        {/* UPSC Ranking Disclaimer */}
        <p className="text-xs text-slate-med/80 text-center mt-6 leading-relaxed max-w-2xl mx-auto">
          Optional, anonymous platform ranking. We average final evaluations made in the last {periodDays} days under the current rubric. At least {minimumEvaluations} {minimumEvaluations === 1 ? "evaluation" : "evaluations"} and {minimumParticipants} qualifying {minimumParticipants === 1 ? "participant is" : "participants are"} required. Ties use evaluation count, then anonymous ID. This is not an official UPSC rank.
        </p>
      </div>
    </div>
  )
}
