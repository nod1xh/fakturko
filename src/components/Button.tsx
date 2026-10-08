import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

import { fontSize, radius, spacing, useColors } from "@/constants/theme";

type Props = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "ghost";
  /** Shows a spinner and blocks presses. */
  loading?: boolean;
  disabled?: boolean;
};

export function Button({ title, onPress, variant = "primary", loading = false, disabled = false }: Props) {
  const colors = useColors();
  const primary = variant === "primary";
  const inactive = disabled || loading;
  const textColor = primary ? colors.btnInk : colors.ink;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        primary
          ? { backgroundColor: colors.ink }
          : { borderWidth: 1, borderColor: colors.line, backgroundColor: "transparent" },
        (pressed || inactive) && { opacity: 0.7 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: fontSize.body,
    fontWeight: "600",
  },
});
