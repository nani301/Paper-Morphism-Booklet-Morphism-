import { useEffect, useState } from "react"
import type { NavigateFn } from "../App"
import { authFetch, BACKEND_URL } from "../lib/api"
import type { ChallengeApiResponse } from "../types/challenge"

export default function ChallengeJourney({ navigate, userId }: { navigate: NavigateFn; userId?: string }) {
  const [data, setData] = useState<ChallengeApiResponse | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (!userId) {
      setData(null)
      return
    }
    let active = true
    setBusy(true)
    setError("")
    authFetch(`${BACKEND_URL}/api/challenge`)
      .then(async response => {
        if (!response.ok) throw new Error("Your journey could not be loaded.")
        return response.json() as Promise<ChallengeApiResponse>
      })
      .then(result => {
        if (active) setData(result)
      })
      .catch(cause => {
        if (active) setError(cause.message)
      })
      .finally(() => {
        if (active) setBusy(false)
      })
    return () => {
      active = false
    }
  }, [userId, reload])

  async function start() {
    if (!userId) {
      navigate("challenge")
      return
    }
    if (data?.enrollment) {
      navigate("challenge")
      return
    }
    setBusy(true)
    setError("")
    try {
      const response = await authFetch(`${BACKEND_URL}/api/challenge/enroll`, { method: "POST" })
      if (!response.ok) throw new Error("Your journey could not be started. Please retry.")
      setReload(value => value + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Please retry.")
      setBusy(false)
    }
  }

  return (
    <section className="py-12 lg:py-24 bg-navy-deep">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <div className="section-label mb-4">THE HABIT LOOP</div>
          <h2 className="font-display text-4xl text-white-pure mb-5">
            21 days.<br />
            <span className="text-gold">Your own journey.</span>
          </h2>
          <p className="text-slate-med mb-5">
            Sign in, write an answer, and learn from your final evaluation. Your calendar starts when you begin, with each day measured in India time.
          </p>
          <ul className="space-y-3 text-muted-white text-sm mb-6">
            <li>Show up: daily signed-in activity is recorded.</li>
            <li>Write with purpose: complete one final evaluation each day.</li>
            <li>Act on feedback: carry a concrete improvement into your next answer.</li>
          </ul>
          <button
            type="button"
            className="btn-primary min-h-[44px]"
            disabled={busy}
            onClick={start}
          >
            {busy ? "Loading…" : data?.enrollment ? "Continue Journey" : "Start Journey"}
          </button>
        </div>
        <div className="bg-card border border-gold/20 rounded-2xl p-6">
          <h3 className="text-gold mb-4">Your 21-day calendar</h3>
          {error ? (
            <div role="alert">
              <p className="text-slate-med">{error}</p>
              <button
                type="button"
                className="btn-secondary min-h-[44px] mt-3"
                onClick={() => setReload(value => value + 1)}
              >
                Retry
              </button>
            </div>
          ) : busy ? (
            <p role="status" className="text-slate-med">
              Loading your journey…
            </p>
          ) : !data?.enrollment ? (
            <p className="text-slate-med py-10">
              {userId
                ? "Begin today to create your personal calendar. No days are marked complete until you earn them."
                : "Sign in and start your journey to see your dates, evaluations, and progress here."}
            </p>
          ) : (
            <>
              <p className="text-xs text-slate-med mb-4">Started {data.enrollment.startedOn} · Asia/Kolkata</p>
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {data.days.map(day => (
                  <div
                    key={day.dayNumber}
                    title={`${day.assignedOn}: ${day.status}${day.signedIn ? ", signed in" : ""}`}
                    className={`rounded-xl p-2 text-center border min-h-[44px] flex flex-col justify-center items-center ${
                      day.status === "completed"
                        ? "bg-gold text-navy-deep border-gold font-bold"
                        : day.status === "available"
                        ? "border-gold text-gold font-bold"
                        : "border-white/10 text-slate-med"
                    }`}
                  >
                    <strong className="block text-sm">{day.status === "completed" ? "✓" : day.dayNumber}</strong>
                    <span className="block text-[9px]">
                      {new Date(`${day.assignedOn}T12:00:00+05:30`).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        timeZone: "Asia/Kolkata",
                      })}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-white mt-5">
                {data.completed || 0}/21 completed · {data.streak || 0} day streak
                {data.averageScore != null ? ` · ${data.averageScore.toFixed(1)}/10 average` : ""}
              </p>
              {data.nextFocus && <p className="text-sm text-slate-med mt-3">Next focus: {data.nextFocus}</p>}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
