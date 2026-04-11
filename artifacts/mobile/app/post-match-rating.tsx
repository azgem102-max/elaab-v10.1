import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  I18nManager,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { api, type ApiMatch } from "@/services/api";

type LevelVote = "higher" | "accurate" | "lower";

interface RatablePlayer {
  id: string;
  nickname: string;
  skillLevel: string | null;
}

const SPORT_ACCENT: Record<string, string> = {
  football: "#2C54E8",
  padel: "#0E9B6E",
  tennis: "#C97B18",
};

const SKILL_LEVEL_LABELS: Record<string, string> = {
  beginner: "مبتدئ",
  intermediate: "متوسط",
  advanced: "متقدم",
  مبتدئ: "مبتدئ",
  متوسط: "متوسط",
  محترف: "محترف",
};

function PlayerLevelCard({
  player,
  vote,
  sportAccent,
  onVote,
}: {
  player: RatablePlayer;
  vote: LevelVote | undefined;
  sportAccent: string;
  onVote: (playerId: string, v: LevelVote) => void;
}) {
  const colors = useColors();

  const buttons: { key: LevelVote; label: string; icon: string; activeColor: string }[] = [
    { key: "higher", label: "أعلى ↑", icon: "trending-up-outline", activeColor: colors.success },
    { key: "accurate", label: "مناسب ✓", icon: "checkmark-circle-outline", activeColor: sportAccent },
    { key: "lower", label: "أقل ↓", icon: "trending-down-outline", activeColor: colors.warning },
  ];

  return (
    <View
      style={[
        cardStyles.card,
        {
          backgroundColor: colors.surfaceContainerLow,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={cardStyles.playerRow}>
        <View style={[cardStyles.avatar, { backgroundColor: sportAccent + "22" }]}>
          <Text style={[cardStyles.avatarText, { color: sportAccent }]}>
            {player.nickname.charAt(0)}
          </Text>
        </View>
        <View style={cardStyles.playerInfo}>
          <Text style={[cardStyles.playerName, { color: colors.onSurface }]}>
            {player.nickname}
          </Text>
          {player.skillLevel && (
            <View style={[cardStyles.levelPill, { backgroundColor: sportAccent + "18", borderColor: sportAccent + "40" }]}>
              <Text style={[cardStyles.levelPillText, { color: sportAccent }]}>
                {SKILL_LEVEL_LABELS[player.skillLevel] ?? player.skillLevel}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={cardStyles.voteRow}>
        {buttons.map((btn) => {
          const isSelected = vote === btn.key;
          return (
            <Pressable
              key={btn.key}
              style={[
                cardStyles.voteBtn,
                {
                  backgroundColor: isSelected ? btn.activeColor + "20" : colors.surfaceContainerHigh,
                  borderColor: isSelected ? btn.activeColor : colors.border,
                  borderWidth: isSelected ? 1.5 : 1,
                },
              ]}
              onPress={() => onVote(player.id, btn.key)}
            >
              <Ionicons
                name={btn.icon as "trending-up-outline"}
                size={14}
                color={isSelected ? btn.activeColor : colors.onSurfaceVariant}
              />
              <Text
                style={[
                  cardStyles.voteBtnText,
                  { color: isSelected ? btn.activeColor : colors.onSurfaceVariant },
                ]}
              >
                {btn.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginBottom: 12,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    justifyContent: "flex-end",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 20,
    fontFamily: "Cairo_700Bold",
  },
  playerInfo: {
    flex: 1,
    alignItems: "flex-end",
    gap: 4,
  },
  playerName: {
    fontSize: 15,
    fontFamily: "Cairo_700Bold",
    textAlign: "right",
  },
  levelPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  levelPillText: {
    fontSize: 11,
    fontFamily: "Cairo_600SemiBold",
  },
  voteRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  voteBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 9,
    borderRadius: 14,
  },
  voteBtnText: {
    fontSize: 12,
    fontFamily: "Cairo_600SemiBold",
  },
});

export default function PostMatchRatingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useApp();
  const params = useLocalSearchParams<{ matchId: string }>();
  const matchId = params.matchId;

  const topPad = Platform.OS === "web" ? 20 : insets.top;
  const botPad = Platform.OS === "web" ? 20 : insets.bottom;

  const [matchData, setMatchData] = useState<ApiMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [votes, setVotes] = useState<Record<string, LevelVote>>({});
  const [submitting, setSubmitting] = useState(false);

  const currentUserId = user?.id ?? "";

  const fetchMatch = useCallback(async () => {
    if (!matchId) return;
    try {
      setLoading(true);
      const res = await api.getMatch(matchId);
      setMatchData(res.match);
    } catch {
      Alert.alert("خطأ", "تعذّر تحميل بيانات المباراة");
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useFocusEffect(
    useCallback(() => {
      fetchMatch();
    }, [fetchMatch])
  );

  const sportAccent = SPORT_ACCENT[matchData?.sport ?? "football"] ?? SPORT_ACCENT.football;

  const ratablePlayers: RatablePlayer[] = (matchData?.players ?? [])
    .filter((p) => p.id !== currentUserId && !!p.skillLevel)
    .map((p) => ({
      id: p.id,
      nickname: p.nickname,
      skillLevel: p.skillLevel ?? null,
    }));

  const handleVote = (playerId: string, v: LevelVote) => {
    setVotes((prev) => ({ ...prev, [playerId]: v }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.submitLevelVotes(matchId, votes);
      router.back();
    } catch {
      Alert.alert("خطأ", "تعذّر إرسال التقييم، حاول مرة أخرى");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingCenter, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isEmpty = ratablePlayers.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Ionicons
            name={I18nManager.isRTL ? "chevron-forward" : "chevron-back"}
            size={24}
            color={colors.onSurface}
          />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.onSurface }]}>كيف كان مستوى زملاؤك؟</Text>
          <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
            ساعدنا في ضبط مستويات اللاعبين
          </Text>
        </View>
      </View>

      {isEmpty ? (
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.success + "15" }]}>
            <Ionicons name="checkmark-circle-outline" size={56} color={colors.success} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>شكراً على مشاركتك!</Text>
          <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}>
            لا يوجد لاعبون بمستوى محدد لتقييمهم في هذه المباراة
          </Text>
          <Pressable
            style={[styles.backBtnLarge, { backgroundColor: sportAccent }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backBtnLargeText}>العودة</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: botPad + 100 }]}
            showsVerticalScrollIndicator={false}
          >
            {ratablePlayers.map((player) => (
              <PlayerLevelCard
                key={player.id}
                player={player}
                vote={votes[player.id]}
                sportAccent={sportAccent}
                onVote={handleVote}
              />
            ))}
          </ScrollView>

          <View
            style={[
              styles.footer,
              {
                paddingBottom: botPad + 16,
                backgroundColor: colors.background,
                borderTopColor: colors.border,
              },
            ]}
          >
            <Pressable
              style={[
                styles.submitBtn,
                {
                  backgroundColor: sportAccent,
                  opacity: submitting ? 0.7 : 1,
                },
              ]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="send-outline" size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>إرسال التقييم</Text>
                </>
              )}
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingCenter: { alignItems: "center", justifyContent: "center" },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerText: {
    flex: 1,
    alignItems: "flex-end",
  },
  title: {
    fontSize: 20,
    fontFamily: "Cairo_700Bold",
    textAlign: "right",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    textAlign: "right",
    marginTop: 2,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  submitBtn: {
    borderRadius: 24,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitBtnText: {
    color: "#fff",
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Cairo_700Bold",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  backBtnLarge: {
    marginTop: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
  },
  backBtnLargeText: {
    color: "#fff",
    fontFamily: "Cairo_700Bold",
    fontSize: 15,
  },
});
