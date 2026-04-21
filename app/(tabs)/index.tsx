import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { getApiUrl } from "@/lib/query-client";
import { fetch } from "expo/fetch";

interface Stats {
  sessions_this_month: number;
  total_volume_kg: number;
  streak_days: number;
  active_prescriptions: number;
  active_clients: number;
  total_sessions: number;
}

const MAIN_PAGES = [
  { icon: "flask-outline", label: "Atlas Brain", sublabel: "IA Acadêmica & Prescrição", route: "/(tabs)/atlas", grad: ["#D4AF37", "#A8892B"] as [string,string] },
  { icon: "scan-outline", label: "Scanner", sublabel: "Análise nutricional com IA", route: "/(tabs)/scanner", grad: ["#3B82F6", "#1E40AF"] as [string,string] },
  { icon: "barbell-outline", label: "Meus Treinos", sublabel: "Programas & Prescrições", route: "/(tabs)/meus-treinos", grad: ["#10B981", "#065F46"] as [string,string] },
  { icon: "storefront-outline", label: "Atlas Store", sublabel: "Produtos & Planos", route: "/(tabs)/loja", grad: ["#8B5CF6", "#5B21B6"] as [string,string] },
];

const QUICK_ACCESS = [
  { icon: "person-circle-outline", label: "Perfil", route: "/(tabs)/perfil" },
  { icon: "cloud-upload-outline", label: "Arquivos", route: "/(tabs)/uploads" },
  { icon: "document-text-outline", label: "Prescrever", route: "/(tabs)/atlas" },
  { icon: "settings-outline", label: "Admin", route: "/(admin)" },
];

const INSIGHTS = [
  { icon: "flash-outline", title: "Sobrecarga Progressiva", subtitle: "Aumente 2,5kg/semana nos exercícios compostos", tag: "Princípio" },
  { icon: "refresh-outline", title: "Volume Semanal", subtitle: "10–20 séries por músculo é a faixa ideal de hipertrofia", tag: "Volume" },
  { icon: "moon-outline", title: "Recuperação", subtitle: "48–72h entre estímulos do mesmo grupamento muscular", tag: "Recuperação" },
];

