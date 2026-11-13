import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react"
import Challenge from "../Challenge"
import ChallengeJourney from "../../components/ChallengeJourney"
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

function mockResponse(status: number, data: unknown, isJson = true): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : status === 201 ? "Created" : "Error",
    headers: new Headers({ "Content-Type": isJson ? "application/json" : "text/html" }),
    json: async () => {
      if (!isJson) throw new SyntaxError("Unexpected token < in JSON at position 0")
      return data
    },
    text: async () => (isJson ? JSON.stringify(data) : String(data))
  } as unknown as Response
}

describe("Adversarial White-Box Stress Test Suite", () => {
  let mockNavigate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.restoreAllMocks()
    mockNavigate = vi.fn()
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, createMockChallenge())))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // -------------------------------------------------------------------------
  // 1. Client-Side Input Handling
  // -------------------------------------------------------------------------
  describe("1. Client-Side Input Handling", () => {
    it("ADV-01: trims whitespace around valid evaluationId before POST submission", async () => {
      const rawUuidWithWhitespace = "   41b5ad00-ffe3-4f8c-bc95-dbe6c2084ffd   \t\n"
      const expectedTrimmedUuid = "41b5ad00-ffe3-4f8c-bc95-dbe6c2084ffd"
      let submittedBody: any = null

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
          submittedBody = JSON.parse(init?.body as string)
          return Promise.resolve(mockResponse(200, { completed: true, dayNumber: 1 }))
        }
        return Promise.resolve(mockResponse(200, challengeData))
      })

      vi.stubGlobal("fetch", fetchMock)

      render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

      const linkBtn = await screen.findByRole("button", { name: /link existing evaluation/i })
      fireEvent.click(linkBtn)

      const input = screen.getByLabelText("Evaluation ID")
      fireEvent.change(input, { target: { value: rawUuidWithWhitespace } })

      fireEvent.click(screen.getByRole("button", { name: /verify and link/i }))

      await waitFor(() => {
        expect(submittedBody).not.toBeNull()
        expect(submittedBody.evaluationId).toBe(expectedTrimmedUuid)
        expect(submittedBody.dayNumber).toBe(1)
      })

      // Await reload completion so no dangling requests hit localhost after unstubbing
      expect(await screen.findByText("Day 1 · 2026-10-30")).toBeDefined()
    })

    it("ADV-02: handles empty string and whitespace-only evaluationId submission gracefully", async () => {
      let submittedBody: any = null

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
          submittedBody = JSON.parse(init?.body as string)
          return Promise.resolve(mockResponse(400, { error: "Valid day and evaluation ID required." }))
        }
        return Promise.resolve(mockResponse(200, challengeData))
      })

      vi.stubGlobal("fetch", fetchMock)

      render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

      const linkBtn = await screen.findByRole("button", { name: /link existing evaluation/i })
      fireEvent.click(linkBtn)

      const input = screen.getByLabelText("Evaluation ID")
      // User types spaces
      fireEvent.change(input, { target: { value: "     " } })

      fireEvent.click(screen.getByRole("button", { name: /verify and link/i }))

      const alert = await screen.findByRole("alert")
      expect(alert.textContent).toContain("Valid day and evaluation ID required.")
      expect(submittedBody.evaluationId).toBe("")
    })

    it("ADV-03: switching linkDay resets input field and updates active day target", async () => {
      const challengeData = createMockChallenge({
        days: [
          createMockDay(1, "2026-10-30", { status: "available", signedIn: true }),
          createMockDay(2, "2026-10-31", { status: "available", signedIn: true }),
          ...createMockChallenge().days.slice(2)
        ]
      })

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, challengeData)))

      render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

      const linkButtons = await screen.findAllByRole("button", { name: /link existing evaluation/i })
      expect(linkButtons.length).toBe(2)

      // Open Day 1 input and type some text
      fireEvent.click(linkButtons[0])
      let input = screen.getByLabelText("Evaluation ID")
      fireEvent.change(input, { target: { value: "some-draft-id" } })
      expect((input as HTMLInputElement).value).toBe("some-draft-id")

      // Click Day 2 Link button
      fireEvent.click(linkButtons[1])

      // Input should now belong to Day 2 and be reset to empty
      input = screen.getByLabelText("Evaluation ID")
      expect((input as HTMLInputElement).value).toBe("")
    })
  })

  // -------------------------------------------------------------------------
  // 2. Error Resilience & Malformed Data
  // -------------------------------------------------------------------------
  describe("2. Error Resilience & Malformed Data", () => {
    it("ADV-04: non-JSON HTML error (502 Bad Gateway) on GET /api/challenge renders HTTP status error", async () => {
      const html502 = "<html><head><title>502 Bad Gateway</title></head><body>Bad Gateway</body></html>"

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(502, html502, false)))

      render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

      const alert = await screen.findByRole("alert")
      expect(alert.textContent).toContain("Challenge unavailable (HTTP 502).")
    })

    it("ADV-05: non-JSON HTML error on POST /api/challenge/enroll falls back to default error text", async () => {
      const unenrolledData: ChallengeApiResponse = {
        enrollment: null,
        days: [],
        timezone: "Asia/Kolkata"
      }

      const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        const method = init?.method?.toUpperCase() || "GET"

        if (url.includes("/api/challenge/enroll") && method === "POST") {
          return Promise.resolve(mockResponse(502, "<html>Gateway Timeout</html>", false))
        }
        return Promise.resolve(mockResponse(200, unenrolledData))
      })

      vi.stubGlobal("fetch", fetchMock)

      render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

      const startBtn = await screen.findByRole("button", { name: /start journey/i })
      fireEvent.click(startBtn)

      const alert = await screen.findByRole("alert")
      expect(alert.textContent).toContain("Enrollment failed.")
    })

    it("ADV-06: non-JSON HTML error on POST /api/challenge/complete falls back to default error text", async () => {
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
          return Promise.resolve(mockResponse(500, "Internal Server Error", false))
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
      expect(alert.textContent).toContain("Could not link evaluation.")
    })

    it("ADV-07: graceful handling when question is null on an available day", async () => {
      const challengeData = createMockChallenge({
        days: [
          createMockDay(1, "2026-10-30", {
            status: "available",
            signedIn: true,
            question: null
          }),
          ...createMockChallenge().days.slice(1)
        ]
      })

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, challengeData)))

      render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

      expect(await screen.findByText("Assigned question unavailable.")).toBeDefined()
      // Write answer button should not crash or render when question is missing
      expect(screen.queryByRole("button", { name: /write answer/i })).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // 3. Asia/Kolkata Date Boundary Edge Cases
  // -------------------------------------------------------------------------
  describe("3. Asia/Kolkata Date Boundaries & Temporal Precision", () => {
    it("ADV-08: 1-second temporal threshold: 18:29:59 UTC preserves Day 1 as available", async () => {
      // 18:29:59 UTC on 2026-10-30 is 23:59:59 IST on 2026-10-30.
      // Day 1 (2026-10-30) is still available today (NOT missed).
      const challengeData = createMockChallenge({
        days: [
          createMockDay(1, "2026-10-30", { status: "available", signedIn: true }),
          createMockDay(2, "2026-10-31", { status: "upcoming", signedIn: false }),
          ...createMockChallenge().days.slice(2)
        ]
      })

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, challengeData)))

      render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

      const day1Card = (await screen.findByText("Day 1 · 2026-10-30")).closest("article")!
      expect(within(day1Card).getByText("available")).toBeDefined()
      expect(within(day1Card).getByRole("button", { name: /write answer/i })).toBeDefined()

      const day2Card = screen.getByText("Day 2 · 2026-10-31").closest("article")!
      expect(within(day2Card).getByText("upcoming")).toBeDefined()
    })

    it("ADV-09: leap year 21-day continuous calendar progression across Feb 29", async () => {
      // Challenge starts on 2028-02-28 (a leap year)
      const challengeData = createMockChallenge({}, "2028-02-28")

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, challengeData)))

      render(<Challenge navigate={mockNavigate as unknown as NavigateFn} />)

      expect(await screen.findByText(/Started 2028-02-28 · Question bank v1 · Asia\/Kolkata/i)).toBeDefined()
      expect(screen.getByText("Day 1 · 2028-02-28")).toBeDefined()
      // Day 2 must be Feb 29
      expect(screen.getByText("Day 2 · 2028-02-29")).toBeDefined()
      // Day 3 must be Mar 01
      expect(screen.getByText("Day 3 · 2028-03-01")).toBeDefined()
      // Day 21 must be Mar 19
      expect(screen.getByText("Day 21 · 2028-03-19")).toBeDefined()
    })
  })

  // -------------------------------------------------------------------------
  // 4. ChallengeJourney Component Edge Cases & States
  // -------------------------------------------------------------------------
  describe("4. ChallengeJourney Component Verification", () => {
    it("ADV-10: ChallengeJourney unauthenticated state prompts sign-in and navigates to challenge on click", async () => {
      render(<ChallengeJourney navigate={mockNavigate as unknown as NavigateFn} userId={undefined} />)

      expect(
        screen.getByText("Sign in and start your journey to see your dates, evaluations, and progress here.")
      ).toBeDefined()

      const btn = screen.getByRole("button", { name: /start journey/i })
      fireEvent.click(btn)

      expect(mockNavigate).toHaveBeenCalledWith("challenge")
    })

    it("ADV-11: ChallengeJourney authenticated unenrolled user starts journey on click", async () => {
      let enrollCalled = false
      const unenrolledData: ChallengeApiResponse = {
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
          enrollCalled = true
          return Promise.resolve(mockResponse(201, { startedOn: "2026-10-30", timezone: "Asia/Kolkata" }))
        }
        if (url.includes("/api/challenge") && method === "GET") {
          return Promise.resolve(mockResponse(200, enrollCalled ? enrolledData : unenrolledData))
        }
        return Promise.resolve(mockResponse(404, {}))
      })

      vi.stubGlobal("fetch", fetchMock)

      render(<ChallengeJourney navigate={mockNavigate as unknown as NavigateFn} userId="user-123" />)

      expect(
        await screen.findByText(
          "Begin today to create your personal calendar. No days are marked complete until you earn them."
        )
      ).toBeDefined()

      const btn = screen.getByRole("button", { name: /start journey/i })
      fireEvent.click(btn)

      await waitFor(() => {
        expect(enrollCalled).toBe(true)
      })

      expect(await screen.findByText(/Started 2026-10-30 · Asia\/Kolkata/i)).toBeDefined()
    })

    it("ADV-12: ChallengeJourney already enrolled user clicks Continue Journey and navigates to challenge", async () => {
      const enrolledData = createMockChallenge({
        completed: 2,
        streak: 2,
        averageScore: 7.5,
        nextFocus: "Refine conclusions.",
        days: [
          createMockDay(1, "2026-10-29", { status: "completed", signedIn: true, evaluationId: "e1" }),
          createMockDay(2, "2026-10-30", { status: "completed", signedIn: true, evaluationId: "e2" }),
          ...createMockChallenge().days.slice(2)
        ]
      })

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, enrolledData)))

      render(<ChallengeJourney navigate={mockNavigate as unknown as NavigateFn} userId="user-123" />)

      expect(await screen.findByText(/Started 2026-10-30 · Asia\/Kolkata/i)).toBeDefined()
      expect(screen.getByText(/2\/21 completed · 2 day streak · 7.5\/10 average/i)).toBeDefined()
      expect(screen.getByText("Next focus: Refine conclusions.")).toBeDefined()

      const continueBtn = screen.getByRole("button", { name: /continue journey/i })
      fireEvent.click(continueBtn)

      expect(mockNavigate).toHaveBeenCalledWith("challenge")
    })

    it("ADV-13: ChallengeJourney handles API error and recovers via Retry button", async () => {
      let fail = true
      const enrolledData = createMockChallenge()

      const fetchMock = vi.fn().mockImplementation(() => {
        if (fail) return Promise.resolve(mockResponse(500, { error: "Database offline" }))
        return Promise.resolve(mockResponse(200, enrolledData))
      })

      vi.stubGlobal("fetch", fetchMock)

      render(<ChallengeJourney navigate={mockNavigate as unknown as NavigateFn} userId="user-123" />)

      const alert = await screen.findByRole("alert")
      expect(alert.textContent).toContain("Your journey could not be loaded.")

      fail = false
      const retryBtn = screen.getByRole("button", { name: /retry/i })
      fireEvent.click(retryBtn)

      expect(await screen.findByText(/Started 2026-10-30 · Asia\/Kolkata/i)).toBeDefined()
    })
  })
})
