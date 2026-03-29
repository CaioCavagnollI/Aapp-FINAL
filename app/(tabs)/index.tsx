import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";

const INSIGHTS = [
  { icon: "flash-outline", title: "Sobrecarga Progressiva", subtitle: "Aumente 2,5kg por semana em exercícios principais", tag: "Princípio" },
  { icon: "refresh-outline", title: "Volume de Treino", subtitle: "10–20 séries por grupamento muscular por semana", tag: "Volume" },
  { icon: "moon-outline", title: "Recuperação Muscular", subtitle: "48–72h entre estímulos do mesmo grupamento", tag: "Recuperação" },
];

const QUICK_ACTIONS = [
  { icon: "flask-outline", label: "Atlas IA", route: "/(tabs)/atlas", color: "#D4AF37" },
  { icon: "scan-outline", label: "Scanner", route: "/(tabs)/scanner", color: "#60A5FA" },
  { icon: "document-text-outline", label: "Prescrever", route: "/(tabs)/prescrever", color: "#4ADE80" },
  { icon: "barbell-outline", label: "Treino", route: "/(tabs)/treino", color: "#F472B6" },
];

const STATS = [
  { label: "Treinos", value: "0", sub: "este mês", icon: "barbell-outline" },
  { label: "Volume", value: "0t", sub: "total", icon: "trending-up-outline" },
  { label: "Sequência", value: "0d", sub: "seguidos", icon: "flame-outline" },
  { label: "Prescrições", value: "0", sub: "ativas", icon: "document-text-outline" },
];

