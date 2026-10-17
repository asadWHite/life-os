"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

export function LandingCtas({
  resume,
  labels,
}: {
  resume: boolean;
  labels: { cta: string; signin: string; resume: string };
}) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={() => router.push(resume ? "/onboarding" : "/sign-up")}
        className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-accent px-7 text-[14.5px] font-semibold text-accent-ink shadow-[0_10px_28px_rgba(0,0,0,0.2)] transition-all hover:brightness-110 active:scale-[0.97]"
      >
        {resume ? labels.resume : labels.cta}
        <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
      </button>
      {!resume && (
        <button
          onClick={() => router.push("/sign-in")}
          className="inline-flex h-12 items-center rounded-full border border-line bg-raised px-6 text-[14px] font-medium text-ink-2 transition-colors hover:border-line-strong hover:text-ink active:scale-[0.97]"
        >
          {labels.signin}
        </button>
      )}
    </div>
  );
}
