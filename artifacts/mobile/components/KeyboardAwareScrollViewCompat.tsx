import { Platform, ScrollView, ScrollViewProps } from "react-native";

type Props = ScrollViewProps & {
  keyboardShouldPersistTaps?: "always" | "never" | "handled";
  bottomOffset?: number;
};

let NativeKeyboardAwareScrollView: React.ComponentType<Props> | null = null;
try {
  NativeKeyboardAwareScrollView =
    require("react-native-keyboard-controller").KeyboardAwareScrollView;
} catch {
  NativeKeyboardAwareScrollView = null;
}

export function KeyboardAwareScrollViewCompat({
  children,
  keyboardShouldPersistTaps = "handled",
  ...props
}: Props) {
  if (Platform.OS === "web" || !NativeKeyboardAwareScrollView) {
    return (
      <ScrollView keyboardShouldPersistTaps={keyboardShouldPersistTaps} {...props}>
        {children}
      </ScrollView>
    );
  }
  const KAScrollView = NativeKeyboardAwareScrollView;
  return (
    <KAScrollView
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      {...props}
    >
      {children}
    </KAScrollView>
  );
}
