// Bosnian messages for Supabase errors.
// Errors are recognized by code/type first; the English message text is
// only a fallback when there is no code.
import {
  isAuthError,
  isAuthRetryableFetchError,
  type PostgrestError,
} from "@supabase/supabase-js";

export const messages = {
  offline: "Nema veze sa internetom. Provjeri vezu i pokušaj ponovo.",
  serverDown: "Server trenutno nije dostupan. Pokušaj ponovo za par minuta.",
  tooManyAttempts: "Previše pokušaja. Sačekaj malo pa pokušaj ponovo.",
  invalidCredentials: "Pogrešan email ili lozinka.",
  emailNotConfirmed: "Email još nije potvrđen. Javi se administratoru.",
  userBanned: "Ovaj korisnik je blokiran. Javi se administratoru.",
  sessionExpired: "Prijava je istekla. Odjavi se i prijavi ponovo.",
  noPermission: "Nemaš dozvolu za ovu radnju.",
  loginFailed: "Prijava nije uspjela. Pokušaj ponovo.",
  loadFailed: "Učitavanje nije uspjelo. Pokušaj ponovo.",
  saveFailed: "Spremanje nije uspjelo. Pokušaj ponovo.",
  deleteFailed: "Brisanje nije uspjelo. Pokušaj ponovo.",
  duplicateSupplier: "Dobavljač s tim nazivom već postoji.",
  supplierHasInvoices: "Dobavljač ima fakture i ne može se obrisati.",
  supplierNotFound: "Dobavljač nije pronađen. Možda ga je neko obrisao.",
  invoiceNotFound: "Faktura nije pronađena. Možda ju je neko obrisao.",
};

/** Postgres error codes the app reacts to. */
export const pgCodes = {
  uniqueViolation: "23505",
  foreignKeyViolation: "23503",
};

type DataErrorOptions = {
  /** Message when nothing more specific matches (default: loading failed). */
  fallback?: string;
  /** Screen-specific messages by error code, e.g. { "23505": "…" }. */
  byCode?: Record<string, string>;
};

// Fetch failures: "Failed to fetch" (web), "Network request failed" (Android/iOS)
const NETWORK_TEXT = /failed to fetch|network request failed|network ?error|load failed/i;

/** Message for errors from supabase.auth (sign in, sign out). */
export function authErrorMessage(error: unknown): string {
  if (isAuthRetryableFetchError(error)) {
    // Status 0 = request never reached the server
    return error.status === 0 || error.status === undefined ? messages.offline : messages.serverDown;
  }

  if (isAuthError(error)) {
    switch (error.code) {
      case "invalid_credentials":
        return messages.invalidCredentials;
      case "email_not_confirmed":
        return messages.emailNotConfirmed;
      case "user_banned":
        return messages.userBanned;
      case "over_request_rate_limit":
        return messages.tooManyAttempts;
      case "request_timeout":
        return messages.serverDown;
    }
    if (error.code) return messages.loginFailed;
    if (error.status === 429) return messages.tooManyAttempts;
  }

  // Fallback: no code, look at the text
  const text = error instanceof Error ? error.message : String(error ?? "");
  if (NETWORK_TEXT.test(text)) return messages.offline;
  if (/invalid login credentials/i.test(text)) return messages.invalidCredentials;
  if (/email not confirmed/i.test(text)) return messages.emailNotConfirmed;
  return messages.loginFailed;
}

/** Message for errors from database queries (supabase.from(...)). */
export function dataErrorMessage(
  error: PostgrestError,
  status?: number,
  { fallback = messages.loadFailed, byCode = {} }: DataErrorOptions = {}
): string {
  // Status 0 = request never reached the server
  if (status === 0) {
    return NETWORK_TEXT.test(error.message) || !error.code ? messages.offline : fallback;
  }

  if (error.code && byCode[error.code]) return byCode[error.code];

  switch (error.code) {
    case "PGRST301": // JWT expired / invalid
    case "PGRST303":
      return messages.sessionExpired;
    case "42501": // no privilege / RLS violation
      return messages.noPermission;
  }
  if (error.code) return fallback;

  // Fallback: no code, look at the text
  if (NETWORK_TEXT.test(error.message)) return messages.offline;
  return fallback;
}
