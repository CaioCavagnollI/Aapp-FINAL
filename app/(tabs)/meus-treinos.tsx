import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
  TextInput, ActivityIndicator, Modal, FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetch } from "expo/fetch";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { getApiUrl } from "@/lib/query-client";

type Tab = "programas" | "sessoes" | "exercicios" | "prescricoes";

interface Program {
  id: string; name: string; description: string | null; weeks: number;
  days_per_week: number; level: string; goal: string | null; is_active: boolean;
}
interface Session {
  id: string; program_id: string | null; name: string; duration_minutes: number | null;
  notes: string | null; created_at: string;
}
interface Exercise {
  id: string; name: string; muscle_group: string; secondary_muscles?: string;
  equipment?: string; difficulty: string; instructions?: string; tips?: string;
}
interface Prescription {
  id: string; client_id: string | null; client_name: string | null;
  program_name: string | null; goal: string | null; status: string;
  content: string | null; created_at: string;
}

const MUSCLE_GROUPS = ["Todos", "Quadríceps", "Peitoral", "Lombar", "Dorsal", "Deltóide", "Bíceps", "Tríceps", "Isquiotibiais", "Glúteos", "Core", "Gastrocnêmio"];
const LEVELS = ["Iniciante", "Intermediário", "Avançado"];
const GOALS = ["Hipertrofia", "Força", "Resistência", "Perda de Peso", "Performance", "Reabilitação"];

const GOAL_COLORS: Record<string, string> = {
  Hipertrofia: "#D4AF37", Força: "#60A5FA", Resistência: "#4ADE80",
  "Perda de Peso": "#F472B6", Performance: "#A78BFA", Reabilitação: "#FB923C",
};

function formatDuration(min: number | null) {
  if (!min) return "--";
  if (min >= 60) return `${Math.floor(min / 60)}h${min % 60 ? (min % 60) + "min" : ""}`;
  return `${min}min`;
}

