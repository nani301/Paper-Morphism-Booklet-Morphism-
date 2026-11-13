import { useState, useEffect, useRef, useCallback } from "react"
import type { NavigateFn, Page } from "../App"
import ChallengeJourney from "../components/ChallengeJourney"
import slideAnswerDna from "../imports/sliding-images/answer-dna.jpeg"
import slideCompareUpgrade from "../imports/sliding-images/compare-upgrade.jpeg"
import slide21DayChallenge from "../imports/sliding-images/21-day-challenge.jpeg"

/* ── Shared micro-components ── */

function ScoreRing({
  score,
  max = 10,
  size = 120,
}: {
  score: number
  max?: number
  size?: number
}) {
  const r = 46
  const circ = 2 * Math.PI * r
  const pct = score / max
  const offset = circ * (1 - pct)
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="block">
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="rgba(245,166,35,0.12)"
        strokeWidth="7"
      />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="url(#ringGrad)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 50 50)"
        style={{ filter: "drop-shadow(0 0 6px rgba(245,166,35,0.5))" }}
      />
      <defs>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#D89B28" />
          <stop offset="100%" stopColor="#FFD166" />
        </linearGradient>
      </defs>
      <text
        x="50"
        y="46"
        textAnchor="middle"
        fill="#F5A623"
        fontSize="18"
        fontWeight="700"
        fontFamily="Fraunces, serif"
      >
        {score}
      </text>
      <text
        x="50"
        y="60"
        textAnchor="middle"
        fill="#94A3B8"
        fontSize="9"
        fontFamily="Outfit, sans-serif"
      >
        / {max}
      </text>
    </svg>
  )
}

function ParameterBar({
  label,
  pct,
  obtained,
  max,
  weight,
}: {
  label: string
  pct: number
  obtained: number
  max: number
  weight: string
}) {
  return (
    <div className="flex items-center gap-3 group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-white truncate">{label}</span>
          <span className="text-xs font-mono text-gold shrink-0 ml-2">
            {obtained}/{max}
          </span>
        </div>
        <div className="progress-track h-1.5">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <span className="text-[10px] text-slate-med font-mono w-8 text-right shrink-0">
        {weight}
      </span>
    </div>
  )
}

/* ── Hero Carousel ── */

export interface HeroSlide {
  id: number
  tag: string
  tabLabel: string
  headline: string
  sub: string
  cta: string
  ctaSecondary: string
  ctaTarget: Page
  ctaSecondaryTarget: Page
  ctaSecondaryParams?: { id?: string }
  dynamicText: string
  imageSrc: string
  alt: string
}

const SLIDES: HeroSlide[] = [
  {
    id: 0,
    tag: "ANSWER DNA",
    tabLabel: "🧬 Answer DNA",
    headline: "DISCOVER YOUR ANSWER DNA",
    sub: "Identify recurring mistakes, understand your analytical strengths, and improve with every UPSC Mains answer.",
    cta: "EVALUATE YOUR ANSWER",
    ctaSecondary: "EXPLORE ANSWER DNA",
    ctaTarget: "evaluate",
    ctaSecondaryTarget: "dna",
    dynamicText: "DISCOVER YOUR ANSWER DNA. WRITE BETTER. SCORE SMARTER.",
    imageSrc: slideAnswerDna,
    alt: "Answer DNA — Identify recurring mistakes, strengths, and improve with every UPSC Mains answer",
  },
  {
    id: 1,
    tag: "COMPARE & UPGRADE",
    tabLabel: "⚡ Compare & Upgrade",
    headline: "SEE THE GAP. CLOSE THE GAP.",
    sub: "Compare your handwritten answer against high-scoring model approaches to elevate structure, evidence, and conclusion.",
    cta: "COMPARE YOUR ANSWER",
    ctaSecondary: "VIEW DEMO REPORT",
    ctaTarget: "evaluate",
    ctaSecondaryTarget: "report",
    ctaSecondaryParams: { id: "demo" },
    dynamicText: "SEE THE GAP. CLOSE THE GAP. SCORE HIGHER.",
    imageSrc: slideCompareUpgrade,
    alt: "Compare & Upgrade — See the gap between your approach (6.3/10) and an upgraded approach (8.7/10)",
  },
  {
    id: 2,
    tag: "21-DAY CHALLENGE",
    tabLabel: "🎯 21-Day Challenge",
    headline: "21 DAYS. ONE HABIT. BETTER ANSWERS.",
    sub: "Write one UPSC Mains answer each day, receive instant rubric-based AI evaluation, track progress, and build consistency.",
    cta: "START 21-DAY CHALLENGE",
    ctaSecondary: "HOW IT WORKS",
    ctaTarget: "challenge",
    ctaSecondaryTarget: "challenge",
    dynamicText: "21 DAYS OF DISCIPLINE. ONE HABIT FOR A LIFETIME.",
    imageSrc: slide21DayChallenge,
    alt: "21 Days One Habit — Daily practice, rubric AI evaluation, and progress tracking for UPSC Mains",
  },
]

