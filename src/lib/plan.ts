/* Rules-based initial plan generation (transparent, NOT AI — spec §5.6).
   Maps the user's stated interests and schedule to a small set of suggested,
   fully editable/dismissible starter tasks and habits. */

export interface PlanSuggestion {
  titleKey: string; // i18n key for the suggested task title
  priority: "normal" | "high";
  startTime?: string;
}

const INTEREST_SUGGESTIONS: Record<string, PlanSuggestion[]> = {
  languages: [{ titleKey: "sug_english", priority: "high", startTime: "18:00" }],
  education: [{ titleKey: "sug_study", priority: "high", startTime: "17:00" }],
  fitness: [{ titleKey: "sug_exercise", priority: "normal", startTime: "07:00" }],
  reading: [{ titleKey: "sug_read", priority: "normal", startTime: "21:00" }],
  career: [{ titleKey: "sug_career", priority: "high" }],
  development: [{ titleKey: "sug_skill", priority: "normal" }],
  creative: [{ titleKey: "sug_create", priority: "normal" }],
  routines: [{ titleKey: "sug_morning", priority: "normal", startTime: "07:30" }],
  productivity: [{ titleKey: "sug_plan_review", priority: "normal", startTime: "09:00" }],
};

export function suggestionsFor(interests: string[], wakeTime: string | null): PlanSuggestion[] {
  const out: PlanSuggestion[] = [];
  for (const interest of interests) {
    for (const s of INTEREST_SUGGESTIONS[interest] ?? []) {
      if (!out.some((o) => o.titleKey === s.titleKey)) out.push({ ...s });
    }
  }
  // If user wakes early, morning suggestions shift 30 min after wake-up.
  if (wakeTime) {
    const [h, m] = wakeTime.split(":").map(Number);
    if (!Number.isNaN(h)) {
      const shifted = `${String(Math.min(h, 22)).padStart(2, "0")}:${String((m + 30) % 60).padStart(2, "0")}`;
      for (const s of out) if (s.startTime && s.startTime < "09:00") s.startTime = shifted;
    }
  }
  return out.slice(0, 4); // never overload day one
}

export function brainRecommendations(input: {
  pendingToday: number;
  overdue: number;
  hasSleepSchedule: boolean;
  completionRate: number | null;
}): string[] {
  const out: string[] = [];
  if (input.overdue > 0) out.push("brain_overdue");
  if (input.pendingToday > 6) out.push("brain_too_many");
  if (!input.hasSleepSchedule) out.push("brain_sleep_schedule");
  if (input.completionRate != null && input.completionRate < 0.4 && input.pendingToday > 0) {
    out.push("brain_light_day");
  }
  return out.slice(0, 2);
}
