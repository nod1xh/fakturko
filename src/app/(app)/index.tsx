// TEMPORARY home screen (Phase 4, step 4.1): shows who is signed in and
// which companies RLS lets them see. Replaced by "My companies" later.
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { fonts, fontSize, maxContentWidth, radius, spacing, useColors } from "@/constants/theme";
import { signOut, useAuth } from "@/lib/auth";
import { dataErrorMessage } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import { vrstaObjektaLabel, type Firma } from "@/lib/types";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; firme: Firma[] };

export default function HomeScreen() {
  const colors = useColors();
  const { session } = useAuth();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [signingOut, setSigningOut] = useState(false);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    const { data, error, status } = await supabase
      .from("firme")
      .select("id, naziv, vrsta_objekta")
      .order("naziv");
    if (error) {
      setState({ status: "error", message: dataErrorMessage(error, status) });
    } else {
      setState({ status: "ready", firme: data as Firma[] });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSignOut() {
    setSigningOut(true);
    // The root layout sends us to the login screen once the session is gone.
    await signOut();
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.paper }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <Text style={[styles.heading, { color: colors.ink }]}>Moje firme</Text>
          <Text style={[styles.muted, { color: colors.muted }]}>
            Prijavljen kao <Text style={{ color: colors.ink }}>{session?.user.email}</Text>
          </Text>

          <View style={styles.section}>
            {state.status === "loading" && <ActivityIndicator color={colors.ink} />}

            {state.status === "error" && (
              <View style={[styles.box, { backgroundColor: colors.debtSoft, borderColor: colors.debt }]}>
                <Text style={[styles.boxText, { color: colors.debt }]}>{state.message}</Text>
                <Button title="Pokušaj ponovo" variant="ghost" onPress={load} />
              </View>
            )}

            {state.status === "ready" && state.firme.length === 0 && (
              <View style={[styles.box, styles.empty, { borderColor: colors.line }]}>
                <Text style={[styles.muted, { color: colors.muted, textAlign: "center" }]}>
                  Nemaš pristup nijednoj firmi.
                </Text>
              </View>
            )}

            {state.status === "ready" &&
              state.firme.map((firma) => (
                <View
                  key={firma.id}
                  style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}
                >
                  <Text style={[styles.cardTitle, { color: colors.ink }]}>{firma.naziv}</Text>
                  <Text style={[styles.cardSub, { color: colors.muted }]}>
                    {vrstaObjektaLabel[firma.vrsta_objekta] ?? firma.vrsta_objekta}
                  </Text>
                </View>
              ))}
          </View>

          <Button title="Odjava" variant="ghost" onPress={handleSignOut} loading={signingOut} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    padding: spacing.lg,
  },
  content: {
    width: "100%",
    maxWidth: maxContentWidth,
    alignSelf: "center",
  },
  heading: {
    fontFamily: fonts.serif,
    fontSize: fontSize.heading,
    lineHeight: fontSize.heading * 1.1,
  },
  muted: {
    fontSize: fontSize.label,
    marginTop: spacing.xs,
  },
  section: {
    marginVertical: spacing.xl,
    gap: spacing.sm,
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  cardSub: {
    fontSize: fontSize.label,
    marginTop: 2,
  },
  box: {
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  boxText: {
    fontSize: fontSize.label,
  },
  empty: {
    borderStyle: "dashed",
  },
});
