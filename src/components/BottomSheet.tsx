// Bottom sheet like the prototype: dark scrim, panel sliding up from the
// bottom. Closes on scrim tap, Android back button and Esc on web.
// Mount it only while open ({open && <BottomSheet …/>}), so forms inside
// start fresh every time.
// Tapping an empty part of the sheet closes the keyboard and an open
// date field (see FormFocus).
import type { ReactNode } from "react";
import { Keyboard, KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FormFocusProvider, useFormFocus } from "@/components/FormFocus";

import { fonts, maxContentWidth, radius, spacing, useColors } from "@/constants/theme";

type Props = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function BottomSheet(props: Props) {
  return (
    <FormFocusProvider>
      <SheetContent {...props} />
    </FormFocusProvider>
  );
}

function SheetContent({ title, onClose, children }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const focus = useFormFocus();

  function closeOpenFields() {
    focus?.setActiveId(null);
    Keyboard.dismiss();
  }

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
            {/* Taps on fields and buttons are handled by them; taps on empty space land here */}
            <Pressable onPress={closeOpenFields} accessible={false} style={styles.body}>
              <Text style={[styles.title, { color: colors.ink }]} accessibilityRole="header">
                {title}
              </Text>
              {children}
            </Pressable>
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
  body: {
    cursor: "auto",
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 30,
    lineHeight: 36,
    marginBottom: 14,
  },
});
