import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import Leaderboard from "../Leaderboard"
import type { NavigateFn } from "../../App"
import type { LeaderboardData, LeaderboardEntry } from "../Leaderboard"

function mockResponse(status: number, data: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : status === 201 ? "Created" : "Error",
    headers: new Headers({ "Content-Type": "application/json" }),
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as unknown as Response
}

describe("Top 50 Leaderboard Redesign Focused Tests", () => {
  let mockNavigate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.restoreAllMocks()
    mockNavigate = vi.fn()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("1. renders dedicated loading state during data fetch", async () => {
    // Delay resolution to capture the loading state
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => new Promise(() => {}))
    )

    render(<Leaderboard navigate={mockNavigate as unknown as NavigateFn} />)

    const loadingStatus = screen.getByRole("status")
    expect(loadingStatus).toBeDefined()
    expect(loadingStatus.textContent).toMatch(/loading leaderboard/i)
  })

  it("2. renders dedicated error state with retry action on request failure", async () => {
    let callCount = 0
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        callCount++
        if (callCount === 1) {
          return mockResponse(503, { error: "Leaderboard cohort unavailable." })
        }
        return mockResponse(200, {
          optedIn: true,
          periodDays: 30,
          minimumEvaluations: 3,
          minimumParticipants: 3,
          entries: [],
        })
      })
    )

    render(<Leaderboard navigate={mockNavigate as unknown as NavigateFn} />)

    // Error alert is displayed
    const errorAlert = await screen.findByRole("alert")
    expect(errorAlert).toBeDefined()
    expect(errorAlert.textContent).toMatch(/Leaderboard cohort unavailable\./i)

    // Retry button is available and works
    const retryBtn = screen.getByRole("button", { name: /retry/i })
    expect(retryBtn).toBeDefined()

    fireEvent.click(retryBtn)

    // After retry, error is gone and empty state is displayed
    await waitFor(() => {
      expect(screen.queryByRole("alert")).toBeNull()
      expect(screen.getByText("Leaderboard Forming")).toBeDefined()
    })
    expect(callCount).toBe(2)
  })

  it("3. displays strong honest empty state when eligible participants are insufficient", async () => {
    const emptyBoard: LeaderboardData = {
      optedIn: false,
      periodDays: 30,
      minimumEvaluations: 3,
      minimumParticipants: 3,
      entries: [],
    }

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, emptyBoard)))

    render(<Leaderboard navigate={mockNavigate as unknown as NavigateFn} />)

    // Honest empty state heading
    expect(await screen.findByText("Leaderboard Forming")).toBeDefined()

    // Clear honest explanation of threshold
    expect(
      screen.getByText(
        /at least 3 opted-in aspirants each complete 3 or more eligible final evaluations within the last 30 days/i
      )
    ).toBeDefined()

    // Criteria breakdown cards
    expect(screen.getByText("At least 3 opted-in")).toBeDefined()
    expect(screen.getByText("Minimum 3 answers")).toBeDefined()
    expect(screen.getByText("Rolling 30 days")).toBeDefined()

    // CTA navigates to evaluate
    const evalBtn = screen.getByRole("button", { name: /evaluate an answer/i })
    expect(evalBtn).toBeDefined()
    fireEvent.click(evalBtn)
    expect(mockNavigate).toHaveBeenCalledWith("evaluate")
  })

  it("4. supports reversible opt-in through PUT /api/leaderboard/opt-in (opt-in and opt-out)", async () => {
    const initialBoard: LeaderboardData = {
      optedIn: false,
      periodDays: 30,
      minimumEvaluations: 3,
      minimumParticipants: 3,
      entries: [],
    }

    const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === "PUT") {
        const body = JSON.parse(init.body as string)
        return mockResponse(200, { optedIn: body.optedIn })
      }
      return mockResponse(200, initialBoard)
    })

    vi.stubGlobal("fetch", fetchMock)

    render(<Leaderboard navigate={mockNavigate as unknown as NavigateFn} />)

    // When optedIn: false, shows "Opt into leaderboard" button
    const optInBtn = await screen.findByRole("button", { name: /opt into leaderboard/i })
    expect(optInBtn).toBeDefined()
    expect(screen.getByText("Not Included")).toBeDefined()

    // Click to Opt In
    fireEvent.click(optInBtn)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/leaderboard/opt-in"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ optedIn: true }),
        })
      )
    })

    // Now re-mock to return optedIn: true to simulate state update
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === "PUT") {
        const body = JSON.parse(init.body as string)
        return mockResponse(200, { optedIn: body.optedIn })
      }
      return mockResponse(200, { ...initialBoard, optedIn: true })
    })

    // Click to Leave Leaderboard
    const leaveBtn = await screen.findByRole("button", { name: /leave leaderboard/i })
    expect(leaveBtn).toBeDefined()

    fireEvent.click(leaveBtn)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/leaderboard/opt-in"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ optedIn: false }),
        })
      )
    })
  })

  it("5. displays only real anonymous entries returned by GET /api/leaderboard with visual hierarchy", async () => {
    const populatedBoard: LeaderboardData = {
      optedIn: true,
      periodDays: 30,
      minimumEvaluations: 3,
      minimumParticipants: 3,
      entries: [
        { rank: 1, label: "Aspirant 7B21A0", evaluations: 8, average: 8.75 },
        { rank: 2, label: "Aspirant 91C44F", evaluations: 6, average: 8.5 },
        { rank: 3, label: "Aspirant 33E8D1", evaluations: 5, average: 8.25 },
        { rank: 4, label: "Aspirant F012A9", evaluations: 4, average: 7.9 },
      ],
    }

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, populatedBoard)))

    render(<Leaderboard navigate={mockNavigate as unknown as NavigateFn} />)

    // Heading and qualitative badge
    expect(await screen.findByText("TOP 50 ASPIRANTS")).toBeDefined()
    expect(screen.getByText("4 QUALIFYING ASPIRANTS")).toBeDefined()

    // Real anonymous labels are present
    expect(screen.getByText("Aspirant 7B21A0")).toBeDefined()
    expect(screen.getByText("Aspirant 91C44F")).toBeDefined()
    expect(screen.getByText("Aspirant 33E8D1")).toBeDefined()
    expect(screen.getByText("Aspirant F012A9")).toBeDefined()

    // Real score numbers are formatted correctly
    expect(screen.getByText("8.75")).toBeDefined()
    expect(screen.getByText("8.50")).toBeDefined()
    expect(screen.getByText("8.25")).toBeDefined()
    expect(screen.getByText("7.90")).toBeDefined()

    // Crowns for Top 3 ranks
    expect(screen.getByLabelText("Rank 1 Gold Crown")).toBeDefined()
    expect(screen.getByLabelText("Rank 2 Silver Crown")).toBeDefined()
    expect(screen.getByLabelText("Rank 3 Bronze Crown")).toBeDefined()
    expect(screen.getByText("#4")).toBeDefined()
  })

  it("6. strictly excludes reference image people, portraits, streaks, rewards, and marketing falsehoods", async () => {
    const populatedBoard: LeaderboardData = {
      optedIn: true,
      periodDays: 30,
      minimumEvaluations: 3,
      minimumParticipants: 3,
      entries: [
        { rank: 1, label: "Aspirant 1A2B3C", evaluations: 5, average: 7.8 },
      ],
    }

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, populatedBoard)))

    render(<Leaderboard navigate={mockNavigate as unknown as NavigateFn} />)

    await screen.findByText("TOP 50 ASPIRANTS")

    // Reference people names from top 50.png must NOT exist
    expect(screen.queryByText(/Nani Kumar/i)).toBeNull()
    expect(screen.queryByText(/Aishwarya S/i)).toBeNull()
    expect(screen.queryByText(/Rohit Verma/i)).toBeNull()
    expect(screen.queryByText(/Meghna R/i)).toBeNull()
    expect(screen.queryByText(/Aditya Singh/i)).toBeNull()

    // Streaks from reference image must NOT exist
    expect(screen.queryByText(/21 days/i)).toBeNull()
    expect(screen.queryByText(/19 days/i)).toBeNull()
    expect(screen.queryByText(/18 days/i)).toBeNull()

    // Fictional rewards and promotional discounts must NOT exist
    expect(screen.queryByText(/exclusive rewards/i)).toBeNull()
    expect(screen.queryByText(/special benefits/i)).toBeNull()
    expect(screen.queryByText(/25% off/i)).toBeNull()
    expect(screen.queryByText(/become the topper/i)).toBeNull()

    // Four honest feature pillars are rendered instead
    expect(screen.getByText("REAL SCORES")).toBeDefined()
    expect(screen.getByText("CONSISTENCY MATTERS")).toBeDefined()
    expect(screen.getByText("PEER BENCHMARKING")).toBeDefined()
    expect(screen.getByText("CONTINUOUS PROGRESS")).toBeDefined()

    // Bottom inspire banner is rendered honestly
    expect(screen.getByText(/EVERY ANSWER YOU EVALUATE TAKES YOU CLOSER TO THE TOP/i)).toBeDefined()
    expect(screen.getByText(/BE CONSISTENT · BE BETTER · BE IN THE TOP 50/i)).toBeDefined()
  })

  it("7. handles opt-in mutation error gracefully without page crash", async () => {
    const initialBoard: LeaderboardData = {
      optedIn: false,
      periodDays: 30,
      minimumEvaluations: 3,
      minimumParticipants: 3,
      entries: [],
    }

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        if (init?.method === "PUT") {
          return mockResponse(503, { error: "Could not update preference." })
        }
        return mockResponse(200, initialBoard)
      })
    )

    render(<Leaderboard navigate={mockNavigate as unknown as NavigateFn} />)

    const optInBtn = await screen.findByRole("button", { name: /opt into leaderboard/i })
    fireEvent.click(optInBtn)

    const optInAlert = await screen.findByRole("alert")
    expect(optInAlert.textContent).toMatch(/Could not update preference\./i)
  })

  it("8. prevents concurrent mutation on rapid double-clicking during in-flight opt-in request", async () => {
    const initialBoard: LeaderboardData = {
      optedIn: false,
      periodDays: 30,
      minimumEvaluations: 3,
      minimumParticipants: 3,
      entries: [],
    }

    let putCount = 0
    let resolvePut: ((res: Response) => void) | undefined

    const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === "PUT") {
        putCount++
        return new Promise<Response>(resolve => {
          resolvePut = resolve
        })
      }
      return mockResponse(200, initialBoard)
    })

    vi.stubGlobal("fetch", fetchMock)

    render(<Leaderboard navigate={mockNavigate as unknown as NavigateFn} />)

    const optInBtn = await screen.findByRole("button", { name: /opt into leaderboard/i })

    // Rapid double click
    fireEvent.click(optInBtn)
    fireEvent.click(optInBtn)
    fireEvent.click(optInBtn)

    // Synchronously only 1 PUT request is dispatched
    expect(putCount).toBe(1)

    // Resolve the in-flight PUT
    resolvePut!(mockResponse(200, { optedIn: true }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /leave leaderboard/i })).toBeDefined()
    })
  })

  it("9. aborts in-flight fetch when unmounted to prevent memory leaks and unhandled rejections", async () => {
    let capturedSignal: AbortSignal | undefined

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        capturedSignal = init?.signal as AbortSignal
        return new Promise(() => {})
      })
    )

    const { unmount } = render(<Leaderboard navigate={mockNavigate as unknown as NavigateFn} />)

    expect(capturedSignal).toBeDefined()
    expect(capturedSignal?.aborted).toBe(false)

    unmount()

    expect(capturedSignal?.aborted).toBe(true)
  })

  it("10. gracefully handles non-numeric or missing average scores without throwing TypeError", async () => {
    const malformedBoard: LeaderboardData = {
      optedIn: true,
      periodDays: 30,
      minimumEvaluations: 3,
      minimumParticipants: 3,
      entries: [
        { rank: 1, label: "Aspirant CORRUPT", evaluations: 3, average: null as unknown as number },
        { rank: 2, label: "Aspirant NAN", evaluations: 3, average: NaN },
      ],
    }

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, malformedBoard)))

    render(<Leaderboard navigate={mockNavigate as unknown as NavigateFn} />)

    expect(await screen.findByText("TOP 50 ASPIRANTS")).toBeDefined()
    expect(screen.getByText("Aspirant CORRUPT")).toBeDefined()
    expect(screen.getByText("Aspirant NAN")).toBeDefined()
    // Invalid scores remain unavailable rather than looking like earned zeroes.
    const unavailable = screen.getAllByText("—")
    expect(unavailable.length).toBe(2)
  })

  it("11. navigates to evaluate page when inspire banner CTA is clicked", async () => {
    const emptyBoard: LeaderboardData = {
      optedIn: false,
      periodDays: 30,
      minimumEvaluations: 3,
      minimumParticipants: 3,
      entries: [],
    }

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, emptyBoard)))

    render(<Leaderboard navigate={mockNavigate as unknown as NavigateFn} />)

    const evaluateBtn = await screen.findByRole("button", { name: /^evaluate$/i })
    expect(evaluateBtn).toBeDefined()
    fireEvent.click(evaluateBtn)

    expect(mockNavigate).toHaveBeenCalledWith("evaluate")
  })

  it("12. handles missing or null entries in API response without throwing TypeError", async () => {
    // Malformed backend payload without 'entries' field
    const incompleteBoard = {
      optedIn: true,
      periodDays: 30,
      minimumEvaluations: 3,
      minimumParticipants: 3,
    }

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, incompleteBoard)))

    render(<Leaderboard navigate={mockNavigate as unknown as NavigateFn} />)

    // Safely defaults to empty array and renders empty state rather than crashing
    expect(await screen.findByText("Leaderboard Forming")).toBeDefined()
  })

  it("13. safely handles entries with null label, null evaluations, or missing rank", async () => {
    const edgeCaseBoard: LeaderboardData = {
      optedIn: true,
      periodDays: 30,
      minimumEvaluations: 3,
      minimumParticipants: 3,
      entries: [
        {
          rank: null as unknown as number,
          label: null as unknown as string,
          evaluations: null as unknown as number,
          average: 8.1,
        },
      ],
    }

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, edgeCaseBoard)))

    render(<Leaderboard navigate={mockNavigate as unknown as NavigateFn} />)

    expect(await screen.findByText("TOP 50 ASPIRANTS")).toBeDefined()
    // Fallback label formats safely without throwing TypeError on label.replace
    expect(screen.getByText("Aspirant #1")).toBeDefined()
    expect(screen.getByText("8.10")).toBeDefined()
  })

  it("14. renders singular vs plural labels accurately for answers and evaluations", async () => {
    const singularBoard: LeaderboardData = {
      optedIn: true,
      periodDays: 30,
      minimumEvaluations: 3,
      minimumParticipants: 3,
      entries: [
        {
          rank: 1,
          label: "Aspirant SOLO",
          evaluations: 1,
          average: 9.0,
        },
      ],
    }

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, singularBoard)))

    render(<Leaderboard navigate={mockNavigate as unknown as NavigateFn} />)

    expect(await screen.findByText("TOP 50 ASPIRANTS")).toBeDefined()
    expect(screen.getByText("1 QUALIFYING ASPIRANT")).toBeDefined()
    expect(screen.getByText("1 answer")).toBeDefined()
    expect(screen.getByText("1 evaluation")).toBeDefined()
  })

  it("15. handles non-JSON HTML gateway error (HTTP 502) gracefully on GET and PUT", async () => {
    const htmlResponse = {
      ok: false,
      status: 502,
      statusText: "Bad Gateway",
      headers: new Headers({ "Content-Type": "text/html" }),
      json: async () => {
        throw new SyntaxError("Unexpected token '<' in JSON")
      },
      text: async () => "<html><body>502 Bad Gateway</body></html>",
    } as unknown as Response

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(htmlResponse))

    render(<Leaderboard navigate={mockNavigate as unknown as NavigateFn} />)

    // Shows dedicated error state with fallback HTTP status message
    const alert = await screen.findByRole("alert")
    expect(alert.textContent).toMatch(/Leaderboard unavailable \(HTTP 502\)\./i)
    expect(screen.getByRole("button", { name: /retry/i })).toBeDefined()
  })

  it("16. safely skips sparse or null items in entries array without throwing TypeError", async () => {
    const sparseBoard = {
      optedIn: true,
      periodDays: 30,
      minimumEvaluations: 3,
      minimumParticipants: 3,
      entries: [
        null as unknown as LeaderboardEntry,
        undefined as unknown as LeaderboardEntry,
        { rank: 1, label: "Aspirant SOLID", evaluations: 4, average: 8.9 },
      ],
    }

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, sparseBoard)))

    render(<Leaderboard navigate={mockNavigate as unknown as NavigateFn} />)

    expect(await screen.findByText("TOP 50 ASPIRANTS")).toBeDefined()
    expect(screen.getByText("Aspirant SOLID")).toBeDefined()
    expect(screen.getByText("8.90")).toBeDefined()
    expect(screen.getByText("1 QUALIFYING ASPIRANT")).toBeDefined()
  })
})
