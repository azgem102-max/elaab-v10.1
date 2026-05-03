import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { typography } from "@/constants/typography";


import { useTranslation, Locale } from "@/i18n";
import { ar } from "@/i18n/ar";
import { en } from "@/i18n/en";

const localeTranslations = { ar, en };

function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function todayAtMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function withAlpha(color: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
  if (!result) return color;
  const r = parseInt(result[1]!, 16);
  const g = parseInt(result[2]!, 16);
  const b = parseInt(result[3]!, 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

interface DatePickerFieldProps {
  value: Date;
  onChange: (date: Date) => void;
  accentColor: string;
}

export function DatePickerField({ value, onChange, accentColor }: DatePickerFieldProps) {
  const colors = useColors();
  const { t, locale } = useTranslation();
  
  const DAY_LABELS = localeTranslations[locale].dateInfo.days;
  const MONTH_LABELS = localeTranslations[locale].dateInfo.months;

  const [showPicker, setShowPicker] = useState(false);
  const today = todayAtMidnight();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(today.getDate() + 2);

  const quickDays = [
    { label: t("common.today"), date: today },
    { label: t("common.tomorrow"), date: tomorrow },
    { label: t("common.dayAfter"), date: dayAfter },
  ];

  function handleNativeChange(_event: DateTimePickerEvent, selectedDate?: Date): void {
    if (Platform.OS !== "ios") setShowPicker(false);
    if (selectedDate) {
      const d = new Date(selectedDate);
      d.setHours(0, 0, 0, 0);
      onChange(d);
    }
  }

  const selectedCard = (
    <View style={[styles.selectedCard, { backgroundColor: withAlpha(accentColor, 0.08), borderColor: withAlpha(accentColor, 0.12) }]}>
      <View style={styles.selectedCardLeft}>
        <Text style={[styles.selectedDayName, { color: accentColor }]}>
          {DAY_LABELS[value.getDay()]}
        </Text>
        <Text style={[styles.selectedDateNum, { color: colors.onSurface }]}>
          {value.getDate()}
        </Text>
        <Text style={[styles.selectedMonth, { color: colors.mutedForeground }]}>
          {MONTH_LABELS[value.getMonth()]}
        </Text>
      </View>
      <View style={styles.selectedCardRight}>
        {Platform.OS === "web" ? (
          <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <Ionicons name="calendar-outline" size={18} color={accentColor} />
            <Text style={[styles.changeText, { color: accentColor }]}>{t("common.change")}</Text>
            <input
              type="date"
              min={toDateInputValue(today)}
              value={toDateInputValue(value)}
              onChange={(e) => {
                if (!e.target.value) return;
                const parts = e.target.value.split("-");
                if (parts.length !== 3) return;
                const newDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                newDate.setHours(0, 0, 0, 0);
                if (!isNaN(newDate.getTime()) && newDate >= today) {
                  onChange(newDate);
                }
              }}
              style={{
                position: "absolute",
                opacity: 0,
                pointerEvents: "none",
                width: 1,
                height: 1,
              }}
            />
          </label>
        ) : (
          <Pressable
            style={styles.changeBtn}
            onPress={() => setShowPicker(true)}
          >
            <Ionicons name="calendar-outline" size={18} color={accentColor} />
            <Text style={[styles.changeText, { color: accentColor }]}>{t("common.change")}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  const quickDaysRow = (
    <View style={styles.quickDaysRow}>
      {quickDays.map((qd) => {
        const isActive = isSameDay(value, qd.date);
        return (
          <Pressable
            key={qd.label}
            style={[
              styles.quickDayChip,
              isActive
                ? { backgroundColor: accentColor }
                : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
            ]}
            onPress={() => onChange(qd.date)}
          >
            <Text style={[styles.quickDayText, { color: isActive ? "#fff" : colors.onSurface }]}>
              {qd.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      {selectedCard}
      {quickDaysRow}
      {showPicker && Platform.OS !== "web" && (
        <DateTimePicker
          value={value}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "calendar"}
          minimumDate={today}
          onChange={handleNativeChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  selectedCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  selectedCardRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  selectedDayName: {
    fontSize: 14,
    fontFamily: typography.headlineSm.fontFamily,
  },
  selectedDateNum: {
    fontSize: 24,
    fontFamily: typography.headlineSm.fontFamily,
  },
  selectedMonth: {
    fontSize: 14,
    fontFamily: typography.body.fontFamily,
  },
  changeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  changeText: {
    fontSize: 14,
    fontFamily: typography.headlineSm.fontFamily,
  },
  quickDaysRow: {
    flexDirection: "row",
    gap: 8,
  },
  quickDayChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  quickDayText: {
    fontSize: 13,
    fontFamily: typography.bodyLg.fontFamily,
  },
});
