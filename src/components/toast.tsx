"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";

interface Toast {
  id: number;
  message: string;
  kind: "success" | "error" | "info";
}

const Ctx = createContext<{ push: (message: string, kind?: Toast["kind"]) => void } | null>(null);

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const push = useCallback((message: string, kind: Toast["kind"] = "success") => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev.slice(-2), { id, message, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  }, []);

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[90] flex flex-col items-center gap-2 px-4 md:bottom-8"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="glass pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-full py-2.5 pl-3.5 pr-4 text-[13px] font-medium text-ink animate-scale-in"
          >
            {t.kind === "success" && <CheckCircle2 size={16} className="text-success" />}
            {t.kind === "error" && <AlertTriangle size={16} className="text-danger" />}
            {t.kind === "info" && <CheckCircle2 size={16} className="text-ink-2" />}
            <span>{t.message}</span>
            <button
              aria-label="dismiss"
              className="ml-1 text-ink-3 transition-colors hover:text-ink"
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
