"use client";

/* Life OS focus lamp — signature illustration in the dedicated palette:
   deep slate #202833 · dark #151B23 · warm #FF633C · glow #FFB16A.
   Two deliberate states: dormant (dim, monochromatic) and lit (controlled
   warm glow + light cone). Motion is restrained: a slow 4.5s breathe. */

export function LampArt({ active, reduceMotion = false }: { active: boolean; reduceMotion?: boolean }) {
  return (
    <svg
      viewBox="0 0 320 340"
      role="img"
      aria-label={active ? "Focus lamp — on" : "Focus lamp — off"}
      className="h-auto w-full max-w-[300px]"
      style={{ overflow: "visible" }}
    >
      <defs>
        <radialGradient id="lamp-glow" cx="50%" cy="46%" r="55%">
          <stop offset="0%" stopColor="#FF633C" stopOpacity="0.5" />
          <stop offset="38%" stopColor="#FF8A5C" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#FF633C" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lamp-cone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFB16A" stopOpacity="0.34" />
          <stop offset="70%" stopColor="#FFB16A" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#FFB16A" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="lamp-pool" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFB16A" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#FFB16A" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="bulb-core" cx="42%" cy="38%" r="72%">
          <stop offset="0%" stopColor="#FFF3E4" />
          <stop offset="55%" stopColor="#FFB16A" />
          <stop offset="100%" stopColor="#FF633C" />
        </radialGradient>
        <filter id="soft-blur" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      {/* ambient glow — only when lit */}
      <g
        style={{
          opacity: active ? 1 : 0,
          transition: "opacity 900ms ease",
          animation: active && !reduceMotion ? "glow-pulse 4.5s ease-in-out infinite" : undefined,
        }}
      >
        <ellipse cx="160" cy="170" rx="150" ry="135" fill="url(#lamp-glow)" />
        <path d="M131 152 L189 152 L236 302 L84 302 Z" fill="url(#lamp-cone)" filter="url(#soft-blur)" />
        <ellipse cx="160" cy="300" rx="86" ry="13" fill="url(#lamp-pool)" />
      </g>

      {/* floor shadow */}
      <ellipse cx="160" cy="312" rx="64" ry="7" fill="#0E1218" opacity="0.9" />

      {/* base */}
      <rect x="118" y="296" width="84" height="15" rx="7.5" fill="#202833" stroke="#2D3746" strokeWidth="1" />
      <rect x="132" y="300.5" width="56" height="3" rx="1.5" fill="#151B23" opacity="0.8" />

      {/* stem */}
      <rect x="155.5" y="158" width="9" height="140" rx="4.5" fill="#202833" stroke="#2D3746" strokeWidth="0.75" />
      {/* neck hinge */}
      <circle cx="160" cy="152" r="9" fill="#202833" stroke="#2D3746" strokeWidth="0.75" />

      {/* dome shade — half-moon opening downward */}
      <path
        d="M116 152 A 44 44 0 0 1 204 152 Z"
        fill="#202833"
        stroke={active ? "#3A4556" : "#2D3746"}
        strokeWidth="1.25"
      />
      <path d="M124 140 A 36 36 0 0 1 160 116" fill="none" stroke="#2D3746" strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
      {/* shade rim */}
      <rect x="114" y="150" width="92" height="5" rx="2.5" fill="#151B23" stroke="#2D3746" strokeWidth="0.75" />

      {/* bulb */}
      <circle
        cx="160"
        cy="163"
        r="12"
        fill={active ? "url(#bulb-core)" : "#39424E"}
        style={{ transition: "fill 600ms ease" }}
      />
      {active && <circle cx="160" cy="163" r="19" fill="#FFB16A" opacity="0.28" filter="url(#soft-blur)" />}

      {/* dormant indicator dot */}
      <circle cx="160" cy="163" r={active ? 0 : 3.2} fill="#55627480" style={{ transition: "all 600ms ease" }} />
    </svg>
  );
}
