import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  StyleProp,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { typography } from "@/constants/typography";
import { spacing } from "@/constants/spacing";
import { useColors } from "@/hooks/useColors";
import { LiquidProgressBar } from "@/components/glass/LiquidProgressBar";
import { HighlightText } from "@/components/HighlightText";
import { sportColor, sportLabel, formatDate } from "@/context/AppContext";
import { getSportIcon } from "@/components/icons/SportIcons";
import { getSportTheme } from "@/constants/sportTheme";
import { useTranslation } from "@/i18n";
import type { Match } from "@/context/AppContext";

const SURFACE = "#FFFFFF";
const BORDER = "#E5E7EB";

// Labels and statuses are now handled via i18n t() calls inside the component

export type MatchCardVariant = "full" | "compact";

interface MatchCardProps {
  match: Match;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: MatchCardVariant;
  searchQuery?: string;
  showScore?: boolean;
  scoreHome?: number;
  scoreAway?: number;
  onJoin?: () => void;
  onLeave?: () => void;
  onViewGroup?: () => void;
  showActions?: boolean;
}

function MatchCardInner({
  match,
  onPress,
  style,
  variant = "full",
  searchQuery = "",
  showScore = false,
  scoreHome,
  scoreAway,
  onJoin,
  onLeave,
  onViewGroup,
  showActions = false,
}: MatchCardProps) {
  const { t, locale } = useTranslation();
  const colors = useColors();
  const SportIcon = getSportIcon(match.sport);
  const sportTheme = getSportTheme(match.sport);

  const PRIMARY = sportTheme.primary;
  const PRIMARY_CONTAINER = sportTheme.primaryContainer;
  const PRIMARY_BADGE_FG = sportTheme.badgeForeground;
  const INFO_BG = sportTheme.infoBackground;

  const matchTime = match.time ?? "";
  const joined = match.playerCount ?? match.players?.length ?? 0;
  const max = match.maxPlayers ?? 0;
  const remaining = max - joined;
  const pct = max > 0 ? joined / max : 0;
  const isFull = joined >= max;
  const isToday = match.status === "today";

  const dateStr = match.date
    ? new Date(match.date).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "";

  function handlePress() {
    if (onPress) {
      onPress();
    } else {
      router.push({ pathname: "/match-details", params: { id: match.id } });
    }
  }

  if (variant === "compact") {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.compactWrapper,
          { backgroundColor: SURFACE, opacity: pressed ? 0.93 : 1 },
          style,
        ]}
      >
        <View style={[styles.compactAccent, { backgroundColor: PRIMARY }]} />
        <View style={styles.compactContent}>
          <View style={styles.compactTopRow}>
            <View style={[styles.categoryPill, { backgroundColor: PRIMARY_CONTAINER }]}>
              <SportIcon color={PRIMARY} size={13} />
              <Text style={[styles.categoryPillText, { color: PRIMARY }]}>
                {t(`sports.${match.sport}`)}
              </Text>
            </View>
            {isToday && (
              <View style={[styles.todayPill, { backgroundColor: "#FEF3C7" }]}>
                <Text style={[styles.todayPillText, { color: "#D97706" }]}>{t("common.today")}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.compactTitle, { color: "#111827" }]} numberOfLines={1}>
            {match.title}
          </Text>
          <View style={styles.compactBottomRow}>
            <View style={styles.compactInfo}>
              <Ionicons name="time-outline" size={12} color="#6B7280" />
              <Text style={[styles.compactInfoText, { color: "#6B7280" }]}>{matchTime}</Text>
              <Ionicons name="location-outline" size={12} color="#6B7280" />
              <Text style={[styles.compactInfoText, { color: "#6B7280" }]} numberOfLines={1}>
                {match.venue}
              </Text>
            </View>
            <Text style={[styles.compactSpots, { color: isFull ? "#DC2626" : "#16A34A" }]}>
              {isFull ? t("matchDetails.spotsFull") : t("matchDetails.spotsRemaining", { count: remaining })}
            </Text>
          </View>
          <LiquidProgressBar progress={Math.min(pct, 1)} sport={match.sport} height={4} />
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.wrapper,
        { opacity: pressed ? 0.93 : 1 },
        style,
      ]}
    >
      <View style={[styles.card, { backgroundColor: SURFACE, borderColor: `${PRIMARY}22` }]}>
        <View style={[styles.sportAccentBar, { backgroundColor: PRIMARY }]} />

        <View style={styles.gradientTopSection}>
          <View style={styles.topRow}>
            <View style={styles.badgeRowLeft}>
              {isFull && (
                <View style={[styles.statusPill, { backgroundColor: "#FEE2E2" }]}>
                  <Ionicons name="alert-circle" size={12} color="#DC2626" />
                  <Text style={[styles.statusPillText, { color: "#DC2626" }]}>{t("matchDetails.spotsFull")}</Text>
                </View>
              )}
              {!match.isPublic ? (
                <View style={[styles.statusPill, { backgroundColor: "#F3F4F6" }]}>
                  <Ionicons name="lock-closed" size={11} color="#6B7280" />
                  <Text style={[styles.statusPillText, { color: "#6B7280" }]}>{t("common.private")}</Text>
                </View>
              ) : (
                <View style={[styles.statusPill, { backgroundColor: "rgba(22, 163, 74, 0.10)" }]}>
                  <Ionicons name="globe-outline" size={11} color="#16A34A" />
                  <Text style={[styles.statusPillText, { color: "#16A34A" }]}>{t("common.public")}</Text>
                </View>
              )}
            </View>
            <View style={styles.badgeRowRight}>
              {isToday && (
                <View style={[styles.todayPill, { backgroundColor: "#FEF3C7" }]}>
                  <Text style={[styles.todayPillText, { color: "#D97706" }]}>{t("common.today")}</Text>
                </View>
              )}
              {(match.sport === "padel" || match.sport === "tennis") && match.matchFormat && (
                <View style={[styles.statusPill, { backgroundColor: PRIMARY_CONTAINER }]}>
                  <Text style={[styles.statusPillText, { color: PRIMARY }]}>
                    {match.matchFormat === "single" ? t("matchDetails.format.single") : t("matchDetails.format.double")}
                  </Text>
                </View>
              )}
              {match.status && match.status !== "upcoming" && !isToday && (
                <View style={[styles.statusPill, { backgroundColor: "#F3F4F6" }]}>
                  <Text style={[styles.statusPillText, { color: "#6B7280" }]}>
                    {t(`matchDetails.status.${match.status}`)}
                  </Text>
                </View>
              )}
              <View style={[styles.categoryPill, { backgroundColor: PRIMARY_CONTAINER, borderWidth: 1, borderColor: `${PRIMARY}30` }]}>
                <SportIcon color={PRIMARY} size={13} />
                <Text style={[styles.categoryPillText, { color: PRIMARY, fontFamily: typography.headlineSm.fontFamily }]}>
                  {t(`sports.${match.sport}`)}
                </Text>
              </View>
            </View>
          </View>

          {searchQuery ? (
            <HighlightText
              text={match.title}
              query={searchQuery}
              style={[styles.title, { color: "#111827" }]}
              highlightStyle={{ fontFamily: typography.headlineSm.fontFamily, backgroundColor: "#FEF08A" }}
              numberOfLines={1}
            />
          ) : (
            <Text style={[styles.title, { color: "#111827" }]} numberOfLines={1}>
              {match.title}
            </Text>
          )}
        </View>

        <View style={styles.bodySection}>
          {showScore && scoreHome !== undefined && scoreAway !== undefined ? (
            <View style={styles.scoreRow}>
              <Text style={[styles.score, { color: PRIMARY }]}>{scoreHome}</Text>
              <Text style={[styles.scoreSep, { color: "#6B7280" }]}>—</Text>
              <Text style={[styles.score, { color: PRIMARY }]}>{scoreAway}</Text>
            </View>
          ) : (
            <View style={[styles.infoCard, { backgroundColor: INFO_BG }]}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoText, { color: "#6B7280" }]}>{matchTime}</Text>
                <Ionicons name="time-outline" size={14} color={PRIMARY} />
              </View>
              <View style={styles.infoRow}>
                {searchQuery ? (
                  <HighlightText
                    text={formatDate(match.date, t, locale)}
                    query={searchQuery}
                    style={[styles.infoText, { color: "#6B7280" }]}
                    highlightStyle={{ fontFamily: typography.headlineSm.fontFamily, backgroundColor: "#FEF08A" }}
                    numberOfLines={1}
                  />
                ) : (
                  <Text style={[styles.infoText, { color: "#6B7280" }]}>{dateStr}</Text>
                )}
                <Ionicons name="calendar-outline" size={14} color={PRIMARY} />
              </View>
              <View style={styles.infoRow}>
                {searchQuery ? (
                  <HighlightText
                    text={match.venue}
                    query={searchQuery}
                    style={[styles.infoText, { color: "#6B7280" }]}
                    highlightStyle={{ fontFamily: typography.headlineSm.fontFamily, backgroundColor: "#FEF08A" }}
                    numberOfLines={1}
                  />
                ) : (
                  <Text style={[styles.infoText, { color: "#6B7280" }]} numberOfLines={1}>
                    {match.venue}
                  </Text>
                )}
                <Ionicons name="location-outline" size={14} color={PRIMARY} />
              </View>
              {match.cost !== undefined && match.cost !== null && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoText, { color: "#111827", fontFamily: typography.headlineSm.fontFamily }]}>
                    {match.cost}{" "}
                    <Text style={{ color: "#6B7280", fontFamily: typography.body.fontFamily, fontSize: 11 }}>{t("common.currency")}</Text>
                  </Text>
                  <Ionicons name="card-outline" size={14} color={PRIMARY} />
                </View>
              )}
            </View>
          )}

          <View style={styles.bottomRow}>
            <View style={styles.spotsSection}>
              <View style={styles.spotsTextRow}>
                <Text style={[styles.spotsRemaining, { color: isFull ? "#DC2626" : "#16A34A" }]}>
                  {isFull ? t("matchDetails.spotsFull") : t("matchDetails.spotsRemaining", { count: remaining })}
                </Text>
                <Text style={[styles.spotsTotal, { color: "#9CA3AF" }]}>
                  {joined}/{max}
                </Text>
              </View>
              <LiquidProgressBar progress={Math.min(pct, 1)} sport={match.sport} height={6} />
            </View>

            <View style={styles.rightCol}>
              {showActions ? (
                <View style={styles.actionsRow}>
                  <Pressable
                    style={[styles.mapBtn, { borderWidth: 1, borderColor: `${PRIMARY}30`, backgroundColor: PRIMARY_CONTAINER }]}
                    onPress={() =>
                      router.push({ pathname: "/match-details", params: { id: match.id, tab: "location" } })
                    }
                  >
                    <Ionicons name="map-outline" size={15} color={PRIMARY} />
                  </Pressable>
                  {onViewGroup ? (
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: PRIMARY }]}
                      onPress={onViewGroup}
                    >
                       <Text style={[styles.actionBtnText, { color: "#fff" }]}>{t("explore.viewGroup")}</Text>
                    </Pressable>
                  ) : match.joinedByCurrentUser ? (
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: `${PRIMARY}15`, borderWidth: 1, borderColor: `${PRIMARY}30` }]}
                      onPress={onLeave}
                    >
                      <Text style={[styles.actionBtnText, { color: PRIMARY }]}>{t("home.joined")}</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={[
                        styles.actionBtn,
                        { backgroundColor: isFull ? "#F3F4F6" : "#C1F422" },
                      ]}
                      onPress={!isFull ? onJoin : undefined}
                      disabled={isFull}
                    >
                      {isFull ? (
                        <Text style={[styles.actionBtnText, { color: "#6B7280" }]}>{t("matchDetails.spotsFull")}</Text>
                      ) : (
                        <Text style={[styles.actionBtnText, { color: "#111827" }]}>{t("common.join")}</Text>
                      )}
                    </Pressable>
                  )}
                </View>
              ) : (
                <View style={styles.costCol}>
                  <Text style={[styles.costValue, { color: "#111827" }]}>
                    {match.cost}{" "}
                    <Text style={[styles.costUnit, { color: "#6B7280" }]}>{t("common.currency")}</Text>
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export const MatchCard = React.memo(MatchCardInner, (prev, next) => {
  return (
    prev.match === next.match &&
    prev.variant === next.variant &&
    prev.searchQuery === next.searchQuery &&
    prev.showActions === next.showActions &&
    prev.showScore === next.showScore &&
    prev.scoreHome === next.scoreHome &&
    prev.scoreAway === next.scoreAway &&
    prev.style === next.style
  );
});

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 20,
    overflow: "hidden",
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
  },
  sportAccentBar: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    zIndex: 2,
  },
  gradientTopSection: {
    padding: spacing.md,
    paddingRight: spacing.md + 6,
    gap: spacing.xs,
  },
  bodySection: {
    paddingHorizontal: spacing.md,
    paddingRight: spacing.md + 6,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6,
  },
  badgeRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badgeRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 4,
    borderRadius: 100,
  },
  sportDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  categoryPillText: {
    ...typography.labelSm,
    textAlign: "center",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: 100,
  },
  statusPillText: {
    ...typography.labelSm,
    textAlign: "center",
  },
  todayPill: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: 100,
  },
  todayPillText: {
    ...typography.labelSm,
    fontFamily: typography.headlineSm.fontFamily,
  },
  title: {
    ...typography.headlineSm,
    textAlign: "right",
    lineHeight: 28,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    justifyContent: "flex-end",
  },
  score: {
    ...typography.displaySm,
    textAlign: "center",
  },
  scoreSep: {
    ...typography.headline,
    textAlign: "center",
  },
  infoCard: {
    borderRadius: 12,
    padding: spacing.xs + 4,
    gap: 7,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    justifyContent: "flex-end",
  },
  infoText: {
    fontSize: 13,
    fontFamily: typography.bodyLg.fontFamily,
    textAlign: "right",
    flex: 1,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  spotsSection: {
    flex: 1,
    gap: 4,
  },
  spotsTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  spotsRemaining: {
    fontSize: 12,
    fontFamily: typography.headlineSm.fontFamily,
  },
  spotsTotal: {
    fontSize: 11,
    fontFamily: typography.bodyLg.fontFamily,
  },
  rightCol: {
    alignItems: "flex-end",
  },
  costCol: {
    alignItems: "flex-end",
  },
  costValue: {
    fontSize: 16,
    fontFamily: typography.headlineSm.fontFamily,
    lineHeight: 22,
  },
  costUnit: {
    fontSize: 11,
    fontFamily: typography.body.fontFamily,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  mapBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtn: {
    borderRadius: 24,
    overflow: "hidden",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
  },
  actionBtnText: {
    fontSize: 13,
    fontFamily: typography.headlineSm.fontFamily,
  },
  compactWrapper: {
    borderRadius: 12,
    overflow: "hidden",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: BORDER,
  },
  compactAccent: {
    width: 3,
  },
  compactContent: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 4,
  },
  compactTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  compactTitle: {
    fontFamily: typography.headlineSm.fontFamily,
    fontSize: 14,
    textAlign: "right",
  },
  compactBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  compactInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  compactInfoText: {
    fontSize: 11,
    fontFamily: typography.body.fontFamily,
    flex: 1,
  },
  compactSpots: {
    fontSize: 11,
    fontFamily: typography.headlineSm.fontFamily,
  },
});
