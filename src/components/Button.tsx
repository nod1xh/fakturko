import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

import { fontSize, radius, spacing, useColors } from "@/constants/theme";

type Props = {
  title: string;
  /**
   * If this returns a Promise, the button locks itself (spinner, no presses)
   * until it settles, so a double click can never save twice.
   */
  onPress: () => void | Promise<unknown>;
  variant?: "primary" | "ghost" | "danger";
  /** Shows a spinner and blocks presses (for work started elsewhere). */
  loading?: boolean;
  disabled?: boolean;
};

export function Button({ title, onPress, variant = "primary", loading = false, disabled = false }: Props) {
  const colors = useColors();
  const [pending, setPending] = useState(false);
  // State updates are async; the ref also stops a second press in the same tick.
  const lockRef = useRef(false);

  const busy = loading || pending;
  const inactive = disabled || busy;

  const background =
    variant === "primary" ? colors.ink : variant === "danger" ? colors.debt : "transparent";
  const textColor = variant === "ghost" ? colors.ink : colors.btnInk;

  async function handlePress() {
    if (lockRef.current || inactive) return;
    const result = onPress();
    if (!(result instanceof Promise)) return;

    lockRef.current = true;
    setPending(true);
    try {
      await result;
    } finally {
      lockRef.current = false;
      setPending(false);
    }
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: background },
        variant === "ghost" && { borderWidth: 1, borderColor: colors.line },
        (pressed || inactive) && { opacity: 0.7 },
      ]}
    >
      {busy ? (
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
