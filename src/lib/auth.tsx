// Current Supabase session for the whole app.
// The session is stored by supabase-js (AsyncStorage on Android,
// localStorage on web), so sign-in survives reloads and app restarts.
import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { supabase } from "@/lib/supabase";

type AuthState = {
  session: Session | null;
  /** True until the stored session has been read. */
  loading: boolean;
};

const AuthContext = createContext<AuthState>({ session: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: true });

  useEffect(() => {
    // Fires INITIAL_SESSION with the stored session first, then on every
    // sign-in, sign-out and token refresh.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, loading: false });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

/** Signs out on this device only; other devices stay signed in. */
export async function signOut(): Promise<void> {
  // The local session is removed even if the request fails (e.g. offline).
  await supabase.auth.signOut({ scope: "local" });
}