export default function MeusTreinosScreen() {
  const insets = useSafeAreaInsets();
  const { token, isPro } = useAuth();
  const { colors, isDark } = useTheme();
  const qc = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const [tab, setTab] = useState<Tab>("programas");
  const [muscleFilter, setMuscleFilter] = useState("Todos");
  const [exSearch, setExSearch] = useState("");
  const [showAddProgram, setShowAddProgram] = useState(false);
  const [showAddSession, setShowAddSession] = useState(false);
  const [showExDetails, setShowExDetails] = useState<Exercise | null>(null);
  const [progName, setProgName] = useState("");
  const [progLevel, setProgLevel] = useState("Intermediário");
  const [progGoal, setProgGoal] = useState("Hipertrofia");
  const [progWeeks, setProgWeeks] = useState("8");
  const [progDays, setProgDays] = useState("4");
  const [sessName, setSessName] = useState("");
  const [sessDuration, setSessDuration] = useState("");

  const bg = isDark ? Colors.black : Colors.lightBg;
  const cardBg = isDark ? Colors.card : Colors.lightCard;
  const textColor = isDark ? Colors.text : Colors.lightText;
  const textSec = isDark ? Colors.textSecondary : Colors.lightTextSecondary;
  const borderColor = isDark ? Colors.border : Colors.lightBorder;
  const inputBg = isDark ? Colors.cardElevated : "#F0F0F5";

  const { data: programsData, isLoading: progLoading } = useQuery<{ programs: Program[] }>({
    queryKey: ["/api/programs"],
    queryFn: async () => {
      const res = await fetch(`${getApiUrl()}api/programs`, { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    enabled: !!token && tab === "programas",
  });

  const { data: sessionsData, isLoading: sessLoading } = useQuery<{ sessions: Session[] }>({
    queryKey: ["/api/sessions"],
    queryFn: async () => {
      const res = await fetch(`${getApiUrl()}api/sessions`, { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    enabled: !!token && tab === "sessoes",
  });

  const { data: exercisesData, isLoading: exLoading } = useQuery<{ exercises: Exercise[] }>({
    queryKey: ["/api/exercises"],
    queryFn: async () => {
      const res = await fetch(`${getApiUrl()}api/exercises`);
      return res.json();
    },
    enabled: tab === "exercicios",
  });

  const { data: prescData, isLoading: prescLoading } = useQuery<{ prescriptions: Prescription[] }>({
    queryKey: ["/api/prescriptions"],
    queryFn: async () => {
      const res = await fetch(`${getApiUrl()}api/prescriptions`, { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    enabled: !!token && tab === "prescricoes",
  });

  const addProgramMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`${getApiUrl()}api/programs`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(data) });
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/programs"] }); setShowAddProgram(false); setProgName(""); },
  });

  const addSessionMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`${getApiUrl()}api/sessions`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(data) });
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/sessions"] }); setShowAddSession(false); setSessName(""); setSessDuration(""); },
  });

  const activateProgramMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${getApiUrl()}api/programs/${id}/activate`, { method: "PUT", headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/programs"] }),
  });

  const deleteProgramMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${getApiUrl()}api/programs/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/programs"] }),
  });

  const filteredExercises = (exercisesData?.exercises || []).filter(ex => {
    const matchMuscle = muscleFilter === "Todos" || ex.muscle_group === muscleFilter;
    const matchSearch = !exSearch || ex.name.toLowerCase().includes(exSearch.toLowerCase()) || ex.muscle_group.toLowerCase().includes(exSearch.toLowerCase());
    return matchMuscle && matchSearch;
  });

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "programas", label: "Programas", icon: "list-outline" },
    { key: "sessoes", label: "Sessões", icon: "time-outline" },
    { key: "exercicios", label: "Exercícios", icon: "barbell-outline" },
    { key: "prescricoes", label: "Prescrições", icon: "document-text-outline" },
  ];

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: bg, borderBottomColor: borderColor }]}>
        <View style={styles.headerTitle}>
          <Text style={[styles.title, { color: textColor }]}>Meus Treinos</Text>
          <Text style={[styles.subtitle, { color: textSec }]}>Programas · Sessões · Biblioteca · Prescrições</Text>
        </View>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); if (tab === "programas") setShowAddProgram(true); else if (tab === "sessoes") setShowAddSession(true); }}
          style={[styles.addBtn, { backgroundColor: Colors.gold }]}
        >
          <Ionicons name="add" size={20} color="#000" />
        </Pressable>
      </View>

      {/* Tab Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabBarScroll, { backgroundColor: bg, borderBottomColor: borderColor }]}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {TABS.map(t => (
          <Pressable key={t.key} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTab(t.key); }}
            style={[styles.tabBtn, { borderColor: tab === t.key ? Colors.gold : borderColor, backgroundColor: tab === t.key ? Colors.gold + "22" : "transparent" }]}>
            <Ionicons name={t.icon as any} size={14} color={tab === t.key ? Colors.gold : textSec} />
            <Text style={[styles.tabText, { color: tab === t.key ? Colors.gold : textSec }]}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Content */}
      {tab === "programas" && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: botPad + 80 }}>
          {progLoading ? (
            <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />
          ) : (programsData?.programs || []).length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="list-outline" size={48} color={textSec} />
              <Text style={[styles.emptyText, { color: textSec }]}>Nenhum programa ainda</Text>
              <Pressable onPress={() => setShowAddProgram(true)} style={[styles.emptyBtn, { backgroundColor: Colors.gold }]}>
                <Text style={styles.emptyBtnText}>Criar Programa</Text>
              </Pressable>
            </View>
          ) : (
            (programsData?.programs || []).map((p, i) => (
              <Animated.View key={p.id} entering={FadeInDown.delay(i * 60)} style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                {p.is_active && (
                  <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>ATIVO</Text></View>
                )}
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: textColor }]}>{p.name}</Text>
                    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                      {p.goal && <View style={[styles.tag, { backgroundColor: (GOAL_COLORS[p.goal] || Colors.gold) + "22" }]}>
                        <Text style={[styles.tagText, { color: GOAL_COLORS[p.goal] || Colors.gold }]}>{p.goal}</Text>
                      </View>}
                      <View style={[styles.tag, { backgroundColor: Colors.gold + "11" }]}>
                        <Text style={[styles.tagText, { color: textSec }]}>{p.level}</Text>
                      </View>
                      <View style={[styles.tag, { backgroundColor: Colors.gold + "11" }]}>
                        <Text style={[styles.tagText, { color: textSec }]}>{p.weeks} sem · {p.days_per_week}x/sem</Text>
                      </View>
                    </View>
                    {p.description && <Text style={[styles.cardDesc, { color: textSec }]}>{p.description}</Text>}
                  </View>
                </View>
                <View style={[styles.cardActions, { borderTopColor: borderColor }]}>
                  {!p.is_active && (
                    <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); activateProgramMutation.mutate(p.id); }} style={styles.cardAction}>
                      <Ionicons name="checkmark-circle-outline" size={16} color={Colors.gold} />
                      <Text style={[styles.cardActionText, { color: Colors.gold }]}>Ativar</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); deleteProgramMutation.mutate(p.id); }} style={styles.cardAction}>
                    <Ionicons name="trash-outline" size={16} color="#F87171" />
                    <Text style={[styles.cardActionText, { color: "#F87171" }]}>Excluir</Text>
                  </Pressable>
                </View>
              </Animated.View>
            ))
          )}
        </ScrollView>
      )}

      {tab === "sessoes" && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: botPad + 80 }}>
          {sessLoading ? (
            <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />
          ) : (sessionsData?.sessions || []).length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="time-outline" size={48} color={textSec} />
              <Text style={[styles.emptyText, { color: textSec }]}>Nenhuma sessão registrada</Text>
              <Pressable onPress={() => setShowAddSession(true)} style={[styles.emptyBtn, { backgroundColor: Colors.gold }]}>
                <Text style={styles.emptyBtnText}>Registrar Sessão</Text>
              </Pressable>
            </View>
          ) : (
            (sessionsData?.sessions || []).map((s, i) => (
              <Animated.View key={s.id} entering={FadeInDown.delay(i * 50)} style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={[styles.sessIcon, { backgroundColor: Colors.gold + "22" }]}>
                    <Ionicons name="barbell-outline" size={20} color={Colors.gold} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: textColor }]}>{s.name}</Text>
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                      <Text style={[styles.sessMeta, { color: textSec }]}>{new Date(s.created_at).toLocaleDateString("pt-BR")}</Text>
                      {s.duration_minutes && <Text style={[styles.sessMeta, { color: textSec }]}>⏱ {formatDuration(s.duration_minutes)}</Text>}
                    </View>
                  </View>
                </View>
              </Animated.View>
            ))
          )}
        </ScrollView>
      )}

      {tab === "exercicios" && (
        <View style={{ flex: 1 }}>
          <View style={{ padding: 16, paddingBottom: 8 }}>
            <TextInput
              style={[styles.searchInput, { backgroundColor: inputBg, color: textColor, borderColor }]}
              placeholder="Buscar exercício..."
              placeholderTextColor={textSec}
              value={exSearch}
              onChangeText={setExSearch}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              {MUSCLE_GROUPS.map(mg => (
                <Pressable key={mg} onPress={() => setMuscleFilter(mg)}
                  style={[styles.muscleChip, { borderColor: muscleFilter === mg ? Colors.gold : borderColor, backgroundColor: muscleFilter === mg ? Colors.gold + "22" : "transparent" }]}>
                  <Text style={[styles.muscleChipText, { color: muscleFilter === mg ? Colors.gold : textSec }]}>{mg}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          {exLoading ? <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} /> : (
            <FlatList
              data={filteredExercises}
              keyExtractor={ex => ex.id}
              contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: botPad + 80 }}
              renderItem={({ item: ex, index }) => (
                <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 40)}>
                  <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowExDetails(ex); }}
                    style={[styles.exCard, { backgroundColor: cardBg, borderColor }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.exName, { color: textColor }]}>{ex.name}</Text>
                      <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                        <View style={[styles.exTag, { backgroundColor: Colors.gold + "22" }]}>
                          <Text style={[styles.exTagText, { color: Colors.gold }]}>{ex.muscle_group}</Text>
                        </View>
                        {ex.equipment && <View style={[styles.exTag, { backgroundColor: isDark ? Colors.border : "#E5E5EA" }]}>
                          <Text style={[styles.exTagText, { color: textSec }]}>{ex.equipment}</Text>
                        </View>}
                        <View style={[styles.exTag, { backgroundColor: isDark ? Colors.border : "#E5E5EA" }]}>
                          <Text style={[styles.exTagText, { color: textSec }]}>{ex.difficulty}</Text>
                        </View>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward-outline" size={16} color={textSec} />
                  </Pressable>
                </Animated.View>
              )}
            />
          )}
        </View>
      )}

      {tab === "prescricoes" && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: botPad + 80 }}>
          {prescLoading ? (
            <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />
          ) : (prescData?.prescriptions || []).length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={48} color={textSec} />
              <Text style={[styles.emptyText, { color: textSec }]}>Nenhuma prescrição ainda</Text>
              <Text style={[styles.emptySubText, { color: textSec }]}>Gere prescrições em Atlas Brain → Prescrição Atlas</Text>
            </View>
          ) : (
            (prescData?.prescriptions || []).map((p, i) => (
              <Animated.View key={p.id} entering={FadeInDown.delay(i * 60)} style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text style={[styles.cardTitle, { color: textColor }]}>{p.program_name || p.client_name || "Prescrição"}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: p.status === "Ativo" ? "#4ADE80" + "22" : Colors.gold + "22" }]}>
                    <Text style={[styles.statusText, { color: p.status === "Ativo" ? "#4ADE80" : Colors.gold }]}>{p.status}</Text>
                  </View>
                </View>
                {p.goal && <Text style={[styles.cardDesc, { color: textSec }]}>🎯 {p.goal}</Text>}
                {p.client_name && <Text style={[styles.cardDesc, { color: textSec }]}>👤 {p.client_name}</Text>}
                <Text style={[styles.cardDesc, { color: textSec }]}>{new Date(p.created_at).toLocaleDateString("pt-BR")}</Text>
                {p.content && (
                  <View style={[styles.prescContent, { backgroundColor: isDark ? Colors.cardElevated : "#F5F5F7", borderColor }]}>
                    <Text style={[styles.prescContentText, { color: textSec }]} numberOfLines={4}>{p.content}</Text>
                    <Text style={[styles.prescShowMore, { color: Colors.gold }]}>Ver prescrição completa</Text>
                  </View>
                )}
              </Animated.View>
            ))
          )}
        </ScrollView>
      )}

      {/* Add Program Modal */}
      <Modal visible={showAddProgram} transparent animationType="slide" onRequestClose={() => setShowAddProgram(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: isDark ? Colors.card : "#fff" }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>Novo Programa</Text>
            <TextInput style={[styles.modalInput, { backgroundColor: inputBg, color: textColor, borderColor }]} placeholder="Nome do programa" placeholderTextColor={textSec} value={progName} onChangeText={setProgName} />
            <Text style={[styles.modalLabel, { color: textSec }]}>Objetivo</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {GOALS.map(g => (
                <Pressable key={g} onPress={() => setProgGoal(g)} style={[styles.modalChip, { borderColor: progGoal === g ? Colors.gold : borderColor, backgroundColor: progGoal === g ? Colors.gold + "22" : "transparent" }]}>
                  <Text style={[styles.modalChipText, { color: progGoal === g ? Colors.gold : textSec }]}>{g}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={[styles.modalLabel, { color: textSec }]}>Nível</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              {LEVELS.map(l => (
                <Pressable key={l} onPress={() => setProgLevel(l)} style={[styles.modalChip, { flex: 1, alignItems: "center", borderColor: progLevel === l ? Colors.gold : borderColor, backgroundColor: progLevel === l ? Colors.gold + "22" : "transparent" }]}>
                  <Text style={[styles.modalChipText, { color: progLevel === l ? Colors.gold : textSec }]}>{l}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalLabel, { color: textSec }]}>Semanas</Text>
                <TextInput style={[styles.modalInput, { backgroundColor: inputBg, color: textColor, borderColor }]} keyboardType="numeric" value={progWeeks} onChangeText={setProgWeeks} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalLabel, { color: textSec }]}>Dias/semana</Text>
                <TextInput style={[styles.modalInput, { backgroundColor: inputBg, color: textColor, borderColor }]} keyboardType="numeric" value={progDays} onChangeText={setProgDays} />
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable onPress={() => setShowAddProgram(false)} style={[styles.modalCancelBtn, { borderColor }]}>
                <Text style={[styles.modalCancelText, { color: textSec }]}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={() => { if (!progName.trim()) return; addProgramMutation.mutate({ name: progName.trim(), goal: progGoal, level: progLevel, weeks: parseInt(progWeeks) || 8, days_per_week: parseInt(progDays) || 4 }); }}
                style={[styles.modalConfirmBtn, { backgroundColor: Colors.gold }]}
                disabled={addProgramMutation.isPending}
              >
                {addProgramMutation.isPending ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.modalConfirmText}>Criar</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Session Modal */}
      <Modal visible={showAddSession} transparent animationType="slide" onRequestClose={() => setShowAddSession(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: isDark ? Colors.card : "#fff" }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>Registrar Sessão</Text>
            <TextInput style={[styles.modalInput, { backgroundColor: inputBg, color: textColor, borderColor }]} placeholder="Nome da sessão" placeholderTextColor={textSec} value={sessName} onChangeText={setSessName} />
            <TextInput style={[styles.modalInput, { backgroundColor: inputBg, color: textColor, borderColor }]} placeholder="Duração (minutos)" placeholderTextColor={textSec} keyboardType="numeric" value={sessDuration} onChangeText={setSessDuration} />
            <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
              <Pressable onPress={() => setShowAddSession(false)} style={[styles.modalCancelBtn, { borderColor }]}>
                <Text style={[styles.modalCancelText, { color: textSec }]}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={() => { if (!sessName.trim()) return; addSessionMutation.mutate({ name: sessName.trim(), duration_minutes: parseInt(sessDuration) || null }); }}
                style={[styles.modalConfirmBtn, { backgroundColor: Colors.gold }]}
                disabled={addSessionMutation.isPending}
              >
                {addSessionMutation.isPending ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.modalConfirmText}>Registrar</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Exercise Details Modal */}
      <Modal visible={!!showExDetails} transparent animationType="slide" onRequestClose={() => setShowExDetails(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: isDark ? Colors.card : "#fff", maxHeight: "80%" }]}>
            <ScrollView>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
                <Text style={[styles.modalTitle, { color: textColor, flex: 1 }]}>{showExDetails?.name}</Text>
                <Pressable onPress={() => setShowExDetails(null)} hitSlop={8}>
                  <Ionicons name="close-outline" size={24} color={textSec} />
                </Pressable>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                <View style={[styles.exTag, { backgroundColor: Colors.gold + "22" }]}>
                  <Text style={[styles.exTagText, { color: Colors.gold }]}>{showExDetails?.muscle_group}</Text>
                </View>
                {showExDetails?.secondary_muscles && (
                  <View style={[styles.exTag, { backgroundColor: borderColor }]}>
                    <Text style={[styles.exTagText, { color: textSec }]}>{showExDetails.secondary_muscles}</Text>
                  </View>
                )}
                {showExDetails?.equipment && (
                  <View style={[styles.exTag, { backgroundColor: borderColor }]}>
                    <Text style={[styles.exTagText, { color: textSec }]}>{showExDetails.equipment}</Text>
                  </View>
                )}
              </View>
              {showExDetails?.instructions && (
                <>
                  <Text style={[styles.modalLabel, { color: textSec }]}>Execução</Text>
                  <Text style={[styles.exInstructions, { color: textColor }]}>{showExDetails.instructions}</Text>
                </>
              )}
              {showExDetails?.tips && (
                <>
                  <Text style={[styles.modalLabel, { color: textSec, marginTop: 12 }]}>Dicas</Text>
                  <Text style={[styles.exInstructions, { color: textSec }]}>{showExDetails.tips}</Text>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { flex: 1 },
  title: { fontFamily: "Outfit_800ExtraBold", fontSize: 26 },
  subtitle: { fontFamily: "Outfit_400Regular", fontSize: 13, marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  tabBarScroll: { borderBottomWidth: 1, paddingVertical: 10, maxHeight: 54 },
  tabBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  tabText: { fontFamily: "Outfit_600SemiBold", fontSize: 12 },
  card: { borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 10 },
  activeBadge: { position: "absolute", top: 10, right: 10, backgroundColor: "#4ADE80" + "22", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  activeBadgeText: { color: "#4ADE80", fontFamily: "Outfit_700Bold", fontSize: 10 },
  cardTitle: { fontFamily: "Outfit_700Bold", fontSize: 15 },
  cardDesc: { fontFamily: "Outfit_400Regular", fontSize: 12, marginTop: 4 },
  tag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontFamily: "Outfit_600SemiBold", fontSize: 11 },
  cardActions: { flexDirection: "row", gap: 16, marginTop: 12, paddingTop: 10, borderTopWidth: 1 },
  cardAction: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardActionText: { fontFamily: "Outfit_600SemiBold", fontSize: 13 },
  sessIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  sessMeta: { fontFamily: "Outfit_400Regular", fontSize: 12 },
  searchInput: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontFamily: "Outfit_400Regular", fontSize: 14, borderWidth: 1 },
  muscleChip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5, marginRight: 6 },
  muscleChipText: { fontFamily: "Outfit_500Medium", fontSize: 12 },
  exCard: { flexDirection: "row", alignItems: "center", borderRadius: 12, padding: 12, borderWidth: 1, marginBottom: 8 },
  exName: { fontFamily: "Outfit_600SemiBold", fontSize: 14 },
  exTag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  exTagText: { fontFamily: "Outfit_500Medium", fontSize: 11 },
  exInstructions: { fontFamily: "Outfit_400Regular", fontSize: 14, lineHeight: 21 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontFamily: "Outfit_600SemiBold", fontSize: 16 },
  emptySubText: { fontFamily: "Outfit_400Regular", fontSize: 13, textAlign: "center", paddingHorizontal: 32 },
  emptyBtn: { borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  emptyBtnText: { color: "#000", fontFamily: "Outfit_700Bold", fontSize: 14 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontFamily: "Outfit_600SemiBold", fontSize: 11 },
  prescContent: { marginTop: 10, borderRadius: 10, padding: 10, borderWidth: 1 },
  prescContentText: { fontFamily: "Outfit_400Regular", fontSize: 12, lineHeight: 18 },
  prescShowMore: { fontFamily: "Outfit_600SemiBold", fontSize: 12, marginTop: 6 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalTitle: { fontFamily: "Outfit_700Bold", fontSize: 18, marginBottom: 16 },
  modalInput: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontFamily: "Outfit_400Regular", fontSize: 14, borderWidth: 1, marginBottom: 12 },
  modalLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 13, marginBottom: 8 },
  modalChip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 },
  modalChipText: { fontFamily: "Outfit_500Medium", fontSize: 13 },
  modalCancelBtn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  modalCancelText: { fontFamily: "Outfit_600SemiBold", fontSize: 14 },
  modalConfirmBtn: { flex: 2, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  modalConfirmText: { color: "#000", fontFamily: "Outfit_700Bold", fontSize: 14 },
});
