/* Sleep domain logic — pure functions, unit-testable. */

export type SleepStatus = "green" | "yellow" | "red" | "none";

/** Target share required for YELLOW. Below this (but ≥ 2h) is counted as red-band short,
 *  except: anything < 120 minutes is always RED (priority rule from spec §9.5). */
export const YELLOW_FRACTION = 0.75;
export const CRITICAL_MINUTES = 120;

/**
 * Duration status:
 *  - duration < 120 min → red (critical, takes priority over everything)
 *  - duration >= target → green (goal achieved)
 *  - 75%–100% of target → yellow (meaningful portion)
 *  - below 75% of target (but ≥ 2h) → red (critically short relative to goal)
 */
export function sleepStatus(durationMinutes: number | null | undefined, targetMinutes: number): SleepStatus {
  if (durationMinutes == null) return "none";
  if (durationMinutes < CRITICAL_MINUTES) return "red";
  if (durationMinutes >= targetMinutes) return "green";
  if (durationMinutes >= Math.round(targetMinutes * YELLOW_FRACTION)) return "yellow";
  return "red";
}

export type Consistency = "on_time" | "slightly_off" | "off" | "unknown";

/** Bedtime / wake-time consistency vs a clock target, in minutes of drift.
 *  Drift is measured circularly on a 24h clock. */
export function clockDriftMinutes(actual: string, target: string): number {
  const [ah, am] = actual.split(":").map(Number);
  const [th, tm] = target.split(":").map(Number);
  let diff = ah * 60 + am - (th * 60 + tm);
  if (diff > 720) diff -= 1440;
  if (diff < -720) diff += 1440;
  return Math.abs(diff);
}

export function consistency(driftMinutes: number): Consistency {
  if (driftMinutes <= 45) return "on_time";
  if (driftMinutes <= 90) return "slightly_off";
  return "off";
}

/** Educational, non-medical recommendations based on settings + records. */
export function sleepRecommendations(input: {
  avgMinutes: number | null;
  targetMinutes: number;
  beforeBedPhone: boolean | null;
  reduceLatePhone: boolean | null;
  sessions: number;
}): string[] {
  const out: string[] = [];
  if (input.sessions === 0) {
    out.push("rec_start_tracking", "rec_consistent_bedtime");
    return out;
  }
  if (input.avgMinutes != null && input.avgMinutes < input.targetMinutes - 45) {
    out.push("rec_prepare_earlier");
  }
  if (input.beforeBedPhone) out.push("rec_screen_use");
  if (input.reduceLatePhone) out.push("rec_late_phone");
  out.push("rec_consistent_bedtime", "rec_review_pattern");
  return out.slice(0, 4);
}
