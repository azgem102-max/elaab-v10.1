import { useApp, Notification } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

import { GlassScreenHeader } from "@/components/glass/GlassScreenHeader";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useEffect, useState, useCallback } from "react";
import { api } from "@/services/api";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  I18nManager,
  PanResponder,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35;

const TYPE_ICONS = {
  match: "football-outline" as const,
  group: "people-outline" as const,
  rating: "star-outline" as const,
  system: "notifications-outline" as const,
};

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "أمس";
  if (days < 7) return `منذ ${days} أيام`;
  return `منذ ${Math.floor(days / 7)} أسابيع`;
}

function navigateForNotification(notif: Notification) {
  if (notif.linkedId) {
    if (notif.type === "match") {
      router.push({ pathname: "/match-details", params: { id: notif.linkedId } });
    } else if (notif.type === "group") {
      router.push({ pathname: "/group-detail", params: { id: notif.linkedId } });
    }
  }
}

function groupNotifications(notifications: Notification[]) {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - 6);

  const today: Notification[] = [];
  const thisWeek: Notification[] = [];
  const older: Notification[] = [];

  for (const n of notifications) {
    const t = n.time instanceof Date ? n.time : new Date(n.time);
    if (t >= startOfToday) {
      today.push(n);
    } else if (t >= startOfWeek) {
      thisWeek.push(n);
    } else {
      older.push(n);
    }
  }

  const sections: { title: string; data: Notification[] }[] = [];
  if (today.length > 0) sections.push({ title: "اليوم", data: today });
  if (thisWeek.length > 0) sections.push({ title: "هذا الأسبوع", data: thisWeek });
  if (older.length > 0) sections.push({ title: "أقدم", data: older });

  return sections;
}

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { notifications, refreshNotifications, markNotificationRead, markAllNotificationsRead, clearAllNotifications } = useApp();
  const [isLoading, setIsLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const visibleNotifications = notifications.filter((n) => !dismissedIds.has(n.id));
  const unread = visibleNotifications.filter((n) => !n.isRead).length;
  const sections = groupNotifications(visibleNotifications);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    setIsLoading(true);
    refreshNotifications().finally(() => setIsLoading(false));
  }, []);

  const handleDismiss = useCallback(async (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await api.deleteNotification(id);
    } catch {
    }
  }, []);

  return (
    <Animated.View style={[styles.container, { backgroundColor: "transparent", opacity: fadeAnim }]}>
      <GlassScreenHeader style={{ paddingTop: topPad + 8, paddingHorizontal: 20, paddingBottom: 8 }}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.iconBtn, { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB" }]}
          >
            <Ionicons name={I18nManager.isRTL ? "chevron-forward" : "chevron-back"} size={22} color={colors.onSurface} />
          </Pressable>
          <View style={styles.titleBlock}>
            <Text style={[styles.title, { color: colors.onSurface }]}>الإشعارات</Text>
            {unread > 0 && (
              <View style={[styles.unreadBadge, { backgroundColor: colors.accent }]}>
                <Text style={[styles.unreadBadgeText, { color: "#111827" }]}>{unread}</Text>
              </View>
            )}
          </View>
          {notifications.length > 0 ? (
            <View style={styles.headerActions}>
              {unread > 0 && (
                <Pressable
                  onPress={markAllNotificationsRead}
                  style={[styles.markAllBtn, { backgroundColor: colors.surfaceContainer }]}
                >
                  <Text style={[styles.markAllText, { color: colors.primary }]}>تحديد الكل كمقروء</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => {
                  Alert.alert("مسح الإشعارات", "هل تريد مسح جميع الإشعارات؟", [
                    { text: "إلغاء", style: "cancel" },
                    { text: "مسح الكل", style: "destructive", onPress: clearAllNotifications },
                  ]);
                }}
                style={[styles.markAllBtn, { backgroundColor: colors.destructive + "15" }]}
              >
                <Text style={[styles.markAllText, { color: colors.destructive }]}>مسح الكل</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.iconBtn} />
          )}
        </View>
      </GlassScreenHeader>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : visibleNotifications.length === 0 ? (
        <EmptyState colors={colors} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(n) => n.id}
          contentContainerStyle={[styles.list, { paddingBottom: botPad + 20 }]}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          windowSize={10}
          maxToRenderPerBatch={8}
          initialNumToRender={8}
          removeClippedSubviews={Platform.OS === "android"}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                {section.title}
              </Text>
              <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
            </View>
          )}
          renderItem={({ item }) => (
            <NotificationItem
              notif={item}
              onPress={() => {
                markNotificationRead(item.id);
                navigateForNotification(item);
              }}
              onDismiss={() => handleDismiss(item.id)}
            />
          )}
        />
      )}
    </Animated.View>
  );
}

