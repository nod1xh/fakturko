import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { ToastProvider } from "@/components/Toast";
import { useColors } from "@/constants/theme";
import { AuthProvider, useAuth } from "@/lib/auth";

// Keep the splash screen until we know whether the user is signed in,
// so the login screen never flashes for a signed-in user.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

function RootNavigator() {
  const { session, loading } = useAuth();
  const colors = useColors();

  useEffect(() => {
    if (!loading) SplashScreen.hide();
  }, [loading]);

  if (loading) return null;

  const signedIn = session !== null;

  // Protected routes: when `guard` is false the screens are unreachable and
  // Expo Router redirects to the first available one.
  return (
    <ToastProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)/login" />
        </Stack.Protected>
      </Stack>
    </ToastProvider>
  );
}
