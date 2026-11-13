import type { NavigateFn } from "../App"
import headerBanner from "../imports/header_banner.png"

interface Props {
  navigate: NavigateFn
}

export default function Footer({ navigate }: Props) {
  return (
    <footer className="bg-navy border-t border-gold/10 pt-10 lg:pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10 mb-10 lg:mb-14">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <div className="mb-5">
              <img
                src={headerBanner}
                alt="Ekalavya — Your Invisible Mentor"
                className="h-10 w-auto object-contain object-left"
                style={{ maxWidth: 200 }}
              />
            </div>
            <p className="text-slate-med text-sm leading-relaxed mb-6 max-w-xs">
              AI-powered UPSC answer evaluation and improvement system. Every
              answer you write teaches you how to write the next one better.
            </p>
            <p className="text-[10px] text-slate-med/60 font-mono tracking-wider uppercase">
              AI Powered Guidance to Ace the Preparation
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-mono tracking-widest text-gold uppercase mb-5">
              Product
            </h4>
            <ul className="space-y-3">
              {[
                { label: "Evaluate Answer", page: "evaluate" as const },
                { label: "Practice Questions", page: "practice" as const },
                { label: "Progress Dashboard", page: "progress" as const },
                { label: "Answer DNA", page: "dna" as const },
                { label: "21-Day Challenge", page: "challenge" as const },
                { label: "Top 50 Leaderboard", page: "leaderboard" as const },
              ].map((item) => (
                <li key={item.page}>
                  <button
                    onClick={() => navigate(item.page)}
                    className="text-sm text-slate-med hover:text-gold transition-colors"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-xs font-mono tracking-widest text-gold uppercase mb-5">
              Resources
            </h4>
            <ul className="space-y-3">
              {[
                "UPSC Answer Writing",
                "Directive Words Guide",
                "Mains Strategy",
                "Topper Insights",
                "Current Affairs",
                "Blog",
              ].map((item) => (
                <li key={item}>
                  <span className="text-sm text-slate-med/60" title="Editorial page pending verification">{item} · Coming soon</span>
                </li>
              ))}
              <li><button onClick={() => { navigate("home"); requestAnimationFrame(() => document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" })) }} className="text-sm text-slate-med hover:text-gold">FAQs</button></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-mono tracking-widest text-gold uppercase mb-5">
              Company
            </h4>
            <ul className="space-y-3">
              {[
                "About Us",
                "For Institutes",
                "Terms of Use",
                "Privacy Policy",
                "Contact",
              ].map((item) => (
                <li key={item}>
                  <span className="text-sm text-slate-med/60" title="Page pending verified content">{item} · Coming soon</span>
                </li>
              ))}
              <li><button onClick={() => navigate("pricing")} className="text-sm text-slate-med hover:text-gold">Pricing</button></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gold/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-med/60 font-mono">
            © {new Date().getFullYear()} Ekalavya. All rights reserved.
          </p>
          <p className="text-xs text-slate-med/50 font-mono text-center sm:text-right max-w-sm">
            Evaluations are designed to improve answer-writing. We make no
            guarantees of selection or rank.
          </p>
        </div>
      </div>
    </footer>
  )
}
