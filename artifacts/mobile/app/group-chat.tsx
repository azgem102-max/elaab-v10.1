import { api } from "@/services/api";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  I18nManager,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  time: Date;
  pending?: boolean;
}

export default function GroupChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { groupId, groupName, sport } = useLocalSearchParams<{
    groupId: string;
    groupName: string;
    sport?: string;
  }>();
  const { user, groups } = useApp();

  const sportColor = "#2C54E8";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; text: string }>({ visible: false, text: "" });
  const [inputText, setInputText] = useState("");
  const lastTimestampRef = useRef<string | null>(null);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentUserId = user?.id ?? "";

  function showToast(text: string) {
    setToast({ visible: true, text });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2800);
  }

  const loadInitial = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    setLoadError(false);
    try {
      const res = await api.getGroupMessages(groupId);
      if (res.messages) {
        const mapped: ChatMessage[] = res.messages.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          senderName: m.senderName,
          text: m.text,
          time: new Date(m.createdAt),
        }));
        setMessages(mapped);
        const last = res.messages[res.messages.length - 1];
        if (last) lastTimestampRef.current = last.createdAt;
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 80);
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  const pollNewMessages = useCallback(async () => {
    if (!groupId) return;
    try {
      const after = lastTimestampRef.current ?? undefined;
      const res = await api.getGroupMessages(groupId, after);
      if (res.messages && res.messages.length > 0) {
        const incoming: ChatMessage[] = res.messages.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          senderName: m.senderName,
          text: m.text,
          time: new Date(m.createdAt),
        }));
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const fresh = incoming.filter((m) => !existingIds.has(m.id));
          if (fresh.length === 0) return prev;
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
          return [...prev, ...fresh];
        });
        const last = res.messages[res.messages.length - 1];
        if (last) lastTimestampRef.current = last.createdAt;
      }
    } catch {}
  }, [groupId]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    pollingRef.current = setInterval(pollNewMessages, 5000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [pollNewMessages]);

  async function handleSend() {
    const text = inputText.trim();
    if (!text || sending || !groupId) return;
    setInputText("");
    setSending(true);
    const tempId = `temp_${Date.now()}`;
    const tempMsg: ChatMessage = {
      id: tempId,
      senderId: currentUserId,
      senderName: user?.nickname ?? "أنت",
      text,
      time: new Date(),
      pending: true,
    };
    setMessages((prev) => [...prev, tempMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    try {
      const res = await api.sendGroupMessage(groupId, text);
      const serverMsg: ChatMessage = {
        id: res.message.id,
        senderId: res.message.senderId,
        senderName: res.message.senderName,
        text: res.message.text,
        time: new Date(res.message.createdAt),
      };
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempId);
        const alreadyExists = withoutTemp.some((m) => m.id === serverMsg.id);
        if (alreadyExists) return withoutTemp;
        return [...withoutTemp, serverMsg];
      });
      lastTimestampRef.current = res.message.createdAt;
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      showToast("فشل إرسال الرسالة، تحقق من اتصالك");
    } finally {
      setSending(false);
    }
  }

  function formatTime(date: Date): string {
    return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
  }

  function renderBubble({ item }: { item: ChatMessage }) {
    const isMe = item.senderId === currentUserId;
    return (
      <View style={[styles.bubbleRow, isMe && styles.bubbleRowMe]}>
        {!isMe && (
          <View style={[styles.avatar, { backgroundColor: sportColor + "25" }]}>
            <Text style={[styles.avatarText, { color: sportColor }]}>
              {item.senderName.charAt(0)}
            </Text>
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isMe
              ? { backgroundColor: sportColor, alignItems: "flex-end" }
              : { backgroundColor: colors.surfaceContainerHigh, alignItems: "flex-start" },
            item.pending && { opacity: 0.65 },
          ]}
        >
          {!isMe && (
            <Text style={[styles.bubbleSender, { color: sportColor }]}>{item.senderName}</Text>
          )}
          <Text style={[styles.bubbleText, { color: isMe ? "#fff" : colors.onSurface }]}>
            {item.text}
          </Text>
          <View style={styles.bubbleFooter}>
            {item.pending && (
              <ActivityIndicator size={8} color={isMe ? "#ffffff80" : colors.mutedForeground} />
            )}
            <Text style={[styles.bubbleTime, { color: isMe ? "#ffffff80" : colors.mutedForeground }]}>
              {formatTime(item.time)}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const group = groups.find((g) => g.id === groupId);
  const isMember = group?.isJoined ?? true;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 20 : insets.bottom;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: "#FFFFFF" }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <View style={[styles.header, { paddingTop: topPad + 6, backgroundColor: "#2C54E8" }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons
            name={I18nManager.isRTL ? "chevron-forward" : "chevron-back"}
            size={24}
            color="#fff"
          />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={[styles.headerIcon, { backgroundColor: "#ffffff30" }]}>
            <Ionicons name="chatbubbles" size={18} color="#fff" />
          </View>
          <View style={styles.headerTextGroup}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {groupName ?? "دردشة المجموعة"}
            </Text>
            <Text style={styles.headerSub}>دردشة المجموعة</Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {!isMember ? (
        <View style={styles.centered}>
          <Ionicons name="lock-closed-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            أنت لست عضواً في هذه المجموعة
          </Text>
          <Text style={[styles.emptySubText, { color: colors.mutedForeground }]}>
            انضم للمجموعة أولاً للوصول إلى الدردشة
          </Text>
          <Pressable
            style={[styles.joinHintBtn, { backgroundColor: sportColor }]}
            onPress={() => router.back()}
          >
            <Text style={styles.joinHintBtnText}>العودة للمجموعة</Text>
          </Pressable>
        </View>
      ) : loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={sportColor} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            جاري تحميل الرسائل...
          </Text>
        </View>
      ) : loadError ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            تعذّر تحميل الرسائل
          </Text>
          <Pressable
            style={[styles.joinHintBtn, { backgroundColor: sportColor }]}
            onPress={() => loadInitial()}
          >
            <Text style={styles.joinHintBtnText}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderBubble}
          contentContainerStyle={[
            styles.messageList,
            { paddingBottom: 8 },
          ]}
          showsVerticalScrollIndicator={false}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={52} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                لا توجد رسائل بعد
              </Text>
              <Text style={[styles.emptySubText, { color: colors.mutedForeground }]}>
                كن أول من يبدأ المحادثة!
              </Text>
            </View>
          }
        />
      )}

      {isMember && !loading && !loadError && (
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.surfaceContainer,
              paddingBottom: botPad + 8,
              borderTopColor: colors.surfaceContainerHigh,
            },
          ]}
        >
          <Pressable
            style={[
              styles.sendBtn,
              {
                backgroundColor:
                  inputText.trim() && !sending ? sportColor : colors.surfaceContainerHigh,
              },
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={sportColor} />
            ) : (
              <Ionicons
                name="send"
                size={20}
                color={inputText.trim() ? "#fff" : colors.mutedForeground}
                style={{ transform: [{ scaleX: -1 }] }}
              />
            )}
          </Pressable>
          <TextInput
            style={[
              styles.textInput,
              {
                color: colors.onSurface,
                backgroundColor: colors.surfaceContainerHigh,
              },
            ]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="اكتب رسالة..."
            placeholderTextColor={colors.mutedForeground}
            textAlign="right"
            returnKeyType="send"
            onSubmitEditing={handleSend}
            multiline
            maxLength={500}
            editable={!sending}
          />
        </View>
      )}

      {toast.visible && (
        <View style={[styles.toastBar, { backgroundColor: colors.destructive }]} pointerEvents="none">
          <Text style={styles.toastBarText}>{toast.text}</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 10,
  },
  backBtn: { padding: 4, width: 40, alignItems: "flex-start" },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextGroup: { alignItems: "center", gap: 1 },
  headerTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 17,
    color: "#fff",
    textAlign: "center",
  },
  headerSub: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    color: "#ffffffb0",
  },

  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontFamily: "Cairo_400Regular", fontSize: 14 },

  messageList: {
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    gap: 10,
  },

  emptyState: {
    flex: 1,
    minHeight: 300,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingTop: 60,
  },
  emptyText: { fontFamily: "Cairo_700Bold", fontSize: 16 },
  emptySubText: { fontFamily: "Cairo_400Regular", fontSize: 13 },

  bubbleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    maxWidth: "82%",
    alignSelf: "flex-start",
  },
  bubbleRowMe: {
    alignSelf: "flex-end",
    flexDirection: "row-reverse",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { fontFamily: "Cairo_700Bold", fontSize: 13 },

  bubble: {
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 9,
    gap: 3,
    flexShrink: 1,
  },
  bubbleSender: {
    fontFamily: "Cairo_700Bold",
    fontSize: 12,
  },
  bubbleText: {
    fontFamily: "Cairo_400Regular",
    fontSize: 15,
    textAlign: "right",
    flexWrap: "wrap",
  },
  bubbleFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    justifyContent: "flex-end",
  },
  bubbleTime: {
    fontFamily: "Cairo_400Regular",
    fontSize: 10,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 10,
    borderTopWidth: 1,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginBottom: 2,
  },
  textInput: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 11,
    fontFamily: "Cairo_400Regular",
    fontSize: 15,
    maxHeight: 120,
    textAlignVertical: "top",
  },

  joinHintBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 50,
  },
  joinHintBtnText: { fontFamily: "Cairo_700Bold", fontSize: 14, color: "#fff" },

  toastBar: {
    position: "absolute",
    bottom: 80,
    left: 20,
    right: 20,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  toastBarText: { fontFamily: "Cairo_600SemiBold", fontSize: 14, color: "#fff" },
});
