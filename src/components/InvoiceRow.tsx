// One invoice like the prototype: pay checkbox, number + amount, dates,
// due flag, "⋯" menu. Overdue invoices get a red border.
import { Pressable, StyleSheet, Text, View } from "react-native";

import { fontSize, radius, spacing, useColors, type Colors } from "@/constants/theme";
import { daysUntil, formatDate, money, plural } from "@/lib/format";
import type { Faktura } from "@/lib/types";

const SOON_DAYS = 7; // "due soon" window, computed in the app (never stored)

type Flag = { text: string; tone: "late" | "soon" };

/** "Kasni 3 dana" / "Dospijeva danas" / "Dospijeva za 4 dana" (unpaid only). */
export function dueFlag(invoice: Faktura): Flag | null {
  if (invoice.placeno) return null;
  const days = daysUntil(invoice.rok_placanja);
  if (days < 0) return { text: `Kasni ${-days} ${plural(-days, "dan", "dana", "dana")}`, tone: "late" };
  if (days === 0) return { text: "Dospijeva danas", tone: "late" };
  if (days <= SOON_DAYS) return { text: `Dospijeva za ${days} ${plural(days, "dan", "dana", "dana")}`, tone: "soon" };
  return null;
}

type Props = {
  invoice: Faktura;
  onToggle: () => void;
  onMenu: () => void;
};

export function InvoiceRow({ invoice, onToggle, onMenu }: Props) {
  const colors = useColors();
  const flag = dueFlag(invoice);
  const overdue = !invoice.placeno && daysUntil(invoice.rok_placanja) < 0;

  const dates: [string, string][] = invoice.placeno
    ? [
        ["Kreirana", formatDate(invoice.datum_unosa)],
        ["Plaćena", formatDate(invoice.datum_placanja)],
      ]
    : [
        ["Unesena", formatDate(invoice.datum_unosa)],
        ["Rok plaćanja", formatDate(invoice.rok_placanja)],
      ];

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.surface, borderColor: overdue ? colors.debt : colors.line },
      ]}
    >
      <PayCheckbox checked={invoice.placeno} onPress={onToggle} colors={colors} />

      <View style={styles.body}>
        <View style={styles.top}>
          <Text style={[styles.number, { color: colors.ink }]} numberOfLines={1}>
            {invoice.broj}
          </Text>
          <Text style={[styles.amount, { color: colors.ink }]}>{money(invoice.iznos)}</Text>
        </View>

        <View style={styles.dates}>
          <View>
            {dates.map(([label]) => (
              <Text key={label} style={[styles.dateText, { color: colors.muted }]}>
                {label}
              </Text>
            ))}
          </View>
          <View>
            {dates.map(([label, value]) => (
              <Text key={label} style={[styles.dateText, { color: colors.ink }]}>
                {value}
              </Text>
            ))}
          </View>
        </View>

        {flag && (
          <View
            style={[
              styles.flag,
              { backgroundColor: flag.tone === "late" ? colors.debtSoft : colors.paper },
            ]}
          >
            <Text style={[styles.flagText, { color: flag.tone === "late" ? colors.debt : colors.ink }]}>
              {flag.text}
            </Text>
          </View>
        )}
      </View>

      <Pressable
        onPress={onMenu}
        accessibilityRole="button"
        accessibilityLabel={`Opcije fakture ${invoice.broj}`}
        hitSlop={10}
        style={({ pressed }) => [styles.more, pressed && { opacity: 0.5 }]}
      >
        <Text style={[styles.moreText, { color: colors.muted }]}>⋯</Text>
      </Pressable>
    </View>
  );
}

function PayCheckbox({ checked, onPress, colors }: { checked: boolean; onPress: () => void; colors: Colors }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={checked ? "Vrati u dugovanja" : "Označi kao plaćeno"}
      hitSlop={8}
      style={({ pressed }) => [
        styles.check,
        checked
          ? { backgroundColor: colors.paid, borderColor: colors.paid }
          : { borderColor: pressed ? colors.paid : colors.line },
      ]}
    >
      {/* Check mark drawn with two borders, so no icon library is needed */}
      {checked && <View style={[styles.checkMark, { borderColor: colors.btnInk }]} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.xl,
    paddingVertical: 14,
    paddingLeft: spacing.md,
    paddingRight: 14,
  },
  check: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 2,
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: {
    width: 14,
    height: 8,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    transform: [{ rotate: "-45deg" }],
    marginTop: -3,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 10,
  },
  number: {
    flexShrink: 1,
    fontSize: fontSize.body,
    fontWeight: "600",
  },
  amount: {
    fontSize: fontSize.body,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  dates: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  dateText: {
    fontSize: fontSize.label,
    lineHeight: 20,
    fontVariant: ["tabular-nums"],
  },
  flag: {
    alignSelf: "flex-start",
    marginTop: spacing.sm,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: radius.pill,
  },
  flagText: {
    fontSize: fontSize.small,
    fontWeight: "600",
  },
  more: {
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
  },
  moreText: {
    fontSize: 20,
    lineHeight: 22,
  },
});
