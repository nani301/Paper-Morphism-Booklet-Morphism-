import { useEffect, useRef, useState } from "react"
import type { OCRResultData, UpscEvaluationReport } from "../types/evaluation"
import { bookletPages, nextBookletPage, swipeBookletDirection, type BookletAnchor, type BookletPage } from "../lib/booklet"

const toneStyle = {
  strength: "bg-emerald-100/90 text-[#064e3b] border-b-2 border-emerald-600 decoration-transparent hover:bg-emerald-200/90 transition-colors",
  improve: "bg-amber-100/95 text-[#78350f] border-b-2 border-dashed border-amber-600 decoration-transparent hover:bg-amber-200/90 transition-colors",
  gap: "bg-rose-100/95 text-[#881337] border-b-2 border-wavy border-rose-600 decoration-transparent hover:bg-rose-200/90 transition-colors",
}

const toneBadge = {
  strength: { label: "Strengths & Hit", color: "bg-emerald-800 text-white" },
  improve: { label: "Refinement", color: "bg-amber-800 text-white" },
  gap: { label: "AI Pen Strike: Flaw", color: "bg-rose-800 text-white" },
}

function TranscribedPage({
  page,
  onSelect,
  readable,
}: {
  page: BookletPage
  onSelect: (anchor: BookletAnchor) => void
  readable: boolean
}) {
  const pieces: React.ReactNode[] = []
  let offset = 0
  for (const anchor of page.anchors) {
    if (anchor.start > offset) pieces.push(page.text.slice(offset, anchor.start))
    pieces.push(
      <button
        type="button"
        key={`${anchor.start}-${anchor.end}`}
        className={`${toneStyle[anchor.tone]} rounded px-1 py-0.5 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-700 inline-block my-0.5 shadow-2xs`}
        onClick={() => onSelect(anchor)}
        aria-label={`Feedback: ${anchor.title}. ${anchor.quote}`}
      >
        {page.text.slice(anchor.start, anchor.end)}
      </button>
    )
    offset = anchor.end
  }
  pieces.push(page.text.slice(offset))
  return (
    <div
      className={`booklet-text relative z-10 whitespace-pre-wrap break-words text-[#19243a] ${
        readable ? "font-sans text-[15px] leading-[2.05rem]" : "font-hand text-[23px] leading-[2.05rem]"
      }`}
    >
      {pieces}
    </div>
  )
}

