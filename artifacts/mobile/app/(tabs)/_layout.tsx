import { useApp } from "@/context/AppContext";
import { useActiveSport } from "@/context/SportFilterContext";
import { GlassTabBar } from "@/components/glass/GlassTabBar";
import { HomeTabIcon, ExploreTabIcon, MatchesTabIcon, GroupsTabIcon, ProfileTabIcon } from "@/components/TabIcons";
import { Tabs } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  View,
} from "react-native";

const ACTIVE_COLOR = "#2C54E8";
const INACTIVE_COLOR = "rgba(107, 114, 128, 0.55)";

interface AnimatedTabIconProps {
  focused: boolean;
  children: React.ReactNode;
  badgeCount?: number;
}

function AnimatedTabIcon({
  focused,
  children,
  badgeCount,
}: AnimatedTabIconProps) {
  const scaleAnim = useRef(new Animated.Value(focused ? 1.1 : 1)).current;
  const opacityAnim = useRef(new Animated.Value(focused ? 1 : 0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: focused ? 1.1 : 1,
        useNativeDriver: true,
        tension: 200,
        friction: 15,
      }),
      Animated.timing(opacityAnim, {
        toValue: focused ? 1 : 0.6,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused]);

  return (
    <View style={styles.tabIconContainer}>
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        }}
      >
        {children}
        {badgeCount !== undefined && badgeCount > 0 && (
          <View style={styles.badge}>
            <Animated.Text style={styles.badgeText}>
              {badgeCount > 99 ? "99+" : String(badgeCount)}
            </Animated.Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

export default function TabLayout() {
  const { groups, unreadCount } = useApp();
  const { activeSport } = useActiveSport();
  const myGroupsCount = groups.filter((g) => g.isJoined).length;

  return (
    <Tabs
      tabBar={(props) => (
          <GlassTabBar
            state={props.state}
            descriptors={props.descriptors as React.ComponentProps<typeof GlassTabBar>["descriptors"]}
            navigation={props.navigation as unknown as React.ComponentProps<typeof GlassTabBar>["navigation"]}
          />
        )}
        screenOptions={{
          tabBarActiveTintColor: ACTIVE_COLOR,
          tabBarInactiveTintColor: INACTIVE_COLOR,
          headerShown: false,
          tabBarShowLabel: false,
          sceneStyle: {
            backgroundColor: "#FFFFFF",
          },
        }}
      >
        <Tabs.Screen
          name="profile"
          options={{
            title: "حسابي",
            tabBarIcon: ({ color, focused }) => (
              <AnimatedTabIcon focused={focused}>
                <ProfileTabIcon color={color} focused={focused} size={24} />
              </AnimatedTabIcon>
            ),
          }}
        />
        <Tabs.Screen
          name="groups"
          options={{
            title: "المجموعات",
            tabBarIcon: ({ color, focused }) => (
              <AnimatedTabIcon focused={focused} badgeCount={myGroupsCount}>
                <GroupsTabIcon color={color} focused={focused} size={24} />
              </AnimatedTabIcon>
            ),
          }}
        />
        <Tabs.Screen
          name="my-matches"
          options={{
            title: "مبارياتي",
            tabBarIcon: ({ color, focused }) => (
              <AnimatedTabIcon focused={focused}>
                <MatchesTabIcon color={color} focused={focused} size={24} />
              </AnimatedTabIcon>
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: "استكشاف",
            tabBarIcon: ({ color, focused }) => (
              <AnimatedTabIcon focused={focused}>
                <ExploreTabIcon color={color} focused={focused} size={24} />
              </AnimatedTabIcon>
            ),
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            title: "الرئيسية",
            tabBarIcon: ({ color, focused }) => (
              <AnimatedTabIcon focused={focused} badgeCount={unreadCount}>
                <HomeTabIcon color={color} focused={focused} size={24} />
              </AnimatedTabIcon>
            ),
          }}
        />
      </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingTop: 2,
  },
  badge: {
    position: "absolute",
    top: -6,
    end: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontFamily: "Cairo_700Bold",
    lineHeight: 14,
  },
});
