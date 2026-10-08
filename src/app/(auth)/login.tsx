import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { fonts, fontSize, radius, spacing, useColors } from "@/constants/theme";
import { authErrorMessage } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const colors = useColors();
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn() {
    if (busy) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail && !password) return setError("Upiši email i lozinku.");
    if (!trimmedEmail) return setError("Upiši email.");
    if (!password) return setError("Upiši lozinku.");

    setError(null);
    setBusy(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      // On success the root layout switches to the app automatically.
      if (signInError) setError(authErrorMessage(signInError));
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.paper }]}>
      {/* "padding" only adds space when the keyboard actually covers the form */}
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <Text style={[styles.brand, { color: colors.ink }]}>Fakturko</Text>
            <Text style={[styles.tagline, { color: colors.muted }]}>
              Praćenje faktura dobavljača
            </Text>

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <TextField
                label="Email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError(null);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                // Password managers: "username" pairs with "current-password"
                autoComplete="username"
                textContentType="username"
                importantForAutofill="yes"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => passwordRef.current?.focus()}
                editable={!busy}
              />
              <TextField
                ref={passwordRef}
                label="Lozinka"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError(null);
                }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                autoComplete="current-password"
                textContentType="password"
                importantForAutofill="yes"
                returnKeyType="go"
                onSubmitEditing={signIn}
                editable={!busy}
              />

              {error && (
                <Text
                  style={[styles.error, { color: colors.debt }]}
                  accessibilityRole="alert"
                  accessibilityLiveRegion="polite"
                >
                  {error}
                </Text>
              )}

              <Button title="Prijavi se" onPress={signIn} loading={busy} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  content: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },
  brand: {
    fontFamily: fonts.serif,
    fontSize: fontSize.hero,
    lineHeight: fontSize.hero * 1.05,
  },
  tagline: {
    fontSize: fontSize.body,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  error: {
    fontSize: fontSize.label,
    marginBottom: spacing.md,
  },
});
