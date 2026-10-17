/* Timezone-aware date helpers. All "dates" (YYYY-MM-DD) are derived in the
   user's own timezone so day boundaries are correct for them. */

export function todayInTz(tz: string, at: Date = new Date()): string {
  return formatDateInTz(at, tz);
}

export function formatDateInTz(at: Date, tz: string): string {
  // en-CA yields YYYY-MM-DD parts
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

export function formatDateHuman(dateStr: string, locale: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(d);
}

export function timeInTz(at: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(at);
}

export function hourInTz(at: Date, tz: string): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "numeric", hour12: false }).format(at),
  );
}

export function weekdayOfDate(dateStr: string): number {
  // 0 = Sunday ... 6 = Saturday (local-agnostic via UTC noon)
  return new Date(dateStr + "T12:00:00Z").getUTCDay();
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function minutesBetween(startIso: string | Date, endIso: string | Date): number {
  const a = typeof startIso === "string" ? new Date(startIso) : startIso;
  const b = typeof endIso === "string" ? new Date(endIso) : endIso;
  return Math.round((b.getTime() - a.getTime()) / 60000);
}

/** Scheduled overnight interval: bedtime 22:30 → wake 06:30 = 480 minutes.
 *  Handles past-midnight correctly (never negative/zero). */
export function scheduledSleepMinutes(bedtime: string, wake: string): number {
  const [bh, bm] = bedtime.split(":").map(Number);
  const [wh, wm] = wake.split(":").map(Number);
  let mins = wh * 60 + wm - (bh * 60 + bm);
  if (mins <= 0) mins += 24 * 60;
  return mins;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(Math.abs(minutes) / 60);
  const m = Math.abs(minutes) % 60;
  const sign = minutes < 0 ? "−" : "";
  if (h === 0) return `${sign}${m}m`;
  return `${sign}${h}h ${String(m).padStart(2, "0")}m`;
}

/** Convert a local "HH:MM" on a given YYYY-MM-DD in a tz into a UTC instant.
 *  Two-pass offset refinement handles DST boundaries reasonably well. */
export function localToUtc(dateStr: string, time: string, tz: string): Date {
  const [h, m] = time.split(":").map(Number);
  const wallAsUtc = new Date(`${dateStr}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00Z`);
  const offsetAt = (instant: Date): number => {
    const inTz = new Date(instant.toLocaleString("en-US", { timeZone: tz }));
    const inUtc = new Date(instant.toLocaleString("en-US", { timeZone: "UTC" }));
    return inTz.getTime() - inUtc.getTime();
  };
  let result = new Date(wallAsUtc.getTime() - offsetAt(wallAsUtc));
  // refine once: re-measure the offset at the corrected instant
  result = new Date(wallAsUtc.getTime() - offsetAt(result));
  return result;
}
