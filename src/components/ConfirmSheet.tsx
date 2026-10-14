// "Are you sure?" sheet with a red confirm button (prototype: confirmSheet).
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { fontSize, spacing, useColors } from "@/constants/theme";

type Props = {
  title: string;
  message: string;
  confirmLabel: string;
  /** Returns an error message to show, or null when done. */
  onConfirm: () => Promise<string | null>;
  onClose: () => void;
};

export function ConfirmSheet({ title, message, confirmLabel, onConfirm, onClose }: Props) {
  const colors = useColors();
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setError(null);
    setError(await onConfirm());
  }

  return (
    <BottomSheet title={title} onClose={onClose}>
      {error && (
        <Text style={[styles.error, { color: colors.debt }]} accessibilityRole="alert">
          {error}
        </Text>
      )}
      <Text style={[styles.message, { color: colors.muted }]}>{message}</Text>
      <View style={styles.actions}>
        <View style={styles.action}>
          <Button title="Odustani" variant="ghost" onPress={onClose} />
        </View>
        <View style={styles.action}>
          {/* Locks itself while onConfirm runs */}
          <Button title={confirmLabel} variant="danger" onPress={confirm} />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  error: {
    fontSize: fontSize.label,
    marginBottom: 10,
  },
  message: {
    fontSize: fontSize.body,
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  action: {
    flex: 1,
  },
});