/* Shared slide image with skeleton loading */
function SlideImg({
  src,
  alt,
}: {
  src: string
  alt: string
}) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-navy-deep">
      {/* Skeleton — shown until image loads */}
      {!loaded && (
        <div className="skeleton-pulse absolute inset-0 w-full h-full" />
      )}
      {/* Actual image */}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-contain block transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"
          }`}
        onLoad={() => setLoaded(true)}
      />
      {/* Subtle edge vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ boxShadow: "inset 0 0 50px rgba(5,9,20,0.35)" }}
      />
    </div>
  )
}

function LaurelBranch({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 32 64"
      className="w-5 h-10 sm:w-7 sm:h-14 lg:w-8 lg:h-16 text-gold/80 shrink-0"
      style={{ transform: flip ? "scaleX(-1)" : undefined }}
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        d="M26 62 C26 44 20 24 6 4"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M26 56 C21 53 17 46 19 41 C22 43 25 48 26 53 Z" />
      <path d="M25 48 C29 44 32 39 31 34 C28 36 24 41 23 45 Z" />
      <path d="M23 39 C18 35 14 29 16 24 C19 26 22 31 23 36 Z" />
      <path d="M20 31 C24 26 26 21 24 16 C22 19 18 24 18 28 Z" />
      <path d="M17 22 C13 18 10 12 12 7 C14 9 17 14 17 19 Z" />
      <path d="M13 14 C16 9 17 4 14 1 C13 3 11 8 11 12 Z" />
      <path d="M7 6 C6 2 8 0 10 0 C10 3 9 5 7 6 Z" />
    </svg>
  )
}

function GoldDividerWithDiamond() {
  return (
    <div
      className="flex items-center justify-center gap-3 w-full max-w-xs sm:max-w-md lg:max-w-lg mx-auto mt-3 sm:mt-4 opacity-80"
      aria-hidden="true"
    >
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/40 to-gold/75" />
      <svg
        viewBox="0 0 14 14"
        className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gold shrink-0 drop-shadow-[0_0_4px_rgba(245,166,35,0.6)]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M7 1.75 L12.25 7 L7 12.25 L1.75 7 Z" />
      </svg>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent via-gold/40 to-gold/75" />
    </div>
  )
}

function HeroCarousel({
  activeSlide,
  setActiveSlide,
  navigate,
}: {
  activeSlide: number
  setActiveSlide: (n: number) => void
  navigate: NavigateFn
}) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [paused, setPaused] = useState(false)
  const touchStartX = useRef<number | null>(null)

  const advance = useCallback(() => {
    setActiveSlide((activeSlide + 1) % SLIDES.length)
  }, [activeSlide, setActiveSlide])

  const prevSlide = useCallback(() => {
    setActiveSlide((activeSlide - 1 + SLIDES.length) % SLIDES.length)
  }, [activeSlide, setActiveSlide])

  useEffect(() => {
    if (paused) return
    timerRef.current = setInterval(advance, 5000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [advance, paused])

  const handleCta = (slideItem: HeroSlide) => {
    navigate(slideItem.ctaTarget)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (diff > 40) {
      advance()
    } else if (diff < -40) {
      prevSlide()
    }
    touchStartX.current = null
  }

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #050914 0%, #08111F 60%, #050914 100%)",
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") prevSlide()
        if (e.key === "ArrowRight") advance()
      }}
    >
      {/* Background constellation */}
      <div className="absolute inset-0 constellation-bg pointer-events-none opacity-40" />

      {/* Gold radial ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 35%, rgba(245,166,35,0.08) 0%, transparent 70%)",
        }}
      />

      {/* Accessible tablist (for screen readers and test compliance) */}
      <div role="tablist" aria-label="Hero slides" className="sr-only">
        {SLIDES.map((s, idx) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={idx === activeSlide}
            onClick={() => setActiveSlide(idx)}
          >
            {s.tabLabel}
          </button>
        ))}
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 lg:pt-8 pb-10 sm:pb-12 lg:pb-14">
        {/* Mobile / Tablet Hero Headline & Subtitle */}
        <div className="block lg:hidden text-center max-w-xl mx-auto mb-5 px-2 pt-2">
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold text-white-pure leading-tight tracking-tight">
            Write Better. <span className="gold-gradient-text">Score Smarter.</span>
          </h1>
          <p className="text-slate-med text-xs sm:text-sm leading-relaxed mt-2.5 max-w-md mx-auto">
            From raw handwritten drafts to top-rank quality. Discover your Answer DNA, compare against model approaches, and build 21-day writing discipline.
          </p>
        </div>

        {/* Showcase Frame & Controls Wrapper */}
        <div className="relative flex flex-col items-center w-full max-w-5xl xl:max-w-6xl mx-auto">
          {/* Showcase Carousel Frame */}
          <div
            className="order-1 relative w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-gold/45 lg:border-gold/55 transition-all duration-500 hover:border-gold/70 group bg-[#060D1A]"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{
              boxShadow:
                "0 0 50px rgba(245, 166, 35, 0.25), 0 0 100px rgba(245, 166, 35, 0.08), 0 25px 60px -15px rgba(0, 0, 0, 0.85)",
            }}
          >
            {/* Golden aura highlights along top and bottom curves */}
            <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-85 z-20 pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-85 z-20 pointer-events-none" />

            {/* Sliding Track */}
            <div
              className="flex transition-transform duration-700 ease-out w-full"
              style={{ transform: `translateX(-${activeSlide * 100}%)` }}
            >
              {SLIDES.map((slide) => (
                <div
                  key={slide.id}
                  className="w-full shrink-0 relative cursor-pointer"
                  onClick={() => handleCta(slide)}
                >
                  <div className="relative w-full aspect-[16/9] bg-navy-deep flex items-center justify-center overflow-hidden">
                    <SlideImg src={slide.imageSrc} alt={slide.alt} />
                  </div>
                </div>
              ))}
            </div>

            {/* Floating Left/Right Arrow Controls (subtle hover / accessible) */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                prevSlide()
              }}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-navy/80 hover:bg-gold/20 border border-gold/30 hover:border-gold text-slate-med hover:text-gold flex items-center justify-center transition-all backdrop-blur-md shadow-xl z-20 cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
              aria-label="Previous slide"
            >
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                advance()
              }}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-navy/80 hover:bg-gold/20 border border-gold/30 hover:border-gold text-slate-med hover:text-gold flex items-center justify-center transition-all backdrop-blur-md shadow-xl z-20 cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
              aria-label="Next slide"
            >
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          {/* Pagination Dots (Active elongated gold pill + inactive circular dots) */}
          <div className="order-2 flex items-center justify-center gap-2 mt-4 sm:mt-5 mb-1 sm:mb-2 z-20">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveSlide(i)}
                className={`cursor-pointer transition-all duration-300 ${i === activeSlide
                  ? "w-7 sm:w-8 h-2 sm:h-2.5 rounded-full bg-gold shadow-[0_0_10px_rgba(245,166,35,0.85)]"
                  : "w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-slate-500/40 hover:bg-gold/50"
                  }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

          {/* Call-To-Action Buttons: Overlaid bottom-left inside frame on desktop, below dots on mobile */}
          <div className="order-3 relative lg:absolute lg:top-[54%] xl:top-[55%] lg:left-[5.5%] xl:left-[6%] lg:z-30 w-full lg:w-auto mt-3.5 lg:mt-0 px-2 sm:px-0">
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-[#08111F]/80 border border-gold/25 shadow-lg backdrop-blur-md lg:flex lg:items-center lg:gap-3.5 lg:p-0 lg:bg-transparent lg:border-0 lg:shadow-none lg:backdrop-blur-none">
              <button
                onClick={() => navigate("evaluate")}
                className="flex items-center justify-center gap-1.5 px-3 py-3 sm:px-5 sm:py-3.5 lg:px-4 lg:py-2.5 xl:px-6 xl:py-3 rounded-xl lg:rounded-full bg-gradient-to-r from-[#D89B28] via-[#F5A623] to-[#FFD166] text-[#050914] font-bold text-[11px] sm:text-xs lg:text-xs xl:text-sm tracking-wider uppercase shadow-[0_0_25px_rgba(245,166,35,0.65)] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer text-center"
              >
                <span className="hidden lg:inline">⚡</span>
                <span className="leading-tight">
                  <span className="block lg:inline">EVALUATE YOUR </span>
                  <span className="block lg:inline">ANSWER →</span>
                </span>
              </button>

              <button
                onClick={() => navigate("dna")}
                className="flex items-center justify-center px-3 py-3 sm:px-5 sm:py-3.5 lg:px-4 lg:py-2.5 xl:px-6 xl:py-3 rounded-xl lg:rounded-full bg-[#08111F]/90 lg:bg-navy-deep/80 border border-gold/45 text-white-pure font-bold lg:font-semibold text-[11px] sm:text-xs lg:text-xs xl:text-sm tracking-wider uppercase backdrop-blur-md hover:bg-gold/15 hover:border-gold active:scale-[0.98] transition-all cursor-pointer text-center leading-tight"
              >
                <span className="leading-tight">
                  <span className="block lg:inline">EXPLORE </span>
                  <span className="block lg:inline">ANSWER DNA</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Dynamic Typography Ticker ── */
function DynamicTypography({ activeSlide }: { activeSlide: number }) {
  const texts = SLIDES.map((s) => s.dynamicText)
  const currentText = texts[activeSlide] || texts[0]

  return (
    <section className="relative py-8 lg:py-12 bg-navy border-y border-gold/15 text-center overflow-hidden px-4">
      {/* Background subtle glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(245,166,35,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-4xl mx-auto flex flex-col items-center justify-center">
        {/* Laurel branches flanking the motto (mobile & tablet only, per R1 vs R2) */}
        <div className="flex items-center justify-center gap-3 sm:gap-6 lg:gap-8 w-full">
          <div className="block lg:hidden shrink-0">
            <LaurelBranch flip />
          </div>

          <div key={activeSlide} className="fade-in-up text-center px-2">
            <p className="font-display text-xs sm:text-base lg:text-2xl font-light tracking-[0.14em] lg:tracking-[0.18em] text-[#F4E8D0] uppercase leading-relaxed max-w-2xl mx-auto drop-shadow-sm">
              {currentText}
            </p>
          </div>

          <div className="block lg:hidden shrink-0">
            <LaurelBranch />
          </div>
        </div>

        {/* Gold decorative horizontal rule with centered diamond accent */}
        <GoldDividerWithDiamond />
      </div>
    </section>
  )
}

/* ── Primary Evaluate CTA ── */
function EvaluateCTA({ navigate }: { navigate: NavigateFn }) {
  const [isDragOver, setIsDragOver] = useState(false)

  return (
    <section aria-labelledby="evaluate-cta-heading" className="relative py-12 sm:py-16 lg:py-24 bg-navy-deep overflow-hidden">
      {/* Ambient gold radial glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 30%, rgba(245,166,35,0.08) 0%, transparent 70%)",
        }}
      />
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="section-label mb-3 sm:mb-4">START HERE</div>
        <h2 id="evaluate-cta-heading" className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-white-pure tracking-tight mb-4 sm:mb-6">
          Ready to test your answer?
        </h2>
        <p className="text-slate-med text-base sm:text-lg mb-8 sm:mb-10 max-w-xl mx-auto leading-relaxed font-body">
          Upload your handwritten answer and receive feedback against the selected paper's rubric. Processing time varies.
        </p>

        {/* Quick upload zone */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload handwritten answer"
          onClick={() => navigate("evaluate")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              navigate("evaluate")
            }
          }}
          onDragEnter={(e) => {
            e.preventDefault()
            setIsDragOver(true)
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragOver(true)
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            setIsDragOver(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragOver(false)
            navigate("evaluate")
          }}
          className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-10 lg:p-14 cursor-pointer transition-all duration-300 group mb-6 sm:mb-8 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-gold/50 ${isDragOver
            ? "border-gold bg-gold/15 shadow-2xl shadow-gold/20 scale-[1.01]"
            : "border-gold/30 hover:border-gold/60 bg-card/60 hover:bg-card/90 hover:shadow-xl hover:shadow-gold/10"
            }`}
        >
          <div className="flex flex-col items-center gap-3 sm:gap-4">
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm ${isDragOver
              ? "bg-gold text-navy-deep scale-110 shadow-gold/30"
              : "bg-gold/10 border border-gold/20 text-gold group-hover:bg-gold/20 group-hover:scale-105 group-hover:border-gold/40"
              }`}>
              <svg
                className="w-7 h-7 sm:w-8 sm:h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
            </div>
            <div>
              <div className="text-white-pure font-semibold text-base sm:text-lg mb-1 group-hover:text-gold-bright transition-colors font-body">
                Drop your answer here
              </div>
              <div className="text-slate-med text-xs sm:text-sm">
                JPG, PNG, PDF — up to 20 pages supported
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium text-gold bg-gold/10 border border-gold/20 group-hover:bg-gold group-hover:text-navy-deep transition-all duration-200 mt-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Browse or Drag Files
            </span>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full">
          <button
            type="button"
            onClick={() => navigate("evaluate")}
            className="btn-primary text-xs sm:text-sm px-7 sm:px-8 py-3.5 w-full sm:w-auto min-h-[44px] shadow-md shadow-gold/20 hover:shadow-gold/30 active:scale-[0.99] transition-all focus:outline-none focus:ring-2 focus:ring-gold/50"
          >
            EVALUATE MY ANSWER →
          </button>
          <button
            type="button"
            onClick={() => navigate("report", { id: "demo" })}
            className="btn-secondary text-xs sm:text-sm px-7 sm:px-8 py-3.5 w-full sm:w-auto min-h-[44px] active:scale-[0.99] transition-all focus:outline-none focus:ring-2 focus:ring-gold/50"
          >
            TRY DEMO
          </button>
        </div>
      </div>
    </section>
  )
}

