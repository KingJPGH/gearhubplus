import type { Lang } from "@/lib/settings";

export const locOf = (lang: Lang) => (lang === "fr" ? "fr-CA" : "en-CA");

export function parseDay(key: string): Date {
  return new Date(`${key}T12:00:00`);
}

export function formatFullDate(key: string, lang: Lang): string {
  return parseDay(key).toLocaleDateString(locOf(lang), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatShortDate(key: string, lang: Lang): string {
  return parseDay(key).toLocaleDateString(locOf(lang), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** "18 au 22 août 2026" / "August 18–22, 2026" — collapses a range into one label. */
export function formatRange(startKey: string, endKey: string, lang: Lang): string {
  if (startKey === endKey) return formatShortDate(startKey, lang);
  const start = parseDay(startKey);
  const end = parseDay(endKey);
  const loc = locOf(lang);
  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();

  if (lang === "fr") {
    const month = start.toLocaleDateString(loc, { month: "long" });
    if (sameMonth) {
      return `${start.getDate()} au ${end.getDate()} ${month} ${start.getFullYear()}`;
    }
    return `${start.toLocaleDateString(loc, { day: "numeric", month: "long" })} au ${end.toLocaleDateString(loc, { day: "numeric", month: "long", year: "numeric" })}`;
  }

  const month = start.toLocaleDateString(loc, { month: "long" });
  if (sameMonth) {
    return `${month} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`;
  }
  return `${start.toLocaleDateString(loc, { month: "long", day: "numeric" })} – ${end.toLocaleDateString(loc, { month: "long", day: "numeric", year: "numeric" })}`;
}

export type WithDate = { id: string; shoot_date: string; range_id?: string | null };

/** Group consecutive days that were created together (same range_id) into one entry. */
export function groupDayRanges<T extends WithDate>(days: T[]): Array<{
  key: string;
  days: T[];
  first: T;
  last: T;
}> {
  const sorted = [...days].sort((a, b) => a.shoot_date.localeCompare(b.shoot_date));
  const out: Array<{ key: string; days: T[]; first: T; last: T }> = [];
  const byRange = new Map<string, T[]>();

  for (const d of sorted) {
    if (d.range_id) {
      const bucket = byRange.get(d.range_id);
      if (bucket) {
        bucket.push(d);
        continue;
      }
      const arr = [d];
      byRange.set(d.range_id, arr);
      out.push({ key: d.range_id, days: arr, first: d, last: d });
    } else {
      out.push({ key: d.id, days: [d], first: d, last: d });
    }
  }

  return out.map((g) => ({ ...g, first: g.days[0], last: g.days[g.days.length - 1] }));
}