export default function VirtualAnswerBooklet({
  ocr,
  report,
  onOpenOriginal,
}: {
  ocr: OCRResultData | null
  report: UpscEvaluationReport
  onOpenOriginal?: () => void
}) {
  const { pages, unplaced } = bookletPages(ocr, report)
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<BookletAnchor | null>(null)
  const [readable, setReadable] = useState(false)
  const [swiped, setSwiped] = useState(false)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const page = pages[Math.min(index, Math.max(0, pages.length - 1))]

  useEffect(() => {
    setIndex(0)
    setSelected(null)
    setSwiped(false)
  }, [ocr])

  const go = (next: number) => {
    const bounded = nextBookletPage(index, pages.length, next - index)
    if (bounded === index) return
    setIndex(bounded)
    setSelected(null)
    setSwiped(true)
  }

  const questionTitle = report.preFlightCheck?.questionText?.trim()
  const paperMode = report.preFlightCheck?.detectedPaperMode || "GS"
  const awardedScore = report.scoring?.awardedScore
  const maxScore = report.scoring?.maxScore ?? 10

  return (
    <section
      aria-label="Virtual answer booklet"
      className="booklet-morphic-container rounded-2xl border border-[#D0C5B0] text-[#19243a] overflow-hidden"
    >
      {/* Visual multi-layer stacked sheet edges on tablet/desktop */}
      {pages.length > 1 && (
        <>
          <div className="hidden md:block absolute -right-1.5 top-8 bottom-8 w-1.5 bg-[#EDE6D7] rounded-r border-r border-[#C6B9A3] pointer-events-none z-0" />
          <div className="hidden md:block absolute -right-3 top-14 bottom-14 w-1.5 bg-[#E4DBC9] rounded-r border-r border-[#BDB09A] pointer-events-none z-0" />
        </>
      )}

      {/* UPSC Institutional Header Pane (Top Edge) */}
      <div className="bg-[#F6F2E8] border-b border-[#D8CEBC] px-4 py-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="shrink-0 px-2 py-0.5 rounded bg-[#4A3B2C] text-[#FDFBF7] font-serif font-bold text-[10px] tracking-widest uppercase">
              UPSC {paperMode}
            </span>
            <div className="truncate">
              <strong>YOUR ANSWER</strong>
              <span className="ml-2 text-[#5E5244] hidden sm:inline">
                OCR transcription · original wording
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {awardedScore !== undefined && (
              <span className="px-2 py-0.5 rounded-full bg-[#EAE1D0] border border-[#C5B79F] text-[#4A3B2C] font-mono font-semibold text-[11px]">
                Score: {awardedScore}/{maxScore}
              </span>
            )}
            <button
              type="button"
              className="underline text-[#173E84] hover:text-[#0E2756] font-medium cursor-pointer"
              onClick={() => setReadable((value) => !value)}
            >
              {readable ? "Handwritten style" : "Readable font"}
            </button>
            {onOpenOriginal && (
              <button
                type="button"
                className="underline text-[#173E84] hover:text-[#0E2756] font-medium cursor-pointer"
                onClick={onOpenOriginal}
              >
                Open original upload
              </button>
            )}
          </div>
        </div>

        {/* Question Strip */}
        {questionTitle && (
          <div className="mt-2.5 pt-2 border-t border-[#E3DACB] flex items-start gap-2 text-[#4A3B2C]">
            <span className="text-amber-800 shrink-0 text-sm">📜</span>
            <p className="text-xs font-serif italic line-clamp-2 leading-relaxed">
              &ldquo;{questionTitle}&rdquo;
            </p>
          </div>
        )}
      </div>

      {page ? (
        <>
          {/* Main Paper Canvas with Spine Crease and Left Margin Rule */}
          <div
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") {
                event.preventDefault()
                go(index + 1)
              }
              if (event.key === "ArrowLeft") {
                event.preventDefault()
                go(index - 1)
              }
            }}
            onTouchStart={(event) => {
              touch.current = {
                x: event.touches[0].clientX,
                y: event.touches[0].clientY,
              }
            }}
            onTouchEnd={(event) => {
              if (!touch.current || !event.changedTouches[0]) return
              const dx = event.changedTouches[0].clientX - touch.current.x
              const dy = event.changedTouches[0].clientY - touch.current.y
              touch.current = null
              go(
                index +
                  swipeBookletDirection(
                    dx,
                    dy,
                    Boolean(String(window.getSelection() || ""))
                  )
              )
            }}
            className="booklet-sheet relative min-h-[490px] max-h-[700px] overflow-y-auto focus-visible:outline-2 focus-visible:outline-blue-700"
            aria-label={`Answer page ${index + 1} of ${pages.length}. Use left and right arrows to change pages.`}
          >
            {/* Bound Spine Crease Gradient */}
            <div className="booklet-spine-crease pointer-events-none" />

            {/* Subtle brass staple / stitched eyelets along the left margin */}
            <div className="absolute left-1.5 top-16 w-2 h-4 rounded-full border border-[#8C6D3B]/40 bg-[#C8A76B]/30 shadow-inner pointer-events-none" />
            <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-4 rounded-full border border-[#8C6D3B]/40 bg-[#C8A76B]/30 shadow-inner pointer-events-none" />
            <div className="absolute left-1.5 bottom-16 w-2 h-4 rounded-full border border-[#8C6D3B]/40 bg-[#C8A76B]/30 shadow-inner pointer-events-none" />

            {/* Official UPSC Margin Guidance Note (Rotated) */}
            <div className="hidden sm:block absolute left-2 top-28 text-[8px] uppercase tracking-wider text-rose-800/40 font-mono -rotate-90 origin-top-left pointer-events-none select-none">
              Candidates must not write on this margin / परीक्षार्थियों को इस हाशिये में नहीं लिखना चाहिए
            </div>

            {/* Transcribed Text Canvas */}
            <div className="booklet-content relative z-10 pl-[58px] pr-5 pt-5 pb-16 sm:pl-[94px] sm:pr-9">
              <TranscribedPage
                page={page}
                onSelect={setSelected}
                readable={readable}
              />
            </div>

            {/* Mobile swipe helper */}
            {!swiped && pages.length > 1 && index === 0 && (
              <div className="absolute right-3 bottom-3 z-20 rounded-full bg-[#172851] text-white px-3 py-1.5 text-xs shadow-lg md:hidden pointer-events-none">
                Swipe left for page 2 →
              </div>
            )}
          </div>

          {/* Pagination & Bound Navigation Controls */}
          <div className="flex items-center justify-between bg-[#F6F2E8] px-4 py-3 border-t border-[#D8CEBC]">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => go(index - 1)}
              className="rounded-lg border border-[#C5B8A2] bg-[#FAF7F0] px-3.5 py-1.5 text-sm font-medium hover:bg-white disabled:opacity-40 transition-colors shadow-2xs"
            >
              ← Previous
            </button>
            <span className="text-sm font-semibold font-serif text-[#4A3B2C]">
              Page {index + 1} of {pages.length}
            </span>
            <button
              type="button"
              disabled={index === pages.length - 1}
              onClick={() => go(index + 1)}
              className="rounded-lg border border-[#C5B8A2] bg-[#FAF7F0] px-3.5 py-1.5 text-sm font-medium hover:bg-white disabled:opacity-40 transition-colors shadow-2xs"
            >
              Next →
            </button>
          </div>
        </>
      ) : (
        <div className="p-8 min-h-[300px] flex flex-col items-center justify-center text-center">
          <strong className="text-base font-serif text-[#4A3B2C]">Transcript unavailable</strong>
          <p className="text-sm text-[#6A5E4E] mt-2 max-w-md">
            The saved evaluation contains no readable OCR text. Feedback appears below without positions on the paper.
          </p>
          {onOpenOriginal && (
            <button
              className="mt-4 underline text-[#173E84] hover:text-[#0E2756] text-sm font-medium cursor-pointer"
              onClick={onOpenOriginal}
            >
              Open original upload
            </button>
          )}
        </div>
      )}

      {/* Slide-up Interleaved Notecard Layer for Tap Feedback */}
      {selected && (
        <div
          className="m-3 sm:m-4 interleaved-card interleaved-card-entry rounded-xl p-4 sm:p-5 relative"
          role="status"
        >
          {/* Masking tape header label */}
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="masking-tape px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider text-[#4A3B2C] rounded-xs">
                💡 AI EVALUATION INLINE SHEET
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                  toneBadge[selected.tone].color
                }`}
              >
                {toneBadge[selected.tone].label}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Close feedback"
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#EAE0CE] text-[#5A4A35] font-bold text-sm cursor-pointer transition-colors"
            >
              ✕
            </button>
          </div>

          <strong className="text-base font-serif text-[#1F242E] block mt-1">
            {selected.title}
          </strong>

          {/* Quoted student passage */}
          <blockquote className="my-2 pl-3 border-l-2 border-amber-600/60 font-serif italic text-xs text-[#5C4D3C] bg-[#F7F3E9] py-1.5 pr-2 rounded-r">
            &ldquo;{selected.quote}&rdquo;
          </blockquote>

          <p className="text-sm mt-2 text-[#2C241B] leading-relaxed">
            {selected.detail}
          </p>

          <p className="text-sm mt-3 pt-2.5 border-t border-[#E5DBCB] text-[#1E3A8A] font-medium leading-relaxed bg-[#EEF2FF] p-2.5 rounded-lg border border-[#C7D2FE]/70">
            <strong>Next attempt: </strong>
            {selected.improvement}
          </p>
        </div>
      )}

      {/* Unplaced Feedback Drawer */}
      {unplaced.length > 0 && (
        <details className="m-3 sm:m-4 rounded-xl bg-[#FAF7F0] border border-[#D5CABB] p-4 text-xs">
          <summary className="cursor-pointer font-semibold text-[#4A3B2C] select-none hover:text-[#1F242E]">
            Feedback without a reliable position on this transcript ({unplaced.length})
          </summary>
          <div className="space-y-3 mt-3">
            {unplaced.map((note, i) => (
              <div key={i} className="border-t border-[#E5DCB] pt-3">
                <strong className="text-sm text-[#1F242E]">{note.title}</strong>
                <p className="text-sm text-[#4A3B2C] mt-1">{note.detail}</p>
                <p className="text-sm text-[#1E3A8A] mt-1">
                  <strong>Next attempt: </strong>
                  {note.improvement}
                </p>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  )
}
