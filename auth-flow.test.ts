import test from "node:test"
import assert from "node:assert/strict"
import { authDestination, authRedirect, isProtectedPage, isRecoveryLocation, emailWaitSeconds, authErrorMessage } from "./src/lib/auth-flow.ts"

test("evaluation and personal data require a session; public browsing does not", () => {
  for (const page of ["evaluate", "report", "notes", "progress", "dna", "practice", "challenge", "leaderboard"]) assert.equal(isProtectedPage(page), true)
  for (const page of ["home", "login", "pricing"]) assert.equal(isProtectedPage(page), false)
})

test("email cooldown survives refresh and expires without accepting corrupt storage", () => {
  assert.equal(emailWaitSeconds("160000", 100000), 60)
  assert.equal(emailWaitSeconds("160000", 159001), 1)
  assert.equal(emailWaitSeconds("160000", 160000), 0)
  for (const value of [null, "invalid", "Infinity", "9999999999999999"]) assert.equal(emailWaitSeconds(value, 100000), 0)
})

test("rate limiting gives actionable guidance without promising an hourly quota reset", () => {
  for (const error of [{ status: 429 }, { code: "over_email_send_rate_limit" }, { code: "over_request_rate_limit" }]) {
    assert.match(authErrorMessage(error), /Stop retrying/)
    assert.match(authErrorMessage(error), /project quota/)
  }
  assert.match(authErrorMessage({ code: "email_not_confirmed" }), /Confirm your email/)
  assert.equal(authErrorMessage({ message: "Invalid login credentials" }), "Invalid login credentials")
})
test("confirmation returns to evaluation without accepting external redirect destinations", () => {
  assert.equal(authDestination("?page=login&next=evaluate"), "evaluate")
  for (const search of ["", "?next=https://evil.example", "?next=//evil.example", "?next=reset"]) assert.equal(authDestination(search), "home")
})
test("recovery survives Supabase consuming the token fragment", () => {
  assert.equal(isRecoveryLocation("?page=login&reset=true", ""), true)
  assert.equal(isRecoveryLocation("", "#access_token=synthetic&type=recovery"), true)
  assert.equal(isRecoveryLocation("", "#type=signup"), false)
  assert.equal(isRecoveryLocation("?reset=false", ""), false)
})
test("signup and reset emails return to distinct forms on the current website", () => {
  for (const origin of ["https://answer-evaluation-vert.vercel.app", "https://ekalavyaai.com"]) {
    const signup = new URL(authRedirect(origin))
    const recovery = new URL(authRedirect(origin, true))
    assert.equal(signup.origin, origin)
    assert.equal(signup.searchParams.get("next"), "evaluate")
    assert.equal(recovery.searchParams.get("page"), "login")
    assert.equal(recovery.searchParams.get("reset"), "true")
    assert.equal(recovery.searchParams.has("next"), false)
  }
})
