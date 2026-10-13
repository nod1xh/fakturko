// Scrollable screen with safe areas and the prototype's centered column.
// Pull-to-refresh on phones when onRefresh is given.
import type { ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { maxContentWidth, spacing, useColors } from "@/constants/theme";

type Props = {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
};

export function Screen({ children, refreshing = false, onRefresh }: Props) {
  const colors = useColors();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.paper }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />
          ) : undefined
        }
      >
        <View style={styles.content}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    paddingTop: spacing.lg,
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  content: {
    width: "100%",
    maxWidth: maxContentWidth,
    alignSelf: "center",
  },
});