/* ── How It Works ── */
function HowItWorks({ navigate }: { navigate: NavigateFn }) {
  const [active, setActive] = useState(0)
  const steps = [
    {
      num: "01",
      title: "WRITE",
      icon: "✍️",
      desc: "Write your UPSC answer on paper. Address the question fully — let your thinking flow.",
    },
    {
      num: "02",
      title: "UPLOAD",
      icon: "📤",
      desc: "Upload as PDF, images, or capture directly using your phone camera with auto-crop.",
    },
    {
      num: "03",
      title: "AI EVALUATES",
      icon: "🤖",
      desc: "Ekalavya analyses your answer across all 8 parameters against the question demand.",
    },
    {
      num: "04",
      title: "UNDERSTAND & UPGRADE",
      icon: "⚡",
      desc: "See exactly where marks were lost. Generate a stronger version that preserves your ideas.",
    },
    {
      num: "05",
      title: "PRACTICE & IMPROVE",
      icon: "📈",
      desc: "Receive a targeted practice question based on your weakest parameter. Track your growth.",
    },
  ]

  return (
    <section aria-labelledby="how-it-works-heading" className="relative py-14 sm:py-20 lg:py-28 bg-navy border-t border-gold/10 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="text-center mb-10 sm:mb-14 lg:mb-16">
          <div className="section-label mb-3 sm:mb-4">THE PROCESS</div>
          <h2 id="how-it-works-heading" className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-white-pure mb-3 sm:mb-4">
            How Ekalavya Works
          </h2>
          <p className="text-slate-med text-base sm:text-lg max-w-xl mx-auto font-body">
            From handwritten answer to personalised improvement in a few simple steps.
          </p>
        </div>

        {/* Steps Flow */}
        <div
          role="tablist"
          aria-label="How Ekalavya Works process steps"
          className="relative flex flex-col lg:flex-row gap-3 sm:gap-4 lg:gap-2"
        >
          {steps.map((step, i) => (
            <div key={i} className="flex-1 relative">
              {/* Connector line between steps on desktop */}
              {i < steps.length - 1 && (
                <div
                  aria-hidden="true"
                  className="hidden lg:block absolute top-[52px] left-1/2 w-full h-0.5 z-0 pointer-events-none transition-colors duration-300"
                >
                  <div
                    className={`h-full w-full transition-all duration-300 ${i < active
                      ? "bg-gradient-to-r from-gold via-gold/80 to-gold/60 shadow-[0_0_8px_rgba(245,166,35,0.4)]"
                      : "bg-gradient-to-r from-gold/30 to-gold/10"
                      }`}
                  />
                </div>
              )}

              <button
                type="button"
                role="tab"
                aria-selected={active === i}
                aria-controls={`step-panel-${i}`}
                id={`step-tab-${i}`}
                tabIndex={active === i ? 0 : -1}
                onClick={() => setActive(i)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                    e.preventDefault()
                    const next = (i + 1) % steps.length
                    setActive(next)
                    document.getElementById(`step-tab-${next}`)?.focus()
                  } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                    e.preventDefault()
                    const prev = (i - 1 + steps.length) % steps.length
                    setActive(prev)
                    document.getElementById(`step-tab-${prev}`)?.focus()
                  } else if (e.key === "Home") {
                    e.preventDefault()
                    setActive(0)
                    document.getElementById("step-tab-0")?.focus()
                  } else if (e.key === "End") {
                    e.preventDefault()
                    setActive(steps.length - 1)
                    document.getElementById(`step-tab-${steps.length - 1}`)?.focus()
                  }
                }}
                className={`relative z-10 w-full p-4 sm:p-5 lg:p-6 rounded-2xl text-left lg:text-center transition-all duration-300 card-hover cursor-pointer focus:outline-none focus:ring-2 focus:ring-gold/50 min-h-[72px] lg:min-h-[230px] flex flex-col justify-start ${active === i
                  ? "bg-card border-2 border-gold/50 shadow-xl shadow-gold/10"
                  : "bg-card/40 border border-gold/15 hover:border-gold/30 hover:bg-card/70"
                  }`}
              >
                <div className="flex items-start lg:flex-col lg:items-center text-left lg:text-center gap-3.5 sm:gap-4 lg:gap-3 w-full">
                  {/* Circular numeric / icon badge */}
                  <div
                    className={`shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-mono font-bold transition-all duration-300 relative z-10 ${active === i
                      ? "bg-gradient-to-br from-gold-bright via-gold to-gold-dark text-navy-deep shadow-lg shadow-gold/25 ring-4 ring-gold/20 scale-105"
                      : "bg-card border border-gold/30 text-gold hover:border-gold/60"
                      }`}
                  >
                    {active === i ? (
                      <span className="text-xl sm:text-2xl" role="img" aria-label={step.title}>
                        {step.icon}
                      </span>
                    ) : (
                      <span className="text-sm sm:text-base font-bold">
                        {step.num}
                      </span>
                    )}
                  </div>

                  {/* Step text content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 lg:justify-center mb-1">
                      <span className="text-[10px] sm:text-[11px] font-mono font-semibold text-gold tracking-widest uppercase">
                        STEP {step.num}
                      </span>
                      {active === i && (
                        <span className="lg:hidden inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-gold/15 text-gold border border-gold/30 uppercase">
                          Active
                        </span>
                      )}
                    </div>
                    <div
                      className={`font-semibold text-sm sm:text-base tracking-wide transition-colors ${active === i ? "text-gold" : "text-muted-white"
                        }`}
                    >
                      {step.title}
                    </div>
                    {active === i && (
                      <div
                        role="tabpanel"
                        id={`step-panel-${i}`}
                        aria-labelledby={`step-tab-${i}`}
                        tabIndex={0}
                        className="text-slate-med text-xs sm:text-sm leading-relaxed mt-2 sm:mt-2.5 fade-in-up font-body focus:outline-none"
                      >
                        {step.desc}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>

        {/* Evaluation CTA button */}
        <div className="mt-10 lg:mt-16 text-center">
          <button
            type="button"
            onClick={() => navigate("evaluate")}
            className="btn-primary text-xs sm:text-sm px-8 py-3.5 min-h-[44px] shadow-md shadow-gold/20 hover:shadow-gold/30 active:scale-[0.99] transition-all focus:outline-none focus:ring-2 focus:ring-gold/50"
          >
            START YOUR FIRST EVALUATION
          </button>
        </div>
      </div>
    </section>
  )
}