export default function HojeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  };

  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: topPad + 12, paddingBottom: Platform.OS === "web" ? 120 : 100 }]}
      >
        <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}, {user?.username || "Atleta"}</Text>
            <Text style={styles.dateText}>{today}</Text>
          </View>
          <Pressable onPress={() => router.push("/(tabs)/atlas")} style={styles.atlasBtn}>
            <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={styles.atlasBtnGrad}>
              <Ionicons name="flask" size={18} color={Colors.black} />
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.statsRow}>
          {STATS.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Ionicons name={s.icon as any} size={16} color={Colors.gold} style={{ marginBottom: 6 }} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={styles.statSub}>{s.sub}</Text>
            </View>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(140).springify()}>
          <Text style={styles.sectionTitle}>Acesso Rápido</Text>
          <View style={styles.quickGrid}>
            {QUICK_ACTIONS.map((a) => (
              <Pressable
                key={a.label}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(a.route as any); }}
                style={({ pressed }) => [styles.quickCard, { opacity: pressed ? 0.8 : 1 }]}
              >
                <View style={[styles.quickIconBox, { backgroundColor: `${a.color}18`, borderColor: `${a.color}30` }]}>
                  <Ionicons name={a.icon as any} size={22} color={a.color} />
                </View>
                <Text style={styles.quickLabel}>{a.label}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Text style={styles.sectionTitle}>Sessão de Hoje</Text>
          <LinearGradient colors={["#1A1A1C", "#111113"]} style={styles.sessionCard}>
            <View style={styles.sessionHeader}>
              <View>
                <Text style={styles.sessionTitle}>Nenhum treino programado</Text>
                <Text style={styles.sessionSub}>Crie ou selecione um programa de treino</Text>
              </View>
              <View style={styles.sessionIconBox}>
                <Ionicons name="barbell-outline" size={22} color={Colors.muted} />
              </View>
            </View>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/(tabs)/treino"); }}
              style={({ pressed }) => [styles.sessionBtn, { opacity: pressed ? 0.85 : 1 }]}
            >
              <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={styles.sessionBtnGrad}>
                <Text style={styles.sessionBtnText}>Ir para Treino</Text>
                <Ionicons name="arrow-forward" size={16} color={Colors.black} />
              </LinearGradient>
            </Pressable>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(260).springify()}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Insights Científicos</Text>
            <Pressable onPress={() => router.push("/(tabs)/atlas")}>
              <Text style={styles.seeAll}>Ver mais</Text>
            </Pressable>
          </View>
          {INSIGHTS.map((ins) => (
            <Pressable
              key={ins.title}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/atlas"); }}
              style={({ pressed }) => [styles.insightCard, { opacity: pressed ? 0.85 : 1 }]}
            >
              <View style={styles.insightIconBox}>
                <Ionicons name={ins.icon as any} size={18} color={Colors.gold} />
              </View>
              <View style={styles.insightText}>
                <View style={styles.insightRow}>
                  <Text style={styles.insightTitle}>{ins.title}</Text>
                  <View style={styles.insightTag}><Text style={styles.insightTagText}>{ins.tag}</Text></View>
                </View>
                <Text style={styles.insightSub}>{ins.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={Colors.muted} />
            </Pressable>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(320).springify()}>
          <LinearGradient colors={["rgba(212,175,55,0.15)", "rgba(212,175,55,0.05)"]} style={styles.nexusBanner}>
            <View style={styles.nexusBannerLeft}>
              <View style={styles.nexusLogo}>
                <Ionicons name="flask" size={18} color={Colors.gold} />
              </View>
              <View>
                <Text style={styles.nexusTitle}>Nexus</Text>
                <Text style={styles.nexusSub}>A Plataforma Científica do Treinamento de Força</Text>
              </View>
            </View>
            <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/loja"); }}>
              <Text style={styles.nexusCta}>Explorar →</Text>
            </Pressable>
          </LinearGradient>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  greeting: { fontFamily: "Outfit_700Bold", fontSize: 22, color: Colors.text, letterSpacing: -0.3 },
  dateText: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.textSecondary, marginTop: 2, textTransform: "capitalize" },
  atlasBtn: { borderRadius: 14, overflow: "hidden" },
  atlasBtnGrad: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 28 },
  statCard: { flex: 1, backgroundColor: Colors.card, borderRadius: 16, padding: 12, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  statValue: { fontFamily: "Outfit_700Bold", fontSize: 18, color: Colors.text, letterSpacing: -0.5 },
  statLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 10, color: Colors.textSecondary, marginTop: 2 },
  statSub: { fontFamily: "Outfit_400Regular", fontSize: 9, color: Colors.muted },
  sectionTitle: { fontFamily: "Outfit_700Bold", fontSize: 18, color: Colors.text, marginBottom: 14, letterSpacing: -0.3 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  seeAll: { fontFamily: "Outfit_500Medium", fontSize: 13, color: Colors.gold },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 28, justifyContent: "space-between" },
  quickCard: { width: "22%", alignItems: "center", gap: 8 },
  quickIconBox: { width: 54, height: 54, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  quickLabel: { fontFamily: "Outfit_500Medium", fontSize: 11, color: Colors.textSecondary, textAlign: "center" },
  sessionCard: { borderRadius: 20, padding: 20, borderWidth: 1, borderColor: Colors.border, marginBottom: 28 },
  sessionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  sessionTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 16, color: Colors.text, marginBottom: 4 },
  sessionSub: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.textSecondary },
  sessionIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.cardElevated, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border },
  sessionBtn: { borderRadius: 12, overflow: "hidden" },
  sessionBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13 },
  sessionBtnText: { fontFamily: "Outfit_700Bold", fontSize: 14, color: Colors.black },
  insightCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: Colors.border, gap: 14 },
  insightIconBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: "rgba(212,175,55,0.1)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(212,175,55,0.2)" },
  insightText: { flex: 1 },
  insightRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  insightTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.text, flex: 1 },
  insightTag: { backgroundColor: "rgba(212,175,55,0.12)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, borderWidth: 1, borderColor: "rgba(212,175,55,0.2)" },
  insightTagText: { fontFamily: "Outfit_500Medium", fontSize: 10, color: Colors.gold },
  insightSub: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.textSecondary },
  nexusBanner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "rgba(212,175,55,0.25)", marginTop: 8, marginBottom: 8 },
  nexusBannerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  nexusLogo: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(212,175,55,0.12)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(212,175,55,0.2)" },
  nexusTitle: { fontFamily: "Outfit_700Bold", fontSize: 15, color: Colors.text },
  nexusSub: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  nexusCta: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.gold },
});
