/* Rules-based personalization and schedule generation.
   Transparent, deterministic — NOT AI. Different inputs produce different outputs.
   Per spec: goals affect schedule, life stage affects time blocks,
   interests affect activity selection, wake/bed time bound the day. */

export interface PlanSuggestion {
  titleKey: string; // i18n key for the suggested task title
  priority: "normal" | "high";
  startTime?: string;
  durationMinutes?: number;
}

/* ────────────────────────────────────────────────────────────── */
/* 1. Interest → activity map                                     */
/* ────────────────────────────────────────────────────────────── */

const INTEREST_ACTIVITIES: Record<string, PlanSuggestion[]> = {
  languages: [{ titleKey: "sug_english", priority: "high", startTime: "18:00", durationMinutes: 30 }],
  education: [{ titleKey: "sug_study", priority: "high", startTime: "17:00", durationMinutes: 45 }],
  fitness: [{ titleKey: "sug_exercise", priority: "normal", startTime: "07:00", durationMinutes: 30 }],
  reading: [{ titleKey: "sug_read", priority: "normal", startTime: "21:00", durationMinutes: 20 }],
  career: [{ titleKey: "sug_career", priority: "high", durationMinutes: 30 }],
  development: [{ titleKey: "sug_skill", priority: "normal", durationMinutes: 30 }],
  creative: [{ titleKey: "sug_create", priority: "normal", durationMinutes: 30 }],
  routines: [{ titleKey: "sug_morning", priority: "normal", startTime: "07:30", durationMinutes: 20 }],
  productivity: [{ titleKey: "sug_plan_review", priority: "normal", startTime: "09:00", durationMinutes: 15 }],
};

/* ────────────────────────────────────────────────────────────── */
/* 2. Life-stage adjustments                                      */
/*    Returns free-time blocks (HH:MM) that may have activities   */
/* ────────────────────────────────────────────────────────────── */

export interface TimeBlock {
  start: string; // "HH:MM"
  end: string;
  type: "busy" | "free" | "sleep" | "morning-routine" | "evening-routine";
  label?: string;
}

export function defaultTimeBlocks(lifeStage: string, workHours: string | null): TimeBlock[] {
  const blocks: TimeBlock[] = [];

  if (lifeStage === "school") {
    blocks.push({ start: "08:00", end: "14:00", type: "busy", label: "Maktab" });
    blocks.push({ start: "14:30", end: "15:00", type: "free", label: "Tushlik / dam olish" });
    blocks.push({ start: "15:00", end: "21:30", type: "free", label: "Bo'sh vaqt" });
  } else if (lifeStage === "university") {
    blocks.push({ start: "09:00", end: "15:00", type: "busy", label: "Darslar" });
    blocks.push({ start: "15:30", end: "22:00", type: "free", label: "Bo'sh vaqt" });
  } else if (lifeStage === "working") {
    const wh = workHours ?? "morning";
    if (wh === "morning") {
      blocks.push({ start: "08:00", end: "17:00", type: "busy", label: "Ish" });
      blocks.push({ start: "17:30", end: "22:00", type: "free", label: "Bo'sh vaqt" });
    } else if (wh === "afternoon") {
      blocks.push({ start: "12:00", end: "20:00", type: "busy", label: "Ish" });
      blocks.push({ start: "07:00", end: "11:30", type: "free", label: "Ertalabki vaqt" });
      blocks.push({ start: "20:30", end: "23:00", type: "free", label: "Kechki vaqt" });
    } else if (wh === "evening") {
      blocks.push({ start: "16:00", end: "23:00", type: "busy", label: "Ish" });
      blocks.push({ start: "07:00", end: "15:30", type: "free", label: "Ertalabki / kunduzgi vaqt" });
    } else {
      // varies
      blocks.push({ start: "09:00", end: "18:00", type: "busy", label: "Ish (o'zgaruvchan)" });
      blocks.push({ start: "18:30", end: "22:30", type: "free", label: "Kechki vaqt" });
    }
  } else {
    // other
    blocks.push({ start: "09:00", end: "21:00", type: "free", label: "Bo'sh vaqt" });
  }

  return blocks;
}

/* ────────────────────────────────────────────────────────────── */
/* 3. Suggestion picker — honours life stage + goals + free time  */
/* ────────────────────────────────────────────────────────────── */

function hhmm(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Returns minutes available between wakeTime and bedTime, excluding busy blocks. */
function freeMinutes(wakeTime: string, bedTime: string, busyBlocks: TimeBlock[]): number {
  const dayStart = hhmm(wakeTime);
  let dayEnd = hhmm(bedTime);
  if (dayEnd <= dayStart) dayEnd += 24 * 60; // overnight

  let free = dayEnd - dayStart;
  for (const b of busyBlocks) {
    if (b.type !== "busy") continue;
    const bs = hhmm(b.start);
    const be = hhmm(b.end);
    const overlap = Math.max(0, Math.min(dayEnd, be) - Math.max(dayStart, bs));
    free -= overlap;
  }
  return Math.max(0, free);
}

export function suggestionsFor(
  interests: string[],
  wakeTime: string | null,
  options?: {
    lifeStage?: string | null;
    workHours?: string | null;
    freeTime?: string | null;
    challenges?: string[];
    maxSuggestions?: number;
  },
): PlanSuggestion[] {
  const wake = wakeTime ?? "07:00";
  const lifeStage = options?.lifeStage ?? "other";
  const workHours = options?.workHours ?? null;
  const maxSuggestions = options?.maxSuggestions ?? 4;
  const busyBlocks = defaultTimeBlocks(lifeStage, workHours);
  const available = freeMinutes(wake, "23:00", busyBlocks);

  // Determine slot availability from freeTime label
  const freeLabel = options?.freeTime ?? "1-2h";
  const freeMin = freeLabel === "<1h" || freeLabel === "lt1" ? 60
    : freeLabel === "1-2h" ? 120
    : freeLabel === "2-4h" ? 240
    : 360;

  const effectiveAvailable = Math.min(available, freeMin);

  const out: PlanSuggestion[] = [];
  let usedMinutes = 0;

  for (const interest of interests) {
    for (const s of INTEREST_ACTIVITIES[interest] ?? []) {
      if (out.some((o) => o.titleKey === s.titleKey)) continue;
      const dur = s.durationMinutes ?? 30;
      if (usedMinutes + dur > effectiveAvailable + 60) continue; // allow slight overflow
      out.push({ ...s });
      usedMinutes += dur;
      if (out.length >= maxSuggestions) return out;
    }
  }

  // Fitness nudge for users who want to exercise (challenge) even if not an interest
  if (
    options?.challenges?.includes("exercise") &&
    !out.some((o) => o.titleKey === "sug_exercise")
  ) {
    out.push({ titleKey: "sug_exercise", priority: "normal", startTime: "07:30", durationMinutes: 20 });
  }

  // Shift early-morning activities 30 min after wake-up
  for (const s of out) {
    if (s.startTime && s.startTime < "09:00") {
      const [h, m] = wake.split(":").map(Number);
      const newH = Math.min(h, 22);
      const newM = (m + 30) % 60;
      const carry = m + 30 >= 60 ? 1 : 0;
      s.startTime = `${String(newH + carry).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
    }
  }

  return out.slice(0, maxSuggestions);
}

/* ────────────────────────────────────────────────────────────── */
/* 4. Brain recommendations (non-AI advisory banners)             */
/* ────────────────────────────────────────────────────────────── */

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
