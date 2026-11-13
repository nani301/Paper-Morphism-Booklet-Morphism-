export const protectedPages = ["evaluate", "report", "progress", "dna", "notes", "practice", "challenge", "leaderboard"] as const

export function isProtectedPage(page: string): boolean {
  return (protectedPages as readonly string[]).includes(page)
}

export function authDestination(search: string): "evaluate" | "home" {
  return new URLSearchParams(search).get("next") === "evaluate" ? "evaluate" : "home"
}

export function isRecoveryLocation(search: string, hash: string): boolean {
  return new URLSearchParams(search).get("reset") === "true" ||
    new URLSearchParams(hash.replace(/^#/, "")).get("type") === "recovery"
}

export function authRedirect(origin: string, recovery = false): string {
  const url = new URL("/", origin)
  url.searchParams.set("page", "login")
  if (recovery) url.searchParams.set("reset", "true")
  else url.searchParams.set("next", "evaluate")
  return url.toString()
}

export function emailWaitSeconds(value: string | null, now = Date.now()): number {
  const until = Number(value)
  if (!Number.isFinite(until) || until > now + 60_000) return 0
  return Math.max(0, Math.ceil((until - now) / 1000))
}

export function authErrorMessage(error: { status?: number; code?: string; message?: string }): string {
  if (error.status === 429 || error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") {
    return "Too many requests. Stop retrying for now. If you already received a confirmation email, use its latest link and then Sign In. The email service may have reached its project quota; a short countdown does not guarantee that quota has reset."
  }
  if (error.code === "email_not_confirmed") return "Confirm your email using the latest link in your inbox before signing in. Resend only if you have not received it."
  return error.message || "Authentication failed. Please try again later."
}
