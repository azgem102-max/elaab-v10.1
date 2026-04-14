import type { Locale } from "@/i18n";

/**
 * Centralized date/time formatting utilities.
 * Saudi Arabia convention: 12-hour with AM/PM.
 */

const DATE_LOCALES: Record<Locale, string> = {
  ar: "ar-SA",
  en: "en-US",
};

/**
 * Format a date object to a readable date string.
 * Example: "الأحد، ١٣ أبريل" or "Sun, Apr 13"
 */
export function formatDate(
  date: Date | string,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(DATE_LOCALES[locale], {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...options,
  });
}

/**
 * Format a date object to a full date string with year.
 * Example: "١٣ أبريل ٢٠٢٦" or "Apr 13, 2026"
 */
export function formatDateFull(date: Date | string, locale: Locale): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(DATE_LOCALES[locale], {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format a date object to a long weekday + date.
 * Example: "الأحد، ١٣ أبريل" or "Sunday, April 13"
 */
export function formatDateLong(date: Date | string, locale: Locale): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(DATE_LOCALES[locale], {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a time string (e.g. "18:30") or Date to 12-hour format.
 * Example: "6:30 PM" or "٦:٣٠ م"
 * 
 * In Saudi Arabia, 12-hour AM/PM is the standard convention.
 */
export function formatTime(
  time: string | Date,
  locale: Locale
): string {
  if (typeof time === "string" && /^\d{1,2}:\d{2}$/.test(time)) {
    const [h, m] = time.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString(DATE_LOCALES[locale], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }
  const d = typeof time === "string" ? new Date(time) : time;
  return d.toLocaleTimeString(DATE_LOCALES[locale], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format a date to show relative day label.
 * "Today", "Tomorrow", or the formatted date.
 */
export function formatRelativeDay(
  date: Date | string,
  locale: Locale,
  t: (key: string) => string
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);

  if (diffDays === 0) return t("common.today");
  if (diffDays === 1) return t("common.tomorrow");
  return formatDate(d, locale);
}

/**
 * Format a compact date for cards and lists.
 * Example: "أبريل ١٣" or "Apr 13"
 */
export function formatDateCompact(date: Date | string, locale: Locale): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(DATE_LOCALES[locale], {
    month: "short",
    day: "numeric",
  });
}
