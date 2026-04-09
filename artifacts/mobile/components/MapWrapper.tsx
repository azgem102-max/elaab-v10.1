import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Callout, Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import type { ApiMatch } from "@/services/api";
import { sportColor, sportLabel } from "@/context/AppContext";
import { getSportIcon } from "@/components/icons/SportIcons";
import { useColors } from "@/hooks/useColors";

const RIYADH_LAT = 24.7136;
const RIYADH_LNG = 46.6753;

function getMatchCoordinates(match: ApiMatch, index: number): { latitude: number; longitude: number } {
  if (match.lat != null && match.lng != null) {
    return { latitude: match.lat, longitude: match.lng };
  }
  const offsetLat = Math.sin(index * 2.3 + 1.1) * 0.04;
  const offsetLng = Math.cos(index * 1.7 + 0.8) * 0.06;
  return { latitude: RIYADH_LAT + offsetLat, longitude: RIYADH_LNG + offsetLng };
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
  const colors = useColors();
  const anim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (match) {
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 10,
      }).start();
    } else {
      Animated.timing(anim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start();
    }
  }, [match]);

  if (!match) return null;

  const sc = sportColor(match.sport, colors);
  const filled = match.playerCount ?? 0;
  const remaining = match.maxPlayers - filled;
  const isFull = filled >= match.maxPlayers;

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [120, 0] });

  return (
    <Animated.View
      style={[
        cardStyles.container,
        {
          opacity: anim,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          cardStyles.card,
          {
            backgroundColor: colors.surface,
            shadowColor: "#000",
          },
        ]}
      >
        <Pressable style={cardStyles.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={18} color={colors.mutedForeground} />
        </Pressable>

        <View style={[cardStyles.header, { backgroundColor: sc + "18" }]}>
          <View style={[cardStyles.sportDot, { backgroundColor: sc }]} />
          <Text style={[cardStyles.sportLabel, { color: sc }]}>{sportLabel(match.sport)}</Text>
          <View style={{ flex: 1 }} />
          <Text style={[cardStyles.timeText, { color: colors.onSurfaceVariant }]}>{match.time}</Text>
        </View>

        <View style={cardStyles.body}>
          <Text style={[cardStyles.title, { color: colors.onSurface }]} numberOfLines={2}>
            {match.title}
          </Text>
          <View style={cardStyles.metaRow}>
            <Ionicons name="location-outline" size={13} color={colors.mutedForeground} />
            <Text style={[cardStyles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>
              {match.venue}
            </Text>
          </View>
          <View style={cardStyles.statsRow}>
            <View style={[cardStyles.statPill, { backgroundColor: isFull ? colors.destructive + "18" : colors.success + "18" }]}>
              <Ionicons
                name={isFull ? "lock-closed-outline" : "people-outline"}
                size={12}
                color={isFull ? colors.destructive : colors.success}
              />
              <Text style={[cardStyles.statText, { color: isFull ? colors.destructive : colors.success }]}>
                {isFull ? "مكتملة" : `${remaining} متبقي`}
              </Text>
            </View>
            <View style={[cardStyles.statPill, { backgroundColor: colors.surfaceContainerLow }]}>
              <Text style={[cardStyles.statText, { color: colors.onSurface }]}>{match.cost} ر.س</Text>
            </View>
          </View>
        </View>

        <View style={cardStyles.actions}>
          <Pressable
            style={[cardStyles.detailsBtn, { backgroundColor: colors.surfaceContainerLow }]}
            onPress={() => onViewDetails(match)}
          >
            <Text style={[cardStyles.detailsBtnText, { color: colors.onSurface }]}>التفاصيل</Text>
          </Pressable>

          {!isFull && !match.joinedByCurrentUser && (
            <Pressable
              style={[cardStyles.joinBtn, { overflow: "hidden" }]}
              onPress={() => onJoin(match)}
            >
              <View style={[cardStyles.joinBtnGradient, { backgroundColor: sc }]}>
                <Text style={cardStyles.joinBtnText}>انضم</Text>
              </View>
            </Pressable>
          )}

          {match.joinedByCurrentUser && (
            <View style={[cardStyles.joinedPill, { backgroundColor: colors.primary + "18" }]}>
              <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
              <Text style={[cardStyles.joinedText, { color: colors.primary }]}>مسجل</Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

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
  const [mapError, setMapError] = useState(false);
  const mapReadyRef = useRef(false);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (Platform.OS === "android") {
      errorTimerRef.current = setTimeout(() => {
        if (!mapReadyRef.current) {
          setMapError(true);
        }
      }, 10000);
    }
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (userLocation && mapReadyRef.current && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: userLocation.lat,
          longitude: userLocation.lng,
          latitudeDelta: 0.12,
          longitudeDelta: 0.12,
        },
        600
      );
    }
  }, [userLocation]);

  const centerLat = userLocation?.lat ?? (matches[0]?.lat ?? RIYADH_LAT);
  const centerLng = userLocation?.lng ?? (matches[0]?.lng ?? RIYADH_LNG);

  const region = {
    latitude: centerLat,
    longitude: centerLng,
    latitudeDelta: 0.12,
    longitudeDelta: 0.12,
  };

  const hasOverlay = onPinPress !== undefined;

  if (mapError) {
    return (
      <View style={[styles.mapErrorContainer, { backgroundColor: colors.surfaceContainerLow }]}>
        <Ionicons name="map-outline" size={48} color={colors.mutedForeground} />
        <Text style={[styles.mapErrorText, { color: colors.mutedForeground }]}>
          تعذّر تحميل الخريطة
        </Text>
        <Text style={[styles.mapErrorSub, { color: colors.mutedForeground }]}>
          تأكد من اتصالك بالإنترنت أو افتح التطبيق على جهازك المحمول
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        showsUserLocation={!!userLocation}
        onMapReady={() => {
          mapReadyRef.current = true;
          setMapError(false);
          if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
        }}
      >
        {matches.map((match, index) => {
          const coord = getMatchCoordinates(match, index);
          const sc = sportColor(match.sport, colors);
          const filled = match.playerCount ?? 0;
          const remaining = match.maxPlayers - filled;
          const isFull = filled >= match.maxPlayers;
          const isSelected = selectedMatch?.id === match.id;
          const SportIcon = getSportIcon(match.sport);

          return (
            <Marker
              key={match.id}
              coordinate={coord}
              onPress={hasOverlay ? () => onPinPress!(match) : undefined}
            >
              <View style={[
                styles.markerPin,
                { backgroundColor: sc },
                isSelected && styles.markerPinSelected,
              ]}>
                <SportIcon color="#fff" size={16} />
              </View>
              {!hasOverlay && (
                <Callout onPress={() => onMatchPress(match)} style={styles.calloutWrapper}>
                  <View style={[styles.calloutCard, { backgroundColor: colors.surface }]}>
                    <View style={[styles.calloutHeader, { backgroundColor: sc + "18" }]}>
                      <Text style={[styles.calloutSport, { color: sc }]}>{sportLabel(match.sport)}</Text>
                      <Text style={[styles.calloutTime, { color: colors.onSurfaceVariant }]}>{match.time}</Text>
                    </View>
                    <Text style={[styles.calloutTitle, { color: colors.onSurface }]} numberOfLines={2}>
                      {match.title}
                    </Text>
                    <Text style={[styles.calloutVenue, { color: colors.mutedForeground }]} numberOfLines={1}>
                      📍 {match.venue}
                    </Text>
                    <View style={styles.calloutRow}>
                      <Text style={[styles.calloutCost, { color: colors.onSurface }]}>
                        {match.cost} ر.س
                      </Text>
                      <View style={[styles.calloutSpots, { backgroundColor: isFull ? colors.destructive + "18" : colors.success + "18" }]}>
                        <Text style={[styles.calloutSpotsText, { color: isFull ? colors.destructive : colors.success }]}>
                          {isFull ? "مكتملة" : `${remaining} متبقي`}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.calloutBtn, { backgroundColor: sc }]}>
                      <Text style={styles.calloutBtnText}>عرض التفاصيل</Text>
                    </View>
                  </View>
                </Callout>
              )}
            </Marker>
          );
        })}
      </MapView>

      {hasOverlay && (
        <MatchMapOverlayCard
          match={selectedMatch ?? null}
          onClose={onCloseCard ?? (() => {})}
          onViewDetails={onMatchPress}
          onJoin={onJoinFromCard ?? (() => {})}
        />
      )}
    </View>
  );
}


const cardStyles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
  },
  card: {
    borderRadius: 24,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  closeBtn: {
    position: "absolute",
    top: 10,
    left: 12,
    zIndex: 10,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sportDot: { width: 7, height: 7, borderRadius: 4 },
  sportLabel: { fontSize: 12, fontFamily: "Cairo_700Bold" },
  timeText: { fontSize: 11, fontFamily: "Cairo_400Regular" },
  body: { paddingHorizontal: 14, paddingVertical: 8, gap: 6 },
  title: { fontSize: 16, fontFamily: "Cairo_700Bold", textAlign: "right", lineHeight: 24 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, fontFamily: "Cairo_400Regular", flex: 1 },
  statsRow: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "flex-end" },
  statPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statText: { fontSize: 12, fontFamily: "Cairo_700Bold" },
  actions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  detailsBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  detailsBtnText: { fontSize: 13, fontFamily: "Cairo_700Bold" },
  joinBtn: { borderRadius: 20, overflow: "hidden" },
  joinBtnGradient: { paddingHorizontal: 22, paddingVertical: 10, alignItems: "center" },
  joinBtnText: { color: "#fff", fontSize: 13, fontFamily: "Cairo_700Bold" },
  joinedPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  joinedText: { fontSize: 13, fontFamily: "Cairo_700Bold" },
});

