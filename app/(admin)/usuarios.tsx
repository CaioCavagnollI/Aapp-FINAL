import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetch } from "expo/fetch";
import Colors from "@/constants/colors";
import { useAdmin } from "@/contexts/AdminContext";
import { getApiUrl } from "@/lib/query-client";

interface User {
  id: string;
  username: string;
  plan: string;
  is_admin: boolean;
  created_at: string;
}

const PLANOS = ["free", "starter_monthly", "starter_annual", "pro_monthly", "pro_annual", "vitalicio"];
const PLANO_LABELS: Record<string, string> = {
  free: "Gratuito",
  starter_monthly: "Starter Mensal",
  starter_annual: "Starter Anual",
  pro_monthly: "Pro Mensal",
  pro_annual: "Pro Anual",
  vitalicio: "Vitalício",
};
const PLANO_COLORS: Record<string, string> = {
  free: Colors.muted,
  starter_monthly: "#4ADE80",
  starter_annual: "#4ADE80",
  pro_monthly: "#60A5FA",
  pro_annual: "#60A5FA",
  vitalicio: Colors.gold,
};

export default function UsuariosScreen() {
  const insets = useSafeAreaInsets();
  const { adminToken } = useAdmin();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("Todos");
  const [planModal, setPlanModal] = useState<User | null>(null);
  const [planSel, setPlanSel] = useState("");
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const baseUrl = getApiUrl();
  const adminHeaders = { "x-admin-token": adminToken || "", "Content-Type": "application/json" };

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await fetch(`${baseUrl}api/admin/users`, { headers: adminHeaders });
      if (!res.ok) throw new Error("Falha");
      const data = await res.json();
      return data.users || [];
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ userId, plan }: { userId: string; plan: string }) => {
      const res = await fetch(`${baseUrl}api/admin/users/${userId}/plan`, {
        method: "PUT",
        headers: adminHeaders,
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) throw new Error("Falha");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setPlanModal(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`${baseUrl}api/admin/users/${userId}`, {
        method: "DELETE",
        headers: adminHeaders,
      });
      if (!res.ok) throw new Error("Falha");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const handleDelete = (user: User) => {
    if (user.is_admin) {
      Alert.alert("Não permitido", "Não é possível excluir o usuário administrador.");
      return;
    }
    Alert.alert(
      "Confirmar exclusão",
      `Deseja excluir o usuário "${user.username}"? Esta ação não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", style: "destructive", onPress: () => deleteMutation.mutate(user.id) },
      ]
    );
  };

  const planCounts: Record<string, number> = {};
  users.forEach((u) => { planCounts[u.plan] = (planCounts[u.plan] || 0) + 1; });

  const filtered = users.filter((u) => {
    const matchSearch = !search || u.username.toLowerCase().includes(search.toLowerCase());
    const matchPlan = planFilter === "Todos" || u.plan === planFilter;
    return matchSearch && matchPlan;
  });

  const planOptions = ["Todos", ...PLANOS];

  return (
    <View style={styles.container}>
      <View style={[styles.topBox, { paddingTop: topPad + 12 }]}>
        <View style={styles.metricsRow}>
          <View style={styles.metCard}>
            <Text style={styles.metNum}>{users.length}</Text>
            <Text style={styles.metLabel}>Total</Text>
          </View>
          <View style={styles.metCard}>
            <Text style={[styles.metNum, { color: Colors.gold }]}>{users.filter((u) => u.plan === "vitalicio").length}</Text>
            <Text style={styles.metLabel}>Vitalício</Text>
          </View>
          <View style={styles.metCard}>
            <Text style={[styles.metNum, { color: "#60A5FA" }]}>{users.filter((u) => u.plan.includes("pro")).length}</Text>
            <Text style={styles.metLabel}>Pro</Text>
          </View>
          <View style={styles.metCard}>
            <Text style={[styles.metNum, { color: "#4ADE80" }]}>{users.filter((u) => u.plan.includes("starter")).length}</Text>
            <Text style={styles.metLabel}>Starter</Text>
          </View>
        </View>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={Colors.muted} style={{ marginRight: 8 }} />
          <TextInput style={styles.searchInput} placeholder="Buscar usuário..." placeholderTextColor={Colors.muted} value={search} onChangeText={setSearch} />
          {search.length > 0 && <Pressable onPress={() => setSearch("")}><Ionicons name="close-circle" size={16} color={Colors.muted} /></Pressable>}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
        {planOptions.map((p) => (
          <Pressable key={p} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPlanFilter(p); }} style={[styles.filterChip, planFilter === p && styles.filterChipAtivo]}>
            <Text style={[styles.filterText, planFilter === p && styles.filterTextAtivo]}>{p === "Todos" ? "Todos" : PLANO_LABELS[p] || p}</Text>
            {p !== "Todos" && planCounts[p] ? <Text style={[styles.filterCount, planFilter === p && { color: Colors.gold }]}>{planCounts[p]}</Text> : null}
          </Pressable>
        ))}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator color={Colors.gold} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 80 }]}>
          <Text style={styles.countText}>{filtered.length} usuário{filtered.length !== 1 ? "s" : ""}</Text>
          {filtered.map((u, idx) => {
            const planColor = PLANO_COLORS[u.plan] || Colors.muted;
            return (
              <Animated.View key={u.id} entering={FadeInDown.delay(idx * 20).springify()}>
                <View style={styles.userCard}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>{u.username.charAt(0).toUpperCase()}</Text>
                    {u.is_admin && <View style={styles.adminDot} />}
                  </View>
                  <View style={styles.userInfo}>
                    <View style={styles.userTopRow}>
                      <Text style={styles.userName}>{u.username}</Text>
                      {u.is_admin && (
                        <View style={styles.adminBadge}>
                          <Text style={styles.adminBadgeText}>ADMIN</Text>
                        </View>
                      )}
                    </View>
                    <View style={[styles.planBadge, { backgroundColor: `${planColor}15` }]}>
                      <Text style={[styles.planBadgeText, { color: planColor }]}>{PLANO_LABELS[u.plan] || u.plan}</Text>
                    </View>
                    <Text style={styles.userDate}>Desde {new Date(u.created_at).toLocaleDateString("pt-BR")}</Text>
                  </View>
                  <View style={styles.actionsCol}>
                    <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPlanSel(u.plan); setPlanModal(u); }} style={styles.actionBtn}>
                      <Ionicons name="create-outline" size={16} color={Colors.gold} />
                    </Pressable>
                    {!u.is_admin && (
                      <Pressable onPress={() => handleDelete(u)} style={[styles.actionBtn, { marginTop: 6 }]}>
                        <Ionicons name="trash-outline" size={16} color="#F87171" />
                      </Pressable>
                    )}
                  </View>
                </View>
              </Animated.View>
            );
          })}
        </ScrollView>
      )}

      <Modal visible={!!planModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Alterar Plano</Text>
              <Pressable onPress={() => setPlanModal(null)}><Ionicons name="close" size={22} color={Colors.muted} /></Pressable>
            </View>
            <Text style={styles.modalUser}>@{planModal?.username}</Text>
            <View style={styles.planoList}>
              {PLANOS.map((p) => (
                <Pressable key={p} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPlanSel(p); }} style={[styles.planoOpt, planSel === p && styles.planoOptAtivo]}>
                  <View style={[styles.planoOptDot, { backgroundColor: PLANO_COLORS[p] || Colors.muted }]} />
                  <Text style={[styles.planoOptText, planSel === p && { color: Colors.gold }]}>{PLANO_LABELS[p]}</Text>
                  {planSel === p && <Ionicons name="checkmark-circle" size={18} color={Colors.gold} />}
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={() => { if (planModal && planSel) updatePlanMutation.mutate({ userId: planModal.id, plan: planSel }); }}
              disabled={updatePlanMutation.isPending}
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            >
              <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={styles.modalBtn}>
                {updatePlanMutation.isPending ? <ActivityIndicator size="small" color={Colors.black} /> : <Text style={styles.modalBtnText}>Confirmar Alteração</Text>}
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  topBox: { paddingHorizontal: 20, paddingBottom: 12 },
  metricsRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  metCard: { flex: 1, backgroundColor: Colors.card, borderRadius: 14, padding: 12, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  metNum: { fontFamily: "Outfit_800ExtraBold", fontSize: 20, color: Colors.text, letterSpacing: -0.5 },
  metLabel: { fontFamily: "Outfit_400Regular", fontSize: 10, color: Colors.muted, marginTop: 2 },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.card, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, fontFamily: "Outfit_400Regular", fontSize: 14, color: Colors.text },
  filterScroll: { paddingVertical: 10 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, flexDirection: "row", alignItems: "center", gap: 6 },
  filterChipAtivo: { backgroundColor: "rgba(212,175,55,0.15)", borderColor: "rgba(212,175,55,0.35)" },
  filterText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: Colors.muted },
  filterTextAtivo: { fontFamily: "Outfit_700Bold", color: Colors.gold },
  filterCount: { fontFamily: "Outfit_600SemiBold", fontSize: 11, color: Colors.muted },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  countText: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.muted, marginBottom: 10 },
  userCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.card, borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  userAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(212,175,55,0.15)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(212,175,55,0.25)" },
  userAvatarText: { fontFamily: "Outfit_700Bold", fontSize: 18, color: Colors.gold },
  adminDot: { position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.gold, borderWidth: 2, borderColor: Colors.card },
  userInfo: { flex: 1 },
  userTopRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  userName: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.text },
  adminBadge: { backgroundColor: "rgba(212,175,55,0.15)", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  adminBadgeText: { fontFamily: "Outfit_700Bold", fontSize: 9, color: Colors.gold },
  planBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginBottom: 4 },
  planBadgeText: { fontFamily: "Outfit_600SemiBold", fontSize: 11 },
  userDate: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.muted },
  actionsCol: { alignItems: "center" },
  actionBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.black, borderWidth: 1, borderColor: Colors.border, alignItems: "center", justifyContent: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: Colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, borderTopWidth: 1, borderColor: Colors.border, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  modalTitle: { fontFamily: "Outfit_700Bold", fontSize: 20, color: Colors.text },
  modalUser: { fontFamily: "Outfit_400Regular", fontSize: 14, color: Colors.textSecondary, marginBottom: 16 },
  planoList: { gap: 8, marginBottom: 20 },
  planoOpt: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.black, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border },
  planoOptAtivo: { borderColor: "rgba(212,175,55,0.4)", backgroundColor: "rgba(212,175,55,0.06)" },
  planoOptDot: { width: 10, height: 10, borderRadius: 5 },
  planoOptText: { fontFamily: "Outfit_500Medium", fontSize: 14, color: Colors.text, flex: 1 },
  modalBtn: { paddingVertical: 15, borderRadius: 14, alignItems: "center" },
  modalBtnText: { fontFamily: "Outfit_700Bold", fontSize: 15, color: Colors.black },
});
