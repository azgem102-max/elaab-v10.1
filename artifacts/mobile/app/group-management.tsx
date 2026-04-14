import { useApp, sportColor, reliabilityColor, formatReliability } from "@/context/AppContext";
import { api, ApiJoinRequest } from "@/services/api";
import { useColors } from "@/hooks/useColors";
import { getSportTheme } from "@/constants/sportTheme";
import { GlassScreenHeader } from "@/components/glass/GlassScreenHeader";
import { SportGradientButton } from "@/components/SportGradientButton";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  I18nManager,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { typography } from "@/constants/typography";


type ConfirmDialogConfig = {
  title: string;
  message: string;
  confirmText: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
};

function ConfirmDialog({
  config,
  visible,
  onCancel,
  colors,
}: {
  config: ConfirmDialogConfig | null;
  visible: boolean;
  onCancel: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!visible) setConfirming(false);
  }, [visible]);

  if (!config) return null;

  async function handleConfirm() {
    if (confirming) return;
    setConfirming(true);
    try {
      await config!.onConfirm();
    } finally {
      setConfirming(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={dlgStyles.overlay}>
        <View style={[dlgStyles.dialog, { backgroundColor: colors.background }]}>
          <Text style={[dlgStyles.title, { color: colors.onSurface }]}>{config.title}</Text>
          <Text style={[dlgStyles.message, { color: colors.mutedForeground }]}>{config.message}</Text>
          <View style={dlgStyles.buttons}>
            <Pressable
              style={[dlgStyles.btn, dlgStyles.cancelBtn, { borderColor: colors.border, opacity: confirming ? 0.5 : 1 }]}
              onPress={onCancel}
              disabled={confirming}
              accessibilityLabel="إلغاء"
            >
              <Text style={[dlgStyles.btnText, { color: colors.mutedForeground }]}>إلغاء</Text>
            </Pressable>
            <Pressable
              style={[
                dlgStyles.btn,
                dlgStyles.confirmBtn,
                { backgroundColor: config.destructive ? "#DC2626" : colors.primary, opacity: confirming ? 0.7 : 1 },
              ]}
              onPress={handleConfirm}
              disabled={confirming}
              accessibilityLabel={config.confirmText}
            >
              {confirming ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[dlgStyles.btnText, { color: "#fff" }]}>{config.confirmText}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const dlgStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  dialog: {
    width: "100%",
    borderRadius: 20,
    padding: 24,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 17,
    fontFamily: typography.headlineSm.fontFamily,
    textAlign: "right",
  },
  message: {
    fontSize: 14,
    fontFamily: typography.body.fontFamily,
    textAlign: "right",
    lineHeight: 22,
  },
  buttons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    borderWidth: 1,
  },
  confirmBtn: {},
  btnText: {
    fontSize: 14,
    fontFamily: typography.headlineSm.fontFamily,
  },
});

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

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogConfig | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const group = groups.find((g) => g.id === id);

  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [isPublic, setIsPublic] = useState(group?.isPublic ?? true);

  const [joinRequests, setJoinRequests] = useState<ApiJoinRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  const loadJoinRequests = useCallback(async () => {
    if (!id) return;
    setLoadingRequests(true);
    try {
      const res = await api.getJoinRequests(id);
      setJoinRequests(res.requests);
    } catch {
      setJoinRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const needsFetch = !group || !group.members || group.members.length < group.memberCount;
    if (needsFetch) {
      setLoadingGroup(true);
      fetchGroupById(id).finally(() => setLoadingGroup(false));
    }
    loadJoinRequests();
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

  function showConfirm(config: ConfirmDialogConfig) {
    setConfirmDialog(config);
    setConfirmVisible(true);
  }

  function hideConfirm() {
    setConfirmVisible(false);
    setConfirmDialog(null);
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
        <Text style={{ fontFamily: typography.headlineSm.fontFamily, fontSize: 16, color: colors.onSurface }}>المجموعة غير موجودة</Text>
        <Pressable
          onPress={() => router.back()}
          style={[{ paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 }, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}
        >
          <Text style={{ fontFamily: typography.bodyLg.fontFamily, fontSize: 14, color: colors.primary }}>العودة</Text>
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
        <Text style={{ fontFamily: typography.headlineSm.fontFamily, fontSize: 16, color: colors.onSurface }}>غير مصرح لك بالوصول</Text>
        <Pressable
          onPress={() => router.back()}
          style={[{ paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 }, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}
        >
          <Text style={{ fontFamily: typography.bodyLg.fontFamily, fontSize: 14, color: colors.primary }}>العودة</Text>
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
    showConfirm({
      title: "ترقية عضو",
      message: `هل تريد ترقية "${memberName}" إلى مشرف؟`,
      confirmText: "ترقية",
      onConfirm: async () => {
        hideConfirm();
        const success = await updateGroupMemberRole(id, memberId, "admin");
        if (success) {
          showToast(`تمت ترقية "${memberName}" إلى مشرف ✓`);
        } else {
          showToast("فشلت الترقية، حاول مجدداً");
        }
      },
    });
  }

  function handleDemoteMember(memberId: string, memberName: string) {
    showConfirm({
      title: "تخفيض مشرف",
      message: `هل تريد تخفيض "${memberName}" إلى عضو عادي؟`,
      confirmText: "تخفيض",
      destructive: true,
      onConfirm: async () => {
        hideConfirm();
        const success = await updateGroupMemberRole(id, memberId, "member");
        if (success) {
          showToast(`تم تخفيض "${memberName}" إلى عضو ✓`);
        } else {
          showToast("فشل التخفيض، حاول مجدداً");
        }
      },
    });
  }

  function handleRemoveMember(memberId: string, memberName: string) {
    showConfirm({
      title: "إزالة عضو",
      message: `هل أنت متأكد من إزالة "${memberName}" من المجموعة؟`,
      confirmText: "إزالة",
      destructive: true,
      onConfirm: async () => {
        hideConfirm();
        const success = await removeGroupMember(id, memberId);
        if (success) {
          showToast(`تمت إزالة "${memberName}" من المجموعة`);
        } else {
          showToast("فشل إزالة العضو، حاول مجدداً");
        }
      },
    });
  }

  async function handleApproveRequest(requestId: string, nickname: string) {
    setProcessingRequestId(requestId);
    try {
      await api.approveJoinRequest(id, requestId);
      setJoinRequests((prev) => prev.filter((r) => r.id !== requestId));
      fetchGroupById(id);
      showToast(`تمت الموافقة على انضمام "${nickname}" ✓`);
    } catch {
      showToast("فشلت الموافقة، حاول مجدداً");
    } finally {
      setProcessingRequestId(null);
    }
  }

  async function handleRejectRequest(requestId: string, nickname: string) {
    setProcessingRequestId(requestId);
    try {
      await api.rejectJoinRequest(id, requestId);
      setJoinRequests((prev) => prev.filter((r) => r.id !== requestId));
      showToast(`تم رفض طلب "${nickname}"`);
    } catch {
      showToast("فشل الرفض، حاول مجدداً");
    } finally {
      setProcessingRequestId(null);
    }
  }

  function handleDeleteGroup() {
    if (deleting) return;
    showConfirm({
      title: "حذف المجموعة",
      message: `هل أنت متأكد من حذف مجموعة "${safeGroup.name}"؟ لا يمكن التراجع عن هذا الإجراء.`,
      confirmText: "حذف المجموعة",
      destructive: true,
      onConfirm: async () => {
        hideConfirm();
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
    });
  }

  return (
    <View style={[styles.container, { backgroundColor: "transparent" }]}>
      <GlassScreenHeader style={{ paddingTop: topPad + 12, paddingHorizontal: 20, paddingBottom: 14 }}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name={I18nManager.isRTL ? "chevron-forward" : "chevron-back"} size={24} color={colors.onSurface} />
          </Pressable>
          <View style={styles.headerCenter}>
            <View style={[styles.headerSportIcon, { backgroundColor: sc }]}>
              <Ionicons name="settings" size={16} color="#fff" />
            </View>
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

          <SportGradientButton
            label="حفظ التغييرات"
            gradientStart={sc}
            gradientEnd={sc + "BB"}
            onPress={handleSaveGroupInfo}
            loading={saving}
            disabled={saving}
          />
        </View>

        <View style={[styles.section, { backgroundColor: colors.background, borderWidth: 1, borderColor: sc + "30" }]}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionTitleIcon, { backgroundColor: sc + "18" }]}>
              <Ionicons name="person-add-outline" size={16} color={sc} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
              طلبات الانضمام{joinRequests.length > 0 ? ` (${joinRequests.length})` : ""}
            </Text>
          </View>

          {loadingRequests ? (
            <ActivityIndicator size="small" color={sc} style={{ marginVertical: 12 }} />
          ) : joinRequests.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لا توجد طلبات انضمام معلقة</Text>
          ) : (
            joinRequests.map((request) => {
              const relColor = reliabilityColor(request.reliability, colors);
              return (
              <View key={request.id} style={[styles.memberCard, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}>
                <View style={[styles.memberAvatar, { backgroundColor: sc + "20" }]}>
                  <Text style={[styles.memberInitial, { color: sc }]}>{request.nickname.charAt(0)}</Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={[styles.memberName, { color: colors.onSurface }]} numberOfLines={1}>
                    {request.nickname}
                  </Text>
                  <View style={styles.memberMetaRow}>
                    {request.reliability !== null && (
                      <View style={[styles.relPill, { backgroundColor: relColor + "20" }]}>
                        <View style={[styles.relDot, { backgroundColor: relColor }]} />
                        <Text style={[styles.relPillText, { color: relColor }]}>
                          {formatReliability(request.reliability)}
                        </Text>
                      </View>
                    )}
                    <Text style={[styles.memberReliability, { color: colors.mutedForeground }]}>
                      {request.matchesPlayed} مباراة
                    </Text>
                  </View>
                </View>
                <View style={styles.requestActions}>
                  <Pressable
                    style={[styles.requestBtn, { backgroundColor: "#16A34A" + "20", borderColor: "#16A34A" + "40" }]}
                    onPress={() => handleApproveRequest(request.id, request.nickname)}
                    disabled={processingRequestId === request.id}
                  >
                    {processingRequestId === request.id ? (
                      <ActivityIndicator size="small" color="#16A34A" />
                    ) : (
                      <Ionicons name="checkmark" size={16} color="#16A34A" />
                    )}
                  </Pressable>
                  <Pressable
                    style={[styles.requestBtn, { backgroundColor: colors.destructive + "20", borderColor: colors.destructive + "40" }]}
                    onPress={() => handleRejectRequest(request.id, request.nickname)}
                    disabled={processingRequestId === request.id}
                  >
                    <Ionicons name="close" size={16} color={colors.destructive} />
                  </Pressable>
                </View>
              </View>
            )})
          )}
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
          <View style={[styles.section, { backgroundColor: colors.destructive + "08", borderWidth: 1, borderColor: colors.destructive + "30" }]}>
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
              style={[styles.deleteBtn, { backgroundColor: deleting ? "#DC2626" + "80" : "#DC2626", borderRadius: 14 }]}
              onPress={handleDeleteGroup}
              disabled={deleting}
              accessibilityLabel="حذف المجموعة نهائياً"
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

      <ConfirmDialog
        config={confirmDialog}
        visible={confirmVisible}
        onCancel={hideConfirm}
        colors={colors}
      />

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
    fontFamily: typography.headlineSm.fontFamily,
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
    fontFamily: typography.headlineSm.fontFamily,
    textAlign: "right",
  },

  label: {
    fontSize: 13,
    fontFamily: typography.bodyLg.fontFamily,
    textAlign: "right",
    marginBottom: -4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: typography.body.fontFamily,
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
  visibilityBtnText: { fontSize: 14, fontFamily: typography.headlineSm.fontFamily },
  toggleSubLabel: {
    fontSize: 12,
    fontFamily: typography.body.fontFamily,
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
    fontFamily: typography.headlineSm.fontFamily,
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
    fontFamily: typography.bodyLg.fontFamily,
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
    fontFamily: typography.headlineSm.fontFamily,
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
    fontFamily: typography.headlineSm.fontFamily,
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
    fontFamily: typography.bodyLg.fontFamily,
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

  emptyText: {
    fontSize: 13,
    fontFamily: typography.body.fontFamily,
    textAlign: "center",
    paddingVertical: 8,
  },
  requestActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  requestBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  memberReliability: {
    fontSize: 12,
    fontFamily: typography.body.fontFamily,
  },

  moreMembers: {
    fontSize: 13,
    fontFamily: typography.body.fontFamily,
    textAlign: "center",
    paddingVertical: 4,
  },

  dangerDesc: {
    fontSize: 13,
    fontFamily: typography.body.fontFamily,
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
    fontFamily: typography.headlineSm.fontFamily,
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
    fontFamily: typography.headlineSm.fontFamily,
    fontSize: 14,
    color: "#fff",
  },
});
