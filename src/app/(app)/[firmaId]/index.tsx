// Suppliers of one company, with open debt per supplier.
import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { AccountMenu } from "@/components/AccountMenu";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { SupplierSheet } from "@/components/SupplierSheet";
import { useToast } from "@/components/Toast";
import { BarButton, TopBar } from "@/components/TopBar";
import { fontSize, radius, spacing, useColors } from "@/constants/theme";
import { dataErrorMessage } from "@/lib/errors";
import { dueRuleText, isOverdue, money, sumAmounts } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { isUuid, type Dobavljac, type Firma, type OtvorenaFaktura } from "@/lib/types";

type SupplierRow = Dobavljac & {
  openCount: number;
  overdueCount: number;
  debt: number;
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "notFound" }
  | { status: "ready"; firma: Firma; suppliers: SupplierRow[] };

export default function SuppliersScreen() {
  const colors = useColors();
  const router = useRouter();
  const toast = useToast();
  const { firmaId } = useLocalSearchParams<{ firmaId: string }>();
  const validId = isUuid(firmaId);

  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    if (!validId) return;
    const [firma, dobavljaci, fakture] = await Promise.all([
      supabase.from("firme").select("id, naziv, vrsta_objekta").eq("id", firmaId).maybeSingle(),
      supabase.from("dobavljaci").select("id, firma_id, naziv, auto_rok_dana").eq("firma_id", firmaId),
      supabase
        .from("fakture")
        .select("firma_id, dobavljac_id, iznos, rok_placanja")
        .eq("firma_id", firmaId)
        .eq("placeno", false),
    ]);
    const failed = [firma, dobavljaci, fakture].find((r) => r.error);
    if (failed?.error) {
      setState({ status: "error", message: dataErrorMessage(failed.error, failed.status) });
      return;
    }
    // No row = company doesn't exist or the user is not a member (RLS)
    if (!firma.data) {
      setState({ status: "notFound" });
      return;
    }

    const open = (fakture.data ?? []) as OtvorenaFaktura[];
    const suppliers = ((dobavljaci.data ?? []) as Dobavljac[])
      .map((dobavljac) => {
        const own = open.filter((f) => f.dobavljac_id === dobavljac.id);
        return {
          ...dobavljac,
          openCount: own.length,
          overdueCount: own.filter((f) => isOverdue(f.rok_placanja)).length,
          debt: sumAmounts(own.map((f) => f.iznos)),
        };
      })
      .sort((a, b) => a.naziv.localeCompare(b.naziv, "bs"));

    setState({ status: "ready", firma: firma.data as Firma, suppliers });
  }, [firmaId, validId]);

  // Reload every time the screen comes into view (e.g. back from a supplier).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Not a company id (e.g. a mistyped URL): go to "Moje firme".
  if (!validId) return <Redirect href="/" />;

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function goBack() {
    // After a page reload on web there is no history, so go to the list directly.
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  const title = state.status === "ready" ? state.firma.naziv : "Dobavljači";

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <TopBar
        title={title}
        onBack={goBack}
        right={<BarButton label="⋯" accessibilityLabel="Meni" onPress={() => setMenuOpen(true)} />}
      />

      {state.status === "loading" && <ActivityIndicator color={colors.ink} style={styles.loading} />}

      {state.status === "error" && (
        <View style={[styles.box, { backgroundColor: colors.debtSoft, borderColor: colors.debt }]}>
          <Text style={[styles.boxText, { color: colors.debt }]}>{state.message}</Text>
          <Button title="Pokušaj ponovo" variant="ghost" onPress={load} />
        </View>
      )}

      {state.status === "notFound" && (
        <View style={[styles.box, styles.empty, { borderColor: colors.line }]}>
          <Text style={[styles.emptyText, { color: colors.muted }]}>Firma nije pronađena.</Text>
          <Button title="Moje firme" variant="ghost" onPress={() => router.replace("/")} />
        </View>
      )}

      {state.status === "ready" && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>Dobavljači</Text>

          {state.suppliers.length === 0 ? (
            <View style={[styles.box, styles.empty, { borderColor: colors.line }]}>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                Još nema dobavljača. Dodaj prvog da počneš unositi fakture.
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {state.suppliers.map((s) => (
                <Pressable
                  key={s.id}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname: "/[firmaId]/dobavljac/[id]",
                      params: { firmaId, id: s.id },
                    })
                  }
                  style={({ pressed }) => [
                    styles.row,
                    { backgroundColor: colors.surface, borderColor: colors.line },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <View style={styles.rowLeft}>
                    <Text style={[styles.name, { color: colors.ink }]}>{s.naziv}</Text>
                    <Text style={[styles.sub, { color: colors.muted }]}>
                      {dueRuleText(s.auto_rok_dana)}
                    </Text>
                  </View>
                  <View style={styles.rowRight}>
                    {s.openCount > 0 ? (
                      <>
                        <Text style={[styles.owed, { color: colors.debt }]}>{money(s.debt)}</Text>
                        <Text style={[styles.sub, { color: colors.muted }]}>
                          {s.openCount} otvoreno{s.overdueCount > 0 ? `, ${s.overdueCount} kasni` : ""}
                        </Text>
                      </>
                    ) : (
                      <Text style={[styles.clear, { color: colors.paid }]}>Sve plaćeno</Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.addButton}>
            <Button title="Dodaj dobavljača" onPress={() => setAddOpen(true)} />
          </View>
        </>
      )}

      {menuOpen && <AccountMenu onClose={() => setMenuOpen(false)} />}

      {addOpen && (
        <SupplierSheet
          firmaId={firmaId}
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            toast("Dobavljač dodan");
            load();
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
  sectionTitle: {
    fontSize: fontSize.label,
    marginBottom: spacing.sm,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  rowLeft: {
    flex: 1,
    minWidth: 0,
  },
  rowRight: {
    alignItems: "flex-end",
  },
  name: {
    fontSize: 17,
    fontWeight: "600",
  },
  sub: {
    fontSize: fontSize.label,
    fontVariant: ["tabular-nums"],
  },
  owed: {
    fontSize: fontSize.body,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  clear: {
    fontSize: fontSize.label,
  },
  addButton: {
    marginTop: 14,
  },
  box: {
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  boxText: {
    fontSize: fontSize.label,
  },
  empty: {
    borderStyle: "dashed",
    paddingVertical: 28,
  },
  emptyText: {
    fontSize: fontSize.body,
    textAlign: "center",
  },
});
