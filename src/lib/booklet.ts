import type { OCRResultData, UpscEvaluationReport } from "../types/evaluation"

export type BookletNote = { quote: string; tone: "strength" | "improve" | "gap"; title: string; detail: string; improvement: string }
export type BookletAnchor = BookletNote & { start: number; end: number }
export type BookletPage = { number: number; text: string; anchors: BookletAnchor[] }

export function nextBookletPage(current: number, count: number, direction: number): number {
  return Math.max(0, Math.min(count - 1, current + direction))
}

export function swipeBookletDirection(dx: number, dy: number, hasSelection: boolean): number {
  if (hasSelection || Math.abs(dx) < 55 || Math.abs(dx) <= Math.abs(dy) * 1.5) return 0
  return dx < 0 ? 1 : -1
}

export function bookletPages(ocr: OCRResultData | null, report: UpscEvaluationReport): { pages: BookletPage[]; unplaced: BookletNote[] } {
  const sourcePages = ocr?.pages?.length
    ? ocr.pages.map((page, index) => ({ number: page.pageNumber || index + 1, text: page.fullText || page.blocks?.map(block => block.text).join("\n") || "" }))
    : ocr?.fullText?.trim() ? [{ number: 1, text: ocr.fullText }] : []
  const pages = sourcePages.filter(page => page.text.trim()).map(page => ({ ...page, anchors: [] as BookletAnchor[] }))
  const diagnosis = report.aspirantDiagnosis
  const notes: BookletNote[] = []
  for (const concern of report.factualConcerns || []) {
    notes.push({ quote: concern.claim, tone: "gap", title: "Factual concern", detail: concern.note, improvement: "Verify this claim against a reliable source before using it again." })
  }
  if (diagnosis) {
    notes.push({ quote: diagnosis.strength.evidence, tone: "strength", title: "What worked", detail: diagnosis.strength.whyItWorks, improvement: diagnosis.strength.nextRefinement })
    for (const dimension of diagnosis.dimensions) {
      if (dimension.status === "MISSED") continue
      notes.push({ quote: dimension.evidence, tone: dimension.status === "HIT" ? "strength" : "improve", title: dimension.name, detail: dimension.explanation, improvement: dimension.improvedTreatment })
    }
    for (const line of diagnosis.sentenceUpgrades) notes.push({ quote: line.original, tone: "improve", title: "Stronger sentence", detail: line.objection, improvement: line.rewrite })
  }
  const unplaced: BookletNote[] = []
  for (const note of notes) {
    const quote = note.quote?.trim()
    if (!quote || quote.length < 8 || /could not be verified|omitted in script/i.test(quote)) { unplaced.push(note); continue }
    const matches = pages.flatMap((page, pageIndex) => {
      const locations: { pageIndex: number; start: number }[] = []
      let from = 0
      while (from < page.text.length) {
        const start = page.text.indexOf(quote, from)
        if (start < 0) break
        locations.push({ pageIndex, start })
        from = start + 1
      }
      return locations
    })
    // Ambiguous or overlapping evidence stays outside the paper; never guess a location.
    if (matches.length !== 1) { unplaced.push(note); continue }
    const { pageIndex, start } = matches[0]
    const page = pages[pageIndex]
    const end = start + quote.length
    if (page.anchors.some(anchor => start < anchor.end && end > anchor.start)) { unplaced.push(note); continue }
    page.anchors.push({ ...note, quote, start, end })
  }
  for (const page of pages) page.anchors.sort((a, b) => a.start - b.start)
  return { pages, unplaced }
}
