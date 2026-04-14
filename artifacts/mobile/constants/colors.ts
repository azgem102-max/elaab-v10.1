const colors = {
  light: {
    // ARENA Dark text (High contrast)
    text: "#121212", 
    tint: "#05B757", // Vibrant Emerald Green (ARENA Primary)
    
    // Background: Clean off-white/beige for that premium studio look
    background: "#F9F9F9", 
    foreground: "#121212",
    
    // Cards & Surfaces: Pure stark white
    card: "#FFFFFF", 
    cardForeground: "#121212",
    
    // Primary: Vibrant Emerald Green
    primary: "#05B757", 
    primaryForeground: "#FFFFFF",
    primaryLight: "#D1F5E1", 
    primaryContainer: "#E6F8ED",
    
    // Muted greys for soft backgrounds and placeholders
    secondary: "#737373", 
    secondaryForeground: "#FFFFFF",
    secondaryContainer: "#F5F5F5",
    
    tertiary: "#1A1A1A", // Bold black for elite cards
    tertiaryForeground: "#FFFFFF",
    tertiaryContainer: "#E5E5E5",
    
    muted: "#F5F5F5", 
    mutedForeground: "#737373",
    
    accent: "#05B757", 
    accentForeground: "#FFFFFF",
    
    // Surface levels (Flattened for ARENA)
    surface: "#FFFFFF",
    surfaceVariant: "#F9F9F9",
    surfaceContainer: "#F5F5F5", 
    surfaceContainerLow: "#FAFAFA",
    surfaceContainerHigh: "#E5E5E5",
    surfaceContainerHighest: "#D4D4D4",
    surfaceContainerLowest: "#FFFFFF",
    
    onSurface: "#121212",
    onSurfaceVariant: "#737373",
    
    destructive: "#EF4444",
    destructiveForeground: "#FFFFFF",
    
    // Crisp borders
    border: "#E5E5E5", 
    input: "#F5F5F5",
    outline: "#A3A3A3", 
    
    success: "#05B757",
    warning: "#F59E0B",
    
    // Sports Colors
    soccer: "#05B757",
    padel: "#1A202C", // Dark Slate for Padel based on elite badge? Or keep bright blue? Let's keep original sport colors but refine
    tennis: "#D97706",

    reliabilityElite: "#05B757",
    reliabilityLow: "#EF4444",
    
    // Shadows
    neuShadowDark: "rgba(0,0,0,0.05)", 
    neuShadowLight: "#FFFFFF",
    matteBlack: "#121212",
  },
  // ARENA uses more rounded cards (around 24)
  radius: 24, 
};

export default colors;