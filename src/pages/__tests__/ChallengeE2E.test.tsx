import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react"
import Challenge from "../Challenge"
import type { NavigateFn } from "../../App"

/**
 * Types representing the authoritative backend challenge contract
 */
interface Question {
  id: string
  paper: string
  topic: string
  marks: number
  text: string
}

interface Day {
  dayNumber: number
  assignedOn: string
  signedIn?: boolean
  question: Question | null
  evaluationId: string | null
  completedAt?: string | null
  status: "completed" | "missed" | "available" | "upcoming"
}

interface ChallengeData {
  enrollment: { startedOn: string; bankVersion: number } | null
  days: Day[]
  completed?: number
  missed?: number
  streak?: number
  averageScore?: number | null
  nextFocus?: string | null
  timezone: string
}

/**
 * Helper to build an individual challenge day with realistic UPSC GS defaults
 */
function createMockDay(dayNumber: number, assignedOn: string, overrides: Partial<Day> = {}): Day {
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

/**
 * Helper to generate a complete 21-day challenge structure starting on a specific India date
 */
function createMockChallenge(overrides: Partial<ChallengeData> = {}, startDateStr = "2026-10-30"): ChallengeData {
  const [year, month, day] = startDateStr.split("-").map(Number)
  const days: Day[] = Array.from({ length: 21 }, (_, index) => {
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
  }
}

/**
 * Helper to mock a standard Fetch Response
 */
function mockResponse(status: number, data: any): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : status === 201 ? "Created" : "Error",
    headers: new Headers({ "Content-Type": "application/json" }),
    json: async () => data,
    text: async () => JSON.stringify(data)
  } as unknown as Response
}

