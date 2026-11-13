import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react"
import Challenge from "../Challenge"
import type { NavigateFn } from "../../App"
import type { ChallengeApiResponse, ChallengeDay } from "../../types/challenge"

function createMockDay(dayNumber: number, assignedOn: string, overrides: Partial<ChallengeDay> = {}): ChallengeDay {
  return {
    dayNumber,
    assignedOn,
    signedIn: false,
    evaluationId: null,
    completedAt: null,
    status: "upcoming",
    question: {
      id: `eka-v1-${String(dayNumber).padStart(2, "0")}`,
      paper: "GS2",
      topic: "Governance",
      marks: 10,
      text: `UPSC practice question for Day ${dayNumber}: Critically examine how digital public infrastructure can improve welfare delivery while addressing exclusion risks.`
    },
    ...overrides
  }
}

function createMockChallenge(overrides: Partial<ChallengeApiResponse> = {}, startDateStr = "2026-10-30"): ChallengeApiResponse {
  const [year, month, day] = startDateStr.split("-").map(Number)
  const days: ChallengeDay[] = Array.from({ length: 21 }, (_, index) => {
    const dayNumber = index + 1
    const dt = new Date(Date.UTC(year, month - 1, day + index))
    const assignedOn = dt.toISOString().split("T")[0]
    return createMockDay(dayNumber, assignedOn)
  })

  return {
    enrollment: {
      startedOn: startDateStr,
      bankVersion: 1
    },
    completed: 0,
    missed: 0,
    streak: 0,
    averageScore: null,
    nextFocus: null,
    timezone: "Asia/Kolkata",
    days,
    ...overrides
  } as ChallengeApiResponse
}

function mockResponse(status: number, data: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : status === 201 ? "Created" : "Error",
    headers: new Headers({ "Content-Type": "application/json" }),
    json: async () => data,
    text: async () => JSON.stringify(data)
  } as unknown as Response
}

