// Bottom sheet like the prototype: dark scrim, panel sliding up from the
// bottom. Closes on scrim tap, Android back button and Esc on web.
// Mount it only while open ({open && <BottomSheet …/>}), so forms inside
// start fresh every time.
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fonts, maxContentWidth, radius, spacing, useColors } from "@/constants/theme";

type Props = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function BottomSheet({ title, onClose, children }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      {/* "padding" only adds space when the keyboard actually covers the sheet */}
      <KeyboardAvoidingView behavior="padding" style={styles.container}>
        <Pressable
          style={styles.scrim}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Zatvori"
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, paddingBottom: spacing.xl + insets.bottom },
          ]}
        >
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
            <Text style={[styles.title, { color: colors.ink }]} accessibilityRole="header">
              {title}
            </Text>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(10, 15, 20, 0.45)",
  },
  sheet: {
    width: "100%",
    maxWidth: maxContentWidth,
    maxHeight: "92%",
    alignSelf: "center",
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingTop: spacing.xl,
    paddingHorizontal: 18,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 30,
    lineHeight: 36,
    marginBottom: 14,
  },
});
