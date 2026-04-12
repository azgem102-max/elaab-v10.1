import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  glassRadius,
  glassShadow,
  glassSpacing,
  glassSpring,
} from "@/constants/glassTheme";
import colors from "@/constants/colors";

interface GlassTabBarRoute {
  key: string;
  name: string;
  params?: Readonly<object | undefined>;
}

interface GlassTabBarProps {
  state: {
    index: number;
    routes: ReadonlyArray<GlassTabBarRoute>;
  };
  descriptors: Record<
    string,
    {
      options: {
        tabBarIcon?: (props: {
          focused: boolean;
          color: string;
          size: number;
        }) => React.ReactNode;
        [key: string]: unknown;
      };
    }
  >;
  navigation: {
    emit: (event: Record<string, unknown>) => { defaultPrevented: boolean };
    navigate: (...args: unknown[]) => void;
  };
  [key: string]: unknown;
}

const FLOAT_MARGIN = glassSpacing.md;
const TAB_BAR_HEIGHT = 60;

export function GlassTabBar({
  state,
  descriptors,
  navigation,
}: GlassTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.floatingContainer,
        { bottom: Math.max(insets.bottom, FLOAT_MARGIN) },
        glassShadow.medium,
      ]}
    >
      <View style={styles.tabRow}>
        {state.routes.map((route: GlassTabBarRoute, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <GlassTabItem
              key={route.key}
              focused={isFocused}
              onPress={onPress}
              icon={options.tabBarIcon}
            />
          );
        })}
      </View>
    </View>
  );
}

interface GlassTabItemProps {
  focused: boolean;
  onPress: () => void;
  icon:
    | ((props: {
        focused: boolean;
        color: string;
        size: number;
      }) => React.ReactNode)
    | undefined;
}

function GlassTabItem({
  focused,
  onPress,
  icon,
}: GlassTabItemProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.88, glassSpring.snappy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, glassSpring.bouncy);
  };

  const activeColor = colors.light.primary;
  const inactiveColor = colors.light.mutedForeground + "8C";

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabItem}
    >
      <Animated.View style={[styles.tabIconWrap, animatedStyle]}>
        {focused && (
          <View style={styles.activePill} />
        )}
        {icon?.({
          focused,
          color: focused ? activeColor : inactiveColor,
          size: 24,
        })}
        {focused && (
          <View
            style={[styles.activeDot, { backgroundColor: activeColor }]}
          />
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: "absolute",
    start: FLOAT_MARGIN,
    end: FLOAT_MARGIN,
    height: TAB_BAR_HEIGHT,
    borderRadius: glassRadius.xxl,
    overflow: "hidden",
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  tabRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: glassSpacing.xs,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  tabIconWrap: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    width: 48,
    height: 40,
  },
  activePill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: glassRadius.md,
    backgroundColor: colors.light.surfaceContainer,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: "absolute",
    bottom: -2,
  },
});
