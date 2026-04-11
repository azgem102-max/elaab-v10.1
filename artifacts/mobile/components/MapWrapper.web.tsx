import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ApiMatch } from "@/services/api";
import { sportColor, sportLabel } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export function MatchMapView({
  matches,
  onMatchPress,
  selectedMatch,
  onPinPress,
  onCloseCard,
  onJoinFromCard,
  userLocation,
}: {
  matches: ApiMatch[];
  onMatchPress: (item: ApiMatch) => void;
  selectedMatch?: ApiMatch | null;
  onPinPress?: (item: ApiMatch) => void;
  onCloseCard?: () => void;
  onJoinFromCard?: (item: ApiMatch) => void;
  userLocation?: { lat: number; lng: number };
}) {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceContainerLow }]}>
      <View style={styles.header}>
        <Ionicons name="map-outline" size={32} color={colors.mutedForeground} />
        <Text style={[styles.title, { color: colors.onSurface }]}>
          عرض الخريطة
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          عرض الخريطة متاح فقط على تطبيق الجوال
        </Text>
      </View>

      {matches.length > 0 && (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          <Text style={[styles.listHeader, { color: colors.onSurfaceVariant }]}>
            المباريات في هذه المنطقة ({matches.length})
          </Text>
          {matches.map((match) => {
            const sc = sportColor(match.sport, colors);
            const filled = match.playerCount ?? 0;
            const remaining = match.maxPlayers - filled;
            const isFull = filled >= match.maxPlayers;
            return (
              <Pressable
                key={match.id}
                onPress={() => onMatchPress(match)}
                style={({ pressed }) => [
                  styles.matchRow,
                  {
                    backgroundColor: colors.surface,
                    borderColor: sc + "30",
                    opacity: pressed ? 0.92 : 1,
                  },
                ]}
              >
                <View style={[styles.sportDot, { backgroundColor: sc }]} />
                <View style={styles.matchInfo}>
                  <Text style={[styles.matchTitle, { color: colors.onSurface }]} numberOfLines={1}>
                    {match.title}
                  </Text>
                  <Text style={[styles.matchMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {match.venue} · {match.time}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 2 }}>
                  <Text style={[styles.sportLabel, { color: sc }]}>
                    {sportLabel(match.sport)}
                  </Text>
                  <Text style={[styles.spotsText, { color: isFull ? colors.destructive : colors.success }]}>
                    {isFull ? "مكتملة" : `${remaining} متبقي`}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}


export function MatchMapOverlayCard({
  match,
  onClose,
  onViewDetails,
  onJoin,
}: {
  match: ApiMatch | null;
  onClose: () => void;
  onViewDetails: (match: ApiMatch) => void;
  onJoin: (match: ApiMatch) => void;
}) {
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    paddingTop: 24,
    paddingHorizontal: 16,
  },
  header: {
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  title: {
    fontSize: 17,
    fontFamily: "Cairo_700Bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    textAlign: "center",
  },
  list: {
    width: "100%",
    maxWidth: 400,
  },
  listContent: {
    gap: 8,
    paddingBottom: 24,
  },
  listHeader: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    textAlign: "right",
    marginBottom: 4,
  },
  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  sportDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  matchInfo: {
    flex: 1,
    gap: 2,
  },
  matchTitle: {
    fontSize: 13,
    fontFamily: "Cairo_700Bold",
    textAlign: "right",
  },
  matchMeta: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    textAlign: "right",
  },
  sportLabel: {
    fontSize: 11,
    fontFamily: "Cairo_700Bold",
  },
  spotsText: {
    fontSize: 11,
    fontFamily: "Cairo_600SemiBold",
  },
});
