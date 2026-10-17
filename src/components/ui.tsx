"use client";

import { useEffect, useRef, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { X, Loader2 } from "lucide-react";

/* ------------------------------- Buttons ------------------------------ */

type BtnVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "secondary",
  size = "md",
  busy = false,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant;
  size?: "sm" | "md" | "lg";
  busy?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium rounded-full transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none select-none";
  const sizes = {
    sm: "text-[12.5px] px-3.5 h-8",
    md: "text-[13.5px] px-5 h-10",
    lg: "text-[14.5px] px-7 h-12",
  };
  const variants: Record<BtnVariant, string> = {
    primary: "bg-accent text-accent-ink shadow-[0_6px_20px_rgba(0,0,0,0.18)] hover:brightness-110",
    secondary: "bg-raised text-ink border border-line hover:border-line-strong",
    ghost: "text-ink-2 hover:bg-sunken hover:text-ink",
    danger: "bg-danger-bg text-danger border border-transparent hover:brightness-95",
  };
  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={disabled || busy}
      {...rest}
    >
      {busy && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  );
}

/* ------------------------------- Inputs ------------------------------- */

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11.5px] text-ink-3">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-line bg-raised px-3.5 py-2.5 text-[14px] text-ink placeholder:text-ink-3 transition-colors focus:border-accent/50 focus:outline-none";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} min-h-[72px] resize-y ${props.className ?? ""}`} />;
}

export function Select({
  options,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: { value: string; label: string }[];
}) {
  return (
    <select {...rest} className={`${inputCls} appearance-none pr-8`}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/* ------------------------------ Segmented ----------------------------- */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className={`inline-flex rounded-full border border-line bg-sunken p-1 ${size === "sm" ? "text-[12px]" : "text-[13px]"}`} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-full px-3.5 py-1.5 font-medium transition-all duration-150 ${
            value === o.value
              ? "bg-raised text-ink shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
              : "text-ink-3 hover:text-ink-2"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* -------------------------------- Chip -------------------------------- */

export function Chip({
  active,
  onClick,
  children,
  className = "",
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3.5 py-2 text-[13px] font-medium transition-all duration-150 active:scale-[0.96] ${
        active
          ? "border-accent bg-accent text-accent-ink"
          : "border-line bg-raised text-ink-2 hover:border-line-strong hover:text-ink"
      } ${className}`}
    >
      {children}
    </button>
  );
}

/* -------------------------------- Modal ------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-ink/35 backdrop-blur-[6px]" />
      <div
        ref={ref}
        className={`relative w-full ${wide ? "max-w-lg" : "max-w-md"} card max-h-[88vh] overflow-y-auto rounded-b-none rounded-t-3xl p-6 animate-rise sm:rounded-3xl`}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
          <button
            onClick={onClose}
            aria-label="close"
            className="grid h-8 w-8 place-items-center rounded-full text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
          >
            <X size={17} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ----------------------------- Empty state ---------------------------- */

export function EmptyState({ icon, title, sub }: { icon: ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sunken text-ink-3">{icon}</div>
      <p className="mt-1 text-[14px] font-semibold text-ink">{title}</p>
      {sub && <p className="max-w-[260px] text-[12.5px] leading-relaxed text-ink-3">{sub}</p>}
    </div>
  );
}

/* ------------------------------ Score ring ---------------------------- */

export function ScoreRing({ value, size = 88, label }: { value: number | null; size?: number; label?: string }) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const pct = value == null ? 0 : Math.min(1, Math.max(0, value));
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-sunken)" strokeWidth={8} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-[19px] font-bold tracking-[-0.02em] text-ink">
            {value == null ? "—" : `${Math.round(pct * 100)}%`}
          </div>
          {label && <div className="mt-[-2px] max-w-[76px] text-[9.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">{label}</div>}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Badge -------------------------------- */

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "success" | "warning" | "danger"; children: ReactNode }) {
  const tones = {
    neutral: "bg-sunken text-ink-2",
    success: "bg-success-bg text-success",
    warning: "bg-warning-bg text-warning",
    danger: "bg-danger-bg text-danger",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}
