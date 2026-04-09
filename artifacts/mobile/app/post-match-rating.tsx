import { useApp, RatingType, reliabilityColor, formatDate, sportLabel, formatReliability, MatchPlayer, AttendanceStatus, PaymentStatus } from "@/context/AppContext";
import type { Match, Player } from "@/context/AppContext";
import { getLevelsForSport } from "@/components/LevelPickerSheet";
import { api } from "@/services/api";
import { useColors } from "@/hooks/useColors";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { ErrorFallbackProps } from "@/components/ErrorFallback";


import { SurfaceCard } from "@/components/SurfaceCard";
import { SportGradientButton } from "@/components/SportGradientButton";
import { Ionicons } from "@expo/vector-icons";

import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  DimensionValue,
  Easing,
  I18nManager,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const RATING_OPTIONS: {
  key: RatingType;
  label: string;
  desc: string;
  emoji: string;
  icon: "color-palette" | "shield" | "flash";
  color: string;
  bgGradient: string;
}[] = [
  { key: "artist", label: "الفنان", desc: "ماهر ومبدع في اللعب", emoji: "🎨", icon: "color-palette", color: "#7B1FA2", bgGradient: "#F3E5F5" },
  { key: "rock", label: "الصخرة", desc: "موثوق ومثابر دائماً", emoji: "🗿", icon: "shield", color: "#1565C0", bgGradient: "#E3F2FD" },
  { key: "bolt", label: "البرق", desc: "سريع وقوي الأداء", emoji: "⚡", icon: "flash", color: "#E65100", bgGradient: "#FFF3E0" },
];

interface ConfettiDotStyle {
  backgroundColor: string;
  width: number;
  height: number;
  borderRadius: number;
  position: "absolute";
  left: DimensionValue;
  bottom: DimensionValue;
}

function ConfettiDot({ anim, dotStyle }: { anim: Animated.Value; dotStyle: ConfettiDotStyle }) {
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -220] });
  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, (Math.random() - 0.5) * 240] });
  const opacity = anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });
  const scale = anim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0.6] });
  return (
    <Animated.View
      style={[
        dotStyle,
        { opacity, transform: [{ translateY }, { translateX }, { scale }] },
      ]}
    />
  );
}

const SCREEN_WIDTH = Dimensions.get("window").width;

function PlayerRatingFallback({ resetError }: ErrorFallbackProps) {
  const colors = useColors();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 }}>
      <Ionicons name="people-outline" size={44} color={colors.mutedForeground} />
      <Text style={{ fontFamily: "Cairo_700Bold", fontSize: 16, color: colors.onSurface, textAlign: "center" }}>
        تعذّر تحميل قائمة اللاعبين
      </Text>
      <Text style={{ fontFamily: "Cairo_400Regular", fontSize: 13, color: colors.mutedForeground, textAlign: "center" }}>
        حدث خطأ أثناء عرض بيانات اللاعبين
      </Text>
      <Pressable
        onPress={resetError}
        style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.primary + "18" }}
      >
        <Text style={{ fontFamily: "Cairo_600SemiBold", fontSize: 14, color: colors.primary }}>إعادة المحاولة</Text>
      </Pressable>
    </View>
  );
}

