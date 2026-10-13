// "Moje firme": always shown, also with one company (later: "Dodaj firmu").
// Each company is a big card with its debt summary, like the prototype's home.
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { AccountMenu } from "@/components/AccountMenu";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { BarButton, TopBar } from "@/components/TopBar";
import { fonts, fontSize, radius, spacing, useColors } from "@/constants/theme";
import { dataErrorMessage } from "@/lib/errors";
import { isOverdue, money, plural, sumAmounts } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { vrstaObjektaLabel, type Firma, type OtvorenaFaktura } from "@/lib/types";

type FirmaSummary = Firma & {
  supplierCount: number;
  openCount: number;
  overdueCount: number;
  debt: number;
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; firme: FirmaSummary[] };

export default function MyCompaniesScreen() {
  const colors = useColors();
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const load = useCallback(async () => {
    // RLS returns only the companies (and their rows) the user is a member of.
    const [firme, dobavljaci, fakture] = await Promise.all([
      supabase.from("firme").select("id, naziv, vrsta_objekta"),
      supabase.from("dobavljaci").select("firma_id"),
      supabase
        .from("fakture")
        .select("firma_id, dobavljac_id, iznos, rok_placanja")
        .eq("placeno", false),
    ]);
    const failed = [firme, dobavljaci, fakture].find((r) => r.error);
    if (failed?.error) {
      setState({ status: "error", message: dataErrorMessage(failed.error, failed.status) });
      return;
    }

    const open = (fakture.data ?? []) as OtvorenaFaktura[];
    const supplierFirmIds = (dobavljaci.data ?? []).map((d) => d.firma_id as string);

    const summaries = ((firme.data ?? []) as Firma[])
      .map((firma) => {
        const own = open.filter((f) => f.firma_id === firma.id);
        return {
          ...firma,
          supplierCount: supplierFirmIds.filter((id) => id === firma.id).length,
          openCount: own.length,
          overdueCount: own.filter((f) => isOverdue(f.rok_placanja)).length,
          debt: sumAmounts(own.map((f) => f.iznos)),
        };
      })
      .sort((a, b) => a.naziv.localeCompare(b.naziv, "bs"));

    setState({ status: "ready", firme: summaries });
  }, []);

  // Reload every time the screen comes into view (e.g. back from a company).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <TopBar
        title="Moje firme"
        right={<BarButton label="⋯" accessibilityLabel="Meni" onPress={() => setMenuOpen(true)} />}
      />

      {state.status === "loading" && <ActivityIndicator color={colors.ink} style={styles.loading} />}

      {state.status === "error" && (
        <View style={[styles.box, { backgroundColor: colors.debtSoft, borderColor: colors.debt }]}>
          <Text style={[styles.boxText, { color: colors.debt }]}>{state.message}</Text>
          <Button title="Pokušaj ponovo" variant="ghost" onPress={load} />
        </View>
      )}

      {state.status === "ready" && state.firme.length === 0 && (
        <View style={[styles.box, styles.empty, { borderColor: colors.line }]}>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            Nemaš pristup nijednoj firmi.
          </Text>
        </View>
      )}

      {state.status === "ready" && (
        <View style={styles.list}>
          {state.firme.map((firma) => (
            <Pressable
              key={firma.id}
              accessibilityRole="button"
              accessibilityLabel={`${firma.naziv}, dug ${money(firma.debt)}`}
              onPress={() => router.push({ pathname: "/[firmaId]", params: { firmaId: firma.id } })}
              style={({ pressed }) => [
                styles.brand,
                { backgroundColor: colors.ink },
                pressed && { transform: [{ scale: 0.985 }] },
              ]}
            >
              <Text style={[styles.brandType, { color: colors.btnInk }]}>
                {vrstaObjektaLabel[firma.vrsta_objekta] ?? firma.vrsta_objekta}
              </Text>
              <Text style={[styles.brandName, { color: colors.btnInk }]}>{firma.naziv}</Text>
              <View style={styles.brandMeta}>
                <Text style={[styles.brandMetaText, { color: colors.btnInk }]}>
                  {firma.supplierCount}{" "}
                  {plural(firma.supplierCount, "dobavljač", "dobavljača", "dobavljača")}
                </Text>
                <Text style={[styles.brandDebt, { color: colors.btnInk }]}>{money(firma.debt)}</Text>
              </View>
              <Text style={[styles.brandSummary, { color: colors.btnInk }]}>
                {summaryText(firma)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {menuOpen && <AccountMenu onClose={() => setMenuOpen(false)} />}
    </Screen>
  );
}

function summaryText({ openCount, overdueCount }: FirmaSummary): string {
  if (openCount === 0) return "Nema otvorenih dugovanja.";
  const open = `Otvoreno: ${openCount} ${plural(openCount, "faktura", "fakture", "faktura")}`;
  if (overdueCount === 0) return `${open}.`;
  return `${open}, od toga ${overdueCount} ${plural(overdueCount, "kasni", "kasne", "kasni")} s plaćanjem.`;
}

const styles = StyleSheet.create({
  loading: {
    marginTop: spacing.xl,
  },
  list: {
    gap: spacing.md,
  },
  brand: {
    borderRadius: 28,
    paddingTop: 26,
    paddingHorizontal: 28,
    paddingBottom: 24,
  },
  brandType: {
    fontSize: fontSize.label,
    opacity: 0.75,
    marginBottom: spacing.xs,
  },
  brandName: {
    fontFamily: fonts.serif,
    fontSize: fontSize.hero,
    lineHeight: fontSize.hero * 1.05,
  },
  brandMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: 22,
    gap: spacing.md,
  },
  brandMetaText: {
    fontSize: 15,
    opacity: 0.85,
  },
  brandDebt: {
    fontSize: 20,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  brandSummary: {
    fontSize: fontSize.label,
    opacity: 0.85,
    marginTop: spacing.sm,
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
  },
  emptyText: {
    fontSize: fontSize.body,
    textAlign: "center",
  },
});
