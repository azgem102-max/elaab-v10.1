import React from "react";
import { StyleProp, Text, TextStyle } from "react-native";

interface HighlightTextProps {
  text: string;
  query: string;
  style?: StyleProp<TextStyle>;
  highlightStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

export function HighlightText({ text, query, style, highlightStyle, numberOfLines }: HighlightTextProps) {
  const q = query.trim().toLowerCase();
  if (!q) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  const index = text.toLowerCase().indexOf(q);
  if (index === -1) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  const before = text.slice(0, index);
  const match = text.slice(index, index + q.length);
  const after = text.slice(index + q.length);

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {before}
      <Text style={highlightStyle ?? { fontWeight: "bold", backgroundColor: "rgba(255,200,0,0.35)" }}>
        {match}
      </Text>
      {after}
    </Text>
  );
}
