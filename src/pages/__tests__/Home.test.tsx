import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import Home from "../Home"
import type { NavigateFn } from "../../App"

describe("Home Page Hero Sliding Images Carousel", () => {
  it("renders all 3 slide tabs in the hero section", () => {
    const navigate: NavigateFn = vi.fn()
    render(<Home navigate={navigate} />)

    expect(screen.getByRole("tab", { name: /Answer DNA/i })).toBeDefined()
    expect(screen.getByRole("tab", { name: /Compare & Upgrade/i })).toBeDefined()
    expect(screen.getByRole("tab", { name: /21-Day Challenge/i })).toBeDefined()
  })

  it("renders the 3 sliding images with appropriate alt attributes", () => {
    const navigate: NavigateFn = vi.fn()
    render(<Home navigate={navigate} />)

    const images = screen.getAllByRole("img")
    const alts = images.map((img) => img.getAttribute("alt"))

    expect(alts.some((alt) => alt?.includes("Answer DNA"))).toBe(true)
    expect(alts.some((alt) => alt?.includes("Compare & Upgrade"))).toBe(true)
    expect(alts.some((alt) => alt?.includes("21-Day Challenge") || alt?.includes("21 Days"))).toBe(true)
  })

  it("navigates through slides using next and previous arrow buttons", () => {
    const navigate: NavigateFn = vi.fn()
    render(<Home navigate={navigate} />)

    // Initial state: slide 0 (Answer DNA)
    const nextBtn = screen.getByLabelText("Next slide")
    const prevBtn = screen.getByLabelText("Previous slide")

    // Advance to slide 1 (Compare & Upgrade)
    fireEvent.click(nextBtn)
    expect(screen.getByRole("tab", { name: /Compare & Upgrade/i }).getAttribute("aria-selected")).toBe("true")

    // Advance to slide 2 (21-Day Challenge)
    fireEvent.click(nextBtn)
    expect(screen.getByRole("tab", { name: /21-Day Challenge/i }).getAttribute("aria-selected")).toBe("true")

    // Wrap around to slide 0
    fireEvent.click(nextBtn)
    expect(screen.getByRole("tab", { name: /Answer DNA/i }).getAttribute("aria-selected")).toBe("true")

    // Go backwards to slide 2
    fireEvent.click(prevBtn)
    expect(screen.getByRole("tab", { name: /21-Day Challenge/i }).getAttribute("aria-selected")).toBe("true")
  })

  it("switches slides directly when clicking tab pills", () => {
    const navigate: NavigateFn = vi.fn()
    render(<Home navigate={navigate} />)

    const compareTab = screen.getByRole("tab", { name: /Compare & Upgrade/i })
    fireEvent.click(compareTab)

    expect(compareTab.getAttribute("aria-selected")).toBe("true")
    expect(screen.getByText("SEE THE GAP. CLOSE THE GAP. SCORE HIGHER.")).toBeDefined()
  })

  it("triggers correct navigation when slide CTA buttons are clicked", () => {
    const navigate = vi.fn()
    render(<Home navigate={navigate} />)

    // Active slide 0 (Answer DNA): CTA evaluates an answer
    const evaluateBtn = screen.getByRole("button", { name: /EVALUATE YOUR ANSWER →/i })
    fireEvent.click(evaluateBtn)
    expect(navigate).toHaveBeenCalledWith("evaluate")

    // Secondary CTA explores Answer DNA
    const exploreDnaBtn = screen.getByRole("button", { name: /EXPLORE ANSWER DNA/i })
    fireEvent.click(exploreDnaBtn)
    expect(navigate).toHaveBeenCalledWith("dna")
  })
})

