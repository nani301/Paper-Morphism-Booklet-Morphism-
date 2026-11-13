import { useState, useEffect, useCallback } from "react"
import Nav from "./components/Nav"
import Footer from "./components/Footer"
import Home from "./pages/Home"
import Evaluate from "./pages/Evaluate"
import EvaluationReport from "./pages/EvaluationReport"
import Leaderboard from "./pages/Leaderboard"
import Challenge from "./pages/Challenge"
import Progress from "./pages/Progress"
import AnswerDNA from "./pages/AnswerDNA"
import Practice from "./pages/Practice"
import Pricing from "./pages/Pricing"
import Login from "./pages/Login"
import CalibrationLab from "./pages/CalibrationLab"
import NotesLibrary from "./pages/NotesLibrary"
import { supabase } from "./lib/supabase"
import { authFetch, BACKEND_URL } from "./lib/api"
import { authDestination, isProtectedPage, isRecoveryLocation } from "./lib/auth-flow"

export type Page =
  | "home"
  | "evaluate"
  | "report"
  | "leaderboard"
  | "challenge"
  | "progress"
  | "dna"
  | "practice"
  | "pricing"
  | "login"
  | "calibration"
  | "notes"

export type PracticeSelection = { text: string; paper: string; marks: number; challengeDay?: number }
export type NavigateFn = (page: Page, params?: { id?: string; question?: PracticeSelection } | string) => void

