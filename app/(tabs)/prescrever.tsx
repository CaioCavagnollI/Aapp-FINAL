import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  TextInput,
  ActivityIndicator,
  Modal,
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
import { getApiUrl } from "@/lib/query-client";

type Aba = "Nova" | "Clientes" | "Historico";
const ABAS: { key: Aba; label: string }[] = [
  { key: "Nova", label: "Nova" },
  { key: "Clientes", label: "Clientes" },
  { key: "Historico", label: "Historico" },
];
const OBJETIVOS = ["Hipertrofia", "Forca", "Resistencia", "Perda de Peso", "Performance", "Reabilitacao"];
const FREQS = [2, 3, 4, 5, 6];
const DURACOES = ["4 sem", "8 sem", "12 sem", "16 sem", "20 sem"];

interface Client {
  id: string;
  name: string;
  email: string | null;
  is_active: boolean;
  notes: string | null;
}

interface Prescription {
  id: string;
  client_id: string | null;
  client_name: string | null;
  program_name: string | null;
  goal: string | null;
  status: string;
  created_at: string;
}

export default function PrescreverScreen() {
  const insets = useSafeAreaInsets();
  const { token, isPro } = useAuth();
  const queryClient = useQueryClient();
  const [abaAtiva, setAbaAtiva] = useState<Aba>("Nova");
  const [nomeCliente, setNomeCliente] = useState("");
  const [objetivoSel, setObjetivoSel] = useState<string | null>(null);
  const [freqSel, setFreqSel] = useState<number>(4);
  const [duracaoSel, setDuracaoSel] = useState<string>("12 sem");
  const [gerandoIA, setGerandoIA] = useState(false);
  const [resultadoIA, setResultadoIA] = useState<string>("");
  const [showResult, setShowResult] = useState(false);
  const [showAddCliente, setShowAddCliente] = useState(false);
  const [novoClienteNome, setNovoClienteNome] = useState("");
  const [novoClienteEmail, setNovoClienteEmail] = useState("");
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const baseUrl = getApiUrl();
  const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const { data: clients = [], isLoading: loadingClients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const res = await fetch(`${baseUrl}api/clients`, { headers: authHeaders });
      if (!res.ok) throw new Error("Falha");
      const data = await res.json();
      return data.clients || data || [];
    },
    enabled: !!token,
  });

  const { data: prescriptions = [], isLoading: loadingPrescriptions } = useQuery<Prescription[]>({
    queryKey: ["/api/prescriptions"],
    queryFn: async () => {
      const res = await fetch(`${baseUrl}api/prescriptions`, { headers: authHeaders });
      if (!res.ok) throw new Error("Falha");
      const data = await res.json();
      return data.prescriptions || data || [];
    },
    enabled: !!token,
  });

  const addClienteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${baseUrl}api/clients`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ name: novoClienteNome, email: novoClienteEmail || null }),
      });
      if (!res.ok) throw new Error("Falha");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setShowAddCliente(false);
      setNovoClienteNome("");
      setNovoClienteEmail("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const handleGerarIA = async () => {
    if (!objetivoSel || !isPro) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setGerandoIA(true);
    setResultadoIA("");
    setShowResult(true);

    try {
      const semanas = parseInt(duracaoSel);
      const res = await fetch(`${baseUrl}api/prescriptions/generate`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          client_name: nomeCliente || "Cliente",
          goal: objetivoSel,
          days_per_week: freqSel,
          weeks: isNaN(semanas) ? 12 : semanas,
        }),
      });

      if (!res.ok) {
        setResultadoIA("Erro ao gerar prescricao. Verifique sua conexao.");
        setGerandoIA(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        const text = await res.text();
        setResultadoIA(text);
        setGerandoIA(false);
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            if (dataStr === "[DONE]") break;
            try {
              const parsed = JSON.parse(dataStr);
              const content = parsed.content || parsed.choices?.[0]?.delta?.content || "";
              accumulated += content;
              setResultadoIA(accumulated);
            } catch {}
          }
        }
      }
      queryClient.invalidateQueries({ queryKey: ["/api/prescriptions"] });
    } catch {
      setResultadoIA("Erro de conexao com o servidor.");
    } finally {
      setGerandoIA(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View>
          <Text style={styles.pageTitle}>Prescrever</Text>
          <Text style={styles.pageSubtitle}>Programas para seus clientes</Text>
        </View>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowAddCliente(true); }} style={styles.addBtn}>
          <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={styles.addBtnGrad}>
            <Ionicons name="person-add-outline" size={18} color={Colors.black} />
          </LinearGradient>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.abasScroll} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
        {ABAS.map((a) => (
          <Pressable key={a.key} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAbaAtiva(a.key); }} style={[styles.abaTab, abaAtiva === a.key && styles.abaTabAtiva]}>
            <Text style={[styles.abaText, abaAtiva === a.key && styles.abaTextAtiva]}>{a.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 100 }]}>
        {abaAtiva === "Nova" && (
          <Animated.View entering={FadeInDown.delay(60).springify()}>
            <Text style={styles.fieldLabel}>Nome do Cliente</Text>
            <View style={styles.inputBox}>
              <Ionicons name="person-outline" size={16} color={Colors.muted} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.input}
                placeholder="Nome do cliente (opcional)"
                placeholderTextColor={Colors.muted}
                value={nomeCliente}
                onChangeText={setNomeCliente}
              />
            </View>

            <Text style={styles.fieldLabel}>Objetivo Principal</Text>
            <View style={styles.objetivoGrid}>
              {OBJETIVOS.map((o) => (
                <Pressable
                  key={o}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setObjetivoSel(o); }}
                  style={[styles.objetivoChip, objetivoSel === o && styles.objetivoChipAtivo]}
                >
                  <Text style={[styles.objetivoText, objetivoSel === o && styles.objetivoTextAtivo]}>{o}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Frequencia Semanal</Text>
            <View style={styles.freqRow}>
              {FREQS.map((f) => (
                <Pressable
                  key={f}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFreqSel(f); }}
                  style={[styles.freqBtn, freqSel === f && styles.freqBtnAtivo]}
                >
                  <Text style={[styles.freqText, freqSel === f && styles.freqTextAtivo]}>{f}x</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Duracao do Programa</Text>
            <View style={styles.freqRow}>
              {DURACOES.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setDuracaoSel(d); }}
                  style={[styles.freqBtn, duracaoSel === d && styles.freqBtnAtivo]}
                >
                  <Text style={[styles.freqText, duracaoSel === d && styles.freqTextAtivo]}>{d}</Text>
                </Pressable>
              ))}
            </View>

            {!isPro && (
              <View style={styles.proAlert}>
                <Ionicons name="lock-closed-outline" size={15} color={Colors.gold} />
                <Text style={styles.proAlertText}>Geracao com IA requer plano Pro Nexus ou superior.</Text>
              </View>
            )}

            <Pressable
              onPress={isPro ? handleGerarIA : undefined}
              disabled={!objetivoSel || gerandoIA}
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }, { marginTop: 8 }]}
            >
              <LinearGradient
                colors={objetivoSel && isPro ? [Colors.goldDark, Colors.gold] : [Colors.border, Colors.border]}
                style={styles.gerarBtn}
              >
                {gerandoIA ? (
                  <ActivityIndicator size="small" color={Colors.black} />
                ) : (
                  <Ionicons name="flash-outline" size={20} color={objetivoSel && isPro ? Colors.black : Colors.muted} />
                )}
                <Text style={[styles.gerarBtnText, !(objetivoSel && isPro) && { color: Colors.muted }]}>
                  {gerandoIA ? "Gerando..." : "Gerar Prescricao com IA"}
                </Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}

        {abaAtiva === "Clientes" && (
          <Animated.View entering={FadeInDown.delay(60).springify()}>
            {loadingClients ? (
              <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />
            ) : clients.length === 0 ? (
              <View style={styles.emptySection}>
                <Ionicons name="people-outline" size={40} color={Colors.muted} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>Nenhum cliente cadastrado</Text>
                <Text style={styles.emptySub}>Toque no icone + para adicionar seu primeiro cliente.</Text>
              </View>
            ) : (
              clients.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                  style={({ pressed }) => [styles.clienteCard, { opacity: pressed ? 0.85 : 1 }]}
                >
                  <View style={styles.clienteAvatar}>
                    <Text style={styles.clienteAvatarText}>{c.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.clienteInfo}>
                    <Text style={styles.clienteNome}>{c.name}</Text>
                    <Text style={styles.clienteMeta}>{c.email || "Sem e-mail"}</Text>
                  </View>
                  <View style={[styles.clienteStatus, { backgroundColor: c.is_active ? "rgba(74,222,128,0.15)" : "rgba(107,107,117,0.15)" }]}>
                    <Text style={[styles.clienteStatusText, { color: c.is_active ? "#4ADE80" : Colors.muted }]}>
                      {c.is_active ? "Ativo" : "Inativo"}
                    </Text>
                  </View>
                </Pressable>
              ))
            )}
            <Pressable style={styles.addClienteBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowAddCliente(true); }}>
              <Ionicons name="person-add-outline" size={18} color={Colors.gold} />
              <Text style={styles.addClienteText}>Adicionar Cliente</Text>
            </Pressable>
          </Animated.View>
        )}

        {abaAtiva === "Historico" && (
          <Animated.View entering={FadeInDown.delay(60).springify()}>
            {loadingPrescriptions ? (
              <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />
            ) : prescriptions.length === 0 ? (
              <View style={styles.emptySection}>
                <Ionicons name="document-text-outline" size={40} color={Colors.muted} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>Nenhuma prescricao criada</Text>
                <Text style={styles.emptySub}>Gere sua primeira prescricao com IA na aba Nova.</Text>
              </View>
            ) : (
              prescriptions.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                  style={({ pressed }) => [styles.histCard, { opacity: pressed ? 0.85 : 1 }]}
                >
                  <View style={styles.histLeft}>
                    <Text style={styles.histCliente}>{p.client_name || p.program_name || "Prescricao"}</Text>
                    {p.goal ? <Text style={styles.histPrograma}>{p.goal}</Text> : null}
                    <Text style={styles.histData}>{new Date(p.created_at).toLocaleDateString("pt-BR")}</Text>
                  </View>
                  <View style={[styles.histStatus, { backgroundColor: p.status === "Ativo" ? "rgba(74,222,128,0.15)" : "rgba(212,175,55,0.1)" }]}>
                    <Text style={[styles.histStatusText, { color: p.status === "Ativo" ? "#4ADE80" : Colors.gold }]}>{p.status}</Text>
                  </View>
                </Pressable>
              ))
            )}
          </Animated.View>
        )}
      </ScrollView>

      <Modal visible={showResult} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: "85%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Prescricao Gerada</Text>
              <Pressable onPress={() => setShowResult(false)}>
                <Ionicons name="close" size={22} color={Colors.muted} />
              </Pressable>
            </View>
            {gerandoIA && !resultadoIA ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={Colors.gold} />
                <Text style={styles.loadingText}>Atlas IA esta gerando sua prescricao...</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.iaResult}>{resultadoIA || "Aguardando..."}</Text>
                {gerandoIA && <ActivityIndicator color={Colors.gold} style={{ marginTop: 12 }} />}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showAddCliente} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo Cliente</Text>
              <Pressable onPress={() => setShowAddCliente(false)}>
                <Ionicons name="close" size={22} color={Colors.muted} />
              </Pressable>
            </View>
            <Text style={styles.fieldLabel}>Nome</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nome do cliente"
              placeholderTextColor={Colors.muted}
              value={novoClienteNome}
              onChangeText={setNovoClienteNome}
              autoFocus
            />
            <Text style={styles.fieldLabel}>E-mail (opcional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="email@exemplo.com"
              placeholderTextColor={Colors.muted}
              value={novoClienteEmail}
              onChangeText={setNovoClienteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Pressable
              onPress={() => { if (novoClienteNome.trim()) addClienteMutation.mutate(); }}
              disabled={addClienteMutation.isPending || !novoClienteNome.trim()}
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            >
              <LinearGradient
                colors={novoClienteNome.trim() ? [Colors.goldDark, Colors.gold] : [Colors.border, Colors.border]}
                style={styles.modalBtn}
              >
                {addClienteMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.black} />
                ) : (
                  <Text style={[styles.modalBtnText, !novoClienteNome.trim() && { color: Colors.muted }]}>Salvar Cliente</Text>
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
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pageTitle: { fontFamily: "Outfit_800ExtraBold", fontSize: 26, color: Colors.text, letterSpacing: -0.5, marginBottom: 2 },
  pageSubtitle: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.textSecondary },
  addBtn: { borderRadius: 14, overflow: "hidden" },
  addBtnGrad: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  abasScroll: { paddingVertical: 12 },
  abaTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  abaTabAtiva: { backgroundColor: "rgba(212,175,55,0.15)", borderColor: "rgba(212,175,55,0.35)" },
  abaText: { fontFamily: "Outfit_500Medium", fontSize: 13, color: Colors.muted },
  abaTextAtiva: { fontFamily: "Outfit_700Bold", color: Colors.gold },
  scroll: { paddingHorizontal: 20, paddingTop: 20 },
  fieldLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.textSecondary, marginBottom: 10, marginTop: 4 },
  inputBox: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 20 },
  input: { flex: 1, fontFamily: "Outfit_400Regular", fontSize: 15, color: Colors.text },
  objetivoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  objetivoChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  objetivoChipAtivo: { backgroundColor: "rgba(212,175,55,0.15)", borderColor: "rgba(212,175,55,0.4)" },
  objetivoText: { fontFamily: "Outfit_500Medium", fontSize: 13, color: Colors.muted },
  objetivoTextAtivo: { color: Colors.gold, fontFamily: "Outfit_600SemiBold" },
  freqRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  freqBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, alignItems: "center" },
  freqBtnAtivo: { backgroundColor: "rgba(212,175,55,0.15)", borderColor: "rgba(212,175,55,0.4)" },
  freqText: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.text },
  freqTextAtivo: { color: Colors.gold },
  proAlert: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(212,175,55,0.08)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(212,175,55,0.2)", marginBottom: 12 },
  proAlertText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: Colors.gold, flex: 1 },
  gerarBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 18 },
  gerarBtnText: { fontFamily: "Outfit_700Bold", fontSize: 16, color: Colors.black },
  emptySection: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 16, color: Colors.textSecondary, marginBottom: 8 },
  emptySub: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.muted, textAlign: "center", lineHeight: 20, paddingHorizontal: 20 },
  clienteCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.card, borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  clienteAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(212,175,55,0.15)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(212,175,55,0.25)" },
  clienteAvatarText: { fontFamily: "Outfit_700Bold", fontSize: 18, color: Colors.gold },
  clienteInfo: { flex: 1 },
  clienteNome: { fontFamily: "Outfit_600SemiBold", fontSize: 15, color: Colors.text, marginBottom: 3 },
  clienteMeta: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.muted },
  clienteStatus: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  clienteStatusText: { fontFamily: "Outfit_600SemiBold", fontSize: 11 },
  addClienteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, borderRadius: 16, borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(212,175,55,0.3)", marginTop: 4 },
  addClienteText: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.gold },
  histCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.card, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  histLeft: { flex: 1 },
  histCliente: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.text, marginBottom: 3 },
  histPrograma: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.textSecondary, marginBottom: 3 },
  histData: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.muted },
  histStatus: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  histStatusText: { fontFamily: "Outfit_600SemiBold", fontSize: 11 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: Colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, borderTopWidth: 1, borderColor: Colors.border, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  modalTitle: { fontFamily: "Outfit_700Bold", fontSize: 20, color: Colors.text },
  modalInput: { backgroundColor: Colors.black, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: Colors.border, fontFamily: "Outfit_400Regular", fontSize: 14, color: Colors.text, marginBottom: 16 },
  modalBtn: { paddingVertical: 15, borderRadius: 14, alignItems: "center" },
  modalBtnText: { fontFamily: "Outfit_700Bold", fontSize: 15, color: Colors.black },
  loadingBox: { alignItems: "center", paddingVertical: 40, gap: 16 },
  loadingText: { fontFamily: "Outfit_500Medium", fontSize: 14, color: Colors.textSecondary, textAlign: "center" },
  iaResult: { fontFamily: "Outfit_400Regular", fontSize: 14, color: Colors.text, lineHeight: 22, paddingBottom: 20 },
});
