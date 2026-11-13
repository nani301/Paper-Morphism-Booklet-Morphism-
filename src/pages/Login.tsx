import { useState, useEffect, useRef } from "react"
import type { User } from "@supabase/supabase-js"
import { authRedirect, emailWaitSeconds, authErrorMessage } from "../lib/auth-flow"
import type { NavigateFn } from "../App"
import headerBanner from "../imports/header_banner.png"
import SanctumMandala from "../components/SanctumMandala"
import { supabase, isSupabaseConfigured } from "../lib/supabase"

interface Props {
  navigate: NavigateFn
  initialTab?: "in" | "up" | "reset"
  requireAccount?: boolean
  recovery?: boolean
  onAuthenticated: (user: User) => void
}

/* ── Ember Particles ── */
const EMBERS = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  x: 8 + ((i * 4.1) % 84),
  size: 1.5 + (i % 3) * 0.8,
  delay: (i * 0.41) % 6,
  dur: 5 + (i % 4),
  drift: -12 + (i % 5) * 6,
}))

function EmberField() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {EMBERS.map((e) => (
        <div
          key={e.id}
          className="absolute rounded-full"
          style={
            {
              left: `${e.x}%`,
              bottom: "-4px",
              width: e.size,
              height: e.size,
              background: `radial-gradient(circle, #FFD166 0%, #F5A623 60%, transparent 100%)`,
              animation: `emberRise ${e.dur}s ${e.delay}s ease-in infinite`,
              "--drift": `${e.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}

/* ── Orbital Rings SVG ── */
function OrbitalRings() {
  const TICKS = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * 2 * Math.PI
    const isMajor = i % 6 === 0
    const r1 = isMajor ? 228 : 233
    return {
      x1: r1 * Math.cos(a),
      y1: r1 * Math.sin(a),
      x2: 238 * Math.cos(a),
      y2: 238 * Math.sin(a),
      major: isMajor,
    }
  })
  const DOTS = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * 2 * Math.PI
    return { cx: 130 * Math.cos(a), cy: 130 * Math.sin(a) }
  })
  return (
    <svg
      viewBox="-260 -260 520 520"
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{
        maxWidth: 560,
        maxHeight: 560,
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
      }}
    >
      <defs>
        <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F5A623" stopOpacity="0.18" />
          <stop offset="60%" stopColor="#F5A623" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#F5A623" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="midGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#050914" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#050914" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Outer ring + ticks */}
      <g
        style={{
          animation: "orbSpin 80s linear infinite",
          transformOrigin: "0 0",
        }}
      >
        <circle
          r="238"
          fill="none"
          stroke="#F5A623"
          strokeWidth="0.6"
          strokeOpacity="0.18"
        />
        {TICKS.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke="#F5A623"
            strokeWidth={t.major ? "1.2" : "0.6"}
            strokeOpacity={t.major ? "0.35" : "0.15"}
          />
        ))}
      </g>

      {/* Dashed ring */}
      <circle
        r="188"
        fill="none"
        stroke="#F5A623"
        strokeWidth="0.75"
        strokeOpacity="0.14"
        strokeDasharray="4 8"
        style={{
          animation: "orbSpinReverse 55s linear infinite",
          transformOrigin: "0 0",
        }}
      />

      {/* Orbiting dot ring */}
      <g
        style={{
          animation: "orbSpin 40s linear infinite",
          transformOrigin: "0 0",
        }}
      >
        <circle
          r="130"
          fill="none"
          stroke="#F5A623"
          strokeWidth="0.5"
          strokeOpacity="0.1"
        />
        {DOTS.map((d, i) => (
          <circle
            key={i}
            cx={d.cx}
            cy={d.cy}
            r={i % 2 === 0 ? "2" : "1.2"}
            fill="#F5A623"
            fillOpacity={i % 2 === 0 ? "0.4" : "0.2"}
          />
        ))}
      </g>

      {/* Thin inner ring */}
      <circle
        r="75"
        fill="none"
        stroke="#F5A623"
        strokeWidth="0.5"
        strokeOpacity="0.12"
      />

      {/* Center core glow */}
      <circle r="60" fill="url(#coreGlow)" />
      <circle
        r="2"
        fill="#FFD166"
        fillOpacity="0.7"
        style={{ filter: "drop-shadow(0 0 4px #F5A623)" }}
      />
    </svg>
  )
}

/* ── Geometric Constellation background ── */
function ConstellationBg() {
  const NODES = [
    { x: 12, y: 18 },
    { x: 28, y: 8 },
    { x: 45, y: 22 },
    { x: 72, y: 14 },
    { x: 88, y: 26 },
    { x: 18, y: 55 },
    { x: 38, y: 68 },
    { x: 62, y: 58 },
    { x: 82, y: 72 },
    { x: 25, y: 88 },
    { x: 70, y: 86 },
  ]
  const EDGES = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [0, 5],
    [5, 6],
    [6, 7],
    [7, 8],
    [2, 7],
    [5, 9],
    [7, 10],
    [8, 10],
  ]
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F5A623" stopOpacity="0.06" />
          <stop offset="50%" stopColor="#F5A623" stopOpacity="0.02" />
          <stop offset="100%" stopColor="#F5A623" stopOpacity="0.06" />
        </linearGradient>
      </defs>
      {EDGES.map(([a, b], i) => (
        <line
          key={i}
          x1={`${NODES[a].x}%`}
          y1={`${NODES[a].y}%`}
          x2={`${NODES[b].x}%`}
          y2={`${NODES[b].y}%`}
          stroke="url(#edgeGrad)"
          strokeWidth="0.75"
        />
      ))}
      {NODES.map(({ x, y }, i) => (
        <circle
          key={i}
          cx={`${x}%`}
          cy={`${y}%`}
          r="1.4"
          fill="#F5A623"
          fillOpacity="0.18"
        />
      ))}
    </svg>
  )
}

/* ── Main component ── */
export default function Login({ navigate, initialTab = "in", requireAccount, recovery, onAuthenticated }: Props) {
  const [tab, setTab] = useState<"in" | "up" | "forgot" | "reset">(initialTab)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const googleEnabled = import.meta.env.VITE_GOOGLE_AUTH_ENABLED === "true"
  const [name, setName] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authSuccess, setAuthSuccess] = useState<string | null>(null)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const errorBanner = useRef<HTMLDivElement>(null)
  useEffect(() => { if (authError) errorBanner.current?.scrollIntoView({ behavior: "smooth", block: "center" }) }, [authError])
  const requestInFlight = useRef(false)
  const cooldownKey = "ekalavya-auth-email-retry-after"
  const [emailWait, setEmailWait] = useState(() => {
    try { return emailWaitSeconds(localStorage.getItem(cooldownKey)) } catch { return 0 }
  })
  const emailAction = tab === "up" || tab === "forgot"
  const startEmailCooldown = () => {
    try { localStorage.setItem(cooldownKey, String(Date.now() + 60_000)) } catch { /* Storage can be unavailable in private browsing. */ }
    setEmailWait(60)
  }
  useEffect(() => {
    const timer = setInterval(() => {
      try { setEmailWait(emailWaitSeconds(localStorage.getItem(cooldownKey))) }
      catch { setEmailWait((seconds) => Math.max(0, seconds - 1)) }
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 60)
    const error = new URLSearchParams(window.location.hash.slice(1)).get("error_description")
    if (error) setAuthError("This email link is invalid or expired. Request a new confirmation or password reset link.")
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => { if (recovery) setTab("reset") }, [recovery])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (requestInFlight.current) return
    if (emailAction && emailWait > 0) {
      setAuthError(`Please wait ${emailWait} seconds before another email request. You can still Sign In to an existing confirmed account.`)
      return
    }
    setAuthError(null)
    setAuthSuccess(null)
    setLoading(true)

    if (!supabase || !isSupabaseConfigured()) {
      setAuthError("Sign-in is unavailable. Please try again later.")
      setLoading(false)
      return
    }
    if ((tab === "up" || tab === "reset") && password.length < 8) {
      setAuthError("Use a password with at least 8 characters.")
      setLoading(false)
      return
    }
    if (tab === "reset" && password !== confirmPassword) {
      setAuthError("The passwords do not match.")
      setLoading(false)
      return
    }

    requestInFlight.current = true
    if (emailAction) startEmailCooldown()
    try {
      if (tab === "in") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) {
          setAuthError(authErrorMessage(error))
          setLoading(false)
          return
        }
        setLoading(false)
        onAuthenticated(data.user)
      } else if (tab === "up") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: authRedirect(window.location.origin),
          },
        })
        if (error) {
          setAuthError(authErrorMessage(error))
          setLoading(false)
          return
        }
        setPassword("")
        setShowPass(false)
        if (data.session && data.user) onAuthenticated(data.user)
        else setAuthSuccess("Check your email and click Confirm email once. You will return here signed in, ready to evaluate.")
        setLoading(false)
      } else if (tab === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: authRedirect(window.location.origin, true),
        })
        if (error) {
          setAuthError(authErrorMessage(error))
          setLoading(false)
          return
        }
        setAuthSuccess("If an account exists for this email, a reset link is on its way. Open it to choose a new password on Ekalavya.")
        setLoading(false)
      } else if (tab === "reset") {
        const { data: sessionData } = await supabase.auth.getSession()
        if (!sessionData.session) throw new Error("Your reset link has expired. Request a new password reset email.")
        const { data, error } = await supabase.auth.updateUser({ password })
        if (error) {
          setAuthError(authErrorMessage(error))
          setLoading(false)
          return
        }
        setPassword("")
        setConfirmPassword("")
        setLoading(false)
        if (data.user) onAuthenticated(data.user)
      }
    } catch (err: any) {
      setAuthError(authErrorMessage(err || {}))
      setLoading(false)
    } finally { requestInFlight.current = false }
  }

  const handleGoogleSignIn = async () => {
    if (!supabase || !isSupabaseConfigured()) {
      setAuthError("Sign-in is unavailable. Please try again later.")
      return
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: authRedirect(window.location.origin),
        },
      })
      if (error) setAuthError(authErrorMessage(error))
    } catch (err: any) {
      setAuthError(err?.message || "Google sign-in failed.")
    }
  }

  const resendConfirmation = async () => {
    if (!supabase || !email.trim() || requestInFlight.current || emailWait > 0) return
    requestInFlight.current = true
    startEmailCooldown()
    setLoading(true)
    setAuthError(null)
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: authRedirect(window.location.origin) } })
      if (error) throw error
      setAuthSuccess("Confirmation requested. Check your inbox and spam folder, then click the latest link once.")
    } catch (error: any) {
      setAuthError(authErrorMessage(error || {}))
    } finally { requestInFlight.current = false; setLoading(false) }
  }

  return (
    <div className="sanctum-page min-h-screen flex flex-col bg-navy-deep text-white-pure overflow-hidden relative">
      <style>{`
        @keyframes emberRise {
          0%   { transform: translateY(0) translateX(0); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 0.6; }
          100% { transform: translateY(-100vh) translateX(var(--drift)); opacity: 0; }
        }
        @keyframes orbSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes orbSpinReverse {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
        @keyframes sanctumFadeIn {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes sanctumLineGrow {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes sanctumSpinner {
          to { transform: rotate(360deg); }
        }
        @keyframes sanctumPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,166,35,0.15); }
          50%      { box-shadow: 0 0 0 12px rgba(245,166,35,0); }
        }
        .sanctum-input {
          width: 100%;
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(245,166,35,0.2);
          border-radius: 0;
          padding: 13px 0 13px 0;
          color: #F8FAFC;
          font-family: var(--font-body, Outfit, sans-serif);
          font-size: 15px;
          outline: none;
          transition: border-color 0.25s;
          caret-color: #F5A623;
        }
        @property --sanctum-light-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
        @keyframes sanctumBorderTravel { to { --sanctum-light-angle: 360deg; } }
        .sanctum-halo { width: clamp(570px, 65vw, 790px); aspect-ratio: 1; }
        .sanctum-mandala { animation: orbSpin 150s linear infinite; transform-origin: 0px 0px; filter: drop-shadow(0 0 2px rgba(245,166,35,.22)); }
        .sanctum-card::before {
          content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1.5px;
          background: conic-gradient(from var(--sanctum-light-angle), transparent 0deg, transparent 240deg, rgba(222,148,35,.2) 285deg, #F9C663 320deg, #FFF0BD 333deg, rgba(250,188,73,.5) 343deg, transparent 360deg);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
          animation: sanctumBorderTravel 9s linear infinite;
          pointer-events: none; z-index: 2;
        }
        @media (max-width: 639px) {
          .sanctum-page { min-height: 100svh; }
          .sanctum-page > header { padding: 18px 24px 8px; }
          .sanctum-page > header img { height: 34px; }
          .sanctum-page > main { padding: 28px 24px 24px; }
          .sanctum-card { padding: 22px; border-radius: 22px; }
          .sanctum-halo { width: calc(100% + 150px); opacity: .7; }
          .sanctum-tabs { margin-bottom: 20px; gap: 12px; }
          .sanctum-tabs > button { flex: 1; min-height: 44px; margin-right: 0 !important; text-align: center; }
          .sanctum-input { font-size: 16px; min-height: 50px; padding: 12px 14px; border: 1px solid rgba(245,166,35,.17); border-radius: 11px; background: rgba(255,255,255,.025); }
          .sanctum-input::placeholder { font-size: 14px; color: rgba(148,163,184,.55); }
          .sanctum-input:focus { border-color: rgba(245,166,35,.75); box-shadow: 0 0 0 3px rgba(245,166,35,.08); }
          .sanctum-input.pr-9 { padding-right: 48px; }
          .sanctum-card label { color: rgba(245,190,85,.85); letter-spacing: .13em; margin-bottom: 7px; }
          .sanctum-card button[aria-label="Show password"], .sanctum-card button[aria-label="Hide password"] { min-width: 44px; min-height: 44px; display: grid; place-items: center; }
          .sanctum-page > footer { padding: 18px 20px calc(18px + env(safe-area-inset-bottom)); background: rgba(3,9,20,.7); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sanctum-mandala, .sanctum-card::before { animation: none; }
        }
        .sanctum-input::placeholder {
          color: rgba(148,163,184,0.3);
          font-size: 14px;
        }
        .sanctum-input:focus {
          border-bottom-color: #F5A623;
        }
      `}</style>

      {/* Layer 0: Dark gradient base */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 50% 45%, #0B1630 0%, #050914 70%)",
        }}
      />

      {/* Layer 1: Subtle amber haze */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 50% 50%, rgba(245,166,35,0.065) 0%, transparent 70%)",
        }}
      />

      {/* Layer 2: Geometric nodes & lines */}
      <ConstellationBg />

      {/* Layer 3: Floating embers */}
      <EmberField />


      {/* ── Top Bar ── */}
      <header className="relative z-20 flex items-center justify-between px-5 sm:px-8 py-4">
        <button
          onClick={() => navigate("home")}
          className="flex items-center gap-3 group"
          aria-label="Back to home"
        >
          <img
            src={headerBanner}
            alt="Ekalavya Logo"
            className="h-10 w-auto object-contain"
          />
        </button>

        <button
          onClick={() => navigate("home")}
          className="flex items-center gap-2 text-xs font-mono text-slate-med/60 hover:text-gold transition-colors tracking-widest uppercase py-2 px-3 rounded-lg hover:bg-gold/5"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Exit
        </button>
      </header>

      {/* ── Center Sanctum Card ── */}
      <main className="relative z-20 flex-1 flex items-center justify-center px-4 py-5">
        <div
          className="w-full max-w-[420px] relative transition-all duration-700"
          style={{
            animation: mounted
              ? "sanctumFadeIn 0.65s cubic-bezier(0.16,1,0.3,1) forwards"
              : "none",
            opacity: mounted ? 1 : 0,
          }}
        >
          <SanctumMandala />
          {/* Outer glow ring behind card */}
          <div
            className="absolute -inset-1 rounded-3xl pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 50% 30%, rgba(245,166,35,0.12) 0%, transparent 70%)",
              filter: "blur(18px)",
            }}
          />

          {/* Card body */}
          <div
            className="sanctum-card relative rounded-2xl p-6 sm:p-7 overflow-hidden"
            style={{
              background: "rgba(7, 15, 32, 0.98)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(245,166,35,0.18)",
              boxShadow:
                "0 0 0 1px rgba(255,255,255,0.03), 0 24px 64px -12px rgba(0,0,0,0.8), 0 0 48px -8px rgba(245,166,35,0.08)",
            }}
          >
            {/* Top gold accent line */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, #F5A623 35%, #FFD166 50%, #F5A623 65%, transparent 100%)",
              }}
            />

            {/* Error or Success Banners */}

            {authError && (
              <div ref={errorBanner} role="alert" className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5">
                <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{authError}</span>
              </div>
            )}

            {authSuccess && (
              <div role="status" className="mb-6 p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-300 text-xs flex items-start gap-2.5">
                <svg className="w-4 h-4 text-green-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{authSuccess}</span>
              </div>
            )}

            {/* Test Mode Login Button */}
            <div className="mb-6">
              <button
                type="button"
                onClick={() => {
                  const testUser = {
                    id: "test-user-mode-001",
                    email: "test.aspirant@ekalavya.test",
                    user_metadata: { full_name: "Test Aspirant (Examiner Mode)" },
                    app_metadata: { provider: "email" },
                    aud: "authenticated",
                    created_at: new Date().toISOString(),
                  } as any
                  onAuthenticated(testUser)
                }}
                className="w-full py-3 px-4 rounded-xl font-medium text-xs tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 hover:border-amber-400 shadow-lg shadow-amber-500/10"
              >
                <span className="text-amber-400">⚡</span>
                <span>Instant Test Mode Login (Skip Auth)</span>
              </button>
            </div>

            {/* Tab switchers */}
            <div className="sanctum-tabs flex items-center mb-5 border-b border-gold/10 pb-0">
              {(
                [
                  { key: "in", label: "Sign In" },
                  { key: "up", label: "Sign Up" },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setTab(key)
                    setAuthError(null)
                    setAuthSuccess(null)
                  }}
                  className="relative text-xs font-mono tracking-widest uppercase px-1 py-2 transition-colors duration-200"
                  style={{
                    color: tab === key ? "#F5A623" : "rgba(148,163,184,0.5)",
                    marginRight: key === "in" ? 20 : 0,
                  }}
                >
                  {label}
                  {tab === key && (
                    <span className="absolute bottom-0 left-0 right-0 h-px bg-gold rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Heading */}
            <div className="mb-5">
              <h1
                className="font-display font-semibold text-white-pure leading-tight mb-1.5"
                style={{ fontSize: "1.95rem" }}
              >
                {tab === "in" && (
                  <>
                    Welcome
                    <br />
                    <span className="text-gold italic">back.</span>
                  </>
                )}
                {tab === "up" && (
                  <>
                    Begin your
                    <br />
                    <span className="text-gold italic">journey.</span>
                  </>
                )}
                {tab === "forgot" && (
                  <>
                    Recover
                    <br />
                    <span className="text-gold italic">access.</span>
                  </>
                )}
                {tab === "reset" && (
                  <>
                    Set new
                    <br />
                    <span className="text-gold italic">password.</span>
                  </>
                )}
              </h1>
              <p className="text-slate-med text-[13px] leading-relaxed">
                {tab === "in" && "Your answers are waiting to be evaluated."}
                {tab === "up" && "Structured UPSC answer evaluation powered by AI."}
                {tab === "forgot" && "Enter your email to receive a password recovery link."}
                {tab === "reset" && "Choose a secure password of at least 8 characters."}
              </p>
            </div>

            {requireAccount && tab === "up" && <p className="mb-4 text-xs text-slate-med">Create your account to save evaluations and follow your progress.</p>}
            {tab !== "forgot" && tab !== "reset" && email.trim() && (
              <button type="button" disabled={loading || emailWait > 0} onClick={resendConfirmation} className="mb-5 text-xs text-gold underline disabled:opacity-50">{emailWait > 0 ? `Resend available in ${emailWait}s` : "Resend confirmation email"}</button>
            )}
            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {tab === "up" && (
                <div className="relative">
                  <label htmlFor="auth-name" className="block text-[10px] font-mono text-gold/60 tracking-[0.18em] uppercase mb-1">
                    Full name
                  </label>
                  <input
                    className="sanctum-input"
                    id="auth-name"
                    type="text"
                    autoComplete="name"
                    placeholder="Your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onFocus={() => setFocusedField("name")}
                    onBlur={() => setFocusedField(null)}
                    required
                  />
                </div>
              )}

              {tab !== "reset" && (
                <div className="relative">
                  <label htmlFor="auth-email" className="block text-[10px] font-mono text-gold/60 tracking-[0.18em] uppercase mb-1">
                    Email address
                  </label>
                  <input
                    className="sanctum-input"
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    placeholder="aspirant@upsc.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    required
                  />
                </div>
              )}

              {tab !== "forgot" && (
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="auth-password" className="block text-[10px] font-mono text-gold/60 tracking-[0.18em] uppercase">
                      {tab === "reset" ? "New Password" : "Password"}
                    </label>
                    {tab === "in" && (
                      <button
                        type="button"
                        onClick={() => {
                          setTab("forgot")
                          setAuthError(null)
                          setAuthSuccess(null)
                        }}
                        className="text-[10px] font-mono text-slate-med/50 hover:text-gold/70 transition-colors tracking-wider uppercase"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      className="sanctum-input pr-9"
                      id="auth-password"
                      type={showPass ? "text" : "password"}
                      autoComplete={tab === "in" ? "current-password" : "new-password"}
                      minLength={tab === "in" ? undefined : 8}
                      placeholder={
                        tab === "up" || tab === "reset" ? "Min. 8 characters" : "• • • • • • • •"
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField(null)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      aria-label={showPass ? "Hide password" : "Show password"}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-med/40 hover:text-gold/60 transition-colors p-1"
                    >
                      {showPass ? (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.8}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.8}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {tab === "reset" && <div>
                <label htmlFor="confirm-password" className="block text-xs text-slate-med">Confirm new password</label>
                <input id="confirm-password" className="sanctum-input" type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>}
              {/* Submit */}
              <button
                type="submit"
                disabled={loading || (emailAction && emailWait > 0)}
                className="w-full rounded-xl py-3.5 text-navy-deep text-sm font-bold tracking-widest uppercase transition-all duration-200 active:scale-[0.98] mt-2 relative overflow-hidden"
                style={{
                  background:
                    "linear-gradient(135deg, #F5A623 0%, #FFD166 55%, #F5A623 100%)",
                  backgroundSize: "200%",
                  boxShadow: loading
                    ? "none"
                    : "0 0 32px rgba(245,166,35,0.4), 0 4px 16px rgba(245,166,35,0.25)",
                  opacity: loading ? 0.7 : 1,
                  animation: !loading
                    ? "sanctumPulse 3s ease-in-out infinite"
                    : "none",
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2.5">
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      style={{
                        animation: "sanctumSpinner 0.8s linear infinite",
                      }}
                    >
                      <path d="M12 3a9 9 0 019 9" strokeLinecap="round" />
                    </svg>
                    Processing…
                  </span>
                ) : emailAction && emailWait > 0 ? (
                  `Please wait ${emailWait}s`
                ) : tab === "in" ? (
                  "Sign In"
                ) : tab === "up" ? (
                  "Create Account"
                ) : tab === "forgot" ? (
                  "Send Recovery Link"
                ) : (
                  "Update Password"
                )}
              </button>

              {tab === "forgot" && (
                <button
                  type="button"
                  onClick={() => {
                    setTab("in")
                    setAuthError(null)
                    setAuthSuccess(null)
                  }}
                  className="w-full text-center text-xs font-mono text-gold/70 hover:text-gold transition-colors pt-1"
                >
                  ← Back to Sign In
                </button>
              )}
            </form>

            {/* Divider */}
            {tab !== "forgot" && tab !== "reset" && (
              <>
                {googleEnabled && <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px bg-gold/8" />
                  <span className="text-[10px] font-mono text-slate-med/30 tracking-[0.2em]">
                    OR
                  </span>
                  <div className="flex-1 h-px bg-gold/8" />
                </div>}

                {/* Google SSO is shown only after the provider is configured. */}
                {googleEnabled && <button
                  onClick={handleGoogleSignIn}
                  type="button"
                  className="w-full flex items-center justify-center gap-3 rounded-xl py-3 text-[13px] font-medium text-slate-med hover:text-white-pure transition-all duration-200 hover:border-gold/20 active:scale-[0.98]"
                  style={{
                    border: "1px solid rgba(255,255,255,0.07)",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </button>}

                {/* Switch tab */}
                <p className="text-center mt-7 text-[13px] text-slate-med/50">
                  {tab === "in" ? "No account? " : "Have an account? "}
                  <button
                    onClick={() => {
                      setTab(tab === "in" ? "up" : "in")
                      setAuthError(null)
                      setAuthSuccess(null)
                    }}
                    className="text-gold/80 font-semibold hover:text-gold transition-colors"
                  >
                    {tab === "in" ? "Sign up free" : "Sign in"}
                  </button>
                </p>
              </>
            )}

            {/* Bottom thin line */}
            <div
              className="absolute bottom-0 left-5 sm:left-9 right-5 sm:right-9 h-px"
              style={{
                background:
                  "linear-gradient(to right, transparent, rgba(245,166,35,0.08), transparent)",
              }}
            />
          </div>
        </div>
      </main>

      {/* ── Bottom stats strip ── */}
      <footer className="relative z-20 border-t border-gold/6 px-8 py-5">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-y-4">
          {[
            { value: "Show up", label: "One answer at a time" },
            { value: "Find clarity", label: "Know your next step" },
            { value: "Build depth", label: "Turn feedback into practice" },
            { value: "Keep growing", label: "Make today count" },
          ].map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-1 px-3 sm:border-r sm:border-gold/15 sm:last:border-r-0 text-center">
              <span className="font-mono text-gold text-sm font-bold">
                {s.value}
              </span>
              <span className="text-[10px] font-mono text-slate-med/40 tracking-widest uppercase">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </footer>
    </div>
  )
}
