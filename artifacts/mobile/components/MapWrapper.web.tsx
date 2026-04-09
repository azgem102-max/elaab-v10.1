import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ApiMatch } from "@/services/api";
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
    <View style={styles.container}>
      <Ionicons name="map-outline" size={48} color={colors.mutedForeground} />
      <Text style={[styles.text, { color: colors.mutedForeground }]}>
        عرض الخريطة متاح فقط على التطبيق
      </Text>
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
    justifyContent: "center",
    gap: 12,
  },
  text: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    textAlign: "center",
  },
});
