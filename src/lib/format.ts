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
  return dateToIso(new Date());
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

// numeric(12,2) in the database: at most 10 digits before the decimal mark
const MAX_AMOUNT = 9_999_999_999.99;

export type ParsedAmount = { ok: true; value: number } | { ok: false; error: string };

/**
 * Amount typed by the user. "12,50" and "12.50" both work; spaces are ignored.
 * One "," or "." is the decimal mark. Thousands separators are rejected on
 * purpose ("1.234" could mean 1234 or 1,234), so the user retypes it.
 */
export function parseAmount(input: string): ParsedAmount {
  const text = input.replace(/\s/g, "");
  if (!text) return { ok: false, error: "Upiši iznos." };
  if (text.startsWith("-")) return { ok: false, error: "Iznos ne smije biti negativan." };

  const thousands = "Upiši iznos bez tačke za hiljade, npr. 1234,50";
  const separators = text.match(/[.,]/g) ?? [];
  if (separators.length > 1) return { ok: false, error: thousands };

  const normalized = text.replace(",", ".");
  if (!/^\d*\.?\d*$/.test(normalized) || !/\d/.test(normalized)) {
    return { ok: false, error: "Iznos nije ispravan. Primjer: 12,50" };
  }

  const decimals = normalized.split(".")[1] ?? "";
  // "1.234" / "1,234": looks like a thousands separator
  if (decimals.length === 3) return { ok: false, error: thousands };
  if (decimals.length > 2) return { ok: false, error: "Iznos može imati najviše 2 decimale." };

  const value = toCents(normalized) / 100;
  if (value > MAX_AMOUNT) return { ok: false, error: "Iznos je prevelik." };
  return { ok: true, value };
}

/** 1250 → "1250,00" for an input field (no thousands separator). */
export function formatAmountInput(amount: number): string {
  return (toCents(amount) / 100).toFixed(2).replace(".", ",");
}

/** Invoice number as saved: no spaces at the start or end. */
export function cleanInvoiceNumber(broj: string): string {
  return broj.trim();
}

/** For the duplicate check: ignores case and spaces at the start/end. */
export function sameInvoiceNumber(a: string, b: string): boolean {
  return cleanInvoiceNumber(a).toLocaleLowerCase("bs") === cleanInvoiceNumber(b).toLocaleLowerCase("bs");
}

/** Local calendar date of a Date object → "YYYY-MM-DD". */
export function dateToIso(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "YYYY-MM-DD" → Date at LOCAL midnight (for date pickers). */
export function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
