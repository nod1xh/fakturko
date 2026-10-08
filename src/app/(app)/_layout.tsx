import { Stack } from "expo-router";

import { useColors } from "@/constants/theme";

export default function AppLayout() {
  const colors = useColors();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }} />
  );
}
