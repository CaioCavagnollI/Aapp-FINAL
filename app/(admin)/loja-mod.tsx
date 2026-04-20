import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
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

interface StoreProduct {
  id: string;
  seller_name: string;
  name: string;
  description?: string;
  price: string;
  category: string;
  contact?: string;
  status: string;
  created_at: string;
}

export default function LojaModScreen() {
  const insets = useSafeAreaInsets();
  const { adminToken } = useAdmin();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"pending" | "approved">("pending");
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const baseUrl = getApiUrl();
  const adminHeaders = { "x-admin-token": adminToken || "", "Content-Type": "application/json" };

  const { data: products = [], isLoading } = useQuery<StoreProduct[]>({
    queryKey: ["/api/admin/store/products/all"],
    queryFn: async () => {
      const res = await fetch(`${baseUrl}api/admin/store/products`, { headers: adminHeaders });
      if (!res.ok) return [];
      const data = await res.json();
      return data.products || [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${baseUrl}api/admin/store/products/${id}/approve`, {
        method: "PUT",
        headers: adminHeaders,
      });
      if (!res.ok) throw new Error("Falha");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/store/products/all"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${baseUrl}api/admin/store/products/${id}`, {
        method: "DELETE",
        headers: adminHeaders,
      });
      if (!res.ok) throw new Error("Falha");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/store/products/all"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const handleDelete = (product: StoreProduct) => {
    Alert.alert(
      "Remover produto",
      `Deseja remover "${product.name}" da loja?`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Remover", style: "destructive", onPress: () => deleteMutation.mutate(product.id) },
      ]
    );
  };

  const pending = products.filter((p) => p.status === "pending");
  const approved = products.filter((p) => p.status === "approved");
  const displayed = tab === "pending" ? pending : approved;

  return (
    <View style={styles.container}>
      <View style={[styles.headerBox, { paddingTop: topPad + 12 }]}>
        <View style={styles.tabs}>
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTab("pending"); }} style={[styles.tabBtn, tab === "pending" && styles.tabBtnAtivo]}>
            <Text style={[styles.tabText, tab === "pending" && styles.tabTextAtivo]}>Pendentes</Text>
            {pending.length > 0 && <View style={styles.tabCount}><Text style={styles.tabCountText}>{pending.length}</Text></View>}
          </Pressable>
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTab("approved"); }} style={[styles.tabBtn, tab === "approved" && styles.tabBtnAtivo]}>
            <Text style={[styles.tabText, tab === "approved" && styles.tabTextAtivo]}>Aprovados</Text>
            {approved.length > 0 && <View style={[styles.tabCount, { backgroundColor: "rgba(74,222,128,0.2)" }]}><Text style={[styles.tabCountText, { color: "#4ADE80" }]}>{approved.length}</Text></View>}
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.gold} style={{ marginTop: 60 }} />
      ) : displayed.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="storefront-outline" size={40} color={Colors.muted} style={{ marginBottom: 12 }} />
          <Text style={styles.emptyTitle}>{tab === "pending" ? "Nenhum produto pendente" : "Nenhum produto aprovado"}</Text>
          <Text style={styles.emptySub}>{tab === "pending" ? "Todos os produtos enviados pela comunidade aparecerão aqui para revisão." : "Produtos aprovados ficam visíveis na loja para todos os usuários."}</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 80 }]}>
          {displayed.map((p, idx) => (
            <Animated.View key={p.id} entering={FadeInDown.delay(idx * 30).springify()}>
              <View style={styles.prodCard}>
                <View style={styles.prodHeader}>
                  <View style={styles.prodIcon}>
                    <Ionicons name="bag-handle-outline" size={18} color={Colors.gold} />
                  </View>
                  <View style={styles.prodInfo}>
                    <Text style={styles.prodName}>{p.name}</Text>
                    <Text style={styles.prodSeller}>@{p.seller_name} · {p.category}</Text>
                  </View>
                  <Text style={styles.prodPrice}>{p.price}</Text>
                </View>

                {p.description && (
                  <Text style={styles.prodDesc}>{p.description}</Text>
                )}

                {p.contact && (
                  <View style={styles.prodContact}>
                    <Ionicons name="call-outline" size={12} color={Colors.textSecondary} />
                    <Text style={styles.prodContactText}>{p.contact}</Text>
                  </View>
                )}

                <Text style={styles.prodDate}>Enviado em {new Date(p.created_at).toLocaleDateString("pt-BR")}</Text>

                <View style={styles.prodActions}>
                  {tab === "pending" && (
                    <Pressable
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); approveMutation.mutate(p.id); }}
                      disabled={approveMutation.isPending}
                      style={({ pressed }) => [styles.approveBtn, { opacity: pressed ? 0.85 : 1 }]}
                    >
                      <LinearGradient colors={["#16A34A", "#4ADE80"]} style={styles.actionGrad}>
                        {approveMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <>
                          <Ionicons name="checkmark-outline" size={14} color="#fff" />
                          <Text style={styles.approveBtnText}>Aprovar</Text>
                        </>}
                      </LinearGradient>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => handleDelete(p)}
                    disabled={deleteMutation.isPending}
                    style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.85 : 1 }]}
                  >
                    <Ionicons name="trash-outline" size={14} color="#F87171" />
                    <Text style={styles.deleteBtnText}>Remover</Text>
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  headerBox: { paddingHorizontal: 20, paddingBottom: 8 },
  tabs: { flexDirection: "row", backgroundColor: Colors.card, borderRadius: 16, padding: 4, borderWidth: 1, borderColor: Colors.border },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 10, borderRadius: 13 },
  tabBtnAtivo: { backgroundColor: "rgba(212,175,55,0.15)" },
  tabText: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.muted },
  tabTextAtivo: { color: Colors.gold },
  tabCount: { backgroundColor: "rgba(212,175,55,0.2)", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  tabCountText: { fontFamily: "Outfit_700Bold", fontSize: 11, color: Colors.gold },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  emptyTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 16, color: Colors.textSecondary, marginBottom: 8, textAlign: "center" },
  emptySub: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.muted, textAlign: "center", lineHeight: 20 },
  scroll: { paddingHorizontal: 20, paddingTop: 16 },
  prodCard: { backgroundColor: Colors.card, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  prodHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  prodIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: "rgba(212,175,55,0.1)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(212,175,55,0.2)" },
  prodInfo: { flex: 1 },
  prodName: { fontFamily: "Outfit_600SemiBold", fontSize: 15, color: Colors.text, marginBottom: 2 },
  prodSeller: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.muted },
  prodPrice: { fontFamily: "Outfit_700Bold", fontSize: 15, color: Colors.gold },
  prodDesc: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginBottom: 8, backgroundColor: Colors.black, borderRadius: 10, padding: 10 },
  prodContact: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  prodContactText: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.textSecondary },
  prodDate: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.muted, marginBottom: 12 },
  prodActions: { flexDirection: "row", gap: 8 },
  approveBtn: { flex: 1, borderRadius: 12, overflow: "hidden" },
  actionGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10 },
  approveBtnText: { fontFamily: "Outfit_700Bold", fontSize: 13, color: "#fff" },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: "rgba(248,113,113,0.3)", backgroundColor: "rgba(248,113,113,0.08)" },
  deleteBtnText: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: "#F87171" },
});
