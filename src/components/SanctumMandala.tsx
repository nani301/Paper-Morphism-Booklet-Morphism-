/** Decorative geometry shares the card's center and never intercepts form input. */
export default function SanctumMandala() {
  return <div aria-hidden="true" className="sanctum-halo pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
    <svg viewBox="-380 -380 760 760" fill="none" className="w-full h-full overflow-visible" stroke="#D99A38" strokeWidth="0.75">
      <defs><radialGradient id="sanctum-halo-glow"><stop offset="45%" stopColor="#EBA42C" stopOpacity="0" /><stop offset="73%" stopColor="#EBA42C" stopOpacity="0.065" /><stop offset="100%" stopColor="#EBA42C" stopOpacity="0" /></radialGradient></defs>
      <circle r="376" fill="url(#sanctum-halo-glow)" stroke="none" />
      <g className="sanctum-mandala">
        <circle r="344" opacity="0.3" /><circle r="330" strokeDasharray="1.2 9" opacity="0.75" />
        <circle r="313" strokeWidth="1.1" opacity="0.9" /><circle r="271" opacity="0.45" /><circle r="257" strokeWidth="1.1" opacity="0.65" />
        {Array.from({ length: 40 }, (_, i) => <g key={i} transform={`rotate(${i * 9})`}>
          <path d="M0 -196 C-9 -217 -25 -232 -20 -251 C-17 -265 -4 -273 0 -289 C4 -273 17 -265 20 -251 C25 -232 9 -217 0 -196Z" opacity="0.85" />
          <path d="M0 -205 C-3 -229 -11 -243 0 -271 C11 -243 3 -229 0 -205Z M0 -220 L0 -280 M-13 -250 Q0 -245 13 -250" opacity="0.6" />
          <path d="M0 -284 Q-6 -294 0 -302 Q6 -294 0 -284" opacity="0.7" />
          <path d="M0 -307 L0 -317" opacity="0.45" /><circle cy="-330" r={i % 5 === 0 ? 1.8 : 0.9} fill="#F7BD58" stroke="none" />
        </g>)}
        {Array.from({ length: 8 }, (_, i) => <g key={i} transform={`rotate(${i * 45})`} opacity="0.8">
          <path d="M0 -300 L0 -365 M-12 -334 Q0 -351 12 -334 Q0 -317 -12 -334 M-16 -342 L16 -342" />
          <circle cy="-313" r="6" /><circle cy="-313" r="3" /><circle cy="-351" r="2" fill="#FFD47D" />
          <path d="M0 -356 L-3 -362 L0 -369 L3 -362Z" fill="#D99A38" />
        </g>)}
      </g>
    </svg>
  </div>
}
