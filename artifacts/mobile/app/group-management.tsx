import { useApp, sportColor, reliabilityColor, formatReliability } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { getSportTheme } from "@/constants/sportTheme";
import { GlassScreenHeader } from "@/components/glass/GlassScreenHeader";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  I18nManager,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function GroupManagementScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    groups,
    user,
    fetchGroupById,
    updateGroup,
    updateGroupMemberRole,
    removeGroupMember,
    deleteGroup,
  } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [loadingGroup, setLoadingGroup] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({ visible: false, message: "" });

  const group = groups.find((g) => g.id === id);

  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [isPublic, setIsPublic] = useState(group?.isPublic ?? true);

  useEffect(() => {
    if (!id) return;
    const needsFetch = !group || !group.members || group.members.length < group.memberCount;
    if (needsFetch) {
      setLoadingGroup(true);
      fetchGroupById(id).finally(() => setLoadingGroup(false));
    }
  }, [id]);

  useEffect(() => {
    if (group) {
      setName(group.name);
      setDescription(group.description ?? "");
      setIsPublic(group.isPublic);
    }
  }, [group?.id]);

  function showToast(message: string) {
    setToast({ visible: true, message });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2500);
  }

  if (loadingGroup) {
    return (
      <View style={[styles.centered, { backgroundColor: "transparent" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!group) {
    return (
      <View style={[styles.centered, { backgroundColor: "transparent", gap: 16 }]}>
        <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
        <Text style={{ fontFamily: "Cairo_700Bold", fontSize: 16, color: colors.onSurface }}>المجموعة غير موجودة</Text>
        <Pressable
          onPress={() => router.back()}
          style={[{ paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 }, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}
        >
          <Text style={{ fontFamily: "Cairo_600SemiBold", fontSize: 14, color: colors.primary }}>العودة</Text>
        </Pressable>
      </View>
    );
  }

  const safeGroup = group;
  const currentUserId = user?.id ?? "";
  const currentUserMember = safeGroup.members?.find((m) => m.id === currentUserId);
  const isOwner = safeGroup.adminId === currentUserId || currentUserMember?.role === "owner";
  const isAdmin = isOwner || currentUserMember?.role === "admin";
  const sc = sportColor(safeGroup.sport, colors);
  const sportTheme = getSportTheme(safeGroup.sport);

  if (!isAdmin) {
    return (
      <View style={[styles.centered, { backgroundColor: "transparent", gap: 16 }]}>
        <Ionicons name="lock-closed-outline" size={48} color={colors.mutedForeground} />
        <Text style={{ fontFamily: "Cairo_700Bold", fontSize: 16, color: colors.onSurface }}>غير مصرح لك بالوصول</Text>
        <Pressable
          onPress={() => router.back()}
          style={[{ paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 }, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}
        >
          <Text style={{ fontFamily: "Cairo_600SemiBold", fontSize: 14, color: colors.primary }}>العودة</Text>
        </Pressable>
      </View>
    );
  }

  async function handleSaveGroupInfo() {
    if (!name.trim()) {
      showToast("اسم المجموعة مطلوب");
      return;
    }
    setSaving(true);
    const success = await updateGroup(id, { name: name.trim(), description, isPublic });
    setSaving(false);
    if (success) {
      showToast("تم حفظ التغييرات بنجاح ✓");
    } else {
      showToast("فشل حفظ التغييرات، حاول مجدداً");
    }
  }

  function handlePromoteMember(memberId: string, memberName: string) {
    Alert.alert(
      "ترقية عضو",
      `هل تريد ترقية "${memberName}" إلى مشرف؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "ترقية",
          onPress: async () => {
            const success = await updateGroupMemberRole(id, memberId, "admin");
            if (success) {
              showToast(`تمت ترقية "${memberName}" إلى مشرف ✓`);
            } else {
              showToast("فشلت الترقية، حاول مجدداً");
            }
          },
        },
      ]
    );
  }

  function handleDemoteMember(memberId: string, memberName: string) {
    Alert.alert(
      "تخفيض مشرف",
      `هل تريد تخفيض "${memberName}" إلى عضو عادي؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "تخفيض",
          style: "destructive",
          onPress: async () => {
            const success = await updateGroupMemberRole(id, memberId, "member");
            if (success) {
              showToast(`تم تخفيض "${memberName}" إلى عضو ✓`);
            } else {
              showToast("فشل التخفيض، حاول مجدداً");
            }
          },
        },
      ]
    );
  }

  function handleRemoveMember(memberId: string, memberName: string) {
    Alert.alert(
      "إزالة عضو",
      `هل أنت متأكد من إزالة "${memberName}" من المجموعة؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "إزالة",
          style: "destructive",
          onPress: async () => {
            const success = await removeGroupMember(id, memberId);
            if (success) {
              showToast(`تمت إزالة "${memberName}" من المجموعة`);
            } else {
              showToast("فشل إزالة العضو، حاول مجدداً");
            }
          },
        },
      ]
    );
  }

  function handleDeleteGroup() {
    if (deleting) return;
    Alert.alert(
      "حذف المجموعة",
      `هل أنت متأكد من حذف مجموعة "${safeGroup.name}"؟ لا يمكن التراجع عن هذا الإجراء.`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف المجموعة",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              const groupId = safeGroup.id;
              const success = await deleteGroup(groupId);
              if (success) {
                router.replace("/(tabs)/groups");
              } else {
                showToast("فشل حذف المجموعة، تحقق من صلاحياتك وحاول مجدداً");
              }
            } catch {
              showToast("حدث خطأ غير متوقع، حاول مجدداً");
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: "transparent" }]}>
      <GlassScreenHeader style={{ paddingTop: topPad + 12, paddingHorizontal: 20, paddingBottom: 14 }}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name={I18nManager.isRTL ? "chevron-forward" : "chevron-back"} size={24} color={colors.onSurface} />
          </Pressable>
          <View style={styles.headerCenter}>
            <LinearGradient
              colors={[sportTheme.cardGradientStart, sportTheme.cardGradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerSportIcon}
            >
              <Ionicons name="settings" size={16} color="#fff" />
            </LinearGradient>
            <Text style={[styles.headerTitle, { color: colors.onSurface }]}>إدارة المجموعة</Text>
          </View>
          <View style={{ width: 32 }} />
        </View>
      </GlassScreenHeader>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.section, { backgroundColor: colors.background, borderWidth: 1, borderColor: sc + "30" }]}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionTitleIcon, { backgroundColor: sc + "18" }]}>
              <Ionicons name="create-outline" size={16} color={sc} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>تعديل معلومات المجموعة</Text>
          </View>

          <Text style={[styles.label, { color: colors.mutedForeground }]}>اسم المجموعة</Text>
          <TextInput
            style={[styles.input, { color: colors.onSurface, borderColor: colors.surfaceContainerHigh, backgroundColor: colors.surfaceContainerLow }]}
            value={name}
            onChangeText={setName}
            placeholder="اسم المجموعة"
            placeholderTextColor={colors.mutedForeground}
            textAlign="right"
            maxLength={60}
          />

          <Text style={[styles.label, { color: colors.mutedForeground }]}>الوصف</Text>
          <TextInput
            style={[styles.input, styles.textArea, { color: colors.onSurface, borderColor: colors.surfaceContainerHigh, backgroundColor: colors.surfaceContainerLow }]}
            value={description}
            onChangeText={setDescription}
            placeholder="وصف المجموعة (اختياري)"
            placeholderTextColor={colors.mutedForeground}
            textAlign="right"
            multiline
            numberOfLines={3}
          />

          <Text style={[styles.label, { color: colors.mutedForeground }]}>نوع المجموعة</Text>
          <View style={styles.visibilityRow}>
            <Pressable
              style={[
                styles.visibilityBtn,
                isPublic
                  ? { backgroundColor: sc, borderColor: sc }
                  : { backgroundColor: colors.surfaceContainerLow, borderColor: colors.surfaceContainerHigh },
              ]}
              onPress={() => setIsPublic(true)}
            >
              <Ionicons name="globe-outline" size={16} color={isPublic ? "#fff" : colors.mutedForeground} />
              <Text style={[styles.visibilityBtnText, { color: isPublic ? "#fff" : colors.mutedForeground }]}>
                عامة
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.visibilityBtn,
                !isPublic
                  ? { backgroundColor: sc, borderColor: sc }
                  : { backgroundColor: colors.surfaceContainerLow, borderColor: colors.surfaceContainerHigh },
              ]}
              onPress={() => setIsPublic(false)}
            >
              <Ionicons name="lock-closed-outline" size={16} color={!isPublic ? "#fff" : colors.mutedForeground} />
              <Text style={[styles.visibilityBtnText, { color: !isPublic ? "#fff" : colors.mutedForeground }]}>
                خاصة
              </Text>
            </Pressable>
          </View>
          <Text style={[styles.toggleSubLabel, { color: colors.mutedForeground, textAlign: "right" }]}>
            {isPublic ? "المجموعات العامة تظهر في نتائج البحث وتجذب لاعبين جدد" : "المجموعات الخاصة لا تظهر في البحث — فقط من تدعوهم يمكنهم الرؤية"}
          </Text>

          <Pressable
            style={[styles.saveBtn, { backgroundColor: saving ? sc + "80" : sc }]}
            onPress={handleSaveGroupInfo}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <Text style={styles.saveBtnText}>حفظ التغييرات</Text>
            )}
          </Pressable>
        </View>

        <View style={[styles.section, { backgroundColor: colors.background, borderWidth: 1, borderColor: sc + "30" }]}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionTitleIcon, { backgroundColor: sc + "18" }]}>
              <Ionicons name="people-outline" size={16} color={sc} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>الأعضاء ({safeGroup.memberCount})</Text>
          </View>

          {safeGroup.members.map((member) => {
            const relColor = reliabilityColor(member.reliability, colors);
            const isCurrentUser = member.id === currentUserId;
            const memberRole = member.role ?? (member.id === safeGroup.adminId ? "owner" : "member");
            const isOwnerMember = memberRole === "owner";
            const isAdminMember = memberRole === "admin";
            const isMemberOnly = memberRole === "member";

            let roleLabel = "عضو";
            let roleBgColor = colors.surfaceContainerHigh;
            let roleTextColor = colors.mutedForeground;
            if (isOwnerMember) {
              roleLabel = "مالك";
              roleBgColor = colors.warning + "20";
              roleTextColor = colors.warning;
            } else if (isAdminMember) {
              roleLabel = "مشرف";
              roleBgColor = colors.primary + "20";
              roleTextColor = colors.primary;
            }

            return (
              <View key={member.id} style={[styles.memberCard, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}>
                <View style={[styles.memberAvatar, { backgroundColor: sc + "20" }]}>
                  <Text style={[styles.memberInitial, { color: sc }]}>{member.nickname.charAt(0)}</Text>
                </View>

                <View style={styles.memberInfo}>
                  <View style={styles.memberNameRow}>
                    <Text style={[styles.memberName, { color: colors.onSurface }]} numberOfLines={1}>
                      {member.nickname}
                    </Text>
                    {isCurrentUser && (
                      <View style={[styles.youBadge, { backgroundColor: sc + "20" }]}>
                        <Text style={[styles.youBadgeText, { color: sc }]}>أنت</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.memberMetaRow}>
                    <View style={[styles.roleBadge, { backgroundColor: roleBgColor }]}>
                      {isOwnerMember && <Ionicons name="star" size={10} color={roleTextColor} />}
                      {isAdminMember && <Ionicons name="shield-checkmark" size={10} color={roleTextColor} />}
                      <Text style={[styles.roleBadgeText, { color: roleTextColor }]}>{roleLabel}</Text>
                    </View>
                    <View style={[styles.relPill, { backgroundColor: relColor + "18" }]}>
                      <View style={[styles.relDot, { backgroundColor: relColor }]} />
                      <Text style={[styles.relPillText, { color: relColor }]}>
                        {formatReliability(member.reliability, member.matchesPlayed)}
                      </Text>
                    </View>
                  </View>
                </View>

                {!isCurrentUser && !isOwnerMember && (
                  <View style={styles.memberActions}>
                    {(isOwner || isAdmin) && isMemberOnly && (
                      <Pressable
                        style={[styles.memberActionBtn, { backgroundColor: colors.primary + "15" }]}
                        onPress={() => handlePromoteMember(member.id, member.nickname)}
                      >
                        <Ionicons name="shield-checkmark-outline" size={15} color={colors.primary} />
                      </Pressable>
                    )}
                    {isOwner && isAdminMember && (
                      <Pressable
                        style={[styles.memberActionBtn, { backgroundColor: colors.warning + "15" }]}
                        onPress={() => handleDemoteMember(member.id, member.nickname)}
                      >
                        <Ionicons name="arrow-down-circle-outline" size={15} color={colors.warning} />
                      </Pressable>
                    )}
                    <Pressable
                      style={[styles.memberActionBtn, { backgroundColor: colors.destructive + "15" }]}
                      onPress={() => handleRemoveMember(member.id, member.nickname)}
                    >
                      <Ionicons name="person-remove-outline" size={15} color={colors.destructive} />
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}

          {safeGroup.memberCount > safeGroup.members.length && (
            <Text style={[styles.moreMembers, { color: colors.mutedForeground }]}>
              و {safeGroup.memberCount - safeGroup.members.length} عضو آخر...
            </Text>
          )}
        </View>

        {isOwner && (
          <View style={[styles.section, { backgroundColor: "#FFF5F5", borderWidth: 1, borderColor: colors.destructive + "30" }]}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionTitleIcon, { backgroundColor: colors.destructive + "18" }]}>
                <Ionicons name="warning-outline" size={16} color={colors.destructive} />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.destructive }]}>منطقة الخطر</Text>
            </View>
            <Text style={[styles.dangerDesc, { color: colors.mutedForeground }]}>
              حذف المجموعة سيزيل جميع البيانات والمحادثات بشكل نهائي ولا يمكن التراجع عنه.
            </Text>
            <Pressable
              style={[styles.deleteBtn, { backgroundColor: deleting ? "#DC2626" + "08" : "#DC2626", borderRadius: 14 }]}
              onPress={handleDeleteGroup}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="trash-outline" size={18} color="#fff" />
              )}
              <Text style={[styles.deleteBtnText, { color: "#fff" }]}>
                {deleting ? "جاري الحذف..." : "حذف المجموعة نهائياً"}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {toast.visible && (
        <View style={[styles.toast, { backgroundColor: colors.success }]} pointerEvents="none">
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: { padding: 4 },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerSportIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    textAlign: "center",
  },

  scroll: {
    paddingHorizontal: 16,
    gap: 16,
    paddingTop: 16,
  },

  section: {
    borderRadius: 20,
    padding: 18,
    gap: 12,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "flex-end",
    marginBottom: 4,
  },
  sectionTitleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
    textAlign: "right",
  },

  label: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    textAlign: "right",
    marginBottom: -4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
    paddingTop: 10,
  },

  visibilityRow: { flexDirection: "row", gap: 10 },
  visibilityBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  visibilityBtnText: { fontSize: 14, fontFamily: "Cairo_700Bold" },
  toggleSubLabel: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
  },

  saveBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: "Cairo_700Bold",
    color: "#fff",
  },

  memberCard: {
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  memberInitial: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
  },
  memberInfo: {
    flex: 1,
    gap: 4,
    alignItems: "flex-end",
  },
  memberNameRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  memberName: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
  },
  memberMetaRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  youBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 50,
  },
  youBadgeText: {
    fontSize: 10,
    fontFamily: "Cairo_700Bold",
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 50,
  },
  roleBadgeText: {
    fontSize: 10,
    fontFamily: "Cairo_700Bold",
  },
  relPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 50,
  },
  relDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  relPillText: {
    fontSize: 10,
    fontFamily: "Cairo_600SemiBold",
  },
  memberActions: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  memberActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  moreMembers: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    textAlign: "center",
    paddingVertical: 4,
  },

  dangerDesc: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    textAlign: "right",
    lineHeight: 20,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  deleteBtnText: {
    fontSize: 15,
    fontFamily: "Cairo_700Bold",
  },

  toast: {
    position: "absolute",
    bottom: 100,
    left: 24,
    right: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  toastText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    color: "#fff",
  },
});
