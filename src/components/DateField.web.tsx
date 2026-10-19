// Date field for web: the browser's own <input type="date"> (calendar on
// desktop, date wheel in Safari on iPhone). No library needed.
// The phone version is DateField.tsx.
import { StyleSheet, Text, View, useColorScheme } from "react-native";

import { fontSize, radius, spacing, useColors } from "@/constants/theme";
import type { DateFieldProps } from "@/components/DateField";

export type { DateFieldProps };

export function DateField({ label, value, onChange }: DateFieldProps) {
  const colors = useColors();
  const scheme = useColorScheme();

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
      <input
        type="date"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{
          width: "100%",
          boxSizing: "border-box",
          minHeight: 46,
          border: `1px solid ${colors.line}`,
          borderRadius: radius.md,
          padding: spacing.md,
          fontSize: fontSize.body,
          fontFamily: "inherit",
          color: colors.ink,
          backgroundColor: colors.paper,
          // Calendar popup in the same light/dark theme
          colorScheme: scheme === "dark" ? "dark" : "light",
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.label,
    marginBottom: 5,
  },
});
