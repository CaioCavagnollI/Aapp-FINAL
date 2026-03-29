import React, { useState } from "react";
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

type Categoria = "Programas" | "Sessões" | "Exercícios" | "Performance";

const PROGRAMAS = [
  { nome: "Hipertrofia 4x — Intermediário", semanas: 12, dias: 4, nivel: "Intermediário", tag: "Hipertrofia", cor: "#D4AF37" },
  { nome: "Força Base 5x5", semanas: 8, dias: 3, nivel: "Iniciante", tag: "Força", cor: "#60A5FA" },
  { nome: "PPL Avançado — Push Pull Legs", semanas: 16, dias: 6, nivel: "Avançado", tag: "Hipertrofia", cor: "#4ADE80" },
  { nome: "Powerlifting Competição", semanas: 20, dias: 4, nivel: "Elite", tag: "Powerlifting", cor: "#F472B6" },
];

const EXERCICIOS = [
  { nome: "Agachamento Livre", grupo: "Quadríceps", icone: "barbell-outline" },
  { nome: "Supino Reto", grupo: "Peitoral", icone: "body-outline" },
  { nome: "Levantamento Terra", grupo: "Posterior", icone: "fitness-outline" },
  { nome: "Barra Fixa", grupo: "Dorsal", icone: "flash-outline" },
  { nome: "Desenvolvimento Ombro", grupo: "Deltóide", icone: "trending-up-outline" },
  { nome: "Rosca Direta", grupo: "Bíceps", icone: "pulse-outline" },
];

const METRICAS = [
  { label: "Volume Semanal", value: "0", unit: "séries", icon: "bar-chart-outline", color: "#D4AF37" },
  { label: "Sessões Completadas", value: "0", unit: "/ mês", icon: "checkmark-circle-outline", color: "#4ADE80" },
  { label: "PR Registrados", value: "0", unit: "recentes", icon: "trophy-outline", color: "#60A5FA" },
];

const CATEGORIAS: Categoria[] = ["Programas", "Sessões", "Exercícios", "Performance"];

