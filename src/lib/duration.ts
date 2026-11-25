/**
 * AERONOTE duration system.
 *
 * The database stores every duration as a whole number of MINUTES.
 * The interface ALWAYS shows and accepts HH:MM — never raw minutes.
 *   90  -> "01:30"     45 -> "00:45"     615 -> "10:15"
 * Accumulated totals may exceed 24 hours ("1234:05"); a single flight or
 * FSTD session is limited to 24:00 by passing { max: MAX_SINGLE_ENTRY }.
 */

/** Longest single flight or FSTD session: 24:00. */
export const MAX_SINGLE_ENTRY = 24 * 60;

/** Converts whole minutes to HH:MM. Hours keep growing past 24 (no days). */
export function formatDuration(minutes: number): string {
  if (!Number.isInteger(minutes) || minutes < 0) {
    throw new RangeError(`Invalid duration in minutes: ${minutes}`);
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export type ParsedDuration =
  | { ok: true; minutes: number }
  | { ok: false; error: string };

/**
 * Reads what the pilot typed. Accepted forms:
 *   "01:30", "1:30"  -> 01:30
 *   "130", "0130"    -> 01:30  (digits fill from the right, like a
 *                               cockpit time display: last two = minutes)
 * "90" is NOT read as 90 minutes: it means 00:90, which is rejected.
 */
export function parseDuration(
  text: string,
  options: { max?: number } = {},
): ParsedDuration {
  const value = text.trim();
  let hours: number;
  let mins: number;

  const withColon = /^(\d{1,4}):(\d{2})$/.exec(value);
  if (withColon) {
    hours = Number(withColon[1]);
    mins = Number(withColon[2]);
  } else if (/^\d{1,6}$/.test(value)) {
    const padded = value.padStart(3, "0");
    hours = Number(padded.slice(0, -2));
    mins = Number(padded.slice(-2));
  } else {
    return { ok: false, error: "Use HH:MM, e.g. 01:30" };
  }

  if (mins > 59) return { ok: false, error: "Minutes must be 00–59" };

  const total = hours * 60 + mins;
  if (options.max !== undefined && total > options.max) {
    return { ok: false, error: `Maximum is ${formatDuration(options.max)}` };
  }
  return { ok: true, minutes: total };
}
