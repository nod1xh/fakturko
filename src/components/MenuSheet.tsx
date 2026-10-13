// List of actions in a bottom sheet (the prototype's "⋯" menus).
import { Pressable, StyleSheet, Text, View } from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { fontSize, spacing, useColors } from "@/constants/theme";

export type MenuItem = {
  label: string;
  onPress: () => void;
  danger?: boolean;
};

type Props = {
  title: string;
  /** Small text under the title, e.g. who is signed in */
  subtitle?: string;
  items: MenuItem[];
  onClose: () => void;
};

export function MenuSheet({ title, subtitle, items, onClose }: Props) {
  const colors = useColors();
  const all: MenuItem[] = [...items, { label: "Zatvori", onPress: onClose }];

  return (
    <BottomSheet title={title} onClose={onClose}>
      {subtitle && <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text>}
      <View>
        {all.map((item, index) => (
          <Pressable
            key={item.label}
            accessibilityRole="button"
            onPress={item.onPress}
            style={({ pressed }) => [
              styles.item,
              index < all.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line },
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text style={[styles.label, { color: item.danger ? colors.debt : colors.ink }]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontSize: fontSize.label,
    marginTop: -6,
    marginBottom: spacing.sm,
  },
  item: {
    paddingVertical: 15,
    paddingHorizontal: spacing.xs,
  },
  label: {
    fontSize: fontSize.body,
  },
});
