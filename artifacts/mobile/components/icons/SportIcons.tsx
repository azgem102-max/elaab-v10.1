import React from "react";
import Svg, { Circle, Ellipse, Line, Path, Rect } from "react-native-svg";
import type { SportType } from "@/context/AppContext";

interface SportIconProps {
  color?: string;
  size?: number;
}

export function AllSportsIcon({ color = "currentColor", size = 24 }: SportIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="7" height="7" rx="2" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <Rect x="14" y="3" width="7" height="7" rx="2" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <Rect x="3" y="14" width="7" height="7" rx="2" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <Rect x="14" y="14" width="7" height="7" rx="2" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function FootballIcon({ color = "currentColor", size = 24 }: SportIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <Path
        d="M12 7 L10 10 L12 13 L14 10 Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M10 10 L7 9.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 10 L17 9.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 13 L10.5 16" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 13 L13.5 16" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M7 9.5 L5.5 12" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M17 9.5 L18.5 12" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M10.5 16 L8 16.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M13.5 16 L16 16.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function PadelIcon({ color = "currentColor", size = 24 }: SportIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Wide, short, rounded-rectangular head — distinctive padel shape */}
      <Rect x="3" y="3" width="14" height="11" rx="3" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      {/* Perforation dots pattern inside head */}
      <Circle cx="7" cy="7" r="0.9" fill={color} />
      <Circle cx="10" cy="7" r="0.9" fill={color} />
      <Circle cx="13" cy="7" r="0.9" fill={color} />
      <Circle cx="7" cy="10" r="0.9" fill={color} />
      <Circle cx="10" cy="10" r="0.9" fill={color} />
      <Circle cx="13" cy="10" r="0.9" fill={color} />
      {/* Short grip */}
      <Line x1="10" y1="14" x2="10" y2="19" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      {/* Small solid ball */}
      <Circle cx="18" cy="18" r="2.5" fill={color} />
    </Svg>
  );
}

export function TennisIcon({ color = "currentColor", size = 24 }: SportIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Tall teardrop/oval head — distinctive tennis shape */}
      <Ellipse cx="9" cy="8" rx="5" ry="7" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      {/* String grid — horizontal lines */}
      <Line x1="4.2" y1="5.5" x2="13.8" y2="5.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="4" y1="8" x2="14" y2="8" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="4.2" y1="10.5" x2="13.8" y2="10.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      {/* String grid — vertical lines */}
      <Line x1="7" y1="1.5" x2="7" y2="14.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="9" y1="1" x2="9" y2="15" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="11" y1="1.5" x2="11" y2="14.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Long grip with wrap bands */}
      <Line x1="12.5" y1="13.5" x2="16" y2="18.5" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="13.3" y1="15.2" x2="14.6" y2="14.6" stroke={color} strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="14.2" y1="16.6" x2="15.5" y2="16" stroke={color} strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
      {/* Yellow-filled ball with curved seam */}
      <Circle cx="18.5" cy="20" r="2.5" fill="#D4E200" stroke={color} strokeWidth="1.2" />
      <Path d="M16.5 19 Q18.5 17.5 20.5 19" stroke={color} strokeWidth="1" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

export function getSportIcon(sport: SportType): React.FC<{ color?: string; size?: number }> {
  if (sport === "football") return FootballIcon;
  if (sport === "padel") return PadelIcon;
  return TennisIcon;
}
