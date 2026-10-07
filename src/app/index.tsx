// Temporary screen: checks the Supabase connection. Replace in Phase 4.
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { supabase } from "@/lib/supabase";

// Colors from docs/pracenje-faktura.html (light theme)
const colors = {
  paper: "#E8ECE6",
  ink: "#1A2530",
  muted: "#5E6B73",
  debt: "#B5452A",
  debtSoft: "#F3DED6",
  paid: "#2E6A4B",
  paidSoft: "#D8E8DD",
};

type Status =
  | { state: "loading" }
  | { state: "ok" }
  | { state: "error"; message: string };

export default function Index() {
  const [status, setStatus] = useState<Status>({ state: "loading" });

  useEffect(() => {
    async function checkConnection() {
      // A reachable Supabase answers PGRST205 ("table not found") for a missing table.
      const { error } = await supabase.from("veza_test_ne_postoji").select("*").limit(1);
      if (error?.code === "PGRST205") {
        setStatus({ state: "ok" });
      } else if (error) {
        setStatus({
          state: "error",
          message: `${error.code ? `[${error.code}] ` : ""}${error.message}`,
        });
      } else {
        setStatus({ state: "error", message: "Neočekivan odgovor: tabela za test postoji." });
      }
    }
    checkConnection().catch((e: unknown) =>
      setStatus({ state: "error", message: e instanceof Error ? e.message : String(e) })
    );
  }, []);

  return (
    <View style={styles.container}>
      {status.state === "loading" && (
        <>
          <ActivityIndicator color={colors.ink} />
          <Text style={styles.muted}>Provjeravam vezu sa Supabaseom…</Text>
        </>
      )}
      {status.state === "ok" && (
        <View style={[styles.card, { backgroundColor: colors.paidSoft, borderColor: colors.paid }]}>
          <Text style={[styles.title, { color: colors.paid }]}>Veza sa Supabaseom radi</Text>
        </View>
      )}
      {status.state === "error" && (
        <View style={[styles.card, { backgroundColor: colors.debtSoft, borderColor: colors.debt }]}>
          <Text style={[styles.title, { color: colors.debt }]}>Veza sa Supabaseom ne radi</Text>
          <Text style={[styles.message, { color: colors.debt }]}>{status.message}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
    backgroundColor: colors.paper,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  message: {
    fontSize: 14,
  },
  muted: {
    color: colors.muted,
  },
});
