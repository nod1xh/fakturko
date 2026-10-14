// Short message at the bottom of the screen, optionally with an action
// button ("Poništi"). One toast at a time; a new one replaces the old.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fontSize, radius, spacing, useColors } from "@/constants/theme";

type ToastAction = { label: string; onPress: () => void };
type ToastOptions = {
  action?: ToastAction;
  /** Milliseconds; default 5000 with an action, otherwise 2500 */
  duration?: number;
};
type ToastState = { id: number; message: string; action?: ToastAction };
type ShowToast = (message: string, options?: ToastOptions) => void;

const ToastContext = createContext<ShowToast>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback<ShowToast>((message, { action, duration } = {}) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), message, action });
    // Longer when there is something to undo
    timer.current = setTimeout(() => setToast(null), duration ?? (action ? 5000 : 2500));
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      <View style={styles.root}>
        {children}
        {toast && (
          <View
            pointerEvents="box-none"
            style={[styles.host, { bottom: insets.bottom + spacing.lg + 4 }]}
          >
            <View
              key={toast.id}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={[styles.toast, { backgroundColor: colors.ink }]}
            >
              <Text style={[styles.text, { color: colors.btnInk }]}>{toast.message}</Text>
              {toast.action && (
                <Pressable
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => {
                    if (timer.current) clearTimeout(timer.current);
                    setToast(null);
                    toast.action?.onPress();
                  }}
                >
                  <Text style={[styles.text, styles.action, { color: colors.btnInk }]}>
                    {toast.action.label}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      </View>
    </ToastContext.Provider>
  );
}

/**
 * const toast = useToast();
 * toast("Dobavljač dodan");
 * toast("Prebačeno u Plaćeno", { action: { label: "Poništi", onPress: undo } });
 */
export function useToast(): ShowToast {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  host: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    alignItems: "center",
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    borderRadius: radius.pill,
    paddingVertical: 11,
    paddingHorizontal: 18,
    maxWidth: 520,
  },
  text: {
    fontSize: fontSize.label,
    flexShrink: 1,
  },
  action: {
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
