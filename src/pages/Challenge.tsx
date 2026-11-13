import { useEffect, useState } from "react"
import type { NavigateFn } from "../App"
import { authFetch, BACKEND_URL } from "../lib/api"
import type { ChallengeApiResponse } from "../types/challenge"
import challengeImg from "../imports/21days_challenge.png"

export default function Challenge({ navigate }: { navigate: NavigateFn }) {
  const [data, setData] = useState<ChallengeApiResponse | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [reload, setReload] = useState(0)
  const [evaluationId, setEvaluationId] = useState("")
  const [linkDay, setLinkDay] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    setBusy(true)
    setError("")
    authFetch(`${BACKEND_URL}/api/challenge`)
      .then(async response => {
        if (!response.ok) throw new Error(`Challenge unavailable (HTTP ${response.status}).`)
        return response.json() as Promise<ChallengeApiResponse>
      })
      .then(result => {
        if (active) setData(result)
      })
      .catch(cause => {
        if (active) setError(cause instanceof Error ? cause.message : "Challenge unavailable.")
      })
      .finally(() => {
        if (active) setBusy(false)
      })
    return () => {
      active = false
    }
  }, [reload])

  async function enroll() {
    setBusy(true)
    setError("")
    try {
      const response = await authFetch(`${BACKEND_URL}/api/challenge/enroll`, { method: "POST" })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Enrollment failed.")
      }
      setReload(value => value + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Enrollment failed.")
    } finally {
      setBusy(false)
    }
  }

  async function linkEvaluation() {
    if (!linkDay) return
    setBusy(true)
    setError("")
    try {
      const response = await authFetch(`${BACKEND_URL}/api/challenge/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayNumber: linkDay, evaluationId: evaluationId.trim() }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Could not link evaluation.")
      }
      setEvaluationId("")
      setLinkDay(null)
      setReload(value => value + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not link evaluation.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-deep pt-16 lg:pt-20 text-white-pure">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
        {/* Hero Section with Approved Archer Artwork */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card to-elevated border border-gold/20 p-6 lg:p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <div className="section-label mb-3">21-DAY CHALLENGE</div>
              <h1 className="font-display text-3xl lg:text-4xl text-white-pure mb-3">
                One real answer each day
              </h1>
              <p className="text-slate-med mb-4 leading-relaxed max-w-2xl text-sm sm:text-base">
                Start your journey today. Each day follows India time and completes when you sign in and finish a final answer evaluation. Use the suggested question or evaluate your own paper. Missed days remain visible; your schedule does not reset.
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold/10 border border-gold/25 text-gold text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                <span>21 DAYS OF DISCIPLINE · ONE EVALUATED ANSWER EACH DAY</span>
              </div>
            </div>
            <div className="w-full md:w-52 lg:w-60 flex-shrink-0 flex justify-center">
              <div className="relative rounded-xl overflow-hidden border border-gold/30 shadow-lg shadow-black/40 bg-navy/80 max-w-[240px]">
                <img
                  src={challengeImg}
                  alt="21-Day Challenge Ekalavya Discipline Artwork"
                  className="w-full h-auto max-h-48 object-cover rounded-xl"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/80 via-transparent to-transparent pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Four Honest Feature Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-gold/15 rounded-xl p-4 transition-colors hover:border-gold/30">
            <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/25 flex items-center justify-center text-gold mb-3 text-lg" aria-hidden="true">
              📅
            </div>
            <h3 className="font-semibold text-white-pure text-sm mb-1">Daily Writing</h3>
            <p className="text-xs text-slate-med leading-relaxed">Solve one assigned mains question every day.</p>
          </div>
          <div className="bg-card border border-gold/15 rounded-xl p-4 transition-colors hover:border-gold/30">
            <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/25 flex items-center justify-center text-gold mb-3 text-lg" aria-hidden="true">
              🔍
            </div>
            <h3 className="font-semibold text-white-pure text-sm mb-1">AI Evaluation</h3>
            <p className="text-xs text-slate-med leading-relaxed">The saved evaluation uses the applicable rubric for that paper.</p>
          </div>
          <div className="bg-card border border-gold/15 rounded-xl p-4 transition-colors hover:border-gold/30">
            <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/25 flex items-center justify-center text-gold mb-3 text-lg" aria-hidden="true">
              📊
            </div>
            <h3 className="font-semibold text-white-pure text-sm mb-1">Track Evolution</h3>
            <p className="text-xs text-slate-med leading-relaxed">Monitor your Answer DNA and metrics across 21 answers.</p>
          </div>
          <div className="bg-card border border-gold/15 rounded-xl p-4 transition-colors hover:border-gold/30">
            <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/25 flex items-center justify-center text-gold mb-3 text-lg" aria-hidden="true">
              🎯
            </div>
            <h3 className="font-semibold text-white-pure text-sm mb-1">Build Daily Consistency</h3>
            <p className="text-xs text-slate-med leading-relaxed">Develop a disciplined daily practice rhythm that lasts.</p>
          </div>
        </div>

        {/* Error Alert Banner with Retry Button */}
        {error && (
          <div
            role="alert"
            className="bg-eka-danger/10 border border-eka-danger/30 rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-3"
          >
            <span className="text-sm text-white-pure">{error}</span>
            <button
              type="button"
              className="btn-secondary min-h-[44px] px-4 py-2 text-xs"
              onClick={() => setReload(value => value + 1)}
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Indicator */}
        {busy && <p role="status" className="text-slate-med mb-5">Loading…</p>}

        {/* Unenrolled State: Hero Overview & Start Journey Button */}
        {!busy && !error && data && !data.enrollment && (
          <div className="bg-card rounded-2xl border border-gold/15 p-6 sm:p-8 text-center max-w-xl mx-auto my-6">
            <h2 className="font-display text-xl text-white-pure mb-2">Begin Your 21-Day Habit</h2>
            <p className="text-slate-med mb-6">Enroll when you are ready to write your first answer today.</p>
            <button
              type="button"
              className="btn-primary min-h-[44px] px-6 py-2.5 text-sm"
              onClick={enroll}
            >
              Start Journey
            </button>
          </div>
        )}

        {/* Enrolled State: Stats Bar, Insights, Calendar Progression & Day Cards */}
        {data?.enrollment && (
          <>
            {/* 3 Metric Stat Cards */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                ["Completed", data.completed || 0],
                ["Missed", data.missed || 0],
                ["Current streak", data.streak || 0],
              ].map(([label, value]) => (
                <div key={label} className="bg-card border border-gold/15 rounded-xl p-4 text-center">
                  <div className="text-2xl text-gold font-bold">{value}</div>
                  <div className="text-xs text-slate-med">{label}</div>
                </div>
              ))}
            </div>

            {/* Timezone and Metadata String */}
            <p className="text-xs text-slate-med mb-5">
              Started {data.enrollment.startedOn} · Question bank v{data.enrollment.bankVersion} · Asia/Kolkata
            </p>

            {/* Evaluation Insights & Diagnostic Next Focus */}
            <div className="bg-card border border-gold/15 rounded-xl p-5 mb-6">
              <h2 className="text-gold mb-2 font-semibold">Your evaluation insights</h2>
              <p className="text-sm text-muted-white">
                {data.averageScore != null
                  ? `Journey average: ${data.averageScore.toFixed(1)}/10 across completed days.`
                  : "Your average appears after your first final evaluation."}
              </p>
              <p className="text-sm text-slate-med mt-2">
                {data.nextFocus || "Complete an evaluation to identify a specific focus for your next answer."}
              </p>
            </div>

            {/* 21-Day Calendar Progression Grid */}
            <div className="bg-card border border-gold/15 rounded-xl p-4 sm:p-5 mb-6">
              <h3 className="text-xs font-semibold text-gold uppercase tracking-wider mb-3">
                21-Day Journey Calendar
              </h3>
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {data.days.map(d => (
                  <div
                    key={d.dayNumber}
                    title={`Day ${d.dayNumber} (${d.assignedOn}): ${d.status}`}
                    className={`rounded-lg p-1.5 sm:p-2 text-center border text-xs min-h-[44px] flex flex-col justify-center items-center transition-all ${
                      d.status === "completed"
                        ? "bg-gold text-navy-deep border-gold font-bold shadow-sm"
                        : d.status === "available"
                        ? "border-gold text-gold bg-gold/10 font-bold ring-1 ring-gold/40"
                        : d.status === "missed"
                        ? "border-eka-danger/30 text-slate-med bg-eka-danger/5"
                        : "border-white/10 text-slate-med/60 bg-white/[0.02]"
                    }`}
                  >
                    <span className="text-xs font-semibold">{d.status === "completed" ? "✓" : `D${d.dayNumber}`}</span>
                    <span className="text-[10px] opacity-75 hidden sm:inline">{d.assignedOn.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* List of 21 Day Cards */}
            <div className="space-y-4">
              {data.days.map(day => (
                <article
                  key={day.dayNumber}
                  className={`bg-card rounded-xl p-5 transition-all ${
                    day.status === "available"
                      ? "border-2 border-gold/40 shadow-lg shadow-gold/5 bg-gradient-to-b from-card to-elevated"
                      : "border border-gold/10"
                  }`}
                >
                  <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                    <strong>
                      Day {day.dayNumber} · {day.assignedOn}
                    </strong>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-mono capitalize ${
                        day.status === "completed"
                          ? "bg-gold/20 text-gold border border-gold/30"
                          : day.status === "available"
                          ? "bg-gold text-navy-deep font-bold"
                          : day.status === "missed"
                          ? "bg-eka-danger/10 text-red-400 border border-eka-danger/20"
                          : "bg-white/5 text-slate-med border border-white/10"
                      }`}
                    >
                      {day.status}
                    </span>
                  </div>

                  {/* Sign-in evidence is strictly separate from day completion */}
                  <p className="text-xs text-slate-med mb-2">
                    {day.status === "upcoming"
                      ? `Upcoming · Scheduled for ${day.assignedOn}`
                      : `${day.signedIn ? "Signed in ✓" : "No sign-in recorded"} · ${
                          day.evaluationId ? "Final evaluation ✓" : "Final evaluation pending"
                        }`}
                  </p>

                  <p className="text-sm text-muted-white leading-relaxed">
                    {day.question?.text || "Assigned question unavailable."}
                  </p>

                  {/* Question Metadata Tags */}
                  {day.question && (
                    <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-slate-med">
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-gold">
                        {day.question.paper}
                      </span>
                      <span>·</span>
                      <span>{day.question.marks} Marks</span>
                      {day.question.topic && (
                        <>
                          <span>·</span>
                          <span>{day.question.topic}</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Available Day Actions: Write Answer & Link Existing Evaluation */}
                  {day.status === "available" && day.question && (
                    <div className="flex flex-wrap gap-3 mt-4">
                      <button
                        type="button"
                        className="btn-primary min-h-[44px] px-5 py-2.5 text-xs sm:text-sm font-semibold"
                        onClick={() =>
                          navigate("evaluate", {
                            question: {
                              text: day.question!.text,
                              paper: day.question!.paper,
                              marks: day.question!.marks,
                              challengeDay: day.dayNumber,
                            },
                          })
                        }
                      >
                        Write answer
                      </button>
                      <button
                        type="button"
                        className="btn-secondary min-h-[44px] px-4 py-2.5 text-xs sm:text-sm"
                        onClick={() => {
                          setLinkDay(day.dayNumber)
                          setEvaluationId("")
                        }}
                      >
                        Link existing evaluation
                      </button>
                    </div>
                  )}

                  {/* Verified Link-Existing-Evaluation Form */}
                  {linkDay === day.dayNumber && (
                    <div className="mt-4 p-4 rounded-xl bg-elevated/70 border border-gold/20 flex flex-wrap gap-2.5 items-center">
                      <input
                        aria-label="Evaluation ID"
                        className="bg-navy border border-gold/25 rounded px-3 py-2 text-sm flex-1 min-w-48 min-h-[44px] text-white-pure placeholder-slate-med/70 focus:outline-none focus:border-gold"
                        value={evaluationId}
                        onChange={event => setEvaluationId(event.target.value)}
                        placeholder="Evaluation ID from your report"
                      />
                      <button
                        type="button"
                        className="btn-secondary min-h-[44px] px-4 py-2 text-xs font-semibold"
                        onClick={linkEvaluation}
                        disabled={busy}
                      >
                        Verify and link
                      </button>
                    </div>
                  )}

                  {/* View Linked Report for Completed Days */}
                  {day.evaluationId && (
                    <div className="mt-3">
                      <button
                        type="button"
                        className="text-xs text-gold underline hover:text-gold-bright transition-colors min-h-[44px] inline-flex items-center"
                        onClick={() => navigate("report", { id: day.evaluationId! })}
                      >
                        View linked report
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