describe("21-Day Challenge Focused Unit & Integration Tests", () => {
  let mockNavigate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.restoreAllMocks()
    mockNavigate = vi.fn()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("1. renders unenrolled state with hero copy, Start Journey CTA, and no pre-filled progress", async () => {
    const unenrolledData: ChallengeApiResponse = {
      enrollment: null,
      days: [],
      timezone: "Asia/Kolkata"
    }

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, unenrolledData)))

    render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

    // Verify Section Label and Hero Header
    expect(await screen.findByText("21-DAY CHALLENGE")).toBeDefined()
    expect(screen.getByText("One real answer each day")).toBeDefined()

    // Verify Unenrolled prompt and Start Journey button
    expect(screen.getByText("Enroll when you are ready to write your first answer today.")).toBeDefined()
    const startBtn = screen.getByRole("button", { name: /start journey/i })
    expect(startBtn).toBeDefined()

    // Verify that stats are not rendered in unenrolled view
    expect(screen.queryByText(/Question bank v/i)).toBeNull()
    expect(screen.queryByText("Completed")).toBeNull()
    expect(screen.queryByText("Missed")).toBeNull()
    expect(screen.queryByText("Current streak")).toBeNull()

    // Verify strict absence of dishonest marketing promises
    expect(screen.queryByText(/25% off/i)).toBeNull()
    expect(screen.queryByText(/topper/i)).toBeNull()
    expect(screen.queryByText(/exclusive reward/i)).toBeNull()

    // Verify paper-neutral rubric wording and absence of fixed-rubric claims
    expect(screen.getByText(/The saved evaluation uses the applicable rubric for that paper/i)).toBeDefined()
    expect(screen.queryByText(/8 key UPSC parameters/i)).toBeNull()
    expect(screen.queryByText(/8-parameter/i)).toBeNull()
  })

  it("2. renders scheduled dates and metadata strictly adhering to Asia/Kolkata timezone", async () => {
    const challengeData = createMockChallenge({
      days: [
        createMockDay(1, "2026-10-30", { status: "available" }),
        createMockDay(2, "2026-10-31", { status: "upcoming" }),
        ...(createMockChallenge() as { days: ChallengeDay[] }).days.slice(2)
      ]
    })

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, challengeData)))

    render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

    expect(await screen.findByText("Day 1 · 2026-10-30")).toBeDefined()
    expect(screen.getByText("Day 2 · 2026-10-31")).toBeDefined()
    expect(screen.getByText(/Started 2026-10-30 · Question bank v1 · Asia\/Kolkata/i)).toBeDefined()
  })

  it("3. strictly separates sign-in evidence from day completion (sign-in alone does not complete day)", async () => {
    const challengeData = createMockChallenge({
      days: [
        createMockDay(1, "2026-10-30", {
          signedIn: true,
          evaluationId: null,
          status: "available"
        }),
        ...(createMockChallenge() as { days: ChallengeDay[] }).days.slice(1)
      ]
    })

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, challengeData)))

    render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

    await waitFor(() => {
      expect(screen.getByText(/Signed in ✓/i)).toBeDefined()
      expect(screen.getByText(/Final evaluation pending/i)).toBeDefined()
    })

    // Day remains available (NOT completed)
    expect(screen.getByText("available")).toBeDefined()
    expect(screen.queryByText(/Final evaluation ✓/i)).toBeNull()
    expect(screen.getByRole("button", { name: /write answer/i })).toBeDefined()
    expect(screen.getByRole("button", { name: /link existing evaluation/i })).toBeDefined()
  })

  it("4. completed day renders linked report action and navigates with evaluation ID", async () => {
    const evaluationUuid = "41b5ad00-ffe3-4f8c-bc95-dbe6c2084ffd"
    const challengeData = createMockChallenge({
      completed: 1,
      streak: 1,
      days: [
        createMockDay(1, "2026-10-30", {
          status: "completed",
          signedIn: true,
          evaluationId: evaluationUuid
        }),
        ...(createMockChallenge() as { days: ChallengeDay[] }).days.slice(1)
      ]
    })

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, challengeData)))

    render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

    const reportBtn = await screen.findByRole("button", { name: /view linked report/i })
    expect(reportBtn).toBeDefined()
    fireEvent.click(reportBtn)

    expect(mockNavigate).toHaveBeenCalledWith("report", { id: evaluationUuid })
  })

  it("5. past missed days remain permanently missed without schedule reset", async () => {
    const challengeData = createMockChallenge(
      {
        completed: 0,
        missed: 3,
        streak: 0,
        days: [
          createMockDay(1, "2026-10-27", { status: "missed" }),
          createMockDay(2, "2026-10-28", { status: "missed" }),
          createMockDay(3, "2026-10-29", { status: "missed" }),
          createMockDay(4, "2026-10-30", { status: "available", signedIn: true }),
          ...(createMockChallenge({}, "2026-10-27") as { days: ChallengeDay[] }).days.slice(4)
        ]
      },
      "2026-10-27"
    )

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, challengeData)))

    render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

    expect(await screen.findByText(/Started 2026-10-27 · Question bank v1 · Asia\/Kolkata/i)).toBeDefined()
    const missedStat = screen.getByText("Missed").parentElement!
    expect(within(missedStat).getByText("3")).toBeDefined()

    expect(screen.getByText("Day 1 · 2026-10-27")).toBeDefined()
    expect(screen.getByText("Day 3 · 2026-10-29")).toBeDefined()
    expect(screen.getByText("Day 4 · 2026-10-30")).toBeDefined()
  })

  it("6. verified link-existing-evaluation flow validates UUID and handles error states", async () => {
    const challengeData = createMockChallenge({
      days: [
        createMockDay(1, "2026-10-30", { status: "available", signedIn: true }),
        ...(createMockChallenge() as { days: ChallengeDay[] }).days.slice(1)
      ]
    })

    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method?.toUpperCase() || "GET"

      if (url.includes("/api/challenge/complete") && method === "POST") {
        return Promise.resolve(mockResponse(422, { error: "Sign in and complete a final evaluation on the scheduled India date." }))
      }
      return Promise.resolve(mockResponse(200, challengeData))
    })

    vi.stubGlobal("fetch", fetchMock)

    render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

    const linkBtn = await screen.findByRole("button", { name: /link existing evaluation/i })
    fireEvent.click(linkBtn)

    const input = screen.getByLabelText("Evaluation ID")
    fireEvent.change(input, { target: { value: "41b5ad00-ffe3-4f8c-bc95-dbe6c2084ffd" } })

    const submitBtn = screen.getByRole("button", { name: /verify and link/i })
    fireEvent.click(submitBtn)

    const alert = await screen.findByRole("alert")
    expect(alert.textContent).toContain("Sign in and complete a final evaluation on the scheduled India date.")
  })

  it("7. renders error alert with retry button on network failure and recovers on retry", async () => {
    let callCount = 0
    const challengeData = createMockChallenge()

    const fetchMock = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.reject(new Error("Network connection lost. Check your internet."))
      }
      return Promise.resolve(mockResponse(200, challengeData))
    })

    vi.stubGlobal("fetch", fetchMock)

    render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

    const alert = await screen.findByRole("alert")
    expect(alert.textContent).toContain("Network connection lost. Check your internet.")

    const retryBtn = screen.getByRole("button", { name: /retry/i })
    fireEvent.click(retryBtn)

    expect(await screen.findByText(/Started 2026-10-30/i)).toBeDefined()
    expect(screen.queryByRole("alert")).toBeNull()
  })
})
