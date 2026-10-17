"use client";

import { cn } from "@/lib/cn";

/* 
   Life OS focus lamp — realistic visual redesign.
   Matches the premium product-render aesthetic of the reference.
   Colors:
   #151B23 (Primary Dark)
   #202833 (Secondary Dark)
   #FF633C (Orange Accent)
   #FFB16A (Warm Light)
*/

export function LampArt({ 
  active, 
  reduceMotion = false,
  className 
}: { 
  active: boolean; 
  reduceMotion?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 400 450"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-full h-auto drop-shadow-2xl", className)}
      style={{ overflow: "visible" }}
    >
      <defs>
        {/* Metallic body gradient */}
        <linearGradient id="lamp_body_grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2D3748" />
          <stop offset="50%" stopColor="#1A202C" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>

        {/* Highlight for metallic edges */}
        <linearGradient id="edge_highlight" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="white" stopOpacity="0.15" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>

        {/* Inner lampshade glow */}
        <radialGradient id="inner_shade_glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFB16A" stopOpacity="0.8" />
          <stop offset="70%" stopColor="#FF633C" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#FF633C" stopOpacity="0" />
        </radialGradient>

        {/* Directional beam */}
        <linearGradient id="light_beam_grad" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#FFB16A" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#FFB16A" stopOpacity="0" />
        </linearGradient>

        {/* Orange Accent Gradient */}
        <linearGradient id="orange_accent_grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FF8A65" />
          <stop offset="50%" stopColor="#FF633C" />
          <stop offset="100%" stopColor="#E64A19" />
        </linearGradient>

        <filter id="soft_glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="15" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        <filter id="beam_blur">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>

      {/* --- BEAM OF LIGHT (Only when active) --- */}
      <g 
        className={cn(
          "transition-opacity duration-700 ease-in-out",
          active ? "opacity-100" : "opacity-0"
        )}
      >
        {/* Large atmospheric glow */}
        <ellipse 
          cx="200" cy="180" rx="140" ry="120" 
          fill="#FFB16A" 
          fillOpacity="0.08" 
          filter="url(#soft_glow)" 
        />
        
        {/* Directional beam from shade */}
        <path 
          d="M130 180 L270 180 L360 420 L40 420 Z" 
          fill="url(#light_beam_grad)" 
          filter="url(#beam_blur)"
          className={cn(!reduceMotion && "animate-pulse")}
          style={{ animationDuration: '4s' }}
        />
      </g>

      {/* --- BASE --- */}
      <g>
        {/* Main base volume */}
        <rect x="120" y="380" width="160" height="24" rx="12" fill="url(#lamp_body_grad)" />
        <rect x="120" y="380" width="160" height="2" rx="1" fill="url(#edge_highlight)" />
        
        {/* Bottom shadow/contact */}
        <rect x="130" y="404" width="140" height="4" rx="2" fill="black" fillOpacity="0.4" />
      </g>

      {/* --- ARM --- */}
      <g>
        {/* Main curved support */}
        <path 
          d="M200 380 Q 200 280 180 150" 
          stroke="url(#lamp_body_grad)" 
          strokeWidth="14" 
          strokeLinecap="round" 
        />
        {/* Arm edge highlight */}
        <path 
          d="M194 370 Q 194 280 174 155" 
          stroke="white" 
          strokeOpacity="0.05" 
          strokeWidth="2" 
          strokeLinecap="round" 
        />
      </g>

      {/* --- HEAD / JOINT --- */}
      <g>
        {/* Neck connector */}
        <circle cx="180" cy="150" r="10" fill="#1A202C" />
        <circle cx="180" cy="150" r="10" stroke="white" strokeOpacity="0.1" />
      </g>

      {/* --- LAMPSHADE --- */}
      <g transform="translate(180, 150) rotate(-10)">
        {/* Outer Surface */}
        <path 
          d="M-70 15 C-70 -40 70 -40 70 15 L85 45 C85 55 -85 55 -85 45 Z" 
          fill="url(#lamp_body_grad)" 
        />
        {/* Outer Rim Highlight */}
        <path 
          d="M-84 45 C-84 54 84 54 84 45" 
          stroke="white" 
          strokeOpacity="0.1" 
          strokeWidth="1" 
        />

        {/* Inner Surface Illumination */}
        <g className={cn("transition-opacity duration-500", active ? "opacity-100" : "opacity-0")}>
           <path 
            d="M-65 15 C-65 -30 65 -30 65 15 L78 40 C78 48 -78 48 -78 40 Z" 
            fill="url(#inner_shade_glow)" 
          />
        </g>

        {/* TOP ACCENT (The Orange Ring) */}
        <path 
          d="M-15 -32 Q 0 -42 15 -32" 
          stroke="url(#orange_accent_grad)" 
          strokeWidth="6" 
          strokeLinecap="round"
          className={cn("transition-all duration-700", active ? "drop-shadow-[0_0_8px_#FF633C]" : "")}
        />
      </g>

      {/* --- BULB (Visible when active) --- */}
      <g 
        transform="translate(185, 175)"
        className={cn("transition-opacity duration-300", active ? "opacity-100" : "opacity-0")}
      >
        <circle r="12" fill="#FFF3E4" filter="url(#soft_glow)" />
      </g>
    </svg>
  );
}
