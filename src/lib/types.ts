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
