// Design tokens from docs/pracenje-faktura.html (light + dark).
import { Platform, useColorScheme } from "react-native";

export const lightColors = {
  paper: "#E8ECE6",
  surface: "#F7F9F5",
  ink: "#1A2530",
  muted: "#5E6B73",
  line: "#CBD3CC",
  debt: "#B5452A",
  debtSoft: "#F3DED6",
  paid: "#2E6A4B",
  paidSoft: "#D8E8DD",
  // Text on ink-colored buttons
  btnInk: "#F7F9F5",
};

export type Colors = typeof lightColors;

export const darkColors: Colors = {
  paper: "#131A1F",
  surface: "#1B242B",
  ink: "#E6ECE8",
  muted: "#93A1A8",
  line: "#2C3740",
  debt: "#E58A6C",
  debtSoft: "#3A2520",
  paid: "#79C79C",
  paidSoft: "#1E3328",
  btnInk: "#131A1F",
};

/** Colors for the current system theme (phone or browser setting). */
export function useColors(): Colors {
  return useColorScheme() === "dark" ? darkColors : lightColors;
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 10,
  md: 12,
  lg: 14,
  xl: 16,
  sheet: 22,
  pill: 999,
};

export const fontSize = {
  small: 13,
  body: 16,
  label: 14,
  title: 22,
  heading: 34,
  hero: 56,
};

// System fonts for now. Instrument Sans / Serif from the prototype can be
// added later by changing only this object.
export const fonts = {
  sans: undefined,
  serif: Platform.select({
    ios: "Georgia",
    android: "serif",
    default: "Georgia, 'Times New Roman', serif",
  }),
};

/** Content width on large screens (web/laptop), as in the prototype. */
export const maxContentWidth = 560;
