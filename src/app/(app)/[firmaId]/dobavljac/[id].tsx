// Supplier screen (prototype: supplier view): summary, tabs Dugovanja /
// Plaćeno, invoice rows with pay checkbox, "⋯" menu per invoice.
import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { InvoiceRow } from "@/components/InvoiceRow";
import { InvoiceSheet } from "@/components/InvoiceSheet";
import { MenuSheet } from "@/components/MenuSheet";
import { Screen } from "@/components/Screen";
import { SupplierSheet } from "@/components/SupplierSheet";
import { useToast } from "@/components/Toast";
import { BarButton, TopBar } from "@/components/TopBar";
import { fontSize, radius, spacing, useColors } from "@/constants/theme";
import { money, sumAmounts } from "@/lib/format";
import { isUuid, type Faktura } from "@/lib/types";
import { useSupplierInvoices } from "@/lib/useSupplierInvoices";

type Tab = "debt" | "paid";

const ERROR_TOAST_MS = 4000;

export default function SupplierScreen() {
  const { firmaId, id } = useLocalSearchParams<{ firmaId: string; id: string }>();
  // Not ids (e.g. a mistyped URL): go to "Moje firme".
  if (!isUuid(firmaId) || !isUuid(id)) return <Redirect href="/" />;
  return <SupplierView firmaId={firmaId} supplierId={id} />;
}

