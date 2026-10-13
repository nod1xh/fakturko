// Screen header like the prototype: round back button, big serif title,
// optional buttons on the right.
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { fonts, fontSize, radius, spacing, useColors } from "@/constants/theme";

type Props = {
  title: string;
  onBack?: () => void;
  /** Usually one or more <BarButton /> */
  right?: ReactNode;
};

export function TopBar({ title, onBack, right }: Props) {
  const colors = useColors();

  return (
    <View style={styles.bar}>
      {onBack && (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Nazad"
          hitSlop={6}
          style={({ pressed }) => [
            styles.back,
            { borderColor: colors.line, backgroundColor: colors.surface },
            pressed && { opacity: 0.6 },
          ]}
        >
          {/* Chevron drawn with two borders, so no icon library is needed */}
          <View style={[styles.chevron, { borderColor: colors.ink }]} />
        </Pressable>
      )}
      <Text
        style={[styles.title, { color: colors.ink }]}
        numberOfLines={1}
        accessibilityRole="header"
      >
        {title}
      </Text>
      {right}
    </View>
  );
}

type BarButtonProps = {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
};

/** Small pill button for the top bar ("Uredi", "⋯"). */
export function BarButton({ label, onPress, accessibilityLabel }: BarButtonProps) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={6}
      style={({ pressed }) => [
        styles.barButton,
        { borderColor: colors.line, backgroundColor: colors.surface },
        pressed && { opacity: 0.6 },
      ]}
    >
      <Text style={[styles.barButtonText, { color: colors.ink }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: 18,
  },
  back: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chevron: {
    width: 11,
    height: 11,
    borderLeftWidth: 2.4,
    borderBottomWidth: 2.4,
    transform: [{ rotate: "45deg" }],
    marginLeft: 4,
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.serif,
    fontSize: fontSize.heading,
    lineHeight: fontSize.heading * 1.15,
  },
  barButton: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: 14,
    minHeight: 38,
    justifyContent: "center",
  },
  barButtonText: {
    fontSize: fontSize.label,
  },
});