/* ── Why Ekalavya ── */
function WhyEkalavya() {
  const cards = [
    {
      step: "SEE",
      title: "Where you lost marks.",
      desc: "Every evaluation shows you the exact parameters that cost you marks — not just a total.",
      color: "#4ADE80",
    },
    {
      step: "UNDERSTAND",
      title: "Why it affected your answer.",
      desc: "Not just what went wrong, but why it matters for the evaluator — and what a stronger pattern looks like.",
      color: "#F5A623",
    },
    {
      step: "UPGRADE",
      title: "See how the answer can become stronger.",
      desc: "Upgrade Bro generates a stronger version of your answer — preserving your ideas, improving the execution.",
      color: "#FFD166",
    },
    {
      step: "REPEAT",
      title: "Practice until the weakness disappears.",
      desc: "Answer DNA tracks your patterns over time. Targeted questions address your weakest parameter.",
      color: "#F5A623",
    },
  ]

  return (
    <section aria-labelledby="why-ekalavya-heading" className="relative py-14 sm:py-20 lg:py-28 bg-navy-deep border-t border-gold/10 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="text-center mb-10 sm:mb-14 lg:mb-16">
          <div className="section-label mb-3 sm:mb-4">THE PHILOSOPHY</div>
          <h2 id="why-ekalavya-heading" className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-white-pure mb-2 sm:mb-3">
            Not just a score.
          </h2>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-light text-gold italic mb-4 sm:mb-6">
            A mentoring loop.
          </h2>
          <p className="text-slate-med text-base sm:text-lg max-w-xl mx-auto font-body leading-relaxed">
            Turn every evaluation into an iterative cycle of diagnosis, clarity, and mastery.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {cards.map((card, i) => (
            <article
              key={i}
              className="bg-card rounded-2xl p-6 sm:p-7 gold-border card-hover cursor-default transition-all duration-300 hover:border-gold/50 hover:shadow-xl hover:shadow-gold/5 flex flex-col justify-between group"
            >
              <div>
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider mb-5"
                  style={{
                    background: `${card.color}18`,
                    color: card.color,
                    border: `1px solid ${card.color}35`,
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: card.color }}
                    aria-hidden="true"
                  />
                  {String(i + 1).padStart(2, "0")} {card.step}
                </div>
                <h3 className="font-display text-xl sm:text-2xl font-semibold text-white-pure mb-3 leading-snug group-hover:text-gold-bright transition-colors">
                  {card.title}
                </h3>
                <p className="text-slate-med text-sm leading-relaxed font-body">
                  {card.desc}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── 8-Parameter Section ── */
function EightParameters({ navigate }: { navigate: NavigateFn }) {
  const params = [
    {
      label: "Understanding & Demand Fulfilment",
      weight: "25%",
      pct: 80,
      obtained: "2.0",
      max: "2.5",
      delta: "+0.3",
    },
    {
      label: "Content Knowledge & Accuracy",
      weight: "25%",
      pct: 76,
      obtained: "1.9",
      max: "2.5",
      delta: "+0.1",
    },
    {
      label: "Analysis & Depth",
      weight: "15%",
      pct: 67,
      obtained: "1.0",
      max: "1.5",
      delta: "+0.2",
    },
    {
      label: "Structure & Logical Flow",
      weight: "10%",
      pct: 70,
      obtained: "0.7",
      max: "1.0",
      delta: "0.0",
    },
    {
      label: "Multi-dimensionality / Coverage",
      weight: "10%",
      pct: 70,
      obtained: "0.7",
      max: "1.0",
      delta: "+0.1",
    },
    {
      label: "Examples / Data / Current Affairs",
      weight: "7.5%",
      pct: 67,
      obtained: "0.5",
      max: "0.75",
      delta: "-0.1",
    },
    {
      label: "Conclusion / Way Forward",
      weight: "5%",
      pct: 80,
      obtained: "0.4",
      max: "0.5",
      delta: "+0.1",
    },
    {
      label: "Presentation & Readability",
      weight: "2.5%",
      pct: 80,
      obtained: "0.2",
      max: "0.25",
      delta: "0.0",
    },
  ]

  return (
    <section className="py-12 lg:py-28 bg-navy-deep">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-8 lg:gap-16 items-center">
          <div>
            <div className="section-label mb-4">8-PARAMETER EVALUATION</div>
            <h2 className="font-display text-3xl lg:text-4xl font-semibold text-white-pure mb-5">
              Every dimension of your answer — measured.
            </h2>
            <p className="text-slate-med text-lg leading-relaxed mb-8">
              Ekalavya evaluates across 8 precisely weighted parameters — the
              same dimensions that determine marks in UPSC Mains. Nothing is
              left to vague feedback.
            </p>
            <div className="space-y-1 mb-8">
              {[
                "Fixed 8-parameter rubric, not a generic AI score",
                "Each parameter weighted to reflect real evaluation priorities",
                "Delta shown vs previous attempt on every parameter",
                "Click any parameter to understand the exact gap",
              ].map((pt) => (
                <div
                  key={pt}
                  className="flex items-start gap-3 text-sm text-muted-white py-1.5"
                >
                  <span className="text-gold mt-0.5 shrink-0">→</span> {pt}
                </div>
              ))}
            </div>
            <button onClick={() => navigate("report")} className="btn-primary">
              SEE FULL REPORT
            </button>
          </div>

          <div className="bg-card rounded-2xl p-6 lg:p-8 gold-border">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-xs font-mono text-slate-med">
                  GS2 · Governance · 10M
                </div>
                <div className="text-sm text-muted-white mt-1">
                  Digital India and e-Governance
                </div>
              </div>
              <ScoreRing score={6.8} size={72} />
            </div>
            <div className="space-y-4">
              {params.map((p) => (
                <div key={p.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-xs text-muted-white leading-snug flex-1 pr-3">
                      {p.label}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-mono ${p.delta.startsWith("+")
                          ? "text-eka-success"
                          : p.delta.startsWith("-")
                            ? "text-eka-danger"
                            : "text-slate-med"
                          }`}
                      >
                        {p.delta !== "0.0" ? p.delta : ""}
                      </span>
                      <span className="text-xs font-mono text-gold">
                        {p.obtained}/{p.max}
                      </span>
                      <span className="text-[10px] text-slate-med/60 font-mono w-7">
                        {p.weight}
                      </span>
                    </div>
                  </div>
                  <div className="progress-track h-1.5">
                    <div
                      className="progress-fill"
                      style={{ width: `${p.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Annotated Answer Preview ── */
function AnnotatedAnswerPreview({ navigate }: { navigate: NavigateFn }) {
  const [activeAnnotation, setActiveAnnotation] = useState<string | null>(null)

  const annotations: {
    id: string
    label: string
    type: "green" | "yellow" | "red"
    detail: string
    top: string
    left: string
  }[] = [
      {
        id: "a1",
        label: "GOOD START",
        type: "green",
        top: "8%",
        left: "60%",
        detail:
          "Strong introduction. Directly frames the question demand with relevant context.",
      },
      {
        id: "a2",
        label: "ADD EXAMPLE",
        type: "yellow",
        top: "30%",
        left: "55%",
        detail:
          "Your point is correct but generic. Add a specific scheme or committee reference.",
      },
      {
        id: "a3",
        label: "EXPAND ANALYSIS",
        type: "red",
        top: "52%",
        left: "62%",
        detail:
          "Causal reasoning is missing. Follow Claim → Why → Impact → Counterpoint.",
      },
      {
        id: "a4",
        label: "GOOD POINT",
        type: "green",
        top: "70%",
        left: "50%",
        detail:
          "Relevant constitutional provision cited correctly. Strengthens the argument.",
      },
      {
        id: "a5",
        label: "STRONG CONCLUSION",
        type: "green",
        top: "88%",
        left: "56%",
        detail:
          "Way forward is specific and actionable. Well-structured conclusion.",
      },
    ]

  return (
    <section className="py-12 lg:py-28 bg-navy">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="text-center mb-8 lg:mb-16">
          <div className="section-label mb-4">FLAGSHIP FEATURE</div>
          <h2 className="font-display text-3xl lg:text-4xl font-semibold text-white-pure mb-5">
            Your answer, annotated by AI.
          </h2>
          <p className="text-slate-med text-lg max-w-xl mx-auto">
            Every line of your handwritten answer is reviewed. Strengths
            highlighted. Opportunities marked. Nothing hidden.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Paper */}
          <div className="lg:col-span-2">
            <div
              className="relative bg-[#F4E8D0] rounded-2xl shadow-2xl overflow-hidden"
              style={{ minHeight: "clamp(320px, 60vw, 480px)" }}
            >
              <div
                className="p-4 lg:p-8 lined-paper"
                style={{ minHeight: "clamp(320px, 60vw, 480px)" }}
              >
                <div className="text-[11px] text-gray-400 mb-3 font-mono uppercase tracking-wider">
                  UPSC CSE · GS2 · Question 4 · 10 Marks
                </div>
                {[
                  "Digital India is not just about digital infrastructure but a fundamental",
                  "shift in governance. The programme aims to transform India into a",
                  "digitally empowered society. E-governance has multiple dimensions:",
                  "",
                  "Government to Citizen (G2C): Services like DigiLocker, Aadhaar-enabled",
                  "payments and UMANG portal have simplified citizen interactions.",
                  "",
                  "Government to Business (G2B): The GEM portal has brought transparency",
                  "to public procurement. Over ₹2 lakh crore of transactions recorded.",
                  "",
                  "However, challenges remain. Digital divide between urban and rural",
                  "areas persists. Literacy and connectivity gaps limit full adoption.",
                  "",
                  "The way forward requires multi-stakeholder approach including capacity",
                  "building, last-mile connectivity and data governance frameworks.",
                ].map((line, i) => (
                  <div
                    key={i}
                    className="handwriting text-sm leading-8 text-gray-800"
                  >
                    {line || " "}
                  </div>
                ))}
              </div>

              {/* Annotation overlays */}
              {annotations.map((ann) => (
                <button
                  key={ann.id}
                  className={`annotation-badge badge-${ann.type} absolute`}
                  style={{ top: ann.top, left: ann.left }}
                  onClick={() =>
                    setActiveAnnotation(
                      activeAnnotation === ann.id ? null : ann.id,
                    )
                  }
                >
                  {ann.label}
                </button>
              ))}
            </div>
          </div>

          {/* Annotation detail */}
          <div className="space-y-4">
            {activeAnnotation ? (
              <div className="bg-card rounded-2xl p-6 gold-border fade-in-up">
                {(() => {
                  const ann = annotations.find(
                    (a) => a.id === activeAnnotation,
                  )!
                  return (
                    <>
                      <div
                        className={`annotation-badge badge-${ann.type} mb-4 inline-flex`}
                      >
                        {ann.label}
                      </div>
                      <div className="space-y-4">
                        <div>
                          <div className="text-[10px] font-mono text-gold mb-1 tracking-wider">
                            AI COMMENT
                          </div>
                          <p className="text-sm text-muted-white">
                            {ann.detail}
                          </p>
                        </div>
                        <div>
                          <div className="text-[10px] font-mono text-gold mb-1 tracking-wider">
                            HOW TO IMPROVE
                          </div>
                          <p className="text-sm text-slate-med">
                            Add a specific constitutional provision, committee
                            recommendation, or contemporary data point.
                          </p>
                        </div>
                        <div>
                          <div className="text-[10px] font-mono text-gold mb-1 tracking-wider">
                            PARAMETER AFFECTED
                          </div>
                          <p className="text-sm text-muted-white">
                            Examples / Data / Current Affairs
                          </p>
                        </div>
                      </div>
                      <div className="mt-5 flex gap-2">
                        <button className="btn-primary text-xs px-4 py-2">
                          APPLY SUGGESTION
                        </button>
                        <button className="btn-secondary text-xs px-4 py-2">
                          ASK AI
                        </button>
                      </div>
                    </>
                  )
                })()}
              </div>
            ) : (
              <>
                <div className="bg-card rounded-2xl p-5 gold-border">
                  <div className="text-xs font-mono text-gold mb-3 tracking-wider">
                    ANNOTATION LEGEND
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="annotation-badge badge-green">
                        GREEN
                      </span>
                      <span className="text-xs text-muted-white">
                        Strong — keep this pattern
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="annotation-badge badge-yellow">
                        YELLOW
                      </span>
                      <span className="text-xs text-muted-white">
                        Opportunity — easy improvement
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="annotation-badge badge-red">RED</span>
                      <span className="text-xs text-muted-white">
                        Major gap — needs attention
                      </span>
                    </div>
                  </div>
                </div>
                <div className="bg-card rounded-2xl p-5 gold-border">
                  <div className="text-xs font-mono text-gold mb-2 tracking-wider">
                    THIS ANSWER
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-med">Strong points</span>
                      <span className="text-eka-success">3</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-med">Opportunities</span>
                      <span className="text-eka-warning">1</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-med">Major gaps</span>
                      <span className="text-eka-danger">1</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-med text-center">
                  ← Click any annotation to see AI feedback
                </p>
              </>
            )}
            <button
              onClick={() => navigate("evaluate")}
              className="btn-primary w-full text-sm"
            >
              EVALUATE YOUR ANSWER
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Upgrade Bro Preview ── */
function UpgradeBroPreview({ navigate }: { navigate: NavigateFn }) {
  const [tab, setTab] = useState<"original" | "upgraded" | "changes">(
    "original",
  )

  const originalText = `Digital India is not just about digital infrastructure but a fundamental shift in governance. The programme aims to transform India. E-governance includes G2C services like DigiLocker and Aadhaar. Government to Business sector also improved with GEM portal. Challenges like digital divide and literacy gaps remain. Multi-stakeholder approach needed for the way forward.`

  const upgradedText = `Digital India represents a paradigm shift from physical to digital governance architecture. At its core, it transforms the State–citizen relationship through three mutually reinforcing dimensions: Digital infrastructure as utility, Governance on demand, and Digital empowerment of citizens (DEIT, 2015).\n\nThe G2C transformation has been substantial. DigiLocker has issued 6+ billion documents, reducing bureaucratic friction. The UMANG platform integrates 1900+ services — a consolidation that addresses the silos that previously fragmented citizen experience.\n\nHowever, structural challenges persist. The Telecom Regulatory Authority of India (2023) notes that only 40% of rural households have broadband access above 25 Mbps — creating a two-speed digital citizenship. The Parliamentary Standing Committee on IT (2022) identified digital literacy as the primary bottleneck.\n\nThe way forward demands a three-track approach: last-mile connectivity through BharatNet, community-level digital literacy centres, and a robust data governance framework aligned with the Digital Personal Data Protection Act, 2023.`

  const changes = [
    {
      section: "INTRODUCTION",
      status: "Refined",
      note: "Added policy framework reference. Established three dimensions.",
    },
    {
      section: "STRUCTURE",
      status: "Reorganized",
      note: "Moved from list-style to analytical argument flow.",
    },
    {
      section: "ANALYSIS",
      status: "Expanded",
      note: "Added cause-effect reasoning and institutional references.",
    },
    {
      section: "EXAMPLES",
      status: "Strengthened",
      note: "Added specific data: DigiLocker volume, UMANG count, TRAI stats.",
    },
    {
      section: "CONCLUSION",
      status: "Improved",
      note: "Referenced the DPDP Act 2023 for contemporary value addition.",
    },
  ]

  return (
    <section className="py-12 lg:py-28 bg-navy-deep">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="text-center mb-8 lg:mb-16">
          <div className="section-label mb-4">FLAGSHIP FEATURE</div>
          <h2 className="font-display text-3xl lg:text-4xl font-semibold text-white-pure mb-3">
            Upgrade Bro ✨
          </h2>
          <p className="text-slate-med text-lg max-w-2xl mx-auto">
            Your ideas. Better executed. Upgrade Bro improves structure,
            analysis, examples, and conclusion — without replacing your
            thinking.
          </p>
        </div>

        <div className="bg-card rounded-2xl gold-border overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gold/10 px-6">
            {(["original", "upgraded", "changes"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-6 py-4 text-sm font-semibold tracking-wide transition-colors ${tab === t ? "tab-active" : "tab-inactive"
                  }`}
              >
                {t === "original"
                  ? "YOUR VERSION"
                  : t === "upgraded"
                    ? "STRONGER VERSION"
                    : "WHAT CHANGED"}
              </button>
            ))}
          </div>

          <div className="p-6 lg:p-8 min-h-64">
            {tab === "original" && (
              <div className="fade-in-up">
                <div className="text-xs font-mono text-slate-med mb-4 tracking-wider">
                  ORIGINAL ANSWER · 6.8/10
                </div>
                <p className="text-muted-white leading-relaxed text-sm">
                  {originalText}
                </p>
              </div>
            )}
            {tab === "upgraded" && (
              <div className="fade-in-up">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-mono text-gold tracking-wider">
                    STRONGER VERSION EXAMPLE
                  </span>
                  <span className="text-[10px] bg-gold/10 text-gold border border-gold/20 px-2 py-0.5 rounded-full font-mono">
                    ~8/10 PATTERN
                  </span>
                </div>
                <p className="text-muted-white leading-relaxed text-sm whitespace-pre-line">
                  {upgradedText}
                </p>
                <div className="mt-4 p-3 bg-elevated rounded-xl text-xs text-slate-med border border-gold/10">
                  This is an illustrative stronger version. It preserves your
                  core arguments and improves their execution. Not a template to
                  copy — a pattern to learn from.
                </div>
              </div>
            )}
            {tab === "changes" && (
              <div className="fade-in-up space-y-4">
                {changes.map((c) => (
                  <div
                    key={c.section}
                    className="flex gap-4 p-4 bg-elevated rounded-xl border border-gold/8"
                  >
                    <div className="shrink-0 pt-0.5">
                      <div className="text-[10px] font-mono text-slate-med">
                        {c.section}
                      </div>
                      <div className="text-[10px] font-mono text-gold mt-0.5">
                        {c.status}
                      </div>
                    </div>
                    <div className="text-sm text-muted-white">{c.note}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-6 lg:px-8 pb-6 flex flex-wrap gap-3 border-t border-gold/8 pt-6">
            <button
              onClick={() => navigate("evaluate")}
              className="btn-primary text-sm"
            >
              TRY IT YOURSELF
            </button>
            <button className="btn-secondary text-sm">
              REWRITE & RE-EVALUATE
            </button>
            <button className="btn-secondary text-sm">
              COMPARE WITH TOPPER
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Compare Bro Preview ── */
function CompareBroPreview({ navigate }: { navigate: NavigateFn }) {
  const rows = [
    {
      aspect: "Introduction",
      you: "Context set. Definition given.",
      ref: "Policy framework, 3 dimensions named, stakes established.",
    },
    {
      aspect: "Dimensions",
      you: "2 dimensions (G2C, G2B)",
      ref: "4 dimensions (G2C, G2B, G2G, infrastructure-as-utility)",
    },
    {
      aspect: "Data Usage",
      you: "General statements",
      ref: "TRAI 2023, DigiLocker 6B docs, UMANG 1900+ services",
    },
    {
      aspect: "Analysis",
      you: "Descriptive challenges listed",
      ref: "Structural diagnosis + institutional failure analysis",
    },
    {
      aspect: "Conclusion",
      you: "Multi-stakeholder approach",
      ref: "BharatNet + digital literacy centres + DPDP Act 2023",
    },
  ]

  return (
    <section className="py-12 lg:py-28 bg-navy">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="text-center mb-8 lg:mb-16">
          <div className="section-label mb-4">FLAGSHIP FEATURE</div>
          <h2 className="font-display text-3xl lg:text-4xl font-semibold text-white-pure mb-3">
            Compare Bro ⚡
          </h2>
          <p className="text-slate-med text-lg max-w-xl mx-auto">
            Not just "topper is better." Understand the exact gap — dimension by
            dimension — and learn what to do differently.
          </p>
        </div>

        <div className="bg-card rounded-2xl gold-border overflow-hidden">
          <div className="hidden sm:grid grid-cols-2 border-b border-gold/10">
            <div className="px-6 py-4 border-r border-gold/10">
              <div className="text-xs font-mono text-slate-med tracking-wider">
                YOUR ANSWER · 6.8/10
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="text-xs font-mono text-gold tracking-wider">
                REFERENCE ANSWER PATTERN · ~8.5/10
              </div>
            </div>
          </div>

          {rows.map((row, i) => (
            <div
              key={i}
              className={`grid grid-cols-2 ${i !== rows.length - 1 ? "border-b border-gold/8" : ""
                }`}
            >
              <div className="px-6 py-5 border-r border-gold/8">
                <div className="text-[10px] font-mono text-slate-med mb-2 tracking-wider">
                  {row.aspect.toUpperCase()}
                </div>
                <div className="text-sm text-muted-white">{row.you}</div>
              </div>
              <div className="px-6 py-5">
                <div className="text-[10px] font-mono text-gold mb-2 tracking-wider">
                  {row.aspect.toUpperCase()}
                </div>
                <div className="text-sm text-muted-white">{row.ref}</div>
              </div>
            </div>
          ))}

          <div className="p-6 bg-elevated border-t border-gold/10">
            <div className="text-xs font-mono text-gold mb-3 tracking-wider">
              YOUR GAP · LEARNING
            </div>
            <p className="text-sm text-muted-white mb-4">
              When a question has broad governance scope, scan all 4 dimensions
              (G2C, G2B, G2G, infrastructure). Use one specific recent data
              point per argument — not general observations.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => navigate("practice")}
                className="btn-primary text-sm"
              >
                PRACTICE THIS PATTERN
              </button>
              <button
                onClick={() => navigate("report")}
                className="btn-secondary text-sm"
              >
                SEE FULL COMPARISON
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── 21-Day Challenge Section ── */
function ChallengeSection({ navigate }: { navigate: NavigateFn }) {
  const days = Array.from({ length: 21 }, (_, i) => i + 1)
  const completed = Array.from({ length: 12 }, (_, i) => i + 1)
  const current = 13

  return (
    <section className="py-12 lg:py-28 bg-navy-deep">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          <div>
            <div className="section-label mb-4">THE HABIT LOOP</div>
            <h2 className="font-display text-3xl lg:text-4xl font-semibold text-white-pure mb-5">
              21 Days.
              <br />
              <span className="gold-gradient-text">One Habit.</span>
            </h2>
            <p className="text-slate-med text-lg leading-relaxed mb-6">
              Write and evaluate one answer every day for 21 days. Not a sprint
              — a practice rhythm that changes how you write.
            </p>

            <div className="space-y-4 mb-8">
              {[
                {
                  icon: "✍️",
                  label: "Write Daily",
                  desc: "One answer per day. No minimum word count — consistency over quantity.",
                },
                {
                  icon: "🤖",
                  label: "AI Evaluate",
                  desc: "Get detailed evaluation using the applicable rubric for that paper.",
                },
                {
                  icon: "📈",
                  label: "Track Progress",
                  desc: "Watch your Answer DNA evolve over 21 evaluations.",
                },
                {
                  icon: "🎯",
                  label: "Build Consistency",
                  desc: "Complete all 21 days to develop a lasting daily writing discipline.",
                },
              ].map((item) => (
                <div key={item.label} className="flex gap-4 items-start">
                  <div className="text-xl shrink-0 mt-0.5">{item.icon}</div>
                  <div>
                    <div className="font-semibold text-white-pure text-sm mb-0.5">
                      {item.label}
                    </div>
                    <div className="text-slate-med text-sm">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-gold/8 rounded-xl border border-gold/20 mb-8">
              <div className="text-sm font-bold text-gold tracking-wide">
                21 DAYS OF DISCIPLINE · ONE ANSWER EACH DAY
              </div>
              <div className="text-xs text-slate-med mt-1">
                Real completed evaluations determine your calendar progression.
              </div>
            </div>

            <button
              onClick={() => navigate("challenge")}
              className="btn-primary"
            >
              START 21-DAY CHALLENGE
            </button>
          </div>

          {/* Calendar visual */}
          <div className="bg-card rounded-2xl p-6 lg:p-8 gold-border">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-xs font-mono text-slate-med">
                  YOUR CHALLENGE
                </div>
                <div className="font-display text-2xl font-semibold text-white-pure mt-1">
                  Day 12/21
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-med">Avg Score</div>
                <div className="text-xl font-mono text-gold font-bold">
                  6.8/10
                </div>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-6">
              {days.map((d) => (
                <div
                  key={d}
                  className={`aspect-square rounded-full flex items-center justify-center text-xs font-bold transition-all ${completed.includes(d)
                    ? "bg-gold text-navy-deep shadow-sm shadow-gold/30"
                    : d === current
                      ? "border-2 border-gold-bright text-gold-bright ring-2 ring-gold-bright/20"
                      : "border border-gold/12 text-slate-med/40"
                    }`}
                >
                  {completed.includes(d) ? "✓" : d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-elevated rounded-xl p-3 text-center">
                <div className="text-lg font-mono font-bold text-gold">12</div>
                <div className="text-[10px] text-slate-med mt-0.5">
                  Day Streak
                </div>
              </div>
              <div className="bg-elevated rounded-xl p-3 text-center">
                <div className="text-lg font-mono font-bold text-eka-success">
                  Active
                </div>
                <div className="text-[10px] text-slate-med mt-0.5">
                  Status
                </div>
              </div>
              <div className="bg-elevated rounded-xl p-3 text-center">
                <div className="text-lg font-mono font-bold text-muted-white">
                  57%
                </div>
                <div className="text-[10px] text-slate-med mt-0.5">
                  Complete
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Leaderboard Preview ── */
function LeaderboardPreview({ navigate }: { navigate: NavigateFn }) {
  const top3 = [
    {
      rank: 1,
      name: "Aspirant #101 (Top 1%)",
      avg: 8.4,
      streak: 21,
      evals: 47,
      improvement: "+18%",
    },
    {
      rank: 2,
      name: "Aspirant #104 (Top 2%)",
      avg: 8.1,
      streak: 18,
      evals: 39,
      improvement: "+22%",
    },
    {
      rank: 3,
      name: "Aspirant #108 (Top 3%)",
      avg: 7.9,
      streak: 21,
      evals: 52,
      improvement: "+15%",
    },
  ]
  const rows = [
    { rank: 4, name: "Aspirant #112", avg: 7.7, streak: 15, improvement: "+11%" },
    { rank: 5, name: "Aspirant #115", avg: 7.5, streak: 19, improvement: "+9%" },
    { rank: 6, name: "Aspirant #119", avg: 7.4, streak: 14, improvement: "+13%" },
    {
      rank: 18,
      name: "Cohort Benchmark",
      avg: 7.4,
      streak: 12,
      improvement: "+12%",
      isMe: true,
    },
  ]
  const podiumColors = ["#F5A623", "#94A3B8", "#CD7F32"]
  const podiumH = [100, 75, 60]

  return (
    <section className="py-12 lg:py-28 bg-navy">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="text-center mb-8 lg:mb-16">
          <div className="section-label mb-4">THE COMPETITION</div>
          <h2 className="font-display text-3xl lg:text-4xl font-semibold text-white-pure mb-3">
            Top 50 Aspirants.
          </h2>
          <h2 className="font-display text-3xl lg:text-4xl font-light text-gold italic mb-5">
            Consistency meets excellence.
          </h2>
          <p className="text-slate-med text-lg max-w-xl mx-auto">
            Rank is not based on a single high score. Improvement, consistency,
            and volume all count.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Podium */}
          <div>
            <div className="flex items-end justify-center gap-4 mb-8">
              {[1, 0, 2].map((i) => (
                <div key={i} className="flex flex-col items-center">
                  <div
                    className="text-xs font-mono mb-1.5"
                    style={{ color: podiumColors[i] }}
                  >
                    {top3[i].avg}/10
                  </div>
                  <div className="text-[10px] text-slate-med mb-1">
                    {top3[i].improvement}
                  </div>
                  <div
                    className="w-14 h-14 rounded-full border-2 flex items-center justify-center text-lg font-display font-bold text-navy-deep mb-2"
                    style={{
                      background: `linear-gradient(135deg, ${podiumColors[i]}, ${podiumColors[i]}cc)`,
                    }}
                  >
                    {top3[i].name[0]}
                  </div>
                  <div className="text-xs text-muted-white text-center w-20 truncate mb-2">
                    {top3[i].name}
                  </div>
                  <div
                    className="w-20 rounded-t-lg flex flex-col items-center justify-start pt-2"
                    style={{
                      height: podiumH[i],
                      background: `${podiumColors[i]}15`,
                      border: `1px solid ${podiumColors[i]}30`,
                    }}
                  >
                    <span
                      className="text-sm font-bold font-mono"
                      style={{ color: podiumColors[i] }}
                    >
                      #{i === 0 ? 2 : i === 1 ? 1 : 3}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-card rounded-2xl p-4 gold-border">
              <div className="text-[10px] font-mono text-gold mb-3 tracking-widest">
                HOW RANKING WORKS
              </div>
              <div className="space-y-2">
                {[
                  { label: "Improvement", pct: 40 },
                  { label: "Consistency", pct: 30 },
                  { label: "Average Score", pct: 20 },
                  { label: "Evaluation Volume", pct: 10 },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="text-xs text-slate-med w-32 shrink-0">
                      {item.label}
                    </div>
                    <div className="progress-track h-1.5 flex-1">
                      <div
                        className="progress-fill"
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                    <div className="text-xs font-mono text-gold w-7 text-right">
                      {item.pct}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="space-y-3">
            <div className="grid grid-cols-5 px-4 pb-2 border-b border-gold/10 text-[10px] font-mono text-slate-med tracking-wider">
              <span>RANK</span>
              <span className="col-span-2">ASPIRANT</span>
              <span className="text-right">AVG</span>
              <span className="text-right">GAIN</span>
            </div>
            {rows.map((row) => (
              <div
                key={row.rank}
                className={`grid grid-cols-5 items-center px-4 py-3 rounded-xl transition-all cursor-pointer ${(row as any).isMe
                  ? "bg-gold/8 border border-gold/30"
                  : "bg-elevated hover:bg-card border border-transparent hover:border-gold/15"
                  }`}
              >
                <span
                  className={`font-mono text-sm font-bold ${(row as any).isMe ? "text-gold" : "text-slate-med"
                    }`}
                >
                  #{row.rank}
                </span>
                <span
                  className={`col-span-2 text-sm ${(row as any).isMe
                    ? "text-gold font-semibold"
                    : "text-muted-white"
                    }`}
                >
                  {row.name}
                  {(row as any).isMe && (
                    <span className="text-[10px] text-gold/70 ml-2">
                      ↑ 4 this week
                    </span>
                  )}
                </span>
                <span
                  className={`text-sm font-mono text-right ${(row as any).isMe ? "text-gold" : "text-white-pure"
                    }`}
                >
                  {row.avg}
                </span>
                <span className="text-sm font-mono text-eka-success text-right">
                  {row.improvement}
                </span>
              </div>
            ))}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => navigate("leaderboard")}
                className="btn-primary flex-1 text-sm"
              >
                VIEW TOP 50
              </button>
              <button className="btn-secondary text-sm px-4">
                SHARE MY RANK
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Answer DNA Preview ── */
function AnswerDNAPreview({ navigate }: { navigate: NavigateFn }) {
  const params = [
    { label: "Understanding", value: 80, color: "#4ADE80" },
    { label: "Content", value: 76, color: "#F5A623" },
    { label: "Analysis", value: 55, color: "#FB7185" },
    { label: "Structure", value: 74, color: "#F5A623" },
    { label: "Multi-dim", value: 60, color: "#FBBF24" },
    { label: "Examples", value: 52, color: "#FB7185" },
    { label: "Conclusion", value: 78, color: "#4ADE80" },
    { label: "Presentation", value: 82, color: "#4ADE80" },
  ]

  const n = params.length
  const cx = 140
  const cy = 140
  const r = 100
  const points = params.map((p, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2
    const rr = r * (p.value / 100)
    return {
      x: cx + rr * Math.cos(angle),
      y: cy + rr * Math.sin(angle),
      label: p.label,
      value: p.value,
    }
  })
  const polyPoints = points.map((p) => `${p.x},${p.y}`).join(" ")

  const gridLevels = [25, 50, 75, 100]

  return (
    <section className="py-12 lg:py-28 bg-navy-deep">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          <div>
            <div className="section-label mb-4">ANSWER DNA</div>
            <h2 className="font-display text-3xl lg:text-4xl font-semibold text-white-pure mb-5">
              Your writing patterns.
              <br />
              <span className="gold-gradient-text">Made visible.</span>
            </h2>
            <p className="text-slate-med text-lg leading-relaxed mb-8">
              After 3+ evaluations, Ekalavya begins identifying your writing DNA
              — recurring strengths, persistent weaknesses, and hidden habits
              that shape every answer you write.
            </p>

            <div className="space-y-4 mb-8">
              {[
                {
                  label: "YOUR STRENGTHS",
                  items: [
                    "Structure & Logical Flow",
                    "Content Relevance",
                    "Presentation",
                  ],
                  color: "#4ADE80",
                },
                {
                  label: "YOUR WEAKNESSES",
                  items: ["Analysis & Depth", "Examples & Data"],
                  color: "#FB7185",
                },
                {
                  label: "YOUR HABITS",
                  items: [
                    "Generic conclusions",
                    "Descriptive over analytical",
                    "Limited contemporary data",
                  ],
                  color: "#FBBF24",
                },
              ].map((group) => (
                <div
                  key={group.label}
                  className="bg-card rounded-xl p-4 gold-border"
                >
                  <div
                    className="text-[10px] font-mono mb-2 tracking-wider"
                    style={{ color: group.color }}
                  >
                    {group.label}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map((item) => (
                      <span
                        key={item}
                        className="text-xs text-muted-white bg-elevated px-3 py-1 rounded-full border border-gold/10"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => navigate("dna")} className="btn-primary">
              VIEW YOUR ANSWER DNA
            </button>
          </div>

          {/* Radar chart */}
          <div className="flex justify-center">
            <div className="bg-card rounded-2xl p-6 gold-border inline-block">
              <div className="text-xs font-mono text-gold mb-4 tracking-wider">
                ANSWER DNA CHART · 12 EVALUATIONS
              </div>
              <svg width="280" height="280" viewBox="0 0 280 280">
                {/* Grid */}
                {gridLevels.map((level) => {
                  const pts = params.map((_, i) => {
                    const angle = (2 * Math.PI * i) / n - Math.PI / 2
                    const rr = r * (level / 100)
                    return `${cx + rr * Math.cos(angle)},${cy + rr * Math.sin(angle)}`
                  })
                  return (
                    <polygon
                      key={level}
                      points={pts.join(" ")}
                      fill="none"
                      stroke="rgba(245,166,35,0.1)"
                      strokeWidth="1"
                    />
                  )
                })}
                {/* Spokes */}
                {params.map((_, i) => {
                  const angle = (2 * Math.PI * i) / n - Math.PI / 2
                  return (
                    <line
                      key={i}
                      x1={cx}
                      y1={cy}
                      x2={cx + r * Math.cos(angle)}
                      y2={cy + r * Math.sin(angle)}
                      stroke="rgba(245,166,35,0.12)"
                      strokeWidth="1"
                    />
                  )
                })}
                {/* Data polygon */}
                <polygon
                  points={polyPoints}
                  fill="rgba(245,166,35,0.12)"
                  stroke="#F5A623"
                  strokeWidth="2"
                />
                {/* Points */}
                {points.map((pt, i) => (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r="4"
                    fill="#F5A623"
                    stroke="#050914"
                    strokeWidth="2"
                  />
                ))}
                {/* Labels */}
                {params.map((p, i) => {
                  const angle = (2 * Math.PI * i) / n - Math.PI / 2
                  const lx = cx + (r + 18) * Math.cos(angle)
                  const ly = cy + (r + 18) * Math.sin(angle)
                  return (
                    <text
                      key={i}
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#94A3B8"
                      fontSize="8.5"
                      fontFamily="Outfit, sans-serif"
                    >
                      {p.label}
                    </text>
                  )
                })}
              </svg>

              <div className="mt-2 text-center">
                <div className="text-xs text-slate-med">
                  Observed writing pattern across 12 evaluations
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Testimonials ── */
function Testimonials() {
  const testimonials = [
    {
      quote:
        "The annotated answer feature changed how I see my writing. I always knew I was weak in analysis — but seeing exactly which lines were descriptive and which were analytical made the problem real.",
      name: "Ananya R.",
      detail: "UPSC CSE 2024 Aspirant · 14 evaluations",
      score: "5.2 → 7.4",
    },
    {
      quote:
        "Upgrade Bro showed me what my Digital India answer could have looked like. I didn't copy it — I studied the structure. My next GS3 answer scored 2 marks higher in structure alone.",
      name: "Mihir K.",
      detail: "UPSC CSE 2025 Aspirant · 31 evaluations",
      score: "6.1 → 7.9",
    },
    {
      quote:
        "The 21-day challenge forced me into a rhythm I hadn't had before. By day 18 I was writing faster and thinking about argument structure before I picked up the pen.",
      name: "Shreya P.",
      detail: "UPSC CSE 2024 Aspirant · 21-Day completed",
      score: "5.8 → 7.2",
    },
  ]

  return (
    <section className="py-12 lg:py-28 bg-navy">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="text-center mb-8 lg:mb-16">
          <div className="section-label mb-4">FROM ASPIRANTS</div>
          <h2 className="font-display text-3xl lg:text-4xl font-semibold text-white-pure">
            What changed for them.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="bg-card rounded-2xl p-6 gold-border card-hover flex flex-col"
            >
              <div className="text-gold text-3xl font-display leading-none mb-4">
                "
              </div>
              <p className="text-muted-white text-sm leading-relaxed flex-1 mb-6">
                {t.quote}
              </p>
              <div className="border-t border-gold/10 pt-4 flex items-end justify-between">
                <div>
                  <div className="font-semibold text-white-pure text-sm">
                    {t.name}
                  </div>
                  <div className="text-[11px] text-slate-med mt-0.5">
                    {t.detail}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-med font-mono mb-0.5">
                    Score
                  </div>
                  <div className="text-sm font-mono text-eka-success font-bold">
                    {t.score}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Pricing Preview ── */
function PricingPreview({ navigate }: { navigate: NavigateFn }) {
  const plans = [
    {
      name: "FREE",
      price: "₹0",
      period: "forever",
      tagline: "Try the mentor.",
      features: [
        "3 evaluations per month",
        "Basic 8-parameter report",
        "Score ring + parameter bars",
        "Limited feedback",
      ],
      cta: "START FREE",
      highlighted: false,
    },
    {
      name: "PRO",
      price: "₹499",
      period: "per month",
      tagline: "Practice seriously.",
      features: [
        "Unlimited evaluations",
        "Full 8-parameter report",
        "Annotated answer view",
        "Upgrade Bro",
        "Compare Bro",
        "AI Dialogist",
        "21-Day Challenge",
        "Progress analytics",
      ],
      cta: "START PRO",
      highlighted: true,
    },
    {
      name: "PRO+",
      price: "₹899",
      period: "per month",
      tagline: "Build complete answer intelligence.",
      features: [
        "Everything in Pro",
        "Answer DNA",
        "Top 50 Leaderboard",
        "Priority AI processing",
        "Topper comparison library",
        "Personalised weekly plan",
        "Export reports as PDF",
      ],
      cta: "START PRO+",
      highlighted: false,
    },
  ]

  return (
    <section className="py-12 lg:py-28 bg-navy-deep">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="text-center mb-8 lg:mb-16">
          <div className="section-label mb-4">PRICING</div>
          <h2 className="font-display text-3xl lg:text-4xl font-semibold text-white-pure mb-5">
            Start free. Scale with practice.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`rounded-2xl p-6 flex flex-col transition-all duration-300 ${plan.highlighted
                ? "bg-gold/8 border-2 border-gold/50 shadow-lg shadow-gold/10 relative"
                : "bg-card gold-border card-hover"
                }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gold text-navy-deep text-[10px] font-bold tracking-wider px-4 py-1 rounded-full">
                  MOST POPULAR
                </div>
              )}
              <div className="mb-6">
                <div className="text-[10px] font-mono text-gold tracking-widest mb-2">
                  {plan.name}
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="font-display text-3xl font-bold text-white-pure">
                    {plan.price}
                  </span>
                  <span className="text-slate-med text-sm">/{plan.period}</span>
                </div>
                <div className="text-slate-med text-sm">{plan.tagline}</div>
              </div>

              <ul className="space-y-2.5 flex-1 mb-8">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-muted-white"
                  >
                    <span className="text-gold mt-0.5 shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => navigate("pricing")}
                className={
                  plan.highlighted
                    ? "btn-primary w-full"
                    : "btn-secondary w-full"
                }
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <button
            onClick={() => navigate("pricing")}
            className="text-sm text-slate-med hover:text-gold transition-colors"
          >
            View full feature comparison →
          </button>
        </div>
      </div>
    </section>
  )
}

/* ── FAQ ── */
function FAQ() {
  const [open, setOpen] = useState<number | null>(null)
  const faqs = [
    {
      q: "How does AI evaluate handwritten answers?",
      a: "Upload a supported image or PDF. Ekalavya extracts the text and evaluates the answer against the confirmed question. If extraction quality is uncertain, the report can be provisional or require review.",
    },
    {
      q: "What are the eight evaluation parameters?",
      a: "The scored dimensions depend on the selected paper and current rubric. Open a completed report to see its actual dimensions, weights, and rubric version.",
    },
    {
      q: "How long does evaluation take?",
      a: "Processing time varies with file size and service availability. The evaluation screen shows the current stage and lets you return to a completed report.",
    },
    {
      q: "Can I upload multiple pages?",
      a: "A multi-page PDF can be submitted as one file. Check the upload screen for the currently supported image formats and size limit.",
    },
    {
      q: "What is Upgrade Bro?",
      a: "When available in a completed report, it suggests a stronger answer for study. Review its claims and sources before using them in your own writing.",
    },
    {
      q: "How does the Top 50 ranking work?",
      a: "Ranking is optional and anonymous. It uses the average of eligible final evaluations under the current rubric from the last 30 days. At least three evaluations and three qualifying participants are required. It is not an official UPSC rank.",
    },
    {
      q: "How does the 21-Day Challenge work?",
      a: "Enroll to receive one assigned question per India calendar day for 21 days. A day completes only when your final evaluation of that question is linked. Missed days remain visible and there is no automatic reset.",
    },
    {
      q: "How is Answer DNA generated?",
      a: "After 3+ evaluations, Ekalavya identifies patterns in your writing — recurring strengths, persistent weaknesses, and writing habits. The DNA updates with each new evaluation.",
    },
  ]

  return (
    <section id="faq" className="py-12 lg:py-28 bg-navy scroll-mt-24">
      <div className="max-w-3xl mx-auto px-6 lg:px-10">
        <div className="text-center mb-8 lg:mb-16">
          <div className="section-label mb-4">FAQ</div>
          <h2 className="font-display text-3xl lg:text-4xl font-semibold text-white-pure">
            Common questions.
          </h2>
        </div>

        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className={`rounded-xl overflow-hidden transition-all duration-200 ${open === i
                ? "bg-card border border-gold/30"
                : "bg-elevated border border-gold/8 hover:border-gold/20"
                }`}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <span
                  className={`text-sm font-semibold ${open === i ? "text-gold" : "text-muted-white"
                    }`}
                >
                  {faq.q}
                </span>
                <svg
                  className={`w-4 h-4 shrink-0 ml-3 transition-transform duration-300 ${open === i ? "rotate-180 text-gold" : "text-slate-med"
                    }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {open === i && (
                <div className="px-5 pb-5 text-sm text-slate-med leading-relaxed fade-in-up">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Final CTA ── */
function FinalCTA({ navigate }: { navigate: NavigateFn }) {
  return (
    <section className="py-24 lg:py-32 bg-navy-deep relative overflow-hidden">
      <div className="absolute inset-0 constellation-bg pointer-events-none" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(245,166,35,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-3xl mx-auto px-6 lg:px-10 text-center">
        <div className="section-label mb-6">ONE MORE ANSWER</div>
        <h2 className="font-display text-4xl lg:text-6xl font-semibold text-white-pure mb-6 leading-tight">
          Your answer is not bad.
          <br />
          <span className="gold-shimmer">It is unfinished.</span>
        </h2>
        <p className="text-slate-med text-xl leading-relaxed mb-12 max-w-xl mx-auto">
          Ekalavya turns every answer you write into data that teaches you how
          to write the next one better.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate("evaluate")}
            className="btn-primary text-sm px-10 py-4"
          >
            EVALUATE YOUR FIRST ANSWER
          </button>
          <button
            onClick={() => navigate("pricing")}
            className="btn-secondary text-sm px-10 py-4"
          >
            VIEW PRICING
          </button>
        </div>

        <p className="mt-8 text-xs text-slate-med/60 font-mono">
          Free to start. No credit card required.
        </p>
      </div>
    </section>
  )
}

/* ── Main Home component ── */
export default function Home({ navigate, userId }: { navigate: NavigateFn; userId?: string }) {
  const [activeSlide, setActiveSlide] = useState(0)

  return (
    <div className="pt-16 lg:pt-20">
      <HeroCarousel
        activeSlide={activeSlide}
        setActiveSlide={setActiveSlide}
        navigate={navigate}
      />
      <DynamicTypography activeSlide={activeSlide} />
      <EvaluateCTA navigate={navigate} />
      <HowItWorks navigate={navigate} />
      <WhyEkalavya />
      <ChallengeJourney navigate={navigate} userId={userId} />
      <FAQ />
      <FinalCTA navigate={navigate} />
    </div>
  )
}