export default function PostMatchRatingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { matches, user, submitRatings, allPlayers } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const contextMatch = matches.find((m) => m.id === id);
  const [apiMatch, setApiMatch] = useState<Match | null>(null);
  const [loadingMatch, setLoadingMatch] = useState(!!id);
  const [fetchError, setFetchError] = useState(false);
  const [ratings, setRatings] = useState<Record<string, RatingType | null>>({});
  const [levelAccuracyVotes, setLevelAccuracyVotes] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyRated, setAlreadyRated] = useState(false);

  const confettiAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!id) {
      setLoadingMatch(false);
      return;
    }
    setLoadingMatch(true);
    setFetchError(false);
    api.getMatch(id).then((res) => {
      const m = res.match;
      const matchSport = m.sport as Match["sport"];
      const players: MatchPlayer[] = (m.players ?? []).map((p) => {
        const sportProfilesMap: MatchPlayer["sportProfiles"] = {};
        if ((matchSport === "padel" || matchSport === "tennis") && typeof (p as unknown as Record<string, unknown>).skillLevelNumeric === "number") {
          sportProfilesMap[matchSport] = {
            sport: matchSport,
            skillLevel: "متوسط",
            skillLevelNumeric: (p as unknown as Record<string, unknown>).skillLevelNumeric as number,
            position: [],
          };
        }
        return {
          id: p.id,
          nickname: p.nickname,
          sports: matchSport ? [matchSport] : [],
          sportProfiles: sportProfilesMap,
          matchesPlayed: p.matchesPlayed ?? 0,
          reliability: p.reliability,
          badges: p.badges ?? [],
          rating: { artist: 0, rock: 0, bolt: 0 },
          attendance: p.attendance as AttendanceStatus,
          paymentStatus: p.paymentStatus as PaymentStatus,
          position: p.position,
        };
      });
      if (m.hasRated) {
        setAlreadyRated(true);
      }
      setApiMatch({
        id: m.id,
        title: m.title,
        sport: m.sport as Match["sport"],
        date: new Date(m.date),
        time: m.time,
        venue: m.venue,
        location: m.location,
        maxPlayers: m.maxPlayers,
        cost: m.cost,
        isPublic: m.isPublic,
        organizerId: m.organizerId,
        organizerName: m.organizerName,
        organizerReliability: m.organizerReliability,
        players,
        status: m.status as Match["status"],
        joinedByCurrentUser: m.joinedByCurrentUser ?? contextMatch?.joinedByCurrentUser ?? false,
        sessionType: m.sessionType,
        matchFormat: m.matchFormat,
        description: m.description,
        invitedGroupId: m.invitedGroupId,
        hasRated: m.hasRated ?? false,
      });
    }).catch(() => {
      if (!contextMatch) setFetchError(true);
    }).finally(() => setLoadingMatch(false));
  }, [id]);

  const match = apiMatch ?? contextMatch;

  if (loadingMatch && !match) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "transparent" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (fetchError || !match) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 32, backgroundColor: "transparent" }}>
        <Ionicons name="wifi-outline" size={48} color={colors.mutedForeground} />
        <Text style={{ color: colors.onSurface, fontFamily: "Cairo_700Bold", fontSize: 16, textAlign: "center" }}>
          تعذّر تحميل بيانات المباراة
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={{ backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 }}
        >
          <Text style={{ color: "#fff", fontFamily: "Cairo_700Bold", fontSize: 14 }}>العودة</Text>
        </Pressable>
      </View>
    );
  }

  if (alreadyRated || match.hasRated) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 32, backgroundColor: "transparent" }}>
        <Ionicons name="checkmark-circle" size={56} color={colors.success} />
        <Text style={{ color: colors.onSurface, fontFamily: "Cairo_700Bold", fontSize: 18, textAlign: "center" }}>
          لقد قيّمت هذه المباراة مسبقاً
        </Text>
        <Text style={{ color: colors.mutedForeground, fontFamily: "Cairo_400Regular", fontSize: 14, textAlign: "center" }}>
          شكراً على مساهمتك في بناء مجتمع رياضي موثوق
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={{ backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 }}
        >
          <Text style={{ color: "#fff", fontFamily: "Cairo_700Bold", fontSize: 14 }}>العودة</Text>
        </Pressable>
      </View>
    );
  }

  const sportTheme = { cardGradientStart: colors.primary, cardGradientEnd: colors.primary + "BB", primary: colors.primary, primaryContainer: colors.surfaceContainer, badgeBackground: colors.surfaceContainer, badgeForeground: colors.primary, pillBackground: colors.surfaceContainer, pillForeground: colors.primary };
  const currentUserId = user?.id ?? "";
  const isFreeMatch = match.cost === 0;
  const otherPlayers = match.players.filter(
    (p) => p.id !== currentUserId && p.attendance === "present" && (isFreeMatch || p.paymentStatus === "paid")
  );
  const hasAttendanceRecorded = match.players.some((p) => p.attendance !== "pending" || p.paymentStatus !== "pending");

  const totalPlayers = otherPlayers.length;
  const ratedCount = Object.values(ratings).filter(Boolean).length;
  const hasAnyRating = ratedCount > 0;

  const CONFETTI_COLORS = ["#7B1FA2", "#1565C0", "#F57F17", "#2E7D32", "#C62828", "#0288D1"];
  const CONFETTI_DOTS: { id: number; dotStyle: ConfettiDotStyle }[] = Array.from({ length: 36 }, (_, i) => {
    const size = 6 + (i % 5) * 4;
    return {
      id: i,
      dotStyle: {
        backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        width: size,
        height: size,
        borderRadius: size / 2,
        position: "absolute" as const,
        left: `${2 + (i * 2.7) % 96}%` as DimensionValue,
        bottom: "30%" as DimensionValue,
      },
    };
  });

  function handleRate(playerId: string, type: RatingType) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRatings((prev) => ({ ...prev, [playerId]: prev[playerId] === type ? null : type }));
  }

  function animateToNext(nextIndex: number) {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -SCREEN_WIDTH,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentIndex(nextIndex);
      slideAnim.setValue(SCREEN_WIDTH * 0.3);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }

  function handleNext() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentIndex < totalPlayers - 1) {
      animateToNext(currentIndex + 1);
    }
  }

  function handlePrev() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentIndex > 0) {
      const idx = currentIndex - 1;
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_WIDTH,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentIndex(idx);
        slideAnim.setValue(-SCREEN_WIDTH * 0.3);
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 250,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(cardOpacity, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }
  }

  async function handleSubmit() {
    if (!match || !hasAnyRating) return;
    setSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const batchRatings: Record<string, RatingType> = {};
    for (const [playerId, ratingType] of Object.entries(ratings)) {
      if (ratingType) batchRatings[playerId] = ratingType;
    }

    try {
      const filteredVotes = Object.fromEntries(
        Object.entries(levelAccuracyVotes).filter(([, v]) => v !== undefined && v !== "")
      );
      await submitRatings(match.id, batchRatings, Object.keys(filteredVotes).length > 0 ? filteredVotes : undefined);
    } catch (err) {
      setSubmitting(false);
      const msg = err instanceof Error ? err.message : "تعذّر إرسال التقييمات، يرجى المحاولة مجدداً";
      Alert.alert("خطأ", msg);
      return;
    }

    setSubmitted(true);
    setSubmitting(false);

    Animated.parallel([
      Animated.spring(successScale, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
      Animated.timing(successOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(confettiAnim, { toValue: 1, duration: 1400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }

  async function handleShare() {
    if (!match) return;
    const ratedSummary = otherPlayers
      .filter((p) => ratings[p.id])
      .map((p) => {
        const opt = RATING_OPTIONS.find((o) => o.key === ratings[p.id]);
        return `${opt?.emoji} ${p.nickname} — ${opt?.label}`;
      })
      .join("\n");
    const text = `🏆 نتيجة مباراة "${match.title}"\n\nتقييماتي للاعبين:\n${ratedSummary}\n\n#العب`;
    try {
      await Share.share({ message: text });
    } catch {}
  }

  if (submitted) {
    const ratedPlayers = otherPlayers.filter((p) => ratings[p.id]);
    return (
      <View style={[styles.successScreen, { backgroundColor: "transparent" }]}>
        {CONFETTI_DOTS.map((dot) => (
          <ConfettiDot key={dot.id} anim={confettiAnim} dotStyle={dot.dotStyle} />
        ))}

        <Animated.View style={{ alignItems: "center", width: "100%", paddingHorizontal: 24, gap: 16, transform: [{ scale: successScale }], opacity: successOpacity }}>
          <View style={[styles.successIconOuter, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}>
            <View style={[styles.successIconGradient, { backgroundColor: colors.primary }]}>
              <Ionicons name="checkmark-circle" size={52} color={colors.background} />
            </View>
          </View>
          <Text style={[styles.successTitle, { color: colors.onSurface }]}>🏆 أحسنت! تقييمك وصل</Text>
          <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
            أنت تصنع فارقاً حقيقياً في{"\n"}مجتمعنا الرياضي — شكراً لك! 🌟
          </Text>

          {ratedPlayers.length > 0 && (
            <View style={[styles.ratedSummaryBox, { backgroundColor: colors.surfaceContainer, borderWidth: 1, borderColor: colors.border, width: "100%" }]}>
              <Text style={[styles.ratedSummaryTitle, { color: colors.onSurface }]}>
                ملخص التقييمات ({ratedPlayers.length} لاعب)
              </Text>
              {ratedPlayers.map((p) => {
                const opt = RATING_OPTIONS.find((o) => o.key === ratings[p.id]);
                if (!opt) return null;
                return (
                  <View key={p.id} style={styles.ratedRow}>
                    <View style={[styles.ratedBadge, { backgroundColor: opt.color + "18" }]}>
                      <Text style={styles.ratedBadgeEmoji}>{opt.emoji}</Text>
                      <Text style={[styles.ratedBadgeLabel, { color: opt.color }]}>{opt.label}</Text>
                    </View>
                    <Text style={[styles.ratedName, { color: colors.onSurface }]}>{p.nickname}</Text>
                  </View>
                );
              })}
            </View>
          )}

          <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
            <Pressable
              onPress={handleShare}
              style={[styles.actionBtn, { backgroundColor: sportTheme.primaryContainer, flex: 1 }]}
            >
              <Ionicons name="share-social-outline" size={18} color={sportTheme.primary} />
              <Text style={[styles.actionBtnText, { color: sportTheme.primary }]}>شارك النتيجة</Text>
            </Pressable>
            <Pressable
              onPress={() => router.back()}
              style={[styles.actionBtn, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, flex: 1 }]}
            >
              <Ionicons name="arrow-back-outline" size={18} color={colors.onSurface} />
              <Text style={[styles.actionBtnText, { color: colors.onSurface }]}>العودة للمباراة</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    );
  }

  const formattedDate = formatDate(match.date);
  const currentPlayer = otherPlayers[currentIndex] ?? null;

  return (
    <View style={[styles.container, { backgroundColor: "transparent" }]}>
      <View style={[styles.headerGradient, { paddingTop: topPad + 6, backgroundColor: colors.primary }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: "rgba(255,255,255,0.25)" }]}>
            <Ionicons name={I18nManager.isRTL ? "chevron-forward" : "chevron-back"} size={22} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>تقييم اللاعبين</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.matchSummary}>
          <Text style={styles.matchSummaryTitle}>{match.title}</Text>
          <View style={styles.matchSummaryDetails}>
            <View style={styles.matchSummaryItem}>
              <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.85)" />
              <Text style={styles.matchSummaryText}>{formattedDate}</Text>
            </View>
            <Text style={styles.matchSummaryDot}>·</Text>
            <View style={styles.matchSummaryItem}>
              <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.85)" />
              <Text style={styles.matchSummaryText}>{match.venue}</Text>
            </View>
            <Text style={styles.matchSummaryDot}>·</Text>
            <View style={styles.matchSummaryItem}>
              <Ionicons name="football-outline" size={13} color="rgba(255,255,255,0.85)" />
              <Text style={styles.matchSummaryText}>{sportLabel(match.sport)}</Text>
            </View>
          </View>
        </View>
      </View>

      <ErrorBoundary FallbackComponent={PlayerRatingFallback}>
      <View style={[styles.contentArea, { paddingBottom: botPad + 110 }]}>
        {otherPlayers.length === 0 ? (
          <View style={[styles.noPlayers, { backgroundColor: colors.surfaceContainer, borderWidth: 1, borderColor: colors.border }]}>
            <Ionicons name="people-outline" size={44} color={colors.mutedForeground} />
            <Text style={[styles.noPlayersText, { color: colors.mutedForeground }]}>
              {hasAttendanceRecorded
                ? isFreeMatch
                  ? "لا يوجد لاعبون حضروا المباراة لتقييمهم"
                  : "لا يوجد لاعبون حضروا ودفعوا رسوم المباراة لتقييمهم"
                : "لم يُسجَّل حضور اللاعبين بعد"}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.progressArea}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressCount, { color: sportTheme.primary }]}>
                  لاعب {currentIndex + 1} من {totalPlayers}
                </Text>
                <Text style={[styles.progressRatedCount, { color: colors.mutedForeground }]}>
                  تم تقييم {ratedCount}
                </Text>
              </View>
              {totalPlayers <= 7 && (
                <View style={[styles.progressTrack, { backgroundColor: sportTheme.primaryContainer }]}>
                  {Array.from({ length: totalPlayers }).map((_, i) => {
                    const isRated = !!ratings[otherPlayers[i]?.id];
                    const isCurrent = i === currentIndex;
                    return (
                      <Pressable
                        key={i}
                        onPress={() => {
                          if (i !== currentIndex) {
                            if (i > currentIndex) {
                              animateToNext(i);
                            } else {
                              const idx = i;
                              Animated.timing(cardOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
                                setCurrentIndex(idx);
                                cardOpacity.setValue(0);
                                Animated.timing(cardOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
                              });
                            }
                          }
                        }}
                        style={[
                          styles.progressDot,
                          {
                            backgroundColor: isCurrent
                              ? colors.accent
                              : isRated
                              ? colors.accent + "60"
                              : colors.border,
                            transform: [{ scale: isCurrent ? 1.3 : 1 }],
                          },
                        ]}
                      />
                    );
                  })}
                </View>
              )}
            </View>

            {currentPlayer && (
              <Animated.View
                style={[
                  styles.playerCardWrap,
                  { transform: [{ translateX: slideAnim }], opacity: cardOpacity },
                ]}
              >
                <PlayerRatingCard
                  player={currentPlayer}
                  match={match}
                  sportTheme={sportTheme}
                  colors={colors}
                  selected={ratings[currentPlayer.id] ?? null}
                  onRate={(type) => handleRate(currentPlayer.id, type)}
                  levelAccuracyVote={levelAccuracyVotes[currentPlayer.id] ?? null}
                  onLevelVote={(vote) => {
                    setLevelAccuracyVotes((prev) => ({
                      ...prev,
                      [currentPlayer.id]: prev[currentPlayer.id] === vote ? "" : vote,
                    }));
                  }}
                  playerProfile={allPlayers.find((p) => p.id === currentPlayer.id) ?? null}
                />
              </Animated.View>
            )}

            <View style={styles.navButtons}>
              <Pressable
                onPress={handlePrev}
                disabled={currentIndex === 0}
                style={[
                  styles.navBtn,
                  { borderWidth: 1, borderColor: colors.border },
                  { backgroundColor: colors.background, opacity: currentIndex === 0 ? 0.3 : 1 },
                ]}
              >
                <Ionicons name="chevron-forward" size={22} color={colors.onSurface} />
                <Text style={[styles.navBtnText, { color: colors.onSurface }]}>السابق</Text>
              </Pressable>

              {currentIndex < totalPlayers - 1 ? (
                <Pressable
                  onPress={handleNext}
                  style={[
                    styles.navBtn,
                    { backgroundColor: colors.accent },
                  ]}
                >
                  <Text style={[styles.navBtnText, { color: colors.accentForeground }]}>التالي</Text>
                  <Ionicons name="chevron-back" size={22} color={colors.accentForeground} />
                </Pressable>
              ) : (
                <View style={{ flex: 1 }} />
              )}
            </View>
          </>
        )}
      </View>
      </ErrorBoundary>

      <View style={[styles.footer, { paddingBottom: botPad + 12, backgroundColor: colors.background }]}>
        <SportGradientButton
          label={`إرسال التقييمات${ratedCount > 0 ? ` (${ratedCount})` : ""}`}
          gradientStart={colors.accent}
          gradientEnd={colors.accent}
          textColor={colors.accentForeground}
          onPress={handleSubmit}
          disabled={!hasAnyRating}
          loading={submitting}
          style={{ flex: 1 }}
        />
        <Pressable
          style={[styles.skipBtn, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.skipText, { color: colors.mutedForeground }]}>تخطي التقييم</Text>
        </Pressable>
      </View>
    </View>
  );
}