function formatVolume(kg: number) {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${Math.round(kg)}kg`;
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const { colors, isDark } = useTheme();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const [refreshing, setRefreshing] = useState(false);

  const { data: stats, isLoading: statsLoading, refetch } = useQuery<Stats>({
    queryKey: ["/api/stats"],
    queryFn: async () => {
      const res = await fetch(`${getApiUrl()}api/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Falha");
      return res.json();
    },
    enabled: !!token,
    staleTime: 30000,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  };

  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  const statsCards = [
    { label: "Sessões", value: statsLoading ? "—" : String(stats?.sessions_this_month ?? 0), sub: "este mês", icon: "barbell-outline", color: Colors.gold },
    { label: "Clientes", value: statsLoading ? "—" : String(stats?.active_clients ?? 0), sub: "ativos", icon: "people-outline", color: "#60A5FA" },
    { label: "Prescrições", value: statsLoading ? "—" : String(stats?.active_prescriptions ?? 0), sub: "ativas", icon: "document-text-outline", color: "#4ADE80" },
    { label: "Sequência", value: statsLoading ? "—" : `${stats?.streak_days ?? 0}d`, sub: "seguidos", icon: "flame-outline", color: "#F472B6" },
  ];

  const bg = isDark ? Colors.black : Colors.lightBg;
  const cardBg = isDark ? Colors.card : Colors.lightCard;
  const textColor = isDark ? Colors.text : Colors.lightText;
  const textSec = isDark ? Colors.textSecondary : Colors.lightTextSecondary;
  const borderColor = isDark ? Colors.border : Colors.lightBorder;

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: topPad + 8, paddingBottom: botPad + 80 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(600)} style={[styles.header, { paddingHorizontal: 20 }]}>
          <View>
            <Text style={[styles.greeting, { color: textSec }]}>{getGreeting()},</Text>
            <Text style={[styles.username, { color: textColor }]}>{user?.username ?? "Atleta"} 👋</Text>
            <Text style={[styles.dateText, { color: textSec }]}>{today}</Text>
          </View>
          <Pressable
            onPress={() => router.push("/(tabs)/perfil")}
            style={[styles.avatarBtn, { backgroundColor: cardBg, borderColor }]}
          >
            <Ionicons name="person-circle-outline" size={28} color={Colors.gold} />
          </Pressable>
        </Animated.View>

        {/* Plan Badge */}
        {user && (
          <Animated.View entering={FadeInDown.delay(100).springify()} style={{ paddingHorizontal: 20, marginTop: 8 }}>
            <View style={[styles.planBadge, { backgroundColor: cardBg, borderColor }]}>
              <Ionicons name="star" size={14} color={Colors.gold} />
              <Text style={[styles.planText, { color: Colors.gold }]}>
                Plano {user.plan === "vitalicio" ? "Vitalício" : user.plan === "free" ? "Gratuito" : user.plan.replace("_", " ").replace("monthly", "Mensal").replace("annual", "Anual")}
              </Text>
              {user.plan === "free" && (
                <Pressable onPress={() => router.push("/(tabs)/loja")} style={styles.upgradeBtn}>
                  <Text style={styles.upgradeText}>Fazer Upgrade</Text>
                </Pressable>
              )}
            </View>
          </Animated.View>
        )}

        {/* Stats Row */}
        <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.statsGrid}>
          {statsCards.map((s, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: cardBg, borderColor }]}>
              <Ionicons name={s.icon as any} size={20} color={s.color} />
              <Text style={[styles.statValue, { color: textColor }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: textSec }]}>{s.label}</Text>
              <Text style={[styles.statSub, { color: textSec }]}>{s.sub}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Volume extra stat */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={[styles.volumeCard, { backgroundColor: cardBg, borderColor }]}>
            <LinearGradient colors={[Colors.gold + "22", Colors.gold + "05"]} style={StyleSheet.absoluteFill} />
            <Ionicons name="trending-up-outline" size={24} color={Colors.gold} />
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.volumeValue, { color: Colors.gold }]}>
                {statsLoading ? "—" : formatVolume(stats?.total_volume_kg ?? 0)}
              </Text>
              <Text style={[styles.volumeLabel, { color: textSec }]}>Volume Total Levantado</Text>
            </View>
            <View style={{ marginLeft: "auto" }}>
              <Text style={[styles.sessionTotal, { color: textSec }]}>{statsLoading ? "—" : stats?.total_sessions ?? 0} sessões</Text>
              <Text style={[styles.sessionSub, { color: textSec }]}>no total</Text>
            </View>
          </View>
        </Animated.View>

        {/* 4 Main Pages */}
        <Animated.View entering={FadeInDown.delay(250).springify()} style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Páginas Principais</Text>
          <View style={styles.mainPagesGrid}>
            {MAIN_PAGES.map((p, i) => (
              <Pressable
                key={i}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(p.route as any); }}
                style={styles.mainPageCard}
              >
                <LinearGradient colors={p.grad} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} />
                <Ionicons name={p.icon as any} size={28} color="#fff" />
                <Text style={styles.mainPageLabel}>{p.label}</Text>
                <Text style={styles.mainPageSub}>{p.sublabel}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Quick Access */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Acesso Rápido</Text>
          <View style={[styles.quickRow, { backgroundColor: cardBg, borderColor }]}>
            {QUICK_ACCESS.map((q, i) => (
              <Pressable
                key={i}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(q.route as any); }}
                style={styles.quickItem}
              >
                <Ionicons name={q.icon as any} size={22} color={Colors.gold} />
                <Text style={[styles.quickLabel, { color: textSec }]}>{q.label}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Insights Científicos (Hoje section) */}
        <Animated.View entering={FadeInDown.delay(350).springify()} style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Insights Científicos de Hoje</Text>
          {INSIGHTS.map((ins, i) => (
            <View key={i} style={[styles.insightCard, { backgroundColor: cardBg, borderColor }]}>
              <View style={[styles.insightIcon, { backgroundColor: Colors.gold + "22" }]}>
                <Ionicons name={ins.icon as any} size={18} color={Colors.gold} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.insightTop}>
                  <Text style={[styles.insightTitle, { color: textColor }]}>{ins.title}</Text>
                  <View style={[styles.insightTag, { backgroundColor: Colors.gold + "22" }]}>
                    <Text style={[styles.insightTagText, { color: Colors.gold }]}>{ins.tag}</Text>
                  </View>
                </View>
                <Text style={[styles.insightSub, { color: textSec }]}>{ins.subtitle}</Text>
              </View>
            </View>
          ))}
        </Animated.View>

        {/* Anamneses Review */}
        <Animated.View entering={FadeInDown.delay(400).springify()} style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={[styles.anamneseCard, { backgroundColor: cardBg, borderColor }]}>
            <LinearGradient colors={["#3B82F6" + "22", "transparent"]} style={StyleSheet.absoluteFill} />
            <View style={styles.anamneseHeader}>
              <View style={[styles.anamneseDot, { backgroundColor: "#3B82F6" }]} />
              <Text style={[styles.anamneseTitle, { color: textColor }]}>Revisão de Anamneses</Text>
              <Pressable
                onPress={() => router.push("/(tabs)/atlas")}
                style={[styles.anamneseBtn, { borderColor: "#3B82F6" }]}
              >
                <Text style={styles.anamneseBtnText}>Ver Todas</Text>
              </Pressable>
            </View>
            <Text style={[styles.anamneseSub, { color: textSec }]}>
              Clientes podem enviar anamneses para revisão personalizada. Prescrições geradas ficam disponíveis aqui para exportação.
            </Text>
            <Pressable
              onPress={() => router.push("/(tabs)/atlas")}
              style={styles.anamneseCTA}
            >
              <Ionicons name="add-circle-outline" size={16} color="#3B82F6" />
              <Text style={[styles.anamneseCTAText, { color: "#3B82F6" }]}>Nova Prescrição Atlas</Text>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  greeting: { fontFamily: "Outfit_400Regular", fontSize: 14 },
  username: { fontFamily: "Outfit_700Bold", fontSize: 26 },
  dateText: { fontFamily: "Outfit_400Regular", fontSize: 13, marginTop: 2 },
  avatarBtn: { width: 46, height: 46, borderRadius: 23, justifyContent: "center", alignItems: "center", borderWidth: 1 },
  planBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, marginBottom: 12 },
  planText: { fontFamily: "Outfit_600SemiBold", fontSize: 13 },
  upgradeBtn: { marginLeft: "auto" as any, backgroundColor: Colors.gold, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  upgradeText: { color: "#000", fontFamily: "Outfit_700Bold", fontSize: 11 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  statCard: { flex: 1, minWidth: "22%", borderRadius: 14, padding: 12, borderWidth: 1, alignItems: "center", gap: 4 },
  statValue: { fontFamily: "Outfit_700Bold", fontSize: 20 },
  statLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 11 },
  statSub: { fontFamily: "Outfit_400Regular", fontSize: 10 },
  volumeCard: { flexDirection: "row", alignItems: "center", borderRadius: 16, padding: 16, borderWidth: 1, overflow: "hidden" },
  volumeValue: { fontFamily: "Outfit_800ExtraBold", fontSize: 24 },
  volumeLabel: { fontFamily: "Outfit_400Regular", fontSize: 12 },
  sessionTotal: { fontFamily: "Outfit_700Bold", fontSize: 16, textAlign: "right" },
  sessionSub: { fontFamily: "Outfit_400Regular", fontSize: 11, textAlign: "right" },
  sectionTitle: { fontFamily: "Outfit_700Bold", fontSize: 17, marginBottom: 12 },
  mainPagesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  mainPageCard: { width: "47.5%", borderRadius: 16, padding: 16, minHeight: 110, overflow: "hidden", justifyContent: "flex-end", gap: 4 },
  mainPageLabel: { color: "#fff", fontFamily: "Outfit_700Bold", fontSize: 15 },
  mainPageSub: { color: "rgba(255,255,255,0.75)", fontFamily: "Outfit_400Regular", fontSize: 11 },
  quickRow: { flexDirection: "row", borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  quickItem: { flex: 1, alignItems: "center", paddingVertical: 14, gap: 4 },
  quickLabel: { fontFamily: "Outfit_500Medium", fontSize: 10 },
  insightCard: { flexDirection: "row", alignItems: "center", borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 8 },
  insightIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  insightTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  insightTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 14, flex: 1 },
  insightTag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8 },
  insightTagText: { fontFamily: "Outfit_600SemiBold", fontSize: 10 },
  insightSub: { fontFamily: "Outfit_400Regular", fontSize: 12 },
  anamneseCard: { borderRadius: 16, padding: 16, borderWidth: 1, overflow: "hidden" },
  anamneseHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 },
  anamneseDot: { width: 8, height: 8, borderRadius: 4 },
  anamneseTitle: { fontFamily: "Outfit_700Bold", fontSize: 15, flex: 1 },
  anamneseBtn: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  anamneseBtnText: { color: "#3B82F6", fontFamily: "Outfit_600SemiBold", fontSize: 11 },
  anamneseSub: { fontFamily: "Outfit_400Regular", fontSize: 13, marginBottom: 12, lineHeight: 19 },
  anamneseCTA: { flexDirection: "row", alignItems: "center", gap: 6 },
  anamneseCTAText: { fontFamily: "Outfit_600SemiBold", fontSize: 13 },
});
