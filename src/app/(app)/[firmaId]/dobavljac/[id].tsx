// Supplier screen. TEMPORARY (step 4.2): name, due-date rule and "Uredi".
// Tabs Dugovanja / Plaćeno come in step 4.3.
import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { SupplierSheet } from "@/components/SupplierSheet";
import { useToast } from "@/components/Toast";
import { BarButton, TopBar } from "@/components/TopBar";
import { fontSize, radius, spacing, useColors } from "@/constants/theme";
import { dataErrorMessage } from "@/lib/errors";
import { dueRuleText, plural } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { isUuid, type Dobavljac } from "@/lib/types";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "notFound" }
  | { status: "ready"; supplier: Dobavljac; invoiceCount: number };

export default function SupplierScreen() {
  const colors = useColors();
  const router = useRouter();
  const toast = useToast();
  const { firmaId, id } = useLocalSearchParams<{ firmaId: string; id: string }>();
  const validIds = isUuid(firmaId) && isUuid(id);

  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async () => {
    if (!validIds) return;
    const [dobavljac, fakture] = await Promise.all([
      supabase
        .from("dobavljaci")
        .select("id, firma_id, naziv, auto_rok_dana")
        .eq("id", id)
        .eq("firma_id", firmaId)
        .maybeSingle(),
      // Count only, no rows: decides whether the supplier can be deleted
      supabase.from("fakture").select("id", { count: "exact", head: true }).eq("dobavljac_id", id),
    ]);
    const failed = [dobavljac, fakture].find((r) => r.error);
    if (failed?.error) {
      setState({ status: "error", message: dataErrorMessage(failed.error, failed.status) });
      return;
    }
    if (!dobavljac.data) {
      setState({ status: "notFound" });
      return;
    }
    setState({
      status: "ready",
      supplier: dobavljac.data as Dobavljac,
      invoiceCount: fakture.count ?? 0,
    });
  }, [firmaId, id, validIds]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!validIds) return <Redirect href="/" />;

  function goToSuppliers() {
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: "/[firmaId]", params: { firmaId } });
  }

  return (
    <Screen>
      <TopBar
        title={state.status === "ready" ? state.supplier.naziv : "Dobavljač"}
        onBack={goToSuppliers}
        right={
          state.status === "ready" ? (
            <BarButton label="Uredi" onPress={() => setEditOpen(true)} />
          ) : undefined
        }
      />

      {state.status === "loading" && <ActivityIndicator color={colors.ink} style={styles.loading} />}

      {state.status === "error" && (
        <View style={[styles.box, { backgroundColor: colors.debtSoft, borderColor: colors.debt }]}>
          <Text style={[styles.text, { color: colors.debt }]}>{state.message}</Text>
          <Button title="Pokušaj ponovo" variant="ghost" onPress={load} />
        </View>
      )}

      {state.status === "notFound" && (
        <View style={[styles.box, styles.dashed, { borderColor: colors.line }]}>
          <Text style={[styles.text, styles.center, { color: colors.muted }]}>
            Dobavljač nije pronađen.
          </Text>
          <Button title="Nazad na dobavljače" variant="ghost" onPress={goToSuppliers} />
        </View>
      )}

      {state.status === "ready" && (
        <View style={[styles.box, styles.dashed, { borderColor: colors.line }]}>
          <Text style={[styles.text, { color: colors.ink }]}>{dueRuleText(state.supplier.auto_rok_dana)}</Text>
          <Text style={[styles.text, { color: colors.muted }]}>
            Ukupno {state.invoiceCount}{" "}
            {plural(state.invoiceCount, "faktura", "fakture", "faktura")}.
          </Text>
          <Text style={[styles.text, { color: colors.muted }]}>
            Tabovi Dugovanja i Plaćeno dolaze u sljedećem koraku.
          </Text>
        </View>
      )}

      {editOpen && state.status === "ready" && (
        <SupplierSheet
          firmaId={firmaId}
          supplier={state.supplier}
          invoiceCount={state.invoiceCount}
          onClose={() => setEditOpen(false)}
          onSaved={(supplier) => {
            setEditOpen(false);
            setState({ ...state, supplier });
            toast("Izmjene spremljene");
          }}
          onDeleted={() => {
            setEditOpen(false);
            toast("Dobavljač obrisan");
            goToSuppliers();
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    marginTop: spacing.xl,
  },
  box: {
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  dashed: {
    borderStyle: "dashed",
  },
  text: {
    fontSize: fontSize.body,
  },
  center: {
    textAlign: "center",
  },
});
