// Supplier + all its invoices, with optimistic "mark paid" / "undo".
//
// Optimistic rules (see CLAUDE.md):
// - The new state is shown immediately; saving runs in the background.
// - Saves for the same invoice run one after another (a queue), so an old
//   request can never overtake a newer one: the last action always wins.
// - If a save fails, the row goes back to the last state the database
//   confirmed, and onError gets a Bosnian message.
// - A reload never overwrites an invoice that is still being saved.
import { useCallback, useRef, useState } from "react";

import { dataErrorMessage, messages } from "@/lib/errors";
import { todayIso } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import type { Dobavljac, Faktura, PaymentState } from "@/lib/types";

const SUPPLIER_COLUMNS = "id, firma_id, naziv, auto_rok_dana";
export const INVOICE_COLUMNS =
  "id, firma_id, dobavljac_id, broj, iznos, datum_unosa, rok_placanja, placeno, datum_placanja";

export type LoadStatus =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "notFound" }
  | { kind: "ready" };

export function useSupplierInvoices(
  firmaId: string,
  supplierId: string,
  onError: (message: string) => void
) {
  const [status, setStatus] = useState<LoadStatus>({ kind: "loading" });
  const [supplier, setSupplier] = useState<Dobavljac | null>(null);
  const [invoices, setInvoices] = useState<Faktura[]>([]);

  // Last payment state the database confirmed, per invoice id
  const confirmed = useRef(new Map<string, PaymentState>());
  // Tail of each invoice's save queue, and how many saves are waiting
  const queues = useRef(new Map<string, Promise<void>>());
  const pending = useRef(new Map<string, number>());
  const loadedOnce = useRef(false);

  const patchInvoice = useCallback((id: string, patch: Partial<Faktura>) => {
    setInvoices((list) => list.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }, []);

  const load = useCallback(async () => {
    const [dobavljac, fakture] = await Promise.all([
      supabase
        .from("dobavljaci")
        .select(SUPPLIER_COLUMNS)
        .eq("id", supplierId)
        .eq("firma_id", firmaId)
        .maybeSingle(),
      supabase
        .from("fakture")
        .select(INVOICE_COLUMNS)
        .eq("dobavljac_id", supplierId)
        .eq("firma_id", firmaId),
    ]);

    const failed = [dobavljac, fakture].find((r) => r.error);
    if (failed?.error) {
      const message = dataErrorMessage(failed.error, failed.status);
      // Already showing data: keep it and just tell the user.
      if (loadedOnce.current) onError(message);
      else setStatus({ kind: "error", message });
      return;
    }
    if (!dobavljac.data) {
      setStatus({ kind: "notFound" });
      return;
    }

    const rows = (fakture.data ?? []) as Faktura[];
    for (const row of rows) {
      confirmed.current.set(row.id, { placeno: row.placeno, datum_placanja: row.datum_placanja });
    }

    setSupplier(dobavljac.data as Dobavljac);
    setInvoices((current) =>
      rows.map((row) => {
        // Still saving: keep what the user sees, not the older server value
        if ((pending.current.get(row.id) ?? 0) > 0) {
          const local = current.find((f) => f.id === row.id);
          if (local) return { ...row, placeno: local.placeno, datum_placanja: local.datum_placanja };
        }
        return row;
      })
    );
    loadedOnce.current = true;
    setStatus({ kind: "ready" });
  }, [firmaId, supplierId, onError]);

  /** Shows the new state at once and saves it in the queue of that invoice. */
  const applyPayment = useCallback(
    (invoice: Faktura, next: PaymentState) => {
      const id = invoice.id;
      patchInvoice(id, next);
      pending.current.set(id, (pending.current.get(id) ?? 0) + 1);

      const revert = (message: string) => {
        // Back to what the database last confirmed
        const last = confirmed.current.get(id);
        if (last) patchInvoice(id, last);
        onError(message);
      };

      const save = async () => {
        try {
          // Only the allowed columns (see CLAUDE.md)
          const { data, error, status: httpStatus } = await supabase
            .from("fakture")
            .update(next)
            .eq("id", id)
            .select("placeno, datum_placanja");

          if (error) {
            revert(dataErrorMessage(error, httpStatus, { fallback: messages.saveFailed }));
          } else if (!data?.length) {
            // RLS / deleted meanwhile: no error, just 0 rows
            revert(messages.invoiceNotFound);
          } else {
            confirmed.current.set(id, data[0] as PaymentState);
          }
        } catch {
          revert(messages.saveFailed);
        } finally {
          pending.current.set(id, (pending.current.get(id) ?? 1) - 1);
        }
      };

      // save() never throws, so the queue keeps going after a failure.
      const tail = (queues.current.get(id) ?? Promise.resolve()).then(save);
      queues.current.set(id, tail);
    },
    [patchInvoice, onError]
  );

  /**
   * Marks paid (today's LOCAL date) or back to debts.
   * Returns the previous state, for "Poništi".
   */
  const setPaid = useCallback(
    (invoice: Faktura, paid: boolean): PaymentState => {
      const previous = { placeno: invoice.placeno, datum_placanja: invoice.datum_placanja };
      applyPayment(invoice, paid ? { placeno: true, datum_placanja: todayIso() } : { placeno: false, datum_placanja: null });
      return previous;
    },
    [applyPayment]
  );

  /** "Poništi": puts back exactly the previous state (incl. the old payment date). */
  const restore = useCallback(
    (invoice: Faktura, previous: PaymentState) => applyPayment(invoice, previous),
    [applyPayment]
  );

  /**
   * After the invoice form saved: adds a new invoice or replaces an edited one.
   * If a payment change of that invoice is still saving, its payment fields
   * stay as the user sees them.
   */
  const upsertInvoice = useCallback((row: Faktura) => {
    const saving = (pending.current.get(row.id) ?? 0) > 0;
    if (!saving) {
      confirmed.current.set(row.id, { placeno: row.placeno, datum_placanja: row.datum_placanja });
    }
    setInvoices((list) => {
      const local = list.find((f) => f.id === row.id);
      if (!local) return [...list, row];
      const merged = saving
        ? { ...row, placeno: local.placeno, datum_placanja: local.datum_placanja }
        : row;
      return list.map((f) => (f.id === row.id ? merged : f));
    });
  }, []);

  /** Waits for the database (not optimistic). Returns an error message or null. */
  const deleteInvoice = useCallback(async (invoice: Faktura): Promise<string | null> => {
    const { data, error, status: httpStatus } = await supabase
      .from("fakture")
      .delete()
      .eq("id", invoice.id)
      .select("id");
    if (error) return dataErrorMessage(error, httpStatus, { fallback: messages.deleteFailed });
    if (!data?.length) return messages.invoiceNotFound;

    confirmed.current.delete(invoice.id);
    setInvoices((list) => list.filter((f) => f.id !== invoice.id));
    return null;
  }, []);

  return { status, supplier, setSupplier, invoices, load, setPaid, restore, deleteInvoice, upsertInvoice };
}