function parseRouteFromLocation(): { page: Page; id: string | null } {
  if (typeof window === "undefined") {
    return { page: "home", id: null }
  }

  if (isRecoveryLocation(window.location.search, window.location.hash)) return { page: "login", id: null }

  // 1. Check query parameters: ?id=... or ?evaluation_id=... or ?page=...
  const searchParams = new URLSearchParams(window.location.search)
  const searchId =
    searchParams.get("id") ||
    searchParams.get("evaluation_id") ||
    searchParams.get("eval_id")
  const pageParam = searchParams.get("page") as Page | null

  // 2. Check pathname: /report/:id or /report or /evaluate
  const pathname = window.location.pathname.replace(/\/$/, "")
  const pathMatch = pathname.match(/^\/(?:report|evaluations)(?:\/([^/?#]+))?$/)

  // 3. Check hash: #/report/:id or #report?id=...
  let hashId: string | null = null
  let hashPage: Page | null = null
  if (window.location.hash) {
    const rawHash = window.location.hash.replace(/^#\/?/, "")
    const [hPath, hQuery] = rawHash.split("?")
    if (hQuery) {
      const hParams = new URLSearchParams(hQuery)
      hashId = hParams.get("id") || hParams.get("evaluation_id")
    }
    const hParts = hPath.split("/")
    if (hParts[0] === "report") {
      hashPage = "report"
      if (hParts[1]) hashId = hParts[1]
    } else if (
      [
        "home",
        "evaluate",
        "leaderboard",
        "challenge",
        "progress",
        "dna",
        "practice",
        "pricing",
        "login",
        "calibration",
        "notes",
      ].includes(hParts[0])
    ) {
      hashPage = hParts[0] as Page
    }
  }

  // If evaluation id exists in search, path, or hash, prioritize report page
  if (
    searchId ||
    pathMatch ||
    hashId ||
    hashPage === "report" ||
    pageParam === "report"
  ) {
    return {
      page: "report",
      id: searchId || (pathMatch ? pathMatch[1] : null) || hashId || null,
    }
  }

  if (
    pageParam &&
    [
      "home",
      "evaluate",
      "leaderboard",
      "challenge",
      "progress",
      "dna",
      "practice",
      "pricing",
      "login",
      "calibration",
      "notes",
    ].includes(pageParam)
  ) {
    return { page: pageParam, id: null }
  }

  if (hashPage) {
    return { page: hashPage, id: null }
  }

  return { page: "home", id: null }
}

export default function App() {
  const initialRoute = parseRouteFromLocation()
  const [page, setPage] = useState<Page>(initialRoute.page)
  const [evaluationId, setEvaluationId] = useState<string | null>(
    initialRoute.id,
  )
  const [reportData, setReportData] = useState<any>(null)
  const [practiceSelection, setPracticeSelection] = useState<PracticeSelection | null>(null)
  const [user, setUser] = useState<any>(null)

  const [authLoading, setAuthLoading] = useState(true)
  useEffect(() => {
    if (!user?.id) return
    let savedDate = ""
    let pending = false
    const recordActivity = async () => {
      const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date())
      if (pending || savedDate === date || document.visibilityState === "hidden") return
      pending = true
      try { const response = await authFetch(`${BACKEND_URL}/api/challenge/activity`, { method: "POST" }); if (response.ok) savedDate = date }
      catch { /* The challenge page shows activity storage failures and retries. */ }
      finally { pending = false }
    }
    void recordActivity()
    const timer = setInterval(recordActivity, 60_000)
    document.addEventListener("visibilitychange", recordActivity)
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", recordActivity) }
  }, [user?.id])
  const [recovery, setRecovery] = useState(() => isRecoveryLocation(window.location.search, window.location.hash))

  // Track authenticated Supabase session
  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null)
        setAuthLoading(false)
      }).catch(() => setAuthLoading(false))
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          setRecovery(true)
          setPage("login")
        }
        setAuthLoading(false)
        setUser(session?.user ?? null)
      })
      return () => subscription.unsubscribe()
    } else setAuthLoading(false)
  }, [])

  const handleLocationChange = useCallback(() => {
    const route = parseRouteFromLocation()
    setPage(route.page)
    setEvaluationId(route.id)
  }, [])

  useEffect(() => {
    window.addEventListener("popstate", handleLocationChange)
    window.addEventListener("hashchange", handleLocationChange)
    return () => {
      window.removeEventListener("popstate", handleLocationChange)
      window.removeEventListener("hashchange", handleLocationChange)
    }
  }, [handleLocationChange])

  const navigate: NavigateFn = (p: Page, params?: { id?: string; question?: PracticeSelection } | string) => {
    const id = typeof params === "string" ? params : (params?.id ?? null)
    setPracticeSelection(p === "evaluate" && typeof params === "object" ? params?.question ?? null : null)
    setPage(p)
    setEvaluationId(id)

    if (p === "report") {
      const targetUrl = id ? `?id=${encodeURIComponent(id)}` : "?page=report"
      window.history.pushState({ page: "report", id }, "", targetUrl)
    } else if (p === "home") {
      window.history.pushState({ page: "home" }, "", "/")
    } else {
      window.history.pushState({ page: p }, "", `?page=${p}`)
    }

    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Preserve the evaluation destination across email confirmation and OAuth redirects.
  useEffect(() => {
    if (!authLoading && user && page === "login" && !recovery) {
      navigate(authDestination(window.location.search))
    }
  }, [authLoading, user, page, recovery])

  if (authLoading && (isProtectedPage(page) || page === "login")) {
    return <div role="status" className="min-h-screen bg-navy-deep text-white-pure grid place-items-center">Checking your session...</div>
  }
  if (page === "login" || (!user && isProtectedPage(page))) {
    const needsAccount = page !== "login"
    return <Login navigate={navigate} initialTab={recovery ? "reset" : needsAccount ? "up" : "in"}
      requireAccount={needsAccount} recovery={recovery} onAuthenticated={(signedInUser) => {
        setUser(signedInUser)
        setRecovery(false)
        navigate(needsAccount ? page : authDestination(window.location.search), needsAccount && page === "report" && evaluationId ? { id: evaluationId } : undefined)
      }} />
  }

  return (
    <div className="min-h-full bg-navy-deep text-white-pure font-body">
      <Nav page={page} navigate={navigate} user={user} />
      <main>
        {page === "home" && <Home navigate={navigate} userId={user?.id} />}
        {page === "evaluate" && (
          <Evaluate navigate={navigate} setReportData={setReportData} practiceSelection={practiceSelection} />
        )}
        {page === "report" && (
          <EvaluationReport
            navigate={navigate}
            reportData={reportData}
            evaluationId={evaluationId}
          />
        )}
        {page === "leaderboard" && <Leaderboard navigate={navigate} />}
        {page === "challenge" && <Challenge navigate={navigate} />}
        {page === "progress" && <Progress navigate={navigate} user={user} />}
        {page === "dna" && <AnswerDNA navigate={navigate} user={user} />}
        {page === "practice" && <Practice navigate={navigate} />}
        {page === "pricing" && <Pricing navigate={navigate} />}
        {page === "calibration" && <CalibrationLab />}
        {page === "notes" && <NotesLibrary navigate={navigate} user={user} />}
      </main>
      <Footer navigate={navigate} />
    </div>
  )
}
