// Add / edit an invoice (prototype: "Nova faktura").
// placeno and datum_placanja are NEVER sent from this form (CLAUDE.md).
import { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { DateField } from "@/components/DateField";
import { TextField } from "@/components/TextField";
import { fontSize, radius, spacing, useColors } from "@/constants/theme";
import { dataErrorMessage, messages, pgCodes } from "@/lib/errors";
import {
  addDays,
  cleanInvoiceNumber,
  formatAmountInput,
  formatDate,
  parseAmount,
  plural,
  sameInvoiceNumber,
  todayIso,
} from "@/lib/format";
import { supabase } from "@/lib/supabase";
import type { Dobavljac, Faktura } from "@/lib/types";
import { INVOICE_COLUMNS } from "@/lib/useSupplierInvoices";

const IOS = Platform.OS === "ios";


type Props = {
  supplier: Dobavljac;
  /** Invoice to edit; omit to add a new one */
  invoice?: Faktura;
  onClose: () => void;
  onSaved: (invoice: Faktura) => void;
};

export function InvoiceSheet({ supplier, invoice, onClose, onSaved }: Props) {
  const colors = useColors();
  const editing = invoice !== undefined;
  const autoDays = supplier.auto_rok_dana;

  const [broj, setBroj] = useState(invoice?.broj ?? "");
  const [iznos, setIznos] = useState(invoice ? formatAmountInput(invoice.iznos) : "");
  const [datumUnosa, setDatumUnosa] = useState(invoice?.datum_unosa ?? todayIso());
  const [rok, setRok] = useState(
    invoice?.rok_placanja ?? (autoDays !== null ? addDays(todayIso(), autoDays) : "")
  );
  // The due date follows the entry date until the user changes it by hand.
  // When editing, it never moves on its own.
  const [rokTouched, setRokTouched] = useState(editing);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState(false);

  function changeDatumUnosa(iso: string) {
    setDatumUnosa(iso);
    setError(null);
    if (iso && autoDays !== null && !rokTouched) setRok(addDays(iso, autoDays));
  }

  /** Another invoice of this supplier with the same number (any case, trimmed)? */
  async function hasDuplicate(number: string): Promise<boolean | string> {
    const { data, error: dbError, status } = await supabase
      .from("fakture")
      .select("id, broj")
      .eq("dobavljac_id", supplier.id);
    if (dbError) return dataErrorMessage(dbError, status, { fallback: messages.saveFailed });
    return (data ?? []).some((f) => f.id !== invoice?.id && sameInvoiceNumber(f.broj, number));
  }

  async function save(confirmedDuplicate = false) {
    const number = cleanInvoiceNumber(broj);
    if (!number) return setError("Upiši broj fakture.");

    const amount = parseAmount(iznos);
    if (!amount.ok) return setError(amount.error);

    if (!datumUnosa) return setError("Upiši datum unosa.");
    if (!rok) return setError("Upiši rok plaćanja.");
    if (rok < datumUnosa) return setError("Rok plaćanja ne može biti prije datuma unosa.");

    setError(null);

    // Duplicate: warn, but allow. When editing, only if the number changed.
    const numberChanged = !editing || !sameInvoiceNumber(invoice.broj, number);
    if (!confirmedDuplicate && numberChanged) {
      const duplicate = await hasDuplicate(number);
      if (typeof duplicate === "string") return setError(duplicate);
      if (duplicate) return setDuplicateWarning(true);
    }

    // Only the columns this form may change (never placeno / datum_placanja)
    const values = {
      broj: number,
      iznos: amount.value,
      datum_unosa: datumUnosa,
      rok_placanja: rok,
    };
    const errorOptions = {
      fallback: messages.saveFailed,
      byCode: {
        // Supplier deleted meanwhile (insert) — check constraints are mapped by name in errors.ts
        [pgCodes.foreignKeyViolation]: messages.supplierNotFound,
        [pgCodes.numericOverflow]: messages.amountTooLarge,
      },
    };

    if (editing) {
      const { data, error: dbError, status } = await supabase
        .from("fakture")
        .update(values)
        .eq("id", invoice.id)
        .select(INVOICE_COLUMNS);
      if (dbError) return setError(dataErrorMessage(dbError, status, errorOptions));
      // RLS or deleted meanwhile: no error, just 0 rows
      if (!data?.length) return setError(messages.invoiceNotFound);
      onSaved(data[0] as Faktura);
    } else {
      const { data, error: dbError, status } = await supabase
        .from("fakture")
        // unio_korisnik_id is filled by the database (default auth.uid())
        .insert({ firma_id: supplier.firma_id, dobavljac_id: supplier.id, ...values })
        .select(INVOICE_COLUMNS)
        .single();
      if (dbError) return setError(dataErrorMessage(dbError, status, errorOptions));
      onSaved(data as Faktura);
    }
  }

  const hint = editing
    ? null
    : autoDays !== null
      ? `Rok se računa automatski: ${autoDays} ${plural(autoDays, "dan", "dana", "dana")} od datuma unosa. Možeš ga i promijeniti.`
      : "Za ovog dobavljača rok plaćanja unosiš ručno.";

  return (
    <BottomSheet title={editing ? "Uredi fakturu" : "Nova faktura"} onClose={onClose}>
      {error && (
        <Text style={[styles.error, { color: colors.debt }]} accessibilityRole="alert">
          {error}
        </Text>
      )}

      <View style={styles.row}>
        <View style={styles.cell}>
          <TextField
            label="Broj fakture"
            value={broj}
            onChangeText={(text) => {
              setBroj(text);
              setError(null);
              setDuplicateWarning(false);
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            importantForAutofill="no"
            autoFocus={!editing}
          />
        </View>
        <View style={styles.cell}>
          <TextField
            label="Iznos (KM)"
            value={iznos}
            onChangeText={(text) => {
              setIznos(text);
              setError(null);
            }}
            placeholder="0,00"
            keyboardType="decimal-pad"
            inputMode="decimal"
            autoComplete="off"
            importantForAutofill="no"
          />
        </View>
      </View>

      {/* iOS opens the calendar under the field and needs the full width */}
      <View style={IOS ? undefined : styles.row}>
        <View style={IOS ? undefined : styles.cell}>
          <DateField label="Datum unosa" value={datumUnosa} onChange={changeDatumUnosa} />
        </View>
        <View style={IOS ? undefined : styles.cell}>
          <DateField
            label="Rok plaćanja"
            value={rok}
            onChange={(iso) => {
              setRok(iso);
              setRokTouched(true);
              setError(null);
            }}
          />
        </View>
      </View>

      {hint && <Text style={[styles.hint, { color: colors.muted }]}>{hint}</Text>}

      {invoice?.placeno && (
        <Text style={[styles.hint, { color: colors.muted }]}>
          Plaćena: {formatDate(invoice.datum_placanja)} (datum plaćanja se ne mijenja)
        </Text>
      )}

      {duplicateWarning ? (
        <View style={[styles.warning, { backgroundColor: colors.debtSoft }]}>
          <Text style={[styles.warningText, { color: colors.debt }]} accessibilityRole="alert">
            Faktura s ovim brojem već postoji. {editing ? "Ipak spremiti?" : "Ipak dodati?"}
          </Text>
          <View style={styles.actions}>
            <View style={styles.action}>
              <Button title="Odustani" variant="ghost" onPress={() => setDuplicateWarning(false)} />
            </View>
            <View style={styles.action}>
              <Button title={editing ? "Ipak spremi" : "Ipak dodaj"} onPress={() => save(true)} />
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.actions}>
          <View style={styles.action}>
            <Button title="Odustani" variant="ghost" onPress={onClose} />
          </View>
          <View style={styles.action}>
            {/* Locks itself while saving, so a double click adds one invoice */}
            <Button title={editing ? "Spremi izmjene" : "Dodaj fakturu"} onPress={() => save()} />
          </View>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  error: {
    fontSize: fontSize.label,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  cell: {
    flex: 1,
    minWidth: 0,
  },
  hint: {
    fontSize: fontSize.small,
    marginTop: -6,
    marginBottom: spacing.md,
  },
  warning: {
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  warningText: {
    fontSize: fontSize.label,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  action: {
    flex: 1,
  },
});