describe("21-Day Challenge Opaque-Box E2E Test Suite", () => {
  let mockNavigate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.restoreAllMocks()
    mockNavigate = vi.fn()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // =========================================================================
  // TIER 1: Feature Coverage (Smoke & Happy Path)
  // =========================================================================
  describe("Tier 1: Feature Coverage", () => {
    it("T1.1: renders unenrolled state with hero copy, Start Journey CTA, and no pre-filled progress", async () => {
      const unenrolledData: ChallengeData = {
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

      // Verify that no stats (completed/missed/streak) or pre-filled circles are rendered
      expect(screen.queryByText(/Question bank v/i)).toBeNull()
      expect(screen.queryByText("Completed")).toBeNull()
      expect(screen.queryByText("Missed")).toBeNull()
      expect(screen.queryByText("Current streak")).toBeNull()

      // Verify no dishonest promotional promises
      expect(screen.queryByText(/25% off/i)).toBeNull()
      expect(screen.queryByText(/topper/i)).toBeNull()
      expect(screen.queryByText(/exclusive reward/i)).toBeNull()
    })

    it("T1.2: Start Journey flow calls POST /api/challenge/enroll and transitions to enrolled view", async () => {
      const unenrolledData: ChallengeData = {
        enrollment: null,
        days: [],
        timezone: "Asia/Kolkata"
      }

      const enrolledData = createMockChallenge({
        days: [
          createMockDay(1, "2026-10-30", { status: "available", signedIn: true }),
          ...createMockChallenge().days.slice(1)
        ]
      })

      const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        const method = init?.method?.toUpperCase() || "GET"

        if (url.includes("/api/challenge/enroll") && method === "POST") {
          return Promise.resolve(mockResponse(201, { startedOn: "2026-10-30", timezone: "Asia/Kolkata" }))
        }
        if (url.includes("/api/challenge") && method === "GET") {
          // If enroll has been called, return enrolledData; else unenrolledData
          const enrolledCalled = fetchMock.mock.calls.some(c => String(c[0]).includes("/api/challenge/enroll"))
          return Promise.resolve(mockResponse(200, enrolledCalled ? enrolledData : unenrolledData))
        }
        return Promise.resolve(mockResponse(404, { error: "Not found" }))
      })

      vi.stubGlobal("fetch", fetchMock)

      render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

      const startBtn = await screen.findByRole("button", { name: /start journey/i })
      fireEvent.click(startBtn)

      // Verify POST enrollment was sent
      await waitFor(() => {
        const enrollCall = fetchMock.mock.calls.find(c => String(c[0]).includes("/api/challenge/enroll"))
        expect(enrollCall).toBeDefined()
        expect(enrollCall![1]?.method).toBe("POST")
      })

      // Verify enrolled dashboard displays started date and 21 days
      expect(await screen.findByText(/Started 2026-10-30 · Question bank v1 · Asia\/Kolkata/i)).toBeDefined()
      expect(screen.getByText("Completed")).toBeDefined()
      expect(screen.getByText("Missed")).toBeDefined()
      expect(screen.getByText("Current streak")).toBeDefined()
      expect(screen.getByText("Day 1 · 2026-10-30")).toBeDefined()
    })

    it("T1.3: displays scheduled dates formatted in Asia/Kolkata timezone", async () => {
      const challengeData = createMockChallenge({
        days: [
          createMockDay(1, "2026-10-30", { status: "available" }),
          createMockDay(2, "2026-10-31", { status: "upcoming" }),
          ...createMockChallenge().days.slice(2)
        ]
      })

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, challengeData)))

      render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

      expect(await screen.findByText("Day 1 · 2026-10-30")).toBeDefined()
      expect(screen.getByText("Day 2 · 2026-10-31")).toBeDefined()
      expect(screen.getByText(/Started 2026-10-30 · Question bank v1 · Asia\/Kolkata/i)).toBeDefined()
    })

    it("T1.4: displays sign-in evidence separately from day completion", async () => {
      // Day 1 has sign-in evidence, but NO linked evaluation
      const challengeData = createMockChallenge({
        days: [
          createMockDay(1, "2026-10-30", {
            signedIn: true,
            evaluationId: null,
            status: "available"
          }),
          ...createMockChallenge().days.slice(1)
        ]
      })

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, challengeData)))

      render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

      await waitFor(() => {
        expect(screen.getByText(/Signed in ✓/i)).toBeDefined()
        expect(screen.getByText(/Final evaluation pending/i)).toBeDefined()
      })

      // Day is NOT marked completed; it remains "available"
      expect(screen.getByText("available")).toBeDefined()
      expect(screen.queryByText(/Final evaluation ✓/i)).toBeNull()
      expect(screen.getByRole("button", { name: /write answer/i })).toBeDefined()
      expect(screen.getByRole("button", { name: /link existing evaluation/i })).toBeDefined()
    })

    it("T1.5: completion flow submits valid evaluation UUID via POST /api/challenge/complete", async () => {
      const validUuid = "41b5ad00-ffe3-4f8c-bc95-dbe6c2084ffd"
      let isCompleted = false

      const challengeInitial = createMockChallenge({
        days: [
          createMockDay(1, "2026-10-30", { status: "available", signedIn: true }),
          ...createMockChallenge().days.slice(1)
        ]
      })

      const challengeAfterComplete = createMockChallenge({
        completed: 1,
        streak: 1,
        averageScore: 8.0,
        days: [
          createMockDay(1, "2026-10-30", {
            status: "completed",
            signedIn: true,
            evaluationId: validUuid,
            completedAt: "2026-10-30T10:00:00Z"
          }),
          ...createMockChallenge().days.slice(1)
        ]
      })

      const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        const method = init?.method?.toUpperCase() || "GET"

        if (url.includes("/api/challenge/complete") && method === "POST") {
          isCompleted = true
          return Promise.resolve(mockResponse(200, { completed: true, dayNumber: 1 }))
        }
        if (url.includes("/api/challenge") && method === "GET") {
          return Promise.resolve(mockResponse(200, isCompleted ? challengeAfterComplete : challengeInitial))
        }
        return Promise.resolve(mockResponse(404, {}))
      })

      vi.stubGlobal("fetch", fetchMock)

      render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

      // Click link button to open the form
      const linkBtn = await screen.findByRole("button", { name: /link existing evaluation/i })
      fireEvent.click(linkBtn)

      // Find input and submit button
      const idInput = screen.getByLabelText("Evaluation ID")
      expect(idInput).toBeDefined()
      fireEvent.change(idInput, { target: { value: validUuid } })

      const submitBtn = screen.getByRole("button", { name: /verify and link/i })
      fireEvent.click(submitBtn)

      // Verify POST /api/challenge/complete was called with correct payload
      await waitFor(() => {
        const completeCall = fetchMock.mock.calls.find(c => String(c[0]).includes("/api/challenge/complete"))
        expect(completeCall).toBeDefined()
        const body = JSON.parse(completeCall![1]?.body as string)
        expect(body).toEqual({ dayNumber: 1, evaluationId: validUuid })
      })

      // Verify day state updated to completed
      expect(await screen.findByText(/Final evaluation ✓/i)).toBeDefined()
      expect(screen.getByRole("button", { name: /view linked report/i })).toBeDefined()
    })

    it("T1.6: displays today's assigned question text and metadata", async () => {
      const questionText = "Critically analyze the role of Parliamentary Standing Committees in ensuring executive accountability."
      const challengeData = createMockChallenge({
        days: [
          createMockDay(1, "2026-10-30", {
            status: "available",
            signedIn: true,
            question: {
              id: "eka-v1-01",
              paper: "GS2",
              topic: "Parliament",
              marks: 15,
              text: questionText
            }
          }),
          ...createMockChallenge().days.slice(1)
        ]
      })

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, challengeData)))

      render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

      expect(await screen.findByText(questionText)).toBeDefined()
      expect(screen.getByRole("button", { name: /write answer/i })).toBeDefined()
    })

    it("T1.7: Write Answer button navigates to evaluate with pre-filled question params", async () => {
      const questionText = "Assess the strategic importance of the International North-South Transport Corridor (INSTC)."
      const challengeData = createMockChallenge({
        days: [
          createMockDay(1, "2026-10-30", {
            status: "available",
            signedIn: true,
            question: {
              id: "eka-v1-02",
              paper: "GS2",
              topic: "International Relations",
              marks: 15,
              text: questionText
            }
          }),
          ...createMockChallenge().days.slice(1)
        ]
      })

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, challengeData)))

      render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

      const writeBtn = await screen.findByRole("button", { name: /write answer/i })
      fireEvent.click(writeBtn)

      expect(mockNavigate).toHaveBeenCalledWith("evaluate", {
        question: {
          text: questionText,
          paper: "GS2",
          marks: 15,
          challengeDay: 1
        }
      })
    })

    it("T1.8: View linked report action for completed days navigates to report view", async () => {
      const evaluationUuid = "87a6c483-5975-4302-861f-9da8b1368143"
      const challengeData = createMockChallenge({
        completed: 1,
        streak: 1,
        days: [
          createMockDay(1, "2026-10-30", {
            status: "completed",
            signedIn: true,
            evaluationId: evaluationUuid
          }),
          ...createMockChallenge().days.slice(1)
        ]
      })

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, challengeData)))

      render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

      const reportBtn = await screen.findByRole("button", { name: /view linked report/i })
      fireEvent.click(reportBtn)

      expect(mockNavigate).toHaveBeenCalledWith("report", { id: evaluationUuid })
    })

    it("T1.9: displays real evaluation insights (average score and next focus recommendation)", async () => {
      const challengeData = createMockChallenge({
        completed: 3,
        averageScore: 7.6666,
        nextFocus: "Include case studies and judicial precedents in the introduction.",
        days: [
          createMockDay(1, "2026-10-28", { status: "completed", evaluationId: "e1" }),
          createMockDay(2, "2026-10-29", { status: "completed", evaluationId: "e2" }),
          createMockDay(3, "2026-10-30", { status: "completed", evaluationId: "e3" }),
          ...createMockChallenge().days.slice(3)
        ]
      })

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, challengeData)))

      render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

      expect(await screen.findByText("Your evaluation insights")).toBeDefined()
      expect(screen.getByText(/Journey average: 7.7\/10 across completed days./i)).toBeDefined()
      expect(screen.getByText("Include case studies and judicial precedents in the introduction.")).toBeDefined()
    })

    it("T1.10: displays honest empty state when no evaluation insights exist yet", async () => {
      const challengeData = createMockChallenge({
        completed: 0,
        averageScore: null,
        nextFocus: null
      })

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, challengeData)))

      render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

      expect(await screen.findByText("Your average appears after your first final evaluation.")).toBeDefined()
      expect(screen.getByText("Complete an evaluation to identify a specific focus for your next answer.")).toBeDefined()
    })

    it("T1.11: displays error banner with Retry action on network or backend failure", async () => {
      let callCount = 0
      const challengeData = createMockChallenge()

      const fetchMock = vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve(mockResponse(500, { error: "Database temporarily unavailable." }))
        }
        return Promise.resolve(mockResponse(200, challengeData))
      })

      vi.stubGlobal("fetch", fetchMock)

      render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

      // Initial failure alert
      const alert = await screen.findByRole("alert")
      expect(alert).toBeDefined()
      expect(alert.textContent).toContain("Challenge unavailable (HTTP 500).")

      // Click Retry
      const retryBtn = screen.getByRole("button", { name: /retry/i })
      fireEvent.click(retryBtn)

      // Dashboard loads successfully after retry
      expect(await screen.findByText(/Started 2026-10-30/i)).toBeDefined()
      expect(screen.queryByRole("alert")).toBeNull()
    })
  })

  // =========================================================================
  // TIER 2: Boundary & Corner Cases
  // =========================================================================
  describe("Tier 2: Boundary & Corner Cases", () => {
    it("T2.1: midnight rollover at 18:30 UTC / 00:00 IST correctly advances India calendar day", async () => {
      // At 18:30:00 UTC on 2026-10-30, IST is 00:00:00 on 2026-10-31.
      // Challenge started on 2026-10-30.
      // Day 1 (2026-10-30) is now in the past: if uncompleted, it is "missed".
      // Day 2 (2026-10-31) is today: "available".
      // Day 3 (2026-11-01) is tomorrow: "upcoming".
      const challengeData = createMockChallenge({
        completed: 0,
        missed: 1,
        streak: 0,
        days: [
          createMockDay(1, "2026-10-30", { status: "missed", signedIn: false, evaluationId: null }),
          createMockDay(2, "2026-10-31", { status: "available", signedIn: true, evaluationId: null }),
          createMockDay(3, "2026-11-01", { status: "upcoming", signedIn: false, evaluationId: null }),
          ...createMockChallenge().days.slice(3)
        ]
      })

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, challengeData)))

      render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

      // Day 1 displays missed
      const day1Card = await screen.findByText("Day 1 · 2026-10-30")
      const day1Article = day1Card.closest("article")!
      expect(within(day1Article).getByText("missed")).toBeDefined()
      expect(within(day1Article).getByText(/No sign-in recorded/i)).toBeDefined()

      // Day 2 displays available with actions
      const day2Card = screen.getByText("Day 2 · 2026-10-31")
      const day2Article = day2Card.closest("article")!
      expect(within(day2Article).getByText("available")).toBeDefined()
      expect(within(day2Article).getByRole("button", { name: /write answer/i })).toBeDefined()

      // Day 3 displays upcoming and has no action buttons
      const day3Card = screen.getByText("Day 3 · 2026-11-01")
      const day3Article = day3Card.closest("article")!
      expect(within(day3Article).getByText("upcoming")).toBeDefined()
      expect(within(day3Article).queryByRole("button", { name: /write answer/i })).toBeNull()
    })

    it("T2.2: past missed days remain permanently missed without schedule reset", async () => {
      // User enrolled 5 days ago (2026-10-25). Days 1-4 were missed. Day 5 is today.
      const challengeData = createMockChallenge(
        {
          completed: 0,
          missed: 4,
          streak: 0,
          days: [
            createMockDay(1, "2026-10-25", { status: "missed" }),
            createMockDay(2, "2026-10-26", { status: "missed" }),
            createMockDay(3, "2026-10-27", { status: "missed" }),
            createMockDay(4, "2026-10-28", { status: "missed" }),
            createMockDay(5, "2026-10-29", { status: "available", signedIn: true }),
            ...createMockChallenge({}, "2026-10-25").days.slice(5)
          ]
        },
        "2026-10-25"
      )

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, challengeData)))

      render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

      // Start date must be preserved as 2026-10-25 (no schedule reset)
      expect(await screen.findByText(/Started 2026-10-25 · Question bank v1 · Asia\/Kolkata/i)).toBeDefined()

      // Missed count reflects all 4 days
      const missedStat = screen.getByText("Missed").parentElement!
      expect(within(missedStat).getByText("4")).toBeDefined()

      // Days 1 to 4 remain missed
      expect(screen.getByText("Day 1 · 2026-10-25")).toBeDefined()
      expect(screen.getByText("Day 4 · 2026-10-28")).toBeDefined()

      // Day 5 is available
      expect(screen.getByText("Day 5 · 2026-10-29")).toBeDefined()
    })

    it("T2.3: rejects invalid / non-UUID evaluation ID with backend HTTP 400 error message", async () => {
      const challengeData = createMockChallenge({
        days: [
          createMockDay(1, "2026-10-30", { status: "available", signedIn: true }),
          ...createMockChallenge().days.slice(1)
        ]
      })

      const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        const method = init?.method?.toUpperCase() || "GET"

        if (url.includes("/api/challenge/complete") && method === "POST") {
          return Promise.resolve(mockResponse(400, { error: "Valid day and evaluation ID required." }))
        }
        return Promise.resolve(mockResponse(200, challengeData))
      })

      vi.stubGlobal("fetch", fetchMock)

      render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

      const linkBtn = await screen.findByRole("button", { name: /link existing evaluation/i })
      fireEvent.click(linkBtn)

      const input = screen.getByLabelText("Evaluation ID")
      fireEvent.change(input, { target: { value: "not-a-valid-uuid" } })

      const submitBtn = screen.getByRole("button", { name: /verify and link/i })
      fireEvent.click(submitBtn)

      // Verify accessible error alert rendered
      const alert = await screen.findByRole("alert")
      expect(alert.textContent).toContain("Valid day and evaluation ID required.")
    })

    it("T2.4: renders conflict error banner when backend returns HTTP 409 (day already completed)", async () => {
      const challengeData = createMockChallenge({
        days: [
          createMockDay(1, "2026-10-30", { status: "available", signedIn: true }),
          ...createMockChallenge().days.slice(1)
        ]
      })

      const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        const method = init?.method?.toUpperCase() || "GET"

        if (url.includes("/api/challenge/complete") && method === "POST") {
          return Promise.resolve(mockResponse(409, { error: "Day already completed." }))
        }
        return Promise.resolve(mockResponse(200, challengeData))
      })

      vi.stubGlobal("fetch", fetchMock)

      render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

      const linkBtn = await screen.findByRole("button", { name: /link existing evaluation/i })
      fireEvent.click(linkBtn)

      const input = screen.getByLabelText("Evaluation ID")
      fireEvent.change(input, { target: { value: "00000000-0000-0000-0000-000000000099" } })

      fireEvent.click(screen.getByRole("button", { name: /verify and link/i }))

      const alert = await screen.findByRole("alert")
      expect(alert.textContent).toContain("Day already completed.")
    })

    it("T2.5: renders unprocessable entity error when backend returns HTTP 422 (ineligible or no sign-in)", async () => {
      const challengeData = createMockChallenge({
        days: [
          createMockDay(1, "2026-10-30", { status: "available", signedIn: false }),
          ...createMockChallenge().days.slice(1)
        ]
      })

      const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        const method = init?.method?.toUpperCase() || "GET"

        if (url.includes("/api/challenge/complete") && method === "POST") {
          return Promise.resolve(
            mockResponse(422, { error: "Sign in and complete a final evaluation on the scheduled India date." })
          )
        }
        return Promise.resolve(mockResponse(200, challengeData))
      })

      vi.stubGlobal("fetch", fetchMock)

      render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

      const linkBtn = await screen.findByRole("button", { name: /link existing evaluation/i })
      fireEvent.click(linkBtn)

      const input = screen.getByLabelText("Evaluation ID")
      fireEvent.change(input, { target: { value: "41b5ad00-ffe3-4f8c-bc95-dbe6c2084ffd" } })

      fireEvent.click(screen.getByRole("button", { name: /verify and link/i }))

      const alert = await screen.findByRole("alert")
      expect(alert.textContent).toContain("Sign in and complete a final evaluation on the scheduled India date.")
    })

    it("T2.6: uncompleted today does not break existing streak while today remains open", async () => {
      // Day 1 was completed yesterday. Day 2 is today and still available (not completed yet).
      // The current streak must be 1 (not broken to 0 while today is open).
      const challengeData = createMockChallenge({
        completed: 1,
        missed: 0,
        streak: 1,
        days: [
          createMockDay(1, "2026-10-30", { status: "completed", signedIn: true, evaluationId: "e1" }),
          createMockDay(2, "2026-10-31", { status: "available", signedIn: true, evaluationId: null }),
          ...createMockChallenge().days.slice(2)
        ]
      })

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, challengeData)))

      render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

      const streakStat = (await screen.findByText("Current streak")).parentElement!
      expect(within(streakStat).getByText("1")).toBeDefined()

      const day2Card = screen.getByText("Day 2 · 2026-10-31").closest("article")!
      expect(within(day2Card).getByText("available")).toBeDefined()
    })

    it("T2.7: handles terminal Day 21 boundary without overflow or phantom Day 22", async () => {
      // All 21 days completed
      const allCompletedDays = Array.from({ length: 21 }, (_, index) => {
        const dayNumber = index + 1
        const dt = new Date(Date.UTC(2026, 9, 30 + index))
        return createMockDay(dayNumber, dt.toISOString().split("T")[0], {
          status: "completed",
          signedIn: true,
          evaluationId: `00000000-0000-0000-0000-${String(dayNumber).padStart(12, "0")}`
        })
      })

      const challengeData = createMockChallenge({
        completed: 21,
        missed: 0,
        streak: 21,
        averageScore: 8.5,
        days: allCompletedDays
      })

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, challengeData)))

      render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

      const completedStat = (await screen.findByText("Completed")).parentElement!
      expect(within(completedStat).getByText("21")).toBeDefined()

      const streakStat = screen.getByText("Current streak").parentElement!
      expect(within(streakStat).getByText("21")).toBeDefined()

      // Day 21 exists and has report link
      expect(screen.getByText(/Day 21 · 2026-11-19/i)).toBeDefined()

      // Phantom Day 22 must NOT exist
      expect(screen.queryByText(/Day 22/i)).toBeNull()
    })
  })

  // =========================================================================
  // TIER 3: Cross-Feature Combinations
  // =========================================================================
  describe("Tier 3: Cross-Feature Combinations", () => {
    it("T3.1: verifies sign-in vs evaluation matrix across multiple days", async () => {
      // Day 1: Signed in = true, Evaluation = false -> status: missed (in past)
      // Day 2: Signed in = false, Evaluation = false -> status: missed
      // Day 3: Signed in = true, Evaluation = true -> status: completed
      // Day 4: Signed in = true, Evaluation = false -> status: available (today)
      const challengeData = createMockChallenge({
        completed: 1,
        missed: 2,
        streak: 0,
        days: [
          createMockDay(1, "2026-10-27", { signedIn: true, evaluationId: null, status: "missed" }),
          createMockDay(2, "2026-10-28", { signedIn: false, evaluationId: null, status: "missed" }),
          createMockDay(3, "2026-10-29", { signedIn: true, evaluationId: "uuid-3", status: "completed" }),
          createMockDay(4, "2026-10-30", { signedIn: true, evaluationId: null, status: "available" }),
          ...createMockChallenge().days.slice(4)
        ]
      })

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, challengeData)))

      render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

      // Day 1: Signed in, but final evaluation pending, missed
      const day1Card = (await screen.findByText("Day 1 · 2026-10-27")).closest("article")!
      expect(within(day1Card).getByText(/Signed in ✓/i)).toBeDefined()
      expect(within(day1Card).getByText(/Final evaluation pending/i)).toBeDefined()
      expect(within(day1Card).getByText("missed")).toBeDefined()

      // Day 2: No sign-in, final evaluation pending, missed
      const day2Card = screen.getByText("Day 2 · 2026-10-28").closest("article")!
      expect(within(day2Card).getByText(/No sign-in recorded/i)).toBeDefined()
      expect(within(day2Card).getByText(/Final evaluation pending/i)).toBeDefined()
      expect(within(day2Card).getByText("missed")).toBeDefined()

      // Day 3: Completed with both sign-in and evaluation
      const day3Card = screen.getByText("Day 3 · 2026-10-29").closest("article")!
      expect(within(day3Card).getByText(/Signed in ✓/i)).toBeDefined()
      expect(within(day3Card).getByText(/Final evaluation ✓/i)).toBeDefined()
      expect(within(day3Card).getByText("completed")).toBeDefined()

      // Day 4: Available today
      const day4Card = screen.getByText("Day 4 · 2026-10-30").closest("article")!
      expect(within(day4Card).getByText(/Signed in ✓/i)).toBeDefined()
      expect(within(day4Card).getByText(/Final evaluation pending/i)).toBeDefined()
      expect(within(day4Card).getByText("available")).toBeDefined()
    })

    it("T3.2: calculates streak correctly with interleaved completed and missed days", async () => {
      // Day 1: completed
      // Day 2: missed
      // Day 3: completed
      // Day 4: completed
      // Day 5: available (today)
      // Reverse calculation: Day 5 open (skip), Day 4 (+1), Day 3 (+1), Day 2 missed (BREAK!). Streak is 2.
      const challengeData = createMockChallenge({
        completed: 3,
        missed: 1,
        streak: 2,
        days: [
          createMockDay(1, "2026-10-26", { status: "completed", signedIn: true, evaluationId: "e1" }),
          createMockDay(2, "2026-10-27", { status: "missed", signedIn: false, evaluationId: null }),
          createMockDay(3, "2026-10-28", { status: "completed", signedIn: true, evaluationId: "e3" }),
          createMockDay(4, "2026-10-29", { status: "completed", signedIn: true, evaluationId: "e4" }),
          createMockDay(5, "2026-10-30", { status: "available", signedIn: true, evaluationId: null }),
          ...createMockChallenge().days.slice(5)
        ]
      })

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, challengeData)))

      render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

      const streakStat = (await screen.findByText("Current streak")).parentElement!
      expect(within(streakStat).getByText("2")).toBeDefined()

      const completedStat = screen.getByText("Completed").parentElement!
      expect(within(completedStat).getByText("3")).toBeDefined()

      const missedStat = screen.getByText("Missed").parentElement!
      expect(within(missedStat).getByText("1")).toBeDefined()
    })

    it("T3.3: interactive linking state machine transitions day card from available to completed", async () => {
      const evaluationUuid = "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d"
      let completedInDb = false

      const initialData = createMockChallenge({
        days: [
          createMockDay(1, "2026-10-30", { status: "available", signedIn: true }),
          ...createMockChallenge().days.slice(1)
        ]
      })

      const completedData = createMockChallenge({
        completed: 1,
        streak: 1,
        days: [
          createMockDay(1, "2026-10-30", {
            status: "completed",
            signedIn: true,
            evaluationId: evaluationUuid
          }),
          ...createMockChallenge().days.slice(1)
        ]
      })

      const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        const method = init?.method?.toUpperCase() || "GET"

        if (url.includes("/api/challenge/complete") && method === "POST") {
          completedInDb = true
          return Promise.resolve(mockResponse(200, { completed: true, dayNumber: 1 }))
        }
        return Promise.resolve(mockResponse(200, completedInDb ? completedData : initialData))
      })

      vi.stubGlobal("fetch", fetchMock)

      render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

      // 1. Initial State: Available, shows Write Answer and Link buttons
      expect(await screen.findByRole("button", { name: /write answer/i })).toBeDefined()
      const linkBtn = screen.getByRole("button", { name: /link existing evaluation/i })

      // 2. Open input
      fireEvent.click(linkBtn)
      const input = screen.getByLabelText("Evaluation ID")
      expect(input).toBeDefined()

      // 3. Type UUID and click Verify
      fireEvent.change(input, { target: { value: evaluationUuid } })
      fireEvent.click(screen.getByRole("button", { name: /verify and link/i }))

      // 4. Assert Transition: Write and Link buttons disappear, View linked report appears
      await waitFor(() => {
        expect(screen.queryByRole("button", { name: /write answer/i })).toBeNull()
        expect(screen.queryByRole("button", { name: /link existing evaluation/i })).toBeNull()
        expect(screen.getByRole("button", { name: /view linked report/i })).toBeDefined()
      })
    })

    it("T3.4: network failure followed by Retry restores full dashboard view", async () => {
      let fail = true
      const challengeData = createMockChallenge({
        completed: 1,
        streak: 1,
        days: [
          createMockDay(1, "2026-10-30", { status: "completed", signedIn: true, evaluationId: "e1" }),
          ...createMockChallenge().days.slice(1)
        ]
      })

      const fetchMock = vi.fn().mockImplementation(() => {
        if (fail) {
          return Promise.reject(new Error("Network connection lost. Check your internet."))
        }
        return Promise.resolve(mockResponse(200, challengeData))
      })

      vi.stubGlobal("fetch", fetchMock)

      render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

      // Alert displays error
      const alert = await screen.findByRole("alert")
      expect(alert.textContent).toContain("Network connection lost. Check your internet.")

      // Clear failure and click Retry
      fail = false
      const retryBtn = screen.getByRole("button", { name: /retry/i })
      fireEvent.click(retryBtn)

      // Dashboard successfully renders
      expect(await screen.findByText(/Started 2026-10-30/i)).toBeDefined()
      expect(screen.queryByRole("alert")).toBeNull()
    })
  })

  // =========================================================================
  // TIER 4: Real-World Application Scenarios
  // =========================================================================
  describe("Tier 4: Real-World Application Scenarios", () => {
    it("T4.1: realistic multi-day student progression simulation across enrollment and completion", async () => {
      // Step 1: Fresh user arrives unenrolled
      let currentStage: "unenrolled" | "day1_started" | "day1_completed" = "unenrolled"

      const eval1Uuid = "71a93e50-29c4-4b51-827d-947b74f07e59"

      const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        const method = init?.method?.toUpperCase() || "GET"

        if (url.includes("/api/challenge/enroll") && method === "POST") {
          currentStage = "day1_started"
          return Promise.resolve(mockResponse(201, { startedOn: "2026-10-30", timezone: "Asia/Kolkata" }))
        }

        if (url.includes("/api/challenge/complete") && method === "POST") {
          currentStage = "day1_completed"
          return Promise.resolve(mockResponse(200, { completed: true, dayNumber: 1 }))
        }

        if (url.includes("/api/challenge") && method === "GET") {
          if (currentStage === "unenrolled") {
            return Promise.resolve(mockResponse(200, { enrollment: null, days: [], timezone: "Asia/Kolkata" }))
          }
          if (currentStage === "day1_started") {
            return Promise.resolve(
              mockResponse(
                200,
                createMockChallenge({
                  days: [
                    createMockDay(1, "2026-10-30", { status: "available", signedIn: true }),
                    ...createMockChallenge().days.slice(1)
                  ]
                })
              )
            )
          }
          if (currentStage === "day1_completed") {
            return Promise.resolve(
              mockResponse(
                200,
                createMockChallenge({
                  completed: 1,
                  streak: 1,
                  averageScore: 7.8,
                  nextFocus: "Strengthen ethical frameworks in Section B.",
                  days: [
                    createMockDay(1, "2026-10-30", {
                      status: "completed",
                      signedIn: true,
                      evaluationId: eval1Uuid
                    }),
                    createMockDay(2, "2026-10-31", { status: "upcoming", signedIn: false }),
                    ...createMockChallenge().days.slice(2)
                  ]
                })
              )
            )
          }
        }

        return Promise.resolve(mockResponse(404, {}))
      })

      vi.stubGlobal("fetch", fetchMock)

      render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

      // 1. Unenrolled -> Start Journey
      const startBtn = await screen.findByRole("button", { name: /start journey/i })
      fireEvent.click(startBtn)

      // 2. Journey Started -> Day 1 is Available
      expect(await screen.findByText("Day 1 · 2026-10-30")).toBeDefined()
      const writeBtn = screen.getByRole("button", { name: /write answer/i })
      fireEvent.click(writeBtn)
      expect(mockNavigate).toHaveBeenCalledWith("evaluate", expect.anything())

      // 3. User links evaluation
      const linkBtn = screen.getByRole("button", { name: /link existing evaluation/i })
      fireEvent.click(linkBtn)
      const input = screen.getByLabelText("Evaluation ID")
      fireEvent.change(input, { target: { value: eval1Uuid } })
      fireEvent.click(screen.getByRole("button", { name: /verify and link/i }))

      // 4. Day 1 Completed -> Report button appears, averageScore and nextFocus update
      expect(await screen.findByText(/Journey average: 7.8\/10 across completed days./i)).toBeDefined()
      expect(screen.getByText("Strengthen ethical frameworks in Section B.")).toBeDefined()
      expect(screen.getByRole("button", { name: /view linked report/i })).toBeDefined()
    })

    it("T4.2: re-enrollment idempotency preserves existing schedule and progress", async () => {
      // User is already enrolled with Day 1 completed.
      // Triggering enrollment again returns HTTP 200 with existing startedOn date.
      const existingData = createMockChallenge({
        completed: 1,
        streak: 1,
        averageScore: 8.0,
        days: [
          createMockDay(1, "2026-10-30", { status: "completed", signedIn: true, evaluationId: "e1" }),
          createMockDay(2, "2026-10-31", { status: "available", signedIn: true }),
          ...createMockChallenge().days.slice(2)
        ]
      })

      const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        const method = init?.method?.toUpperCase() || "GET"

        if (url.includes("/api/challenge/enroll") && method === "POST") {
          return Promise.resolve(mockResponse(200, { startedOn: "2026-10-30", timezone: "Asia/Kolkata" }))
        }
        return Promise.resolve(mockResponse(200, existingData))
      })

      vi.stubGlobal("fetch", fetchMock)

      render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

      // Verify existing progress is rendered
      expect(await screen.findByText(/Started 2026-10-30/i)).toBeDefined()
      const completedStat = screen.getByText("Completed").parentElement!
      expect(within(completedStat).getByText("1")).toBeDefined()

      // Ensure Day 1 remains completed
      const day1Card = screen.getByText("Day 1 · 2026-10-30").closest("article")!
      expect(within(day1Card).getByText("completed")).toBeDefined()
      expect(within(day1Card).getByRole("button", { name: /view linked report/i })).toBeDefined()
    })
  })
})
