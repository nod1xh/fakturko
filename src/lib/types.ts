// Row types for Supabase tables (column names as in the database).

export type VrstaObjekta = "restoran" | "kafic" | "nargila_bar";

export type Firma = {
  id: string;
  naziv: string;
  vrsta_objekta: VrstaObjekta;
};

export const vrstaObjektaLabel: Record<VrstaObjekta, string> = {
  restoran: "Restoran",
  kafic: "Kafić",
  nargila_bar: "Nargila bar",
};

export type Dobavljac = {
  id: string;
  firma_id: string;
  naziv: string;
  /** NULL = due date is entered manually for each invoice */
  auto_rok_dana: number | null;
};

/** The columns of an unpaid invoice needed for debt summaries. */
export type OtvorenaFaktura = {
  firma_id: string;
  dobavljac_id: string;
  iznos: number;
  rok_placanja: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Route params come from the URL, so check them before querying. */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export type Faktura = {
  id: string;
  firma_id: string;
  dobavljac_id: string;
  broj: string;
  iznos: number;
  datum_unosa: string;
  rok_placanja: string;
  placeno: boolean;
  /** Set only together with placeno = true (DB check) */
  datum_placanja: string | null;
};

/** The two columns that "mark paid" / "undo" change. */
export type PaymentState = Pick<Faktura, "placeno" | "datum_placanja">;
