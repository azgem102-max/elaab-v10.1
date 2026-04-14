import {
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
  Tajawal_900Black,
  useFonts,
} from "@expo-google-fonts/tajawal";
import {
  Alexandria_400Regular,
  Alexandria_700Bold,
  Alexandria_900Black,
} from "@expo-google-fonts/alexandria";
import {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
} from "@expo-google-fonts/ibm-plex-sans-arabic";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_900Black,
} from "@expo-google-fonts/inter";
import {
  Manrope_400Regular,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import { Feather, Ionicons } from "@expo/vector-icons";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, I18nManager, Linking, NativeModules, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
let KeyboardProvider: React.ComponentType<{ children: React.ReactNode }>;
try {
  KeyboardProvider = require("react-native-keyboard-controller").KeyboardProvider;
} catch {
  KeyboardProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;
}
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GlassBackground } from "@/components/glass/GlassBackground";
import { AppProvider, useApp, setQueryClientRef, setCachedPushTokenRef } from "@/context/AppContext";
import { SportFilterProvider } from "@/context/SportFilterContext";
import { usePushNotifications, NOTIF_PERMISSION_KEY } from "@/hooks/usePushNotifications";
import { api } from "@/services/api";
import { LanguageProvider } from "@/i18n";
import { typography } from "@/constants/typography";


// RTL/LTR is now managed dynamically by LanguageProvider
// The LanguageProvider reads the saved language from AsyncStorage
// and applies the correct I18nManager.forceRTL() on mount.

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();
setQueryClientRef(queryClient);

function navigateFromNotification(data: Record<string, unknown>) {
  const relatedId = typeof data["relatedId"] === "string" ? data["relatedId"] : undefined;
  const type = typeof data["type"] === "string" ? data["type"] : undefined;

  if (!relatedId) return;

  if (type === "group") {
    router.push({ pathname: "/group-detail", params: { id: relatedId } });
  } else {
    router.push({ pathname: "/match-details", params: { id: relatedId } });
  }
}

function NotificationPermissionBanner() {
  const { user } = useApp();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user || Platform.OS === "web") return;

    async function checkBannerVisibility() {
      try {
        const Notifications = await import("expo-notifications");
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== "granted") {
          const denied = await AsyncStorage.getItem(NOTIF_PERMISSION_KEY);
          if (denied === "true") {
            setVisible(true);
          }
        } else {
          await AsyncStorage.removeItem(NOTIF_PERMISSION_KEY);
          setVisible(false);
        }
      } catch {
      }
    }

    checkBannerVisibility();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        checkBannerVisibility();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [user]);

  if (!visible) return null;

  return (
    <View style={[bannerStyles.banner, { top: insets.top + 8 }]}>
      <Pressable onPress={() => setVisible(false)} style={bannerStyles.closeBtn} hitSlop={8}>
        <Ionicons name="close" size={16} color="#fff" />
      </Pressable>
      <View style={bannerStyles.content}>
        <Ionicons name="notifications-off-outline" size={20} color="#fff" />
        <Text style={bannerStyles.text}>الإشعارات معطّلة — فعّلها لتلقّي تنبيهات المباريات</Text>
      </View>
      <Pressable
        onPress={() => {
          setVisible(false);
          Linking.openSettings();
        }}
        style={bannerStyles.actionBtn}
      >
        <Text style={bannerStyles.actionText}>تفعيل الإشعارات</Text>
      </Pressable>
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  banner: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 9999,
    backgroundColor: "#E53E3E",
    borderRadius: 14,
    padding: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "flex-end",
  },
  text: {
    color: "#fff",
    fontFamily: typography.bodyLg.fontFamily,
    fontSize: 13,
    flex: 1,
    textAlign: "right",
    lineHeight: 20,
  },
  closeBtn: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 1,
  },
  actionBtn: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: "flex-end",
  },
  actionText: {
    color: "#fff",
    fontFamily: typography.headlineSm.fontFamily,
    fontSize: 13,
  },
});

function PushNotificationManager() {
  const { user } = useApp();
  const responseListenerRef = useRef<{ remove: () => void } | null>(null);

  const registerToken = useCallback(async (token: string) => {
    try {
      await api.registerPushToken(token);
      setCachedPushTokenRef(token);
    } catch {
    }
  }, []);
  usePushNotifications(!!user, registerToken);

  useEffect(() => {
    if (Platform.OS === "web") return;

    async function setupNotificationResponseListener() {
      try {
        const Notifications = await import("expo-notifications");

        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        if (lastResponse) {
          const data = lastResponse.notification.request.content.data as Record<string, unknown>;
          navigateFromNotification(data);
        }

        responseListenerRef.current = Notifications.addNotificationResponseReceivedListener((response) => {
          const data = response.notification.request.content.data as Record<string, unknown>;
          navigateFromNotification(data);
        });
      } catch {
      }
    }

    setupNotificationResponseListener();

    return () => {
      responseListenerRef.current?.remove();
    };
  }, []);

  return null;
}

function RootLayoutNav() {
  return (
    <GlassBackground>
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <PushNotificationManager />
      <NotificationPermissionBanner />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: Platform.OS === "web" ? "#FFFFFF" : "transparent",
          },
        }}
      >
        <Stack.Screen name="language" options={{ animation: "fade", gestureEnabled: false }} />
        <Stack.Screen name="index" options={{ animation: "fade", gestureEnabled: false }} />
        <Stack.Screen name="phone" options={{ animation: "slide_from_left", gestureEnabled: true }} />
        <Stack.Screen name="otp" options={{ animation: "slide_from_left", gestureEnabled: true }} />
        <Stack.Screen name="profile-setup" options={{ animation: "slide_from_left", gestureEnabled: false }} />
        <Stack.Screen name="position-selector" options={{ animation: "slide_from_left", gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="create-match" />
        <Stack.Screen name="match-details" />
        <Stack.Screen name="manage-match" />
        <Stack.Screen name="edit-match" />
        <Stack.Screen name="group-detail" />
        <Stack.Screen name="group-management" />
        <Stack.Screen name="group-chat" />
        <Stack.Screen name="create-group" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="invite/[token]" />
        <Stack.Screen name="post-match-rating" options={{ headerShown: false }} />
      </Stack>
    </GlassBackground>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold,
    Tajawal_900Black,
    Alexandria_400Regular,
    Alexandria_700Bold,
    Alexandria_900Black,
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_900Black,
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    ...Ionicons.font,
    ...Feather.font,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <LanguageProvider>
              <AppProvider>
                <SportFilterProvider>
                  <RootLayoutNav />
                </SportFilterProvider>
              </AppProvider>
            </LanguageProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
