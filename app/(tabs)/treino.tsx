import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetch } from "expo/fetch";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl } from "@/lib/query-client";

type Categoria = "Programas" | "Sessoes" | "Exercicios";
const CATEGORIAS: { key: Categoria; label: string }[] = [
  { key: "Programas", label: "Programas" },
  { key: "Sessoes", label: "Sessoes" },
  { key: "Exercicios", label: "Exercicios" },
];

interface Program {
  id: string;
  name: string;
  description: string | null;
  weeks: number;
  days_per_week: number;
  level: string;
  goal: string | null;
  is_active: boolean;
}

interface Session {
  id: string;
  program_id: string | null;
  name: string;
  duration_minutes: number | null;
  notes: string | null;
  created_at: string;
}

interface Stats {
  sessions_this_month: number;
  total_volume_kg: number;
  streak_days: number;
}

const EXERCICIOS_BASE = [
  { nome: "Agachamento Livre", grupo: "Quadriceps", icone: "barbell-outline" },
  { nome: "Supino Reto", grupo: "Peitoral", icone: "body-outline" },
  { nome: "Levantamento Terra", grupo: "Posterior", icone: "fitness-outline" },
  { nome: "Barra Fixa", grupo: "Dorsal", icone: "flash-outline" },
  { nome: "Desenvolvimento Ombro", grupo: "Deltoide", icone: "trending-up-outline" },
  { nome: "Rosca Direta", grupo: "Biceps", icone: "pulse-outline" },
];

const GOAL_COLORS: Record<string, string> = {
  Hipertrofia: "#D4AF37",
  "Forca": "#60A5FA",
  "Resistencia": "#4ADE80",
  "Perda de Peso": "#F472B6",
  Performance: "#A78BFA",
  "Reabilitacao": "#FB923C",
};

