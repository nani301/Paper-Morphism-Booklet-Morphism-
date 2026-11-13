import { describe, it, expect } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import VirtualAnswerBooklet from "./VirtualAnswerBooklet"
import type { OCRResultData, UpscEvaluationReport } from "../types/evaluation"

const ocr: OCRResultData = { pages: [
  { pageNumber: 1, width: 800, height: 1200, blocks: [], fullText: "The first page is here." },
  { pageNumber: 2, width: 800, height: 1200, blocks: [], fullText: "The second page is here." },
] }
const report = { aspirantDiagnosis: {
  strength: { evidence: "The first page", whyItWorks: "It answers the opening demand.", nextRefinement: "Add a cited example." },
  dimensions: [], sentenceUpgrades: [],
} } as unknown as UpscEvaluationReport

describe("virtual answer booklet", () => {
  it("shows saved words, exact feedback, page controls, and a readable font switch", () => {
    render(<VirtualAnswerBooklet ocr={ocr} report={report} />)
    expect(screen.getByText("Page 1 of 2")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: /Feedback: What worked/ }))
    expect(screen.getByText("It answers the opening demand.")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Readable font" }))
    expect(screen.getByRole("button", { name: "Handwritten style" })).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Next →" }))
    expect(screen.getByText("The second page is here.")).toBeTruthy()
    expect(screen.getByText("Page 2 of 2")).toBeTruthy()
  })

  it("supports focused keyboard navigation and does not invent a missing transcript", () => {
    const { rerender } = render(<VirtualAnswerBooklet ocr={ocr} report={report} />)
    fireEvent.keyDown(screen.getByRole("region", { name: "Virtual answer booklet" }).querySelector("[tabindex='0']")!, { key: "ArrowRight" })
    expect(screen.getByText("Page 2 of 2")).toBeTruthy()
    rerender(<VirtualAnswerBooklet ocr={null} report={report} />)
    expect(screen.getByText("Transcript unavailable")).toBeTruthy()
  })
})