export default function TreinoScreen() {
  const insets = useSafeAreaInsets();
  const [catAtiva, setCatAtiva] = useState<Categoria>("Programas");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: topPad + 12, paddingBottom: Platform.OS === "web" ? 120 : 100 }]}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
          <View>
            <Text style={styles.pageTitle}>Treino</Text>
            <Text style={styles.pageSubtitle}>Programas, sessões e performance</Text>
          </View>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/(tabs)/prescrever"); }}
            style={styles.addBtn}
          >
            <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={styles.addBtnGrad}>
              <Ionicons name="add" size={22} color={Colors.black} />
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* Sessão Ativa */}
        <Animated.View entering={FadeInDown.delay(60).springify()}>
          <LinearGradient colors={["rgba(212,175,55,0.12)", "rgba(212,175,55,0.04)"]} style={styles.sessionBanner}>
            <View style={styles.sessionBannerLeft}>
              <Ionicons name="flash-outline" size={20} color={Colors.gold} />
              <View>
                <Text style={styles.sessionBannerLabel}>Sessão de Hoje</Text>
                <Text style={styles.sessionBannerSub}>Nenhum programa ativo</Text>
              </View>
            </View>
            <Pressable onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
              <Text style={styles.iniciarBtn}>Iniciar →</Text>
            </Pressable>
          </LinearGradient>
        </Animated.View>

        {/* Métricas */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.metricsRow}>
          {METRICAS.map((m) => (
            <View key={m.label} style={styles.metricCard}>
              <Ionicons name={m.icon as any} size={18} color={m.color} style={{ marginBottom: 8 }} />
              <Text style={[styles.metricValue, { color: m.color }]}>{m.value}</Text>
              <Text style={styles.metricUnit}>{m.unit}</Text>
              <Text style={styles.metricLabel}>{m.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Tabs de Categoria */}
        <Animated.View entering={FadeInDown.delay(140).springify()}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
            {CATEGORIAS.map((c) => (
              <Pressable
                key={c}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCatAtiva(c); }}
                style={[styles.catTab, catAtiva === c && styles.catTabActive]}
              >
                <Text style={[styles.catTabText, catAtiva === c && styles.catTabTextActive]}>{c}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Conteúdo da Categoria */}
        {catAtiva === "Programas" && (
          <Animated.View entering={FadeInDown.delay(180).springify()}>
            {PROGRAMAS.map((p) => (
              <Pressable
                key={p.nome}
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                style={({ pressed }) => [styles.programCard, { opacity: pressed ? 0.85 : 1 }]}
              >
                <View style={[styles.programAccent, { backgroundColor: p.cor }]} />
                <View style={styles.programBody}>
                  <View style={styles.programTop}>
                    <Text style={styles.programName}>{p.nome}</Text>
                    <View style={[styles.programTagBadge, { backgroundColor: `${p.cor}20`, borderColor: `${p.cor}40` }]}>
                      <Text style={[styles.programTagText, { color: p.cor }]}>{p.tag}</Text>
                    </View>
                  </View>
                  <View style={styles.programMeta}>
                    <View style={styles.programMetaItem}>
                      <Ionicons name="calendar-outline" size={12} color={Colors.muted} />
                      <Text style={styles.programMetaText}>{p.semanas} semanas</Text>
                    </View>
                    <View style={styles.programMetaItem}>
                      <Ionicons name="barbell-outline" size={12} color={Colors.muted} />
                      <Text style={styles.programMetaText}>{p.dias} dias/sem</Text>
                    </View>
                    <View style={styles.programMetaItem}>
                      <Ionicons name="person-outline" size={12} color={Colors.muted} />
                      <Text style={styles.programMetaText}>{p.nivel}</Text>
                    </View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.muted} />
              </Pressable>
            ))}
            <Pressable style={styles.newProgramBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}>
              <Ionicons name="add-circle-outline" size={20} color={Colors.gold} />
              <Text style={styles.newProgramText}>Criar Novo Programa</Text>
            </Pressable>
          </Animated.View>
        )}

        {catAtiva === "Sessões" && (
          <Animated.View entering={FadeInDown.delay(180).springify()} style={styles.emptySection}>
            <Ionicons name="calendar-outline" size={40} color={Colors.muted} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>Nenhuma sessão registrada</Text>
            <Text style={styles.emptySub}>Inicie uma sessão de treino para ver seu histórico aqui.</Text>
          </Animated.View>
        )}

        {catAtiva === "Exercícios" && (
          <Animated.View entering={FadeInDown.delay(180).springify()}>
            {EXERCICIOS.map((e) => (
              <Pressable key={e.nome} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} style={({ pressed }) => [styles.exercicioCard, { opacity: pressed ? 0.85 : 1 }]}>
                <View style={styles.exercicioIcon}>
                  <Ionicons name={e.icone as any} size={18} color={Colors.gold} />
                </View>
                <View style={styles.exercicioInfo}>
                  <Text style={styles.exercicioNome}>{e.nome}</Text>
                  <Text style={styles.exercicioGrupo}>{e.grupo}</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={Colors.muted} />
              </Pressable>
            ))}
          </Animated.View>
        )}

        {catAtiva === "Performance" && (
          <Animated.View entering={FadeInDown.delay(180).springify()} style={styles.emptySection}>
            <Ionicons name="trending-up-outline" size={40} color={Colors.muted} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>Dados insuficientes</Text>
            <Text style={styles.emptySub}>Complete pelo menos 3 sessões para ver suas métricas de performance.</Text>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  pageTitle: { fontFamily: "Outfit_800ExtraBold", fontSize: 26, color: Colors.text, letterSpacing: -0.5, marginBottom: 2 },
  pageSubtitle: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.textSecondary },
  addBtn: { borderRadius: 14, overflow: "hidden" },
  addBtnGrad: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  sessionBanner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "rgba(212,175,55,0.25)", marginBottom: 20 },
  sessionBannerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  sessionBannerLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 15, color: Colors.text },
  sessionBannerSub: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  iniciarBtn: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.gold },
  metricsRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  metricCard: { flex: 1, backgroundColor: Colors.card, borderRadius: 16, padding: 14, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  metricValue: { fontFamily: "Outfit_800ExtraBold", fontSize: 22, letterSpacing: -0.5 },
  metricUnit: { fontFamily: "Outfit_400Regular", fontSize: 10, color: Colors.muted, marginTop: 2 },
  metricLabel: { fontFamily: "Outfit_500Medium", fontSize: 10, color: Colors.textSecondary, marginTop: 4, textAlign: "center" },
  catScroll: { marginBottom: 20 },
  catTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  catTabActive: { backgroundColor: "rgba(212,175,55,0.15)", borderColor: "rgba(212,175,55,0.35)" },
  catTabText: { fontFamily: "Outfit_500Medium", fontSize: 13, color: Colors.muted },
  catTabTextActive: { fontFamily: "Outfit_700Bold", color: Colors.gold },
  programCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.card, borderRadius: 18, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: Colors.border, overflow: "hidden", gap: 12 },
  programAccent: { width: 3, height: "100%", borderRadius: 2, position: "absolute", left: 0, top: 0, bottom: 0 },
  programBody: { flex: 1, paddingLeft: 8 },
  programTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  programName: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.text, flex: 1, lineHeight: 20 },
  programTagBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, borderWidth: 1 },
  programTagText: { fontFamily: "Outfit_500Medium", fontSize: 10 },
  programMeta: { flexDirection: "row", gap: 12 },
  programMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  programMetaText: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.muted },
  newProgramBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, borderRadius: 16, borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(212,175,55,0.3)", marginTop: 4 },
  newProgramText: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.gold },
  emptySection: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 16, color: Colors.textSecondary, marginBottom: 8 },
  emptySub: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.muted, textAlign: "center", lineHeight: 20, paddingHorizontal: 20 },
  exercicioCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.card, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  exercicioIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(212,175,55,0.1)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(212,175,55,0.2)" },
  exercicioInfo: { flex: 1 },
  exercicioNome: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.text, marginBottom: 2 },
  exercicioGrupo: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.muted },
});