function SupplierView({ firmaId, supplierId }: { firmaId: string; supplierId: string }) {
  const colors = useColors();
  const router = useRouter();
  const toast = useToast();

  const showError = useCallback(
    (message: string) => toast(message, { duration: ERROR_TOAST_MS }),
    [toast]
  );
  const { status, supplier, setSupplier, invoices, load, setPaid, restore, deleteInvoice, upsertInvoice } =
    useSupplierInvoices(firmaId, supplierId, showError);

  const [tab, setTab] = useState<Tab>("debt");
  const [refreshing, setRefreshing] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<Faktura | null>(null);
  const [deleteFor, setDeleteFor] = useState<Faktura | null>(null);
  // null = closed; { invoice: undefined } = new invoice; { invoice } = edit
  const [invoiceForm, setInvoiceForm] = useState<{ invoice?: Faktura } | null>(null);

  // Reload every time the screen comes into view.
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

  function goToSuppliers() {
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: "/[firmaId]", params: { firmaId } });
  }

  function togglePaid(invoice: Faktura) {
    const paid = !invoice.placeno;
    const previous = setPaid(invoice, paid);
    toast(paid ? "Prebačeno u Plaćeno" : "Vraćeno u Dugovanja", {
      action: { label: "Poništi", onPress: () => restore(invoice, previous) },
    });
  }

  const open = invoices
    .filter((f) => !f.placeno)
    .sort(
      (a, b) =>
        a.rok_placanja.localeCompare(b.rok_placanja) ||
        a.datum_unosa.localeCompare(b.datum_unosa) ||
        a.broj.localeCompare(b.broj, "bs")
    );
  const paid = invoices
    .filter((f) => f.placeno)
    .sort(
      (a, b) =>
        (b.datum_placanja ?? "").localeCompare(a.datum_placanja ?? "") ||
        b.datum_unosa.localeCompare(a.datum_unosa)
    );
  const shown = tab === "debt" ? open : paid;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <TopBar
        title={supplier?.naziv ?? "Dobavljač"}
        onBack={goToSuppliers}
        right={
          status.kind === "ready" && supplier ? (
            <BarButton label="Uredi" onPress={() => setEditOpen(true)} />
          ) : undefined
        }
      />

      {status.kind === "loading" && <ActivityIndicator color={colors.ink} style={styles.loading} />}

      {status.kind === "error" && (
        <View style={[styles.box, { backgroundColor: colors.debtSoft, borderColor: colors.debt }]}>
          <Text style={[styles.boxText, { color: colors.debt }]}>{status.message}</Text>
          <Button title="Pokušaj ponovo" variant="ghost" onPress={load} />
        </View>
      )}

      {status.kind === "notFound" && (
        <View style={[styles.box, styles.empty, { borderColor: colors.line }]}>
          <Text style={[styles.emptyText, { color: colors.muted }]}>Dobavljač nije pronađen.</Text>
          <Button title="Nazad na dobavljače" variant="ghost" onPress={goToSuppliers} />
        </View>
      )}

      {status.kind === "ready" && (
        <>
          <View style={styles.summary}>
            <View style={[styles.summaryCard, { backgroundColor: colors.debtSoft }]}>
              <Text style={[styles.summaryLabel, { color: colors.muted }]}>Dugovanja</Text>
              <Text style={[styles.summaryAmount, { color: colors.debt }]}>
                {money(sumAmounts(open.map((f) => f.iznos)))}
              </Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.paidSoft }]}>
              <Text style={[styles.summaryLabel, { color: colors.muted }]}>Plaćeno</Text>
              <Text style={[styles.summaryAmount, { color: colors.paid }]}>
                {money(sumAmounts(paid.map((f) => f.iznos)))}
              </Text>
            </View>
          </View>

          <View
            accessibilityRole="tablist"
            style={[styles.tabs, { backgroundColor: colors.surface, borderColor: colors.line }]}
          >
            <TabButton label={`Dugovanja (${open.length})`} selected={tab === "debt"} onPress={() => setTab("debt")} />
            <TabButton label={`Plaćeno (${paid.length})`} selected={tab === "paid"} onPress={() => setTab("paid")} />
          </View>

          {shown.length === 0 ? (
            <View style={[styles.box, styles.empty, { borderColor: colors.line }]}>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                {tab === "debt"
                  ? "Nema dugovanja prema ovom dobavljaču."
                  : "Još nema plaćenih faktura. Kad označiš fakturu kao plaćenu, pojavit će se ovdje."}
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {shown.map((invoice) => (
                <InvoiceRow
                  key={invoice.id}
                  invoice={invoice}
                  onToggle={() => togglePaid(invoice)}
                  onMenu={() => setMenuFor(invoice)}
                />
              ))}
            </View>
          )}

          {tab === "debt" && (
            <View style={styles.addButton}>
              <Button title="Dodaj fakturu" onPress={() => setInvoiceForm({})} />
            </View>
          )}
        </>
      )}

      {menuFor && (
        <MenuSheet
          title={menuFor.broj}
          onClose={() => setMenuFor(null)}
          items={[
            {
              label: menuFor.placeno ? "Vrati u dugovanja" : "Označi kao plaćeno",
              onPress: () => {
                setMenuFor(null);
                togglePaid(menuFor);
              },
            },
            {
              label: "Uredi fakturu",
              onPress: () => {
                setMenuFor(null);
                setInvoiceForm({ invoice: menuFor });
              },
            },
            {
              label: "Obriši fakturu",
              danger: true,
              onPress: () => {
                setMenuFor(null);
                setDeleteFor(menuFor);
              },
            },
          ]}
        />
      )}

      {deleteFor && (
        <ConfirmSheet
          title="Obrisati fakturu?"
          message={`Faktura ${deleteFor.broj} bit će trajno obrisana.`}
          confirmLabel="Obriši"
          onClose={() => setDeleteFor(null)}
          onConfirm={async () => {
            const error = await deleteInvoice(deleteFor);
            if (!error) {
              setDeleteFor(null);
              toast("Faktura obrisana");
            }
            return error;
          }}
        />
      )}

      {invoiceForm && supplier && (
        <InvoiceSheet
          supplier={supplier}
          invoice={invoiceForm.invoice}
          onClose={() => setInvoiceForm(null)}
          onSaved={(saved) => {
            const isNew = !invoiceForm.invoice;
            setInvoiceForm(null);
            upsertInvoice(saved);
            toast(isNew ? "Faktura dodana" : "Izmjene spremljene");
          }}
        />
      )}

      {editOpen && supplier && (
        <SupplierSheet
          firmaId={firmaId}
          supplier={supplier}
          invoiceCount={invoices.length}
          onClose={() => setEditOpen(false)}
          onSaved={(saved) => {
            setEditOpen(false);
            setSupplier(saved);
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

function TabButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      style={[styles.tab, selected && { backgroundColor: colors.ink }]}
    >
      <Text style={[styles.tabText, { color: selected ? colors.btnInk : colors.muted }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loading: {
    marginTop: spacing.xl,
  },
  summary: {
    flexDirection: "row",
    gap: 10,
    marginBottom: spacing.lg,
  },
  summaryCard: {
    flex: 1,
    borderRadius: radius.xl,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  summaryLabel: {
    fontSize: fontSize.small,
  },
  summaryAmount: {
    fontSize: fontSize.title,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  tabs: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.xs,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    borderRadius: radius.sm,
    padding: 11,
    alignItems: "center",
  },
  tabText: {
    fontSize: fontSize.body,
    fontWeight: "600",
  },
  list: {
    gap: spacing.sm,
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