const styles = StyleSheet.create({
  map: { flex: 1 },
  mapErrorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 32,
  },
  mapErrorText: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    textAlign: "center",
  },
  mapErrorSub: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  markerPin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  markerPinSelected: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2.5,
    borderColor: "#fff",
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 9,
  },
  calloutWrapper: { width: 200 },
  calloutCard: {
    borderRadius: 16,
    overflow: "hidden",
    gap: 6,
    padding: 0,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  calloutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  calloutSport: { fontSize: 12, fontFamily: "Cairo_700Bold" },
  calloutTime: { fontSize: 11, fontFamily: "Cairo_400Regular" },
  calloutTitle: { fontSize: 13, fontFamily: "Cairo_700Bold", textAlign: "right", lineHeight: 20, paddingHorizontal: 12 },
  calloutVenue: { fontSize: 11, fontFamily: "Cairo_400Regular", textAlign: "right", paddingHorizontal: 12 },
  calloutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  calloutCost: { fontSize: 14, fontFamily: "Cairo_700Bold" },
  calloutSpots: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  calloutSpotsText: { fontSize: 11, fontFamily: "Cairo_600SemiBold" },
  calloutBtn: {
    margin: 10,
    marginTop: 6,
    borderRadius: 20,
    paddingVertical: 8,
    alignItems: "center",
  },
  calloutBtnText: { color: "#fff", fontFamily: "Cairo_700Bold", fontSize: 13 },
});
