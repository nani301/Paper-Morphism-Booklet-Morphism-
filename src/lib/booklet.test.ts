import test from "node:test"
import assert from "node:assert/strict"
import { bookletPages, nextBookletPage, swipeBookletDirection } from "./booklet.ts"
import type { OCRResultData, UpscEvaluationReport } from "../types/evaluation"

const base = { aspirantDiagnosis: {
  strength: { evidence: "A clear, useful point.", whyItWorks: "It addresses the demand.", nextRefinement: "Add a specific example." },
  dimensions: [{ name: "Example", status: "PARTIAL", evidence: "This phrase is absent.", explanation: "Needs detail.", improvedTreatment: "Name one example." }],
  sentenceUpgrades: [],
} } as unknown as UpscEvaluationReport

test("preserves OCR page boundaries and only anchors an exact unique quote", () => {
  const ocr = { pages: [
    { pageNumber: 1, width: 800, height: 1200, fullText: "Question and context.", blocks: [] },
    { pageNumber: 2, width: 800, height: 1200, fullText: "A clear, useful point. The conclusion.", blocks: [] },
  ] } satisfies OCRResultData
  const result = bookletPages(ocr, base)
  assert.equal(result.pages.length, 2)
  assert.equal(result.pages[0].anchors.length, 0)
  assert.equal(result.pages[1].anchors[0].quote, "A clear, useful point.")
  assert.equal(result.unplaced.length, 1)
})

test("repeated evidence is not placed on an arbitrary page", () => {
  const ocr = { pages: [
    { pageNumber: 1, width: 800, height: 1200, fullText: "A clear, useful point.", blocks: [] },
    { pageNumber: 2, width: 800, height: 1200, fullText: "A clear, useful point.", blocks: [] },
  ] } satisfies OCRResultData
  const result = bookletPages(ocr, base)
  assert.equal(result.pages.every(page => page.anchors.length === 0), true)
  assert.equal(result.unplaced.length, 2)
})

test("missing OCR yields no invented page", () => {
  const result = bookletPages(null, base)
  assert.equal(result.pages.length, 0)
  assert.equal(result.unplaced.length, 2)
})

test("navigation stays within saved pages; vertical touch and selected text do not turn pages", () => {
  assert.equal(nextBookletPage(0, 2, -1), 0)
  assert.equal(nextBookletPage(1, 2, 1), 1)
  assert.equal(swipeBookletDirection(-80, 5, false), 1)
  assert.equal(swipeBookletDirection(80, 5, false), -1)
  assert.equal(swipeBookletDirection(-80, 90, false), 0)
  assert.equal(swipeBookletDirection(-80, 5, true), 0)
})

test("factual concern is highlighted only when its full claim occurs in OCR", () => {
  const report = { ...base, factualConcerns: [{ claim: "A clear, useful point.", riskLevel: "high", note: "Check accuracy." }] } as UpscEvaluationReport
  const result = bookletPages({ fullText: "A clear, useful point." }, report)
  assert.equal(result.pages[0].anchors.length, 1)
  assert.equal(result.pages[0].anchors[0].tone, "gap")
  assert.equal(result.unplaced.some(note => note.title === "What worked"), true)
})