function NotificationItem({
  notif,
  onPress,
  onDismiss,
}: {
  notif: Notification;
  onPress: () => void;
  onDismiss: () => void;
}) {
  const colors = useColors();

  const typeColor = {
    match: colors.primary,
    group: colors.secondary,
    rating: colors.warning,
    system: colors.mutedForeground,
  }[notif.type];

  const typeIconBg = {
    match: colors.primary + "18",
    group: colors.secondary + "18",
    rating: colors.warning + "18",
    system: colors.mutedForeground + "18",
  }[notif.type];

  const hasLink = !!notif.linkedId;

  const translateX = useRef(new Animated.Value(0)).current;
  const itemHeight = useRef(new Animated.Value(1)).current;
  const itemOpacity = useRef(new Animated.Value(1)).current;
  const dotOpacity = useRef(new Animated.Value(notif.isRead ? 0 : 1)).current;
  const prevIsRead = useRef(notif.isRead);

  useEffect(() => {
    if (!prevIsRead.current && notif.isRead) {
      Animated.timing(dotOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
    prevIsRead.current = notif.isRead;
  }, [notif.isRead]);

  const dismissItem = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -SCREEN_WIDTH,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(itemOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.timing(itemHeight, {
        toValue: 0,
        duration: 220,
        useNativeDriver: false,
      }).start(() => {
        onDismiss();
      });
    });
  }, [onDismiss]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 8 && Math.abs(gestureState.dy) < 30;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -SWIPE_THRESHOLD) {
          dismissItem();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            tension: 80,
            friction: 10,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const swipeDeleteOpacity = translateX.interpolate({
    inputRange: [-SWIPE_THRESHOLD, -SWIPE_THRESHOLD * 0.5, 0],
    outputRange: [1, 0.5, 0],
    extrapolate: "clamp",
  });

  return (
    <Animated.View
      style={[
        styles.swipeContainer,
        {
          opacity: itemOpacity,
          maxHeight: itemHeight.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 200],
          }),
          marginBottom: itemHeight.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 10],
          }),
        },
      ]}
    >
      <Animated.View
        style={[styles.deleteBackground, { backgroundColor: colors.destructive, opacity: swipeDeleteOpacity }]}
        pointerEvents="none"
      >
        <Ionicons name="trash-outline" size={22} color="#fff" />
        <Text style={styles.deleteText}>حذف</Text>
      </Animated.View>

      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        <Pressable onPress={onPress}>
          <View
            style={[
              styles.notifCard,
              { borderWidth: 1, borderColor: "#E5E7EB" },
              { backgroundColor: "#FFFFFF" },
            ]}
          >
            <View
              style={[
                styles.typeStrip,
                { backgroundColor: typeColor },
              ]}
            />

            <Animated.View
              style={[styles.unreadDot, { backgroundColor: colors.accent, opacity: dotOpacity }]}
              pointerEvents="none"
            />

            <View style={styles.notifContent}>
              <View style={[styles.notifIcon, { backgroundColor: typeIconBg, shadowColor: typeColor, shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 }]}>
                <Ionicons name={TYPE_ICONS[notif.type]} size={24} color={typeColor} />
              </View>

              <View style={styles.notifTextCol}>
                <Text
                  style={[
                    styles.notifTitle,
                    {
                      color: colors.onSurface,
                      fontFamily: notif.isRead ? "Cairo_600SemiBold" : "Cairo_700Bold",
                      fontSize: notif.isRead ? 14 : 15,
                    },
                  ]}
                >
                  {notif.title}
                </Text>
                <Text
                  style={[
                    styles.notifBody,
                    {
                      color: notif.isRead ? colors.mutedForeground : colors.onSurfaceVariant,
                    },
                  ]}
                >
                  {notif.body}
                </Text>
                <View style={styles.notifFooter}>
                  <Text style={[styles.notifTime, { color: colors.mutedForeground }]}>
                    {timeAgo(notif.time)}
                  </Text>
                  {hasLink && (
                    <View style={[styles.tapHint, { backgroundColor: colors.surfaceContainer }]}>
                      <Ionicons name="arrow-forward" size={10} color={colors.mutedForeground} />
                      <Text style={[styles.tapHintText, { color: colors.mutedForeground }]}>
                        اضغط للانتقال
                      </Text>
                    </View>
                  )}
                  {!notif.isRead && (
                    <View style={[styles.unreadLabel, { backgroundColor: colors.accent }]}>
                      <Text style={[styles.unreadLabelText, { color: "#111827" }]}>جديد</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

function EmptyState({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconWrap, { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB" }]}>
        <Ionicons name="notifications-off-outline" size={44} color={colors.mutedForeground} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>لا توجد إشعارات</Text>
      <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
        ستظهر إشعاراتك هنا عند وجود أي نشاط جديد
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  titleBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: { fontSize: 20, fontFamily: "Cairo_700Bold" },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadgeText: {
    fontSize: 11,
    fontFamily: "Cairo_700Bold",
    color: "#FFFFFF",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 50,
  },
  markAllText: { fontSize: 12, fontFamily: "Cairo_700Bold" },
  list: { paddingHorizontal: 16, paddingTop: 4, gap: 0 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Cairo_700Bold",
    letterSpacing: 0.5,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    opacity: 0.5,
  },

  swipeContainer: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 20,
  },
  deleteBackground: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingRight: 20,
    gap: 8,
    zIndex: 0,
  },
  deleteText: {
    color: "#fff",
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
  },

  notifCard: {
    borderRadius: 20,
    padding: 14,
    paddingRight: 18,
    position: "relative",
    overflow: "hidden",
    zIndex: 1,
  },
  typeStrip: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: 4,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  unreadDot: {
    position: "absolute",
    top: 14,
    left: 14,
    width: 10,
    height: 10,
    borderRadius: 5,
    zIndex: 2,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  notifContent: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  notifIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  notifTextCol: {
    flex: 1,
    gap: 3,
    alignItems: "flex-end",
  },
  notifTitle: {
    textAlign: "right",
  },
  notifBody: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    textAlign: "right",
    lineHeight: 20,
  },
  notifFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "flex-end",
    marginTop: 2,
    flexWrap: "wrap",
  },
  notifTime: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
  },
  tapHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tapHintText: {
    fontSize: 10,
    fontFamily: "Cairo_400Regular",
  },
  unreadLabel: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 50,
  },
  unreadLabelText: {
    fontSize: 10,
    fontFamily: "Cairo_700Bold",
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
});