describe("Home Page - EvaluateCTA Section", () => {
  it("renders section label, headline, and descriptive subtitle", () => {
    const navigate = vi.fn()
    render(<Home navigate={navigate} />)

    expect(screen.getByText("START HERE")).toBeDefined()
    expect(screen.getByText("Ready to test your answer?")).toBeDefined()
    expect(
      screen.getByText(/Upload your handwritten answer and receive feedback against the selected paper's rubric/i)
    ).toBeDefined()
  })

  it("renders the interactive drop zone and navigates to evaluate on click, keyboard press, and file drop", () => {
    const navigate = vi.fn()
    render(<Home navigate={navigate} />)

    const dropZone = screen.getByLabelText("Upload handwritten answer")
    expect(dropZone).toBeDefined()
    expect(screen.getByText("Drop your answer here")).toBeDefined()
    expect(screen.getByText(/JPG, PNG, PDF — up to 20 pages supported/i)).toBeDefined()

    // Click navigation
    fireEvent.click(dropZone)
    expect(navigate).toHaveBeenCalledWith("evaluate")

    // Keyboard navigation (Enter key)
    fireEvent.keyDown(dropZone, { key: "Enter" })
    expect(navigate).toHaveBeenCalledWith("evaluate")

    // Keyboard navigation (Space key)
    fireEvent.keyDown(dropZone, { key: " " })
    expect(navigate).toHaveBeenCalledWith("evaluate")

    // Drag-and-drop file interaction
    fireEvent.dragEnter(dropZone)
    fireEvent.dragOver(dropZone)
    fireEvent.dragLeave(dropZone)
    fireEvent.drop(dropZone)
    expect(navigate).toHaveBeenCalledWith("evaluate")
  })

  it("triggers correct routing from CTA buttons", () => {
    const navigate = vi.fn()
    render(<Home navigate={navigate} />)

    const evaluateMyAnswerBtn = screen.getByRole("button", { name: /EVALUATE MY ANSWER →/i })
    fireEvent.click(evaluateMyAnswerBtn)
    expect(navigate).toHaveBeenCalledWith("evaluate")

    const tryDemoBtn = screen.getByRole("button", { name: /TRY DEMO/i })
    fireEvent.click(tryDemoBtn)
    expect(navigate).toHaveBeenCalledWith("report", { id: "demo" })
  })
})

describe("Home Page - HowItWorks Section", () => {
  it("renders the process header and all 5 step titles and numbers", () => {
    const navigate = vi.fn()
    render(<Home navigate={navigate} />)

    expect(screen.getByText("THE PROCESS")).toBeDefined()
    expect(screen.getByText("How Ekalavya Works")).toBeDefined()
    expect(
      screen.getByText("From handwritten answer to personalised improvement in a few simple steps.")
    ).toBeDefined()

    expect(screen.getByRole("tablist", { name: /How Ekalavya Works process steps/i })).toBeDefined()
    expect(screen.getByText("WRITE")).toBeDefined()
    expect(screen.getByText("UPLOAD")).toBeDefined()
    expect(screen.getByText("AI EVALUATES")).toBeDefined()
    expect(screen.getByText("UNDERSTAND & UPGRADE")).toBeDefined()
    expect(screen.getByText("PRACTICE & IMPROVE")).toBeDefined()
  })

  it("activates step cards and displays step descriptions interactively via click and keyboard", () => {
    const navigate = vi.fn()
    render(<Home navigate={navigate} />)

    // Step 0 is active initially
    expect(
      screen.getByText("Write your UPSC answer on paper. Address the question fully — let your thinking flow.")
    ).toBeDefined()

    // Click step 1 (UPLOAD)
    const uploadStepTab = screen.getByRole("tab", { name: /UPLOAD/i })
    fireEvent.click(uploadStepTab)
    expect(uploadStepTab.getAttribute("aria-selected")).toBe("true")
    expect(
      screen.getByText("Upload as PDF, images, or capture directly using your phone camera with auto-crop.")
    ).toBeDefined()

    // Keyboard navigation with ArrowRight from step 1 -> step 2 (AI EVALUATES)
    fireEvent.keyDown(uploadStepTab, { key: "ArrowRight" })
    const aiStepTab = screen.getByRole("tab", { name: /AI EVALUATES/i })
    expect(aiStepTab.getAttribute("aria-selected")).toBe("true")
    expect(
      screen.getByText("Ekalavya analyses your answer across all 8 parameters against the question demand.")
    ).toBeDefined()

    // Click step 3 (UNDERSTAND & UPGRADE)
    const upgradeStepTab = screen.getByRole("tab", { name: /UNDERSTAND & UPGRADE/i })
    fireEvent.click(upgradeStepTab)
    expect(upgradeStepTab.getAttribute("aria-selected")).toBe("true")
    expect(
      screen.getByText("See exactly where marks were lost. Generate a stronger version that preserves your ideas.")
    ).toBeDefined()

    // Keyboard navigation with ArrowLeft from step 3 -> step 2
    fireEvent.keyDown(upgradeStepTab, { key: "ArrowLeft" })
    expect(aiStepTab.getAttribute("aria-selected")).toBe("true")

    // Click step 4 (PRACTICE & IMPROVE)
    const practiceStepTab = screen.getByRole("tab", { name: /PRACTICE & IMPROVE/i })
    fireEvent.click(practiceStepTab)
    expect(practiceStepTab.getAttribute("aria-selected")).toBe("true")
    expect(
      screen.getByText("Receive a targeted practice question based on your weakest parameter. Track your growth.")
    ).toBeDefined()
  })

  it("navigates to evaluate from the START YOUR FIRST EVALUATION button", () => {
    const navigate = vi.fn()
    render(<Home navigate={navigate} />)

    const startEvaluationBtn = screen.getByRole("button", { name: /START YOUR FIRST EVALUATION/i })
    fireEvent.click(startEvaluationBtn)
    expect(navigate).toHaveBeenCalledWith("evaluate")
  })
})

describe("Home Page - WhyEkalavya Section", () => {
  it("renders philosophy header and headings", () => {
    const navigate = vi.fn()
    render(<Home navigate={navigate} />)

    expect(screen.getByText("THE PHILOSOPHY")).toBeDefined()
    expect(screen.getByText("Not just a score.")).toBeDefined()
    expect(screen.getByText("A mentoring loop.")).toBeDefined()
  })

  it("renders the 4-card philosophy grid with themed status pills and descriptions", () => {
    const navigate = vi.fn()
    render(<Home navigate={navigate} />)

    // Status pills
    expect(screen.getByText("01 SEE")).toBeDefined()
    expect(screen.getByText("02 UNDERSTAND")).toBeDefined()
    expect(screen.getByText("03 UPGRADE")).toBeDefined()
    expect(screen.getByText("04 REPEAT")).toBeDefined()

    // Card titles
    expect(screen.getByText("Where you lost marks.")).toBeDefined()
    expect(screen.getByText("Why it affected your answer.")).toBeDefined()
    expect(screen.getByText("See how the answer can become stronger.")).toBeDefined()
    expect(screen.getByText("Practice until the weakness disappears.")).toBeDefined()

    // Card descriptions
    expect(
      screen.getByText("Every evaluation shows you the exact parameters that cost you marks — not just a total.")
    ).toBeDefined()
    expect(
      screen.getByText("Not just what went wrong, but why it matters for the evaluator — and what a stronger pattern looks like.")
    ).toBeDefined()
    expect(
      screen.getByText("Upgrade Bro generates a stronger version of your answer — preserving your ideas, improving the execution.")
    ).toBeDefined()
    expect(
      screen.getByText("Answer DNA tracks your patterns over time. Targeted questions address your weakest parameter.")
    ).toBeDefined()
  })
})


