import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const NOTIF_PERMISSION_KEY = "@elab_notif_permission_denied";

function isExpoGoEnvironment(): boolean {
  return (
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
    Constants.appOwnership === "expo"
  );
}

export function usePushNotifications(isLoggedIn: boolean, registerToken: (token: string) => Promise<void>) {
  const registered = useRef(false);

  useEffect(() => {
    if (!isLoggedIn || Platform.OS === "web") return;
    if (isExpoGoEnvironment()) return;

    async function setupPush() {
      if (registered.current) return;

      try {
        const Notifications = await import("expo-notifications");

        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== "granted") {
          await AsyncStorage.setItem(NOTIF_PERMISSION_KEY, "true");
          return;
        }

        await AsyncStorage.removeItem(NOTIF_PERMISSION_KEY);

        const tokenData = await Notifications.getExpoPushTokenAsync();
        const token = tokenData.data;

        await registerToken(token);
        registered.current = true;
      } catch {
      }
    }

    setupPush();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && !registered.current) {
        setupPush();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isLoggedIn, registerToken]);
}
