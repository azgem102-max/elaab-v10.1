import React from "react";
import Svg, { Path, Circle, Rect, Line } from "react-native-svg";

interface TabIconProps {
  color: string;
  size?: number;
  focused?: boolean;
}

export function HomeTabIcon({ color, size = 24, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {focused ? (
        <>
          <Path
            d="M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.5523 5.44772 21 6 21H9V16C9 15.4477 9.44772 15 10 15H14C14.5523 15 15 15.4477 15 16V21H18C18.5523 21 19 20.5523 19 20V10M19 10L21 12"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={color}
            fillOpacity={0.15}
          />
          <Path
            d="M9 21V16H15V21"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <Path
          d="M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.5523 5.44772 21 6 21H9V16C9 15.4477 9.44772 15 10 15H14C14.5523 15 15 15.4477 15 16V21H18C18.5523 21 19 20.5523 19 20V10M19 10L21 12"
          stroke={color}
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}

export function ExploreTabIcon({ color, size = 24, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle
        cx={12}
        cy={12}
        r={9}
        stroke={color}
        strokeWidth={focused ? 2 : 1.75}
        fill={focused ? color : "none"}
        fillOpacity={focused ? 0.12 : 0}
      />
      <Path
        d="M16.24 7.76L14.12 14.12L7.76 16.24L9.88 9.88L16.24 7.76Z"
        stroke={color}
        strokeWidth={focused ? 2 : 1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={focused ? color : "none"}
        fillOpacity={focused ? 0.4 : 0}
      />
      <Circle cx={12} cy={12} r={1.5} fill={color} />
    </Svg>
  );
}

export function MatchesTabIcon({ color, size = 24, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle
        cx={12}
        cy={12}
        r={9}
        stroke={color}
        strokeWidth={focused ? 2 : 1.75}
        fill={focused ? color : "none"}
        fillOpacity={focused ? 0.12 : 0}
      />
      <Path
        d="M12 3C12 3 9 7 9 12C9 17 12 21 12 21"
        stroke={color}
        strokeWidth={focused ? 1.75 : 1.5}
        strokeLinecap="round"
      />
      <Path
        d="M12 3C12 3 15 7 15 12C15 17 12 21 12 21"
        stroke={color}
        strokeWidth={focused ? 1.75 : 1.5}
        strokeLinecap="round"
      />
      <Path
        d="M3.5 9.5L20.5 9.5"
        stroke={color}
        strokeWidth={focused ? 1.75 : 1.5}
        strokeLinecap="round"
      />
      <Path
        d="M3.5 14.5L20.5 14.5"
        stroke={color}
        strokeWidth={focused ? 1.75 : 1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function GroupsTabIcon({ color, size = 24, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle
        cx={9}
        cy={7}
        r={3}
        stroke={color}
        strokeWidth={focused ? 2 : 1.75}
        fill={focused ? color : "none"}
        fillOpacity={focused ? 0.2 : 0}
      />
      <Circle
        cx={15}
        cy={7}
        r={3}
        stroke={color}
        strokeWidth={focused ? 2 : 1.75}
        fill={focused ? color : "none"}
        fillOpacity={focused ? 0.15 : 0}
      />
      <Path
        d="M3 19C3 16.2386 5.68629 14 9 14C12.3137 14 15 16.2386 15 19"
        stroke={color}
        strokeWidth={focused ? 2 : 1.75}
        strokeLinecap="round"
      />
      <Path
        d="M15 14C16.2 14 17.3 14.35 18.2 14.95C19.3 15.7 20 16.79 20 18"
        stroke={color}
        strokeWidth={focused ? 2 : 1.75}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function ProfileTabIcon({ color, size = 24, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle
        cx={12}
        cy={8}
        r={4}
        stroke={color}
        strokeWidth={focused ? 2 : 1.75}
        fill={focused ? color : "none"}
        fillOpacity={focused ? 0.2 : 0}
      />
      <Path
        d="M4 20C4 17.2386 7.58172 15 12 15C16.4183 15 20 17.2386 20 20"
        stroke={color}
        strokeWidth={focused ? 2 : 1.75}
        strokeLinecap="round"
      />
    </Svg>
  );
}
