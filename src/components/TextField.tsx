import type { Ref } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

import { useFormFocus } from "@/components/FormFocus";
import { fontSize, radius, spacing, useColors } from "@/constants/theme";

type Props = TextInputProps & {
  label: string;
  ref?: Ref<TextInput>;
};

/** Labeled text input styled like the prototype's form fields. */
export function TextField({ label, style, ref, onFocus, ...inputProps }: Props) {
  const colors = useColors();
  const focus = useFormFocus();

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
      <TextInput
        ref={ref}
        placeholderTextColor={colors.muted}
        style={[
          styles.input,
          { borderColor: colors.line, backgroundColor: colors.paper, color: colors.ink },
          style,
        ]}
        {...inputProps}
        onFocus={(event) => {
          // Typing in a field closes an open date picker of the same form
          focus?.setActiveId(null);
          onFocus?.(event);
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
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSize.body,
  },
});
