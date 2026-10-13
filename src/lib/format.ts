// Money and date helpers. Formatting is done by hand (not toLocaleString)
// so the result is identical on Android (Hermes), iOS and web.

/** Converts a KM amount to whole cents, to add amounts without float errors. */
export function toCents(amount: number | string | null | undefined): number {
  return Math.round(Number(amount ?? 0) * 100);
}

/** Sum of KM amounts, exact to the cent. */
export function sumAmounts(amounts: (number | string | null | undefined)[]): number {
  return amounts.reduce<number>((total, amount) => total + toCents(amount), 0) / 100;
}

/** 1234.5 → "1.234,50 KM" (bs-BA format). */
export function money(amount: number): string {
  const cents = Math.abs(toCents(amount));
  const whole = Math.floor(cents / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const fraction = (cents % 100).toString().padStart(2, "0");
  const sign = amount < 0 && cents > 0 ? "-" : "";
  return `${sign}${whole},${fraction} KM`;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Today's LOCAL date as "YYYY-MM-DD" (not UTC). */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "2026-10-08" → "08.10.2026." */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}.`;
}

// Calendar dates as UTC midnight, so daylight saving time never shifts a day.
function isoToUtc(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** "2026-10-08" + 30 → "2026-11-07" */
export function addDays(iso: string, days: number): string {
  const d = new Date(isoToUtc(iso) + days * 86_400_000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Days from today to the date: negative = in the past, 0 = today. */
export function daysUntil(iso: string): number {
  return Math.round((isoToUtc(iso) - isoToUtc(todayIso())) / 86_400_000);
}

/** Due date has passed (computed, never stored). */
export function isOverdue(dueIso: string): boolean {
  return daysUntil(dueIso) < 0;
}

/**
 * Bosnian plural form: plural(n, "faktura", "fakture", "faktura")
 * 1, 21, 31… → one · 2–4, 22–24… → few · 0, 5–20, 25… → many
 */
export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/** Supplier's due-date rule: "Rok 30 dana, automatski" / "Rok se unosi ručno" */
export function dueRuleText(autoRokDana: number | null): string {
  if (autoRokDana === null) return "Rok se unosi ručno";
  return `Rok ${autoRokDana} ${plural(autoRokDana, "dan", "dana", "dana")}, automatski`;
}
