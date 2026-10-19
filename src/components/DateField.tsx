// Date field for Android and iOS. Shows "DD.MM.YYYY."; tapping opens the
// system date picker (Android: dialog, iOS: calendar under the field).
// The web version is DateField.web.tsx (browser's own date input).
//
// iOS calendar closes when a date is picked, another field gets focus,
// another date field opens, or an empty part of the form is tapped
// (FormFocus). The Android dialog is modal, so nothing else can be touched
// while it is open; it closes on pick, "Odustani" or the back button.
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useId, useState } from "react";
import { Keyboard, Platform, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";

import { useFormFocus } from "@/components/FormFocus";
import { fontSize, radius, spacing, useColors } from "@/constants/theme";
import { dateToIso, formatDate, isoToDate, todayIso } from "@/lib/format";

export type DateFieldProps = {
  label: string;
  /** "YYYY-MM-DD", or "" when empty */
  value: string;
  onChange: (iso: string) => void;
};

export function DateField({ label, value, onChange }: DateFieldProps) {
  const colors = useColors();
  const scheme = useColorScheme();
  const id = useId();
  const focus = useFormFocus();
  // Inside a sheet the form decides which field is open; elsewhere, local state
  const [localOpen, setLocalOpen] = useState(false);
  const iosOpen = focus ? focus.activeId === id : localOpen;

  function setIosOpen(open: boolean) {
    if (focus) focus.setActiveId(open ? id : null);
    else setLocalOpen(open);
  }

  // Empty field: the picker starts at today
  const pickerValue = isoToDate(value || todayIso());

  function open() {
    // Leave the text field that had focus, so the keyboard goes away
    Keyboard.dismiss();
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: pickerValue,
        mode: "date",
        positiveButton: { label: "U redu" },
        negativeButton: { label: "Odustani" },
        onValueChange: (_event, date) => onChange(dateToIso(date)),
      });
    } else {
      setIosOpen(!iosOpen);
    }
  }

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? formatDate(value) : "nije odabran"}`}
        style={[
          styles.input,
          { borderColor: iosOpen ? colors.ink : colors.line, backgroundColor: colors.paper },
        ]}
      >
        <Text style={[styles.value, { color: value ? colors.ink : colors.muted }]}>
          {value ? formatDate(value) : "Odaberi datum"}
        </Text>
      </Pressable>

      {iosOpen && Platform.OS === "ios" && (
        // Claims touches inside the calendar (e.g. month arrows), so they
        // don't reach the sheet's "tap empty space" handler and close it.
        <View onStartShouldSetResponder={() => true}>
          <DateTimePicker
            value={pickerValue}
            mode="date"
            display="inline"
            locale="bs-BA"
            themeVariant={scheme === "dark" ? "dark" : "light"}
            accentColor={colors.ink}
            onValueChange={(_event, date) => {
              onChange(dateToIso(date));
              setIosOpen(false);
            }}
          />
        </View>
      )}
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
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  value: {
    fontSize: fontSize.body,
    fontVariant: ["tabular-nums"],
  },
});
