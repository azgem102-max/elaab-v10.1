import { Platform } from "react-native";

import { glassRadius } from "./glassTheme";

export const border = {
  default: { borderWidth: 1, borderColor: "#E5E7EB" } as object,
  focus: { borderWidth: 1.5, borderColor: "#2C54E8" } as object,
  surface: { backgroundColor: "#EEF2FF", borderWidth: 1, borderColor: "#E5E7EB" } as object,
};

export const shadow = {
  sm: Platform.select({
    web: { boxShadow: "0px 1px 6px rgba(44, 84, 232, 0.08)" },
    default: {
      shadowColor: "#2C54E8",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
  }) as object,
  md: Platform.select({
    web: { boxShadow: "0px 2px 12px rgba(44, 84, 232, 0.10), 0px 1px 4px rgba(0,0,0,0.04)" },
    default: {
      shadowColor: "#2C54E8",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
  }) as object,
  lg: Platform.select({
    web: { boxShadow: "0px 4px 24px rgba(44, 84, 232, 0.12), 0px 2px 8px rgba(44, 84, 232, 0.08)" },
    default: {
      shadowColor: "#2C54E8",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 6,
    },
  }) as object,
};

export const card = Platform.select({
  web: {
    backgroundColor: "#FFFFFF",
    borderRadius: glassRadius.md,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  default: {
    backgroundColor: "#FFFFFF",
    borderRadius: glassRadius.md,
  },
}) as object;

export const BG = "#FFFFFF";

export const neu = {
  raised: shadow.md,
  raisedSm: shadow.sm,
  raisedLg: shadow.lg,
  inset: border.surface,
  insetSm: border.surface,
  pill: shadow.sm,
  glassStyle: card,
};