type ColorsType = ReturnType<typeof useColors>;

function RatingOptionCard({
  opt,
  isSelected,
  colors,
  onPress,
}: {
  opt: typeof RATING_OPTIONS[0];
  isSelected: boolean;
  colors: ColorsType;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.spring(scale, { toValue: 0.92, tension: 300, friction: 10, useNativeDriver: true }).start();
  }

  function handlePressOut() {
    Animated.spring(scale, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }).start();
  }

  function handlePress() {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.88, tension: 400, friction: 8, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1.06, tension: 200, friction: 6, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }),
    ]).start();
    onPress();
  }

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      android_ripple={{ color: opt.color + "20" }}
      style={{ flex: 1 }}
    >
      <Animated.View
        style={[
          styles.ratingCard,
          isSelected
            ? { backgroundColor: opt.bgGradient, borderWidth: 2, borderColor: opt.color }
            : { borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FAFAFA" },
          { transform: [{ scale }] },
        ]}
      >
        {isSelected && (
          <View style={[styles.checkMark, { backgroundColor: opt.color }]}>
            <Ionicons name="checkmark" size={10} color={colors.background} />
          </View>
        )}
        <View
          style={[
            styles.ratingEmojiWrap,
            {
              backgroundColor: isSelected ? opt.color : opt.color + "15",
              borderRadius: 18,
              borderWidth: isSelected ? 0 : 1,
              borderColor: opt.color + "30",
            },
          ]}
        >
          <Text style={{ fontSize: 30 }}>{opt.emoji}</Text>
        </View>
        <Text style={[styles.ratingLabel, { color: isSelected ? opt.color : colors.onSurfaceVariant }]}>
          {opt.label}
        </Text>
        <Text
          style={[styles.ratingDesc, { color: isSelected ? opt.color + "CC" : colors.mutedForeground }]}
          numberOfLines={2}
        >
          {opt.desc}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const LEVEL_VOTE_OPTIONS: { key: string; label: string; icon: "checkmark-circle-outline" | "arrow-down-circle-outline" | "arrow-up-circle-outline"; color: string }[] = [
  { key: "matching", label: "مطابق", icon: "checkmark-circle-outline", color: "#2E7D32" },
  { key: "lower", label: "مستواه أقل", icon: "arrow-down-circle-outline", color: "#E65100" },
  { key: "higher", label: "مستواه أعلى", icon: "arrow-up-circle-outline", color: "#0277BD" },
];

function PlayerRatingCard({
  player,
  match,
  sportTheme,
  colors,
  selected,
  onRate,
  levelAccuracyVote,
  onLevelVote,
  playerProfile,
}: {
  player: MatchPlayer;
  match: Match;
  sportTheme: { cardGradientStart: string; cardGradientEnd: string; primary: string; primaryContainer: string; badgeBackground: string; badgeForeground: string; pillBackground: string; pillForeground: string };
  colors: ColorsType;
  selected: RatingType | null;
  onRate: (type: RatingType) => void;
  levelAccuracyVote: string | null;
  onLevelVote: (vote: string) => void;
  playerProfile: Player | null;
}) {
  const relColor = reliabilityColor(player.reliability, colors);
  const relFormatted = formatReliability(player.reliability, player.matchesPlayed);
  const selectedOpt = selected ? RATING_OPTIONS.find((o) => o.key === selected) ?? null : null;
  const sportPosArr = player.sportProfiles[match.sport]?.position ?? [];
  const position = player.position || (sportPosArr.length > 0 ? sportPosArr[0] : "لاعب");

  const matchSport = match.sport as "padel" | "tennis" | "football";
  const skillLevelNumericFromPlayer = (matchSport === "padel" || matchSport === "tennis")
    ? (player.sportProfiles[matchSport]?.skillLevelNumeric ?? playerProfile?.sportProfiles?.[matchSport]?.skillLevelNumeric ?? null)
    : null;
  const skillLevelNumeric = skillLevelNumericFromPlayer;
  const showLevelQuestion = (matchSport === "padel" || matchSport === "tennis") && skillLevelNumeric != null;
  const levelLabel = (() => {
    if (!skillLevelNumeric || (matchSport !== "padel" && matchSport !== "tennis")) return null;
    const levels = getLevelsForSport(matchSport);
    if (levels.length === 0) return null;
    const level = levels.find((l) => l.value === skillLevelNumeric) ?? levels.reduce((prev, curr) =>
      Math.abs(curr.value - skillLevelNumeric) < Math.abs(prev.value - skillLevelNumeric) ? curr : prev
    );
    return `${skillLevelNumeric.toFixed(1)} — ${level.name}`;
  })();
  const sportDisplayName = match.sport === "padel" ? "البادل" : "التنس";

  return (
    <SurfaceCard elevated style={styles.playerCard}>
      <View
        style={[styles.playerCardGradient, { backgroundColor: colors.surfaceContainer }]}
        pointerEvents="none"
      />
      <View style={styles.playerHeader}>
        <View style={styles.playerInfo}>
          <Text style={[styles.playerName, { color: colors.onSurface }]}>{player.nickname}</Text>
          <View style={styles.playerMeta}>
            <View style={[styles.positionBadge, { backgroundColor: sportTheme.pillBackground }]}>
              <Text style={[styles.positionText, { color: sportTheme.pillForeground }]}>{position}</Text>
            </View>
            <View style={[styles.relBadge, { backgroundColor: relColor + "18" }]}>
              <Text style={[styles.relText, { color: relColor }]}>
                {relFormatted !== "—" ? `${relFormatted} موثوقية` : "لاعب جديد"}
              </Text>
            </View>
          </View>
          {player.badges.length > 0 && (
            <View style={styles.badgesRow}>
              {player.badges.map((badge) => {
                const opt = RATING_OPTIONS.find((r) => r.key === badge);
                if (!opt) return null;
                return (
                  <View key={badge} style={[styles.badgeChip, { backgroundColor: opt.bgGradient, borderWidth: 1, borderColor: opt.color + "40" }]}>
                    <Text style={styles.badgeEmoji}>{opt.emoji}</Text>
                    <Text style={[styles.badgeChipText, { color: opt.color }]}>{opt.label}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={[styles.playerAvatar, { backgroundColor: sportTheme.primaryContainer }]}>
          <Text style={[styles.playerInitial, { color: sportTheme.primary }]}>
            {player.nickname.charAt(0)}
          </Text>
        </View>
      </View>

      {selectedOpt && (
        <View style={[styles.selectedBanner, { backgroundColor: selectedOpt.color + "18" }]}>
          <Text style={styles.selectedBannerEmoji}>{selectedOpt.emoji}</Text>
          <Text style={[styles.selectedBannerText, { color: selectedOpt.color }]}>
            تم اختيار "{selectedOpt.label}"
          </Text>
        </View>
      )}

      <View style={styles.ratingOptions}>
        {RATING_OPTIONS.map((opt) => {
          const isSelected = selected === opt.key;
          return (
            <RatingOptionCard
              key={opt.key}
              opt={opt}
              isSelected={isSelected}
              colors={colors}
              onPress={() => onRate(opt.key)}
            />
          );
        })}
      </View>

      {showLevelQuestion && (
        <View style={[styles.levelVoteSection, { borderTopColor: colors.border }]}>
          <Text style={[styles.levelVoteQuestion, { color: colors.onSurface }]}>
            هل مستوى {player.nickname} في {sportDisplayName}
            {levelLabel ? ` (${levelLabel})` : ""} مطابق لأدائه؟
          </Text>
          <Text style={[styles.levelVoteOptional, { color: colors.mutedForeground }]}>اختياري</Text>
          <View style={styles.levelVoteButtons}>
            {LEVEL_VOTE_OPTIONS.map((opt) => {
              const isVoted = levelAccuracyVote === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onLevelVote(opt.key);
                  }}
                  style={[
                    styles.levelVoteBtn,
                    isVoted ? { backgroundColor: opt.color + "15", borderColor: opt.color, borderWidth: 1 } : { borderWidth: 1, borderColor: colors.border },
                    { backgroundColor: isVoted ? opt.color + "15" : colors.background },
                    isVoted && { borderColor: opt.color, borderWidth: 1 },
                  ]}
                >
                  <Ionicons
                    name={opt.icon}
                    size={16}
                    color={isVoted ? opt.color : colors.mutedForeground}
                  />
                  <Text style={[styles.levelVoteBtnText, { color: isVoted ? opt.color : colors.onSurfaceVariant }]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  headerGradient: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: "#fff",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  matchSummary: {
    gap: 8,
  },
  matchSummaryTitle: {
    fontSize: 20,
    fontFamily: "Cairo_700Bold",
    color: "#fff",
    textAlign: "right",
  },
  matchSummaryDetails: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    justifyContent: "flex-end",
  },
  matchSummaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  matchSummaryText: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: "rgba(255,255,255,0.9)",
  },
  matchSummaryDot: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
  },

  contentArea: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
    overflow: "hidden",
  },

  progressArea: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressCount: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
  },
  progressRatedCount: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
  },
  progressTrack: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flex: 1,
    maxWidth: 28,
  },

  noPlayers: {
    borderRadius: 18,
    padding: 30,
    alignItems: "center",
    gap: 12,
    marginTop: 20,
  },
  noPlayersText: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    textAlign: "center",
  },

  playerCardWrap: {
    flex: 1,
  },
  playerCard: {
    borderRadius: 20,
    padding: 14,
    gap: 14,
    backgroundColor: "#fff",
    flex: 1,
    overflow: "hidden",
  },
  playerCardGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  playerHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  playerInfo: {
    flex: 1,
    alignItems: "flex-end",
    gap: 6,
    marginLeft: 12,
  },
  playerName: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    textAlign: "right",
  },
  playerMeta: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  positionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 50,
  },
  positionText: {
    fontSize: 11,
    fontFamily: "Cairo_700Bold",
  },
  relBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 50,
  },
  relText: {
    fontSize: 11,
    fontFamily: "Cairo_700Bold",
  },
  badgesRow: {
    flexDirection: "row",
    gap: 4,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  badgeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeEmoji: {
    fontSize: 10,
  },
  badgeChipText: {
    fontSize: 10,
    fontFamily: "Cairo_700Bold",
  },
  playerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  playerInitial: {
    fontSize: 26,
    fontFamily: "Cairo_700Bold",
  },

  selectedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  selectedBannerEmoji: {
    fontSize: 14,
  },
  selectedBannerText: {
    fontSize: 12,
    fontFamily: "Cairo_700Bold",
  },

  ratingOptions: {
    flexDirection: "row",
    gap: 8,
  },
  ratingCard: {
    flex: 1,
    borderRadius: 16,
    padding: 10,
    alignItems: "center",
    gap: 6,
    position: "relative",
  },
  ratingEmojiWrap: {
    width: 62,
    height: 62,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingEmoji: {
    fontSize: 32,
  },
  ratingLabel: {
    fontSize: 13,
    fontFamily: "Cairo_700Bold",
  },
  ratingDesc: {
    fontSize: 10,
    fontFamily: "Cairo_400Regular",
    textAlign: "center",
    lineHeight: 14,
  },
  checkMark: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  navButtons: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 50,
  },
  navBtnText: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
  },

  footer: {
    paddingHorizontal: 16,
    gap: 10,
    paddingTop: 12,
  },
  skipBtn: {
    paddingVertical: 12,
    borderRadius: 50,
    alignItems: "center",
  },
  skipText: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
  },

  successScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    paddingHorizontal: 0,
  },
  successIconOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: "hidden",
  },
  successIconGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontSize: 26,
    fontFamily: "Cairo_700Bold",
    marginTop: 8,
  },
  successSub: {
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    textAlign: "center",
    lineHeight: 24,
  },

  ratedSummaryBox: {
    borderRadius: 18,
    padding: 14,
    gap: 8,
  },
  ratedSummaryTitle: {
    fontSize: 13,
    fontFamily: "Cairo_700Bold",
    textAlign: "right",
    marginBottom: 4,
  },
  ratedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  ratedName: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    textAlign: "right",
    flex: 1,
  },
  ratedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 50,
  },
  ratedBadgeEmoji: {
    fontSize: 13,
  },
  ratedBadgeLabel: {
    fontSize: 12,
    fontFamily: "Cairo_700Bold",
  },

  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderRadius: 50,
  },
  actionBtnText: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
  },

  levelVoteSection: {
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 8,
  },
  levelVoteQuestion: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    textAlign: "right",
    lineHeight: 20,
  },
  levelVoteOptional: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    textAlign: "right",
  },
  levelVoteButtons: {
    flexDirection: "row",
    gap: 6,
  },
  levelVoteBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  levelVoteBtnText: {
    fontSize: 11,
    fontFamily: "Cairo_700Bold",
  },
});
