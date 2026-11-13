import { useEffect, useState } from "react"
import type { NavigateFn } from "../App"
import { authFetch, BACKEND_URL } from "../lib/api"

type Question = {
  id: string
  version: number
  paper: string
  topic: string
  directive: string
  marks: number
  text: string
  source: string
  sourceYear: number | null
}
type PracticeResponse = {
  bankVersion: number
  timezone: string
  today: string
  daily: Question
  questions: Question[]
  recommendation: { dimension: string; questions: Question[] } | null
  pyq: Question[]
}

export default function Practice({ navigate }: { navigate: NavigateFn }) {
  const [data, setData] = useState<PracticeResponse | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [reload, setReload] = useState(0)
  const [tab, setTab] = useState<"recommended" | "daily" | "all" | "pyq">("recommended")

  useEffect(() => {
    let active = true
    setLoading(true)
    setError("")
    authFetch(`${BACKEND_URL}/api/practice/questions`)
      .then(async response => {
        if (!response.ok) throw new Error(`Practice questions could not be loaded (HTTP ${response.status}).`)
        return response.json() as Promise<PracticeResponse>
      })
      .then(result => { if (active) setData(result) })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "Practice questions could not be loaded.") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [reload])

  const tabs = [
    { id: "recommended", label: "For You" },
    { id: "daily", label: "Today" },
    { id: "all", label: "Question Bank" },
    { id: "pyq", label: "Verified PYQs" },
  ] as const
  const questions = !data ? [] : tab === "daily" ? [data.daily]
    : tab === "recommended" ? (data.recommendation?.questions || [data.daily])
    : tab === "pyq" ? data.pyq : data.questions

  return <div className="min-h-screen bg-navy-deep pt-16 lg:pt-20 text-white-pure">
    <div className="max-w-5xl mx-auto px-6 lg:px-10 py-12">
      <div className="section-label mb-3">PRACTICE</div>
      <h1 className="font-display text-3xl lg:text-4xl mb-3">Practice questions</h1>
      <p className="text-slate-med mb-8">Original questions with a clear source. Daily selection resets at midnight in India.</p>
      <div className="flex gap-2 mb-8 overflow-x-auto">
        {tabs.map(item => <button key={item.id} type="button" onClick={() => setTab(item.id)}
          className={`px-4 py-2 rounded-xl whitespace-nowrap ${tab === item.id ? "bg-gold text-navy-deep" : "bg-card text-slate-med"}`}>{item.label}</button>)}
      </div>
      {loading && <p role="status" className="text-slate-med">Loading questions…</p>}
      {error && <div role="alert" className="bg-eka-danger/10 border border-eka-danger/30 rounded-xl p-5">
        <p>{error}</p><button type="button" className="btn-secondary mt-3" onClick={() => setReload(value => value + 1)}>Retry</button>
      </div>}
      {!loading && !error && data?.recommendation && tab === "recommended" &&
        <p className="text-sm text-slate-med mb-5">Based on your final evaluations, practise: <strong>{data.recommendation.dimension.replace(/([A-Z])/g, " $1")}</strong>. This is a practice suggestion, not a predicted mark gain.</p>}
      {!loading && !error && !questions.length && <div className="bg-card rounded-xl p-6 text-slate-med">
        {tab === "pyq" ? "No questions have verified UPSC provenance yet." : "No questions are available yet."}
      </div>}
      {!loading && !error && <div className="space-y-4">{questions.map(question => <article key={question.id} className="bg-card rounded-2xl border border-gold/15 p-6">
        <div className="text-xs text-gold font-mono mb-3">{question.paper} · {question.topic} · {question.marks} marks · {question.directive}</div>
        <p className="text-muted-white leading-relaxed mb-3">{question.text}</p>
        <p className="text-xs text-slate-med mb-4">Source: {question.source}{question.sourceYear ? ` (${question.sourceYear})` : ""} · Bank v{question.version}</p>
        <button type="button" className="btn-primary" onClick={() => navigate("evaluate", { question: { text: question.text, paper: question.paper, marks: question.marks } })}>Write and evaluate an answer</button>
      </article>)}</div>}
    </div>
  </div>
}
