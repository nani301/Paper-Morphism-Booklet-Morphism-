import { useState, useEffect } from "react"
import type { Page, NavigateFn } from "../App"
import headerBanner from "../imports/header_banner.png"
import { supabase } from "../lib/supabase"

interface Props {
  page: Page
  navigate: NavigateFn
  user?: any
}

export default function Nav({ page, navigate, user }: Props) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const navLinks: { label: string; page: Page }[] = [
    { label: "Home", page: "home" },
    { label: "Evaluate", page: "evaluate" },
    { label: "Progress", page: "progress" },
    { label: "Answer DNA", page: "dna" },
    { label: "Notes", page: "notes" },
    { label: "Practice", page: "practice" },
    { label: "Leaderboard", page: "leaderboard" },
    { label: "Calibration", page: "calibration" },
  ]

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }
    navigate("home")
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-400 ${
        scrolled
          ? "glassmorphism border-b border-gold/10 shadow-lg shadow-black/20"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-[1600px] mx-auto px-6 lg:px-10 flex items-center justify-between gap-4 h-16 lg:h-20">
        {/* Logo */}
        <button
          onClick={() => navigate("home")}
          className="flex items-center group cursor-pointer"
          aria-label="Ekalavya home"
        >
          <div className="relative flex flex-col items-start">
            <img
              src={headerBanner}
              alt="Ekalavya — Your Invisible Mentor"
              className="h-9 sm:h-10 lg:h-11 w-auto object-contain object-left"
              style={{ maxWidth: 175 }}
            />
            <span className="hidden lg:block text-[8px] font-mono tracking-[0.22em] text-gold/75 font-semibold pl-[112px] -mt-1.5">
              AI
            </span>
          </div>
        </button>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-4 xl:gap-6">
          {navLinks.map((link) => (
            <button
              key={link.page}
              onClick={() => navigate(link.page)}
              className={`relative text-xs lg:text-sm font-medium tracking-wide pb-1 transition-colors duration-200 cursor-pointer ${
                page === link.page
                  ? "text-gold font-semibold"
                  : "text-slate-med hover:text-white-pure"
              }`}
            >
              {link.label}
              {page === link.page && (
                <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-gold rounded-full shadow-[0_0_8px_rgba(245,166,35,0.7)]" />
              )}
            </button>
          ))}
        </nav>

        {/* Right CTAs */}
        <div className="hidden lg:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-med/80 bg-white-pure/5 px-2.5 py-1.5 rounded-lg border border-white-pure/10 max-w-[180px] truncate">
                {user.email || "Candidate"}
              </span>
              <button
                onClick={handleSignOut}
                className="text-xs font-mono text-slate-med hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/20 cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate("login")}
              className="text-sm text-slate-med hover:text-white-pure transition-colors px-3 py-2 rounded-lg hover:bg-white-pure/5 cursor-pointer font-medium"
            >
              Login
            </button>
          )}

          <button
            onClick={() => navigate("evaluate")}
            className="btn-primary text-xs px-5 py-2.5 rounded-full shadow-[0_0_15px_rgba(245,166,35,0.4)] cursor-pointer"
          >
            EVALUATE ANSWER
          </button>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="lg:hidden p-2 text-slate-med hover:text-gold transition-colors cursor-pointer"
          aria-label="Toggle menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            {menuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu dropdown */}
      {menuOpen && (
        <div className="lg:hidden glassmorphism border-b border-gold/10 px-6 py-4 flex flex-col gap-3">
          {navLinks.map((link) => (
            <button
              key={link.page}
              onClick={() => {
                navigate(link.page)
                setMenuOpen(false)
              }}
              className={`text-left text-sm py-1.5 ${
                page === link.page ? "text-gold font-semibold" : "text-slate-med"
              }`}
            >
              {link.label}
            </button>
          ))}
          <div className="pt-3 border-t border-gold/10 flex flex-col gap-2">
            {user ? (
              <>
                <span className="text-xs font-mono text-slate-med truncate">
                  {user.email}
                </span>
                <button
                  onClick={() => {
                    handleSignOut()
                    setMenuOpen(false)
                  }}
                  className="text-left text-xs font-mono text-red-400 py-1"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  navigate("login")
                  setMenuOpen(false)
                }}
                className="text-left text-sm text-slate-med hover:text-white-pure py-1"
              >
                Login
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
