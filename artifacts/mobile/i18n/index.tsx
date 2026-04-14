import React, { createContext, useContext, useCallback, useState, useEffect, useMemo } from "react";
import { I18nManager, Platform, NativeModules } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ar, TranslationKeys } from "./ar";
import { en } from "./en";

export type Locale = "ar" | "en";

const LANGUAGE_STORAGE_KEY = "@elab_language";

const translations: Record<Locale, TranslationKeys> = { ar, en };

// === Helpers ===

/**
 * Resolve a nested key like "home.quickActions.myMatches" to its value.
 */
function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== "object") {
      return path; // fallback: return the key itself
    }
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : path;
}

/**
 * Replace placeholders like {count}, {name}, {seconds} etc.
 */
function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  return Object.entries(params).reduce(
    (result, [key, value]) => result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value)),
    text
  );
}

// === Context ===

interface LanguageContextValue {
  locale: Locale;
  isRTL: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
  setLanguage: (locale: Locale) => Promise<void>;
  isLanguageLoaded: boolean;
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: "ar",
  isRTL: true,
  t: (key) => key,
  setLanguage: async () => {},
  isLanguageLoaded: false,
});

// === Provider ===

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("ar");
  const [isLanguageLoaded, setIsLanguageLoaded] = useState(false);

  // Load saved language on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (saved === "ar" || saved === "en") {
          setLocale(saved);
          // Ensure RTL matches saved language
          const shouldBeRTL = saved === "ar";
          if (I18nManager.isRTL !== shouldBeRTL) {
            I18nManager.allowRTL(shouldBeRTL);
            I18nManager.forceRTL(shouldBeRTL);
          }
        }
      } catch {
        // Fallback to Arabic
      } finally {
        setIsLanguageLoaded(true);
      }
    })();
  }, []);

  const isRTL = locale === "ar";

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const raw = getNestedValue(translations[locale] as unknown as Record<string, unknown>, key);
      return interpolate(raw, params);
    },
    [locale]
  );

  const setLanguage = useCallback(async (newLocale: Locale) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newLocale);
      setLocale(newLocale);

      const shouldBeRTL = newLocale === "ar";
      if (I18nManager.isRTL !== shouldBeRTL) {
        I18nManager.allowRTL(shouldBeRTL);
        I18nManager.forceRTL(shouldBeRTL);

        // Reload the app for RTL/LTR to take effect
        if (Platform.OS === "android") {
          NativeModules.DevSettings?.reload?.();
        } else if (Platform.OS === "ios") {
          // On iOS, Updates.reloadAsync would be ideal, but for dev we use DevSettings
          NativeModules.DevSettings?.reload?.();
        }
        // On web, a simple page reload
        if (Platform.OS === "web") {
          window.location.reload();
        }
      }
    } catch {
      // Silently fail
    }
  }, []);

  const value = useMemo(
    () => ({ locale, isRTL, t, setLanguage, isLanguageLoaded }),
    [locale, isRTL, t, setLanguage, isLanguageLoaded]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

// === Hook ===

export function useTranslation() {
  return useContext(LanguageContext);
}

// === Storage helpers (for use outside React) ===

export async function getSavedLanguage(): Promise<Locale | null> {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === "ar" || saved === "en") return saved;
    return null;
  } catch {
    return null;
  }
}

export async function hasChosenLanguage(): Promise<boolean> {
  const saved = await getSavedLanguage();
  return saved !== null;
}