export default function TreinoScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [catAtiva, setCatAtiva] = useState<Categoria>("Programas");
  const [showNewProgram, setShowNewProgram] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGoal, setNewGoal] = useState("Hipertrofia");
  const [newWeeks, setNewWeeks] = useState("12");
  const [newDays, setNewDays] = useState("4");
  const [newLevel, setNewLevel] = useState("Intermediario");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const baseUrl = getApiUrl();
  const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const { data: programs = [], isLoading: loadingPrograms, refetch: refetchPrograms } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
    queryFn: async () => {
      const res = await fetch(`${baseUrl}api/programs`, { headers: authHeaders });
      if (!res.ok) throw new Error("Falha");
      const data = await res.json();
      return data.programs || data || [];
    },
    enabled: !!token,
  });

  const { data: sessions = [], isLoading: loadingSessions, refetch: refetchSessions } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
    queryFn: async () => {
      const res = await fetch(`${baseUrl}api/sessions`, { headers: authHeaders });
      if (!res.ok) throw new Error("Falha");
      const data = await res.json();
      return data.sessions || data || [];
    },
    enabled: !!token,
  });

  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/stats"],
    queryFn: async () => {
      const res = await fetch(`${baseUrl}api/stats`, { headers: authHeaders });
      if (!res.ok) throw new Error("Falha");
      return res.json();
    },
    enabled: !!token,
  });

  const createProgramMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${baseUrl}api/programs`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          name: newName,
          goal: newGoal,
          weeks: parseInt(newWeeks),
          days_per_week: parseInt(newDays),
          level: newLevel,
        }),
      });
      if (!res.ok) throw new Error("Falha");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      setShowNewProgram(false);
      setNewName("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const registerSessionMutation = useMutation({
    mutationFn: async (programId?: string) => {
      const res = await fetch(`${baseUrl}api/sessions`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          program_id: programId || null,
          duration_minutes: 60,
          notes: "Sessao registrada via app",
        }),
      });
      if (!res.ok) throw new Error("Falha");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const metricas = [
    { label: "Volume", value: stats ? `${stats.total_volume_kg}kg` : "---", unit: "total", icon: "bar-chart-outline", color: "#D4AF37" },
    { label: "Sessoes", value: stats ? String(stats.sessions_this_month) : "---", unit: "/ mes", icon: "checkmark-circle-outline", color: "#4ADE80" },
    { label: "Sequencia", value: stats ? `${stats.streak_days}d` : "---", unit: "dias", icon: "flame-outline", color: "#60A5FA" },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => { refetchPrograms(); refetchSessions(); }}
            tintColor={Colors.gold}
          />
        }
        contentContainerStyle={[styles.content, { paddingTop: topPad + 12, paddingBottom: Platform.OS === "web" ? 120 : 90 }]}
      >
        <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
          <View>
            <Text style={styles.pageTitle}>Treino</Text>
            <Text style={styles.pageSubtitle}>Programas, sessoes e performance</Text>
          </View>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowNewProgram(true); }}
            style={styles.addBtn}
          >
            <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={styles.addBtnGrad}>
              <Ionicons name="add" size={22} color={Colors.black} />
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).springify()}>
          <LinearGradient colors={["rgba(212,175,55,0.12)", "rgba(212,175,55,0.04)"]} style={styles.sessionBanner}>
            <View style={styles.sessionBannerLeft}>
              <Ionicons name="flash-outline" size={20} color={Colors.gold} />
              <View>
                <Text style={styles.sessionBannerLabel}>Registrar Sessao</Text>
                <Text style={styles.sessionBannerSub}>
                  {programs.length > 0 ? programs[0].name : "Nenhum programa ativo"}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                registerSessionMutation.mutate(programs[0]?.id);
              }}
              disabled={registerSessionMutation.isPending}
            >
              {registerSessionMutation.isPending ? (
                <ActivityIndicator size="small" color={Colors.gold} />
              ) : (
                <Text style={styles.iniciarBtn}>Registrar</Text>
              )}
            </Pressable>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.metricsRow}>
          {metricas.map((m) => (
            <View key={m.label} style={styles.metricCard}>
              <Ionicons name={m.icon as any} size={18} color={m.color} style={{ marginBottom: 8 }} />
              <Text style={[styles.metricValue, { color: m.color }]}>{m.value}</Text>
              <Text style={styles.metricUnit}>{m.unit}</Text>
              <Text style={styles.metricLabel}>{m.label}</Text>
            </View>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(140).springify()}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
            {CATEGORIAS.map((c) => (
              <Pressable
                key={c.key}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCatAtiva(c.key); }}
                style={[styles.catTab, catAtiva === c.key && styles.catTabActive]}
              >
                <Text style={[styles.catTabText, catAtiva === c.key && styles.catTabTextActive]}>{c.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>

        {catAtiva === "Programas" && (
          <Animated.View entering={FadeInDown.delay(180).springify()}>
            {loadingPrograms ? (
              <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />
            ) : programs.length === 0 ? (
              <View style={styles.emptySection}>
                <Ionicons name="barbell-outline" size={40} color={Colors.muted} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>Nenhum programa criado</Text>
                <Text style={styles.emptySub}>Toque em + para criar seu primeiro programa de treino.</Text>
              </View>
            ) : (
              programs.map((p) => {
                const cor = GOAL_COLORS[p.goal || ""] || Colors.gold;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                    style={({ pressed }) => [styles.programCard, { opacity: pressed ? 0.85 : 1 }]}
                  >
                    <View style={[styles.programAccent, { backgroundColor: cor }]} />
                    <View style={styles.programBody}>
                      <View style={styles.programTop}>
                        <Text style={styles.programName}>{p.name}</Text>
                        {p.goal ? (
                          <View style={[styles.programTagBadge, { backgroundColor: `${cor}20`, borderColor: `${cor}40` }]}>
                            <Text style={[styles.programTagText, { color: cor }]}>{p.goal}</Text>
                          </View>
                        ) : null}
                      </View>
                      <View style={styles.programMeta}>
                        <View style={styles.programMetaItem}>
                          <Ionicons name="calendar-outline" size={12} color={Colors.muted} />
                          <Text style={styles.programMetaText}>{p.weeks} semanas</Text>
                        </View>
                        <View style={styles.programMetaItem}>
                          <Ionicons name="barbell-outline" size={12} color={Colors.muted} />
                          <Text style={styles.programMetaText}>{p.days_per_week} dias/sem</Text>
                        </View>
                        <View style={styles.programMetaItem}>
                          <Ionicons name="person-outline" size={12} color={Colors.muted} />
                          <Text style={styles.programMetaText}>{p.level}</Text>
                        </View>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={Colors.muted} />
                  </Pressable>
                );
              })
            )}
            <Pressable style={styles.newProgramBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowNewProgram(true); }}>
              <Ionicons name="add-circle-outline" size={20} color={Colors.gold} />
              <Text style={styles.newProgramText}>Criar Novo Programa</Text>
            </Pressable>
          </Animated.View>
        )}

        {catAtiva === "Sessoes" && (
          <Animated.View entering={FadeInDown.delay(180).springify()}>
            {loadingSessions ? (
              <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />
            ) : sessions.length === 0 ? (
              <View style={styles.emptySection}>
                <Ionicons name="calendar-outline" size={40} color={Colors.muted} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>Nenhuma sessao registrada</Text>
                <Text style={styles.emptySub}>Inicie uma sessao de treino para ver seu historico aqui.</Text>
              </View>
            ) : (
              sessions.map((s) => (
                <View key={s.id} style={styles.sessaoCard}>
                  <View style={styles.sessaoIconBox}>
                    <Ionicons name="barbell-outline" size={18} color={Colors.gold} />
                  </View>
                  <View style={styles.sessaoInfo}>
                    <Text style={styles.sessaoData}>{new Date(s.created_at).toLocaleDateString("pt-BR")}</Text>
                    <Text style={styles.sessaoMeta}>
                      {s.duration_minutes ? `${s.duration_minutes} min` : "Duracao nao registrada"}
                      {s.name ? ` - ${s.name}` : ""}
                    </Text>
                    {s.notes ? <Text style={styles.sessaoNotes}>{s.notes}</Text> : null}
                  </View>
                  <View style={styles.sessBadge}>
                    <Text style={styles.sessBadgeText}>Concluida</Text>
                  </View>
                </View>
              ))
            )}
          </Animated.View>
        )}

        {catAtiva === "Exercicios" && (
          <Animated.View entering={FadeInDown.delay(180).springify()}>
            {EXERCICIOS_BASE.map((e) => (
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
      </ScrollView>

      <Modal visible={showNewProgram} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo Programa</Text>
              <Pressable onPress={() => setShowNewProgram(false)}>
                <Ionicons name="close" size={22} color={Colors.muted} />
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>Nome do Programa</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Hipertrofia 4x Intermediario"
              placeholderTextColor={Colors.muted}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />

            <Text style={styles.fieldLabel}>Objetivo</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
              {["Hipertrofia", "Forca", "Resistencia", "Performance"].map((g) => (
                <Pressable
                  key={g}
                  onPress={() => setNewGoal(g)}
                  style={[styles.chip, newGoal === g && styles.chipActive]}
                >
                  <Text style={[styles.chipText, newGoal === g && styles.chipTextActive]}>{g}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.modalRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Semanas</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="12"
                  placeholderTextColor={Colors.muted}
                  keyboardType="number-pad"
                  value={newWeeks}
                  onChangeText={setNewWeeks}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Dias/sem</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="4"
                  placeholderTextColor={Colors.muted}
                  keyboardType="number-pad"
                  value={newDays}
                  onChangeText={setNewDays}
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Nivel</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }} contentContainerStyle={{ gap: 8 }}>
              {["Iniciante", "Intermediario", "Avancado", "Elite"].map((l) => (
                <Pressable
                  key={l}
                  onPress={() => setNewLevel(l)}
                  style={[styles.chip, newLevel === l && styles.chipActive]}
                >
                  <Text style={[styles.chipText, newLevel === l && styles.chipTextActive]}>{l}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable
              onPress={() => { if (newName.trim()) createProgramMutation.mutate(); }}
              disabled={createProgramMutation.isPending || !newName.trim()}
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            >
              <LinearGradient
                colors={newName.trim() ? [Colors.goldDark, Colors.gold] : [Colors.border, Colors.border]}
                style={styles.modalBtn}
              >
                {createProgramMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.black} />
                ) : (
                  <Text style={[styles.modalBtnText, !newName.trim() && { color: Colors.muted }]}>Criar Programa</Text>
                )}
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
  metricValue: { fontFamily: "Outfit_800ExtraBold", fontSize: 20, letterSpacing: -0.5 },
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
  sessaoCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.card, borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  sessaoIconBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: "rgba(212,175,55,0.1)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(212,175,55,0.2)" },
  sessaoInfo: { flex: 1 },
  sessaoData: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.text, marginBottom: 3 },
  sessaoMeta: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.muted },
  sessaoNotes: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  sessBadge: { backgroundColor: "rgba(74,222,128,0.15)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  sessBadgeText: { fontFamily: "Outfit_600SemiBold", fontSize: 11, color: "#4ADE80" },
  exercicioCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.card, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  exercicioIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(212,175,55,0.1)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(212,175,55,0.2)" },
  exercicioInfo: { flex: 1 },
  exercicioNome: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.text, marginBottom: 2 },
  exercicioGrupo: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.muted },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: Colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, borderTopWidth: 1, borderColor: Colors.border, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  modalTitle: { fontFamily: "Outfit_700Bold", fontSize: 20, color: Colors.text },
  fieldLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.textSecondary, marginBottom: 8 },
  modalInput: { backgroundColor: Colors.black, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: Colors.border, fontFamily: "Outfit_400Regular", fontSize: 14, color: Colors.text, marginBottom: 16 },
  modalRow: { flexDirection: "row", gap: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.black, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: "rgba(212,175,55,0.15)", borderColor: "rgba(212,175,55,0.4)" },
  chipText: { fontFamily: "Outfit_500Medium", fontSize: 13, color: Colors.muted },
  chipTextActive: { color: Colors.gold, fontFamily: "Outfit_600SemiBold" },
  modalBtn: { paddingVertical: 15, borderRadius: 14, alignItems: "center" },
  modalBtnText: { fontFamily: "Outfit_700Bold", fontSize: 15, color: Colors.black },
});
