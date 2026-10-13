// Add / edit / delete a supplier (prototype: "Novi dobavljač", "Uredi dobavljača").
import { useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { fontSize, spacing, useColors } from "@/constants/theme";
import { dataErrorMessage, messages, pgCodes } from "@/lib/errors";
import { plural } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import type { Dobavljac } from "@/lib/types";

const COLUMNS = "id, firma_id, naziv, auto_rok_dana";
const DEFAULT_DAYS = 30;
const MAX_DAYS = 365; // same limit as the check constraint in the database

type Props = {
  firmaId: string;
  /** Supplier to edit; omit to add a new one */
  supplier?: Dobavljac;
  /** All invoices (paid + unpaid) of the edited supplier; > 0 blocks deleting */
  invoiceCount?: number;
  onClose: () => void;
  onSaved: (supplier: Dobavljac) => void;
  onDeleted?: () => void;
};

export function SupplierSheet({ firmaId, supplier, invoiceCount = 0, onClose, onSaved, onDeleted }: Props) {
  const colors = useColors();
  const editing = supplier !== undefined;

  const [name, setName] = useState(supplier?.naziv ?? "");
  const [auto, setAuto] = useState(supplier ? supplier.auto_rok_dana !== null : false);
  const [days, setDays] = useState(String(supplier?.auto_rok_dana ?? DEFAULT_DAYS));
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save() {
    const naziv = name.trim();
    if (!naziv) return setError("Upiši naziv dobavljača.");

    let autoRokDana: number | null = null;
    if (auto) {
      const n = Number(days.trim());
      if (!/^\d+$/.test(days.trim()) || n > MAX_DAYS) {
        return setError(`Broj dana mora biti cijeli broj od 0 do ${MAX_DAYS}.`);
      }
      autoRokDana = n;
    }

    setError(null);
    const values = { naziv, auto_rok_dana: autoRokDana };
    const errorOptions = {
      fallback: messages.saveFailed,
      byCode: { [pgCodes.uniqueViolation]: messages.duplicateSupplier },
    };

    if (editing) {
      // Only the columns the app may update (see CLAUDE.md)
      const { data, error: dbError, status } = await supabase
        .from("dobavljaci")
        .update(values)
        .eq("id", supplier.id)
        .select(COLUMNS);
      if (dbError) return setError(dataErrorMessage(dbError, status, errorOptions));
      // RLS or a deleted row: no error, just 0 rows
      if (!data?.length) return setError(messages.supplierNotFound);
      onSaved(data[0] as Dobavljac);
    } else {
      const { data, error: dbError, status } = await supabase
        .from("dobavljaci")
        .insert({ firma_id: firmaId, ...values })
        .select(COLUMNS)
        .single();
      if (dbError) return setError(dataErrorMessage(dbError, status, errorOptions));
      onSaved(data as Dobavljac);
    }
  }

  async function remove() {
    if (!supplier) return;
    const { data, error: dbError, status } = await supabase
      .from("dobavljaci")
      .delete()
      .eq("id", supplier.id)
      .select("id");
    if (dbError) {
      return setError(
        dataErrorMessage(dbError, status, {
          fallback: messages.deleteFailed,
          // Backup: the database blocks deleting a supplier with invoices
          byCode: { [pgCodes.foreignKeyViolation]: messages.supplierHasInvoices },
        })
      );
    }
    if (!data?.length) return setError(messages.supplierNotFound);
    onDeleted?.();
  }

  const errorText = error && (
    <Text style={[styles.error, { color: colors.debt }]} accessibilityRole="alert">
      {error}
    </Text>
  );

  if (confirmDelete && supplier) {
    return (
      <BottomSheet title="Obrisati dobavljača?" onClose={onClose}>
        {errorText}
        <Text style={[styles.text, { color: colors.muted }]}>
          Dobavljač {supplier.naziv} bit će trajno obrisan.
        </Text>
        <View style={styles.actions}>
          <View style={styles.action}>
            <Button title="Odustani" variant="ghost" onPress={() => setConfirmDelete(false)} />
          </View>
          <View style={styles.action}>
            <Button title="Obriši" variant="danger" onPress={remove} />
          </View>
        </View>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet title={editing ? "Uredi dobavljača" : "Novi dobavljač"} onClose={onClose}>
      {errorText}

      <TextField
        label="Naziv dobavljača"
        value={name}
        onChangeText={(text) => {
          setName(text);
          setError(null);
        }}
        autoCapitalize="sentences"
        autoComplete="off"
        importantForAutofill="no"
        returnKeyType="done"
        autoFocus={!editing}
      />

      <View style={styles.toggle}>
        <Switch
          value={auto}
          onValueChange={(value) => {
            setAuto(value);
            setError(null);
          }}
          trackColor={{ true: colors.ink, false: colors.line }}
          thumbColor={colors.surface}
          accessibilityLabel="Rok plaćanja se računa automatski"
        />
        <Text style={[styles.toggleLabel, { color: colors.ink }]} onPress={() => setAuto(!auto)}>
          Rok plaćanja se računa automatski
        </Text>
      </View>

      {auto && (
        <TextField
          label="Broj dana do roka plaćanja"
          value={days}
          onChangeText={(text) => {
            setDays(text);
            setError(null);
          }}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={3}
          returnKeyType="done"
        />
      )}

      <Text style={[styles.hint, { color: colors.muted }]}>
        Ako je uključeno, rok se sam popuni kad uneseš fakturu. Inače ga unosiš ručno.
      </Text>

      <View style={styles.actions}>
        <View style={styles.action}>
          {editing && invoiceCount === 0 ? (
            <Button title="Obriši" variant="ghost" onPress={() => setConfirmDelete(true)} />
          ) : (
            <Button title="Odustani" variant="ghost" onPress={onClose} />
          )}
        </View>
        <View style={styles.action}>
          {/* The Button locks itself while save() runs, so a double click saves once */}
          <Button title={editing ? "Spremi izmjene" : "Dodaj dobavljača"} onPress={save} />
        </View>
      </View>

      {editing && invoiceCount > 0 && (
        <Text style={[styles.note, { color: colors.muted }]}>
          Dobavljač ima {invoiceCount} {plural(invoiceCount, "fakturu", "fakture", "faktura")} i ne
          može se obrisati.
        </Text>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  error: {
    fontSize: fontSize.label,
    marginBottom: 10,
  },
  text: {
    fontSize: fontSize.body,
    marginBottom: spacing.lg,
  },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 15,
  },
  hint: {
    fontSize: fontSize.small,
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  action: {
    flex: 1,
  },
  note: {
    fontSize: fontSize.small,
    marginTop: spacing.md,
    textAlign: "center",
  },
});
