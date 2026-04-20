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

type Aba = "Nova" | "Clientes" | "Historico" | "Premium";
const ABAS: { key: Aba; label: string }[] = [
  { key: "Nova", label: "Nova" },
  { key: "Clientes", label: "Clientes" },
  { key: "Historico", label: "Histórico" },
  { key: "Premium", label: "Premium" },
];
const OBJETIVOS = ["Hipertrofia", "Força", "Resistência", "Perda de Peso", "Performance", "Reabilitação"];
const FREQS = [2, 3, 4, 5, 6];
const DURACOES = ["4 sem", "8 sem", "12 sem", "16 sem", "20 sem"];
const ESPECIALIDADES = ["Musculação", "Crossfit", "Powerlifting", "Emagrecimento", "Reabilitação", "Esportes", "Nutrição Esportiva", "Fisioterapia"];

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

interface TrainerProfile {
  id: string;
  name: string;
  bio: string;
  specialties?: string;
  experience_years?: number;
  price_per_month?: string;
  contact?: string;
}

export default function PrescreverScreen() {
  const insets = useSafeAreaInsets();
  const { token, isPro, isStarter } = useAuth();
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
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [profNome, setProfNome] = useState("");
  const [profBio, setProfBio] = useState("");
  const [profEsp, setProfEsp] = useState<string[]>([]);
  const [profAnos, setProfAnos] = useState("");
  const [profPreco, setProfPreco] = useState("");
  const [profContato, setProfContato] = useState("");
  const [salvandoPerf, setSalvandoPerf] = useState(false);
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

  const { data: trainerProfiles = [], isLoading: loadingProfiles } = useQuery<TrainerProfile[]>({
    queryKey: ["/api/trainer-profiles"],
    queryFn: async () => {
      const res = await fetch(`${baseUrl}api/trainer-profiles`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.profiles || [];
    },
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
        setResultadoIA("Erro ao gerar prescrição. Verifique sua conexão.");
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
      setResultadoIA("Erro de conexão com o servidor.");
    } finally {
      setGerandoIA(false);
    }
  };

  const handleSalvarPerfil = async () => {
    if (!profNome.trim() || !profBio.trim()) return;
    setSalvandoPerf(true);
    try {
      const res = await fetch(`${baseUrl}api/trainer-profiles`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          name: profNome,
          bio: profBio,
          specialties: profEsp.join(", "),
          experience_years: profAnos ? parseInt(profAnos) : null,
          price_per_month: profPreco,
          contact: profContato,
        }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/trainer-profiles"] });
        setShowPremiumModal(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {}
    setSalvandoPerf(false);
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
            {a.key === "Premium" && <Ionicons name="star" size={12} color={abaAtiva === a.key ? Colors.gold : Colors.muted} style={{ marginRight: 4 }} />}
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

            <Text style={styles.fieldLabel}>Frequência Semanal</Text>
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

            <Text style={styles.fieldLabel}>Duração do Programa</Text>
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
                <Text style={styles.proAlertText}>Geração com IA requer plano Pro Nexus ou superior.</Text>
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
                  {gerandoIA ? "Gerando..." : "Gerar Prescrição com IA"}
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
                <Text style={styles.emptySub}>Toque no ícone + para adicionar seu primeiro cliente.</Text>
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
                <Text style={styles.emptyTitle}>Nenhuma prescrição criada</Text>
                <Text style={styles.emptySub}>Gere sua primeira prescrição com IA na aba Nova.</Text>
              </View>
            ) : (
              prescriptions.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                  style={({ pressed }) => [styles.histCard, { opacity: pressed ? 0.85 : 1 }]}
                >
                  <View style={styles.histLeft}>
                    <Text style={styles.histCliente}>{p.client_name || p.program_name || "Prescrição"}</Text>
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

        {abaAtiva === "Premium" && (
          <Animated.View entering={FadeInDown.delay(60).springify()}>
            <LinearGradient colors={["rgba(212,175,55,0.12)", "rgba(212,175,55,0.04)"]} style={styles.premiumBanner}>
              <Ionicons name="star" size={32} color={Colors.gold} style={{ marginBottom: 10 }} />
              <Text style={styles.premiumTitle}>Prescrição Premium</Text>
              <Text style={styles.premiumDesc}>
                Personal trainers certificados divulgam seu perfil profissional para oferecer consultoria online personalizada. Se você tem um plano ativo, pode se cadastrar como profissional.
              </Text>
              {isStarter ? (
                <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowPremiumModal(true); }} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }, { width: "100%" }]}>
                  <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={styles.premiumBtn}>
                    <Ionicons name="add-circle-outline" size={18} color={Colors.black} />
                    <Text style={styles.premiumBtnText}>Criar Meu Perfil Profissional</Text>
                  </LinearGradient>
                </Pressable>
              ) : (
                <View style={styles.lockPremium}>
                  <Ionicons name="lock-closed-outline" size={16} color={Colors.gold} />
                  <Text style={styles.lockPremiumText}>Disponível para assinantes (Starter ou superior)</Text>
                </View>
              )}
            </LinearGradient>

            <Text style={styles.sectionTitle}>Profissionais Disponíveis</Text>
            {loadingProfiles ? (
              <ActivityIndicator color={Colors.gold} style={{ marginTop: 20 }} />
            ) : trainerProfiles.length === 0 ? (
              <View style={styles.emptySection}>
                <Ionicons name="people-circle-outline" size={40} color={Colors.muted} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>Nenhum profissional cadastrado</Text>
                <Text style={styles.emptySub}>Seja o primeiro a criar seu perfil profissional na plataforma!</Text>
              </View>
            ) : (
              trainerProfiles.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                  style={({ pressed }) => [styles.trainerCard, { opacity: pressed ? 0.85 : 1 }]}
                >
                  <View style={styles.trainerAvatar}>
                    <Ionicons name="person" size={22} color={Colors.gold} />
                  </View>
                  <View style={styles.trainerInfo}>
                    <Text style={styles.trainerNome}>{p.name}</Text>
                    {p.specialties && <Text style={styles.trainerEsp} numberOfLines={1}>{p.specialties}</Text>}
                    <View style={styles.trainerMeta}>
                      {p.experience_years && (
                        <View style={styles.trainerBadge}>
                          <Text style={styles.trainerBadgeText}>{p.experience_years} anos</Text>
                        </View>
                      )}
                      {p.price_per_month && (
                        <View style={[styles.trainerBadge, { backgroundColor: "rgba(74,222,128,0.12)" }]}>
                          <Text style={[styles.trainerBadgeText, { color: "#4ADE80" }]}>{p.price_per_month}/mês</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={Colors.muted} />
                </Pressable>
              ))
            )}
          </Animated.View>
        )}
      </ScrollView>

      {/* Modal Gerar IA */}
      <Modal visible={showResult} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: "85%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Prescrição Gerada</Text>
              <Pressable onPress={() => setShowResult(false)}>
                <Ionicons name="close" size={22} color={Colors.muted} />
              </Pressable>
            </View>
            {gerandoIA && !resultadoIA ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={Colors.gold} />
                <Text style={styles.loadingText}>Atlas IA está gerando sua prescrição...</Text>
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

      {/* Modal Adicionar Cliente */}
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
            <TextInput style={styles.modalInput} placeholder="Nome do cliente" placeholderTextColor={Colors.muted} value={novoClienteNome} onChangeText={setNovoClienteNome} autoFocus />
            <Text style={styles.fieldLabel}>E-mail (opcional)</Text>
            <TextInput style={styles.modalInput} placeholder="email@exemplo.com" placeholderTextColor={Colors.muted} value={novoClienteEmail} onChangeText={setNovoClienteEmail} keyboardType="email-address" autoCapitalize="none" />
            <Pressable
              onPress={() => { if (novoClienteNome.trim()) addClienteMutation.mutate(); }}
              disabled={addClienteMutation.isPending || !novoClienteNome.trim()}
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            >
              <LinearGradient colors={novoClienteNome.trim() ? [Colors.goldDark, Colors.gold] : [Colors.border, Colors.border]} style={styles.modalBtn}>
                {addClienteMutation.isPending ? <ActivityIndicator size="small" color={Colors.black} /> : <Text style={[styles.modalBtnText, !novoClienteNome.trim() && { color: Colors.muted }]}>Salvar Cliente</Text>}
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal Perfil Premium */}
      <Modal visible={showPremiumModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: "90%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Meu Perfil Profissional</Text>
              <Pressable onPress={() => setShowPremiumModal(false)}>
                <Ionicons name="close" size={22} color={Colors.muted} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Nome completo *</Text>
              <TextInput style={styles.modalInput} placeholder="Seu nome profissional" placeholderTextColor={Colors.muted} value={profNome} onChangeText={setProfNome} />
              <Text style={styles.fieldLabel}>Bio *</Text>
              <TextInput style={[styles.modalInput, { height: 90, textAlignVertical: "top" }]} placeholder="Descreva sua experiência e metodologia..." placeholderTextColor={Colors.muted} value={profBio} onChangeText={setProfBio} multiline />
              <Text style={styles.fieldLabel}>Especialidades</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
                {ESPECIALIDADES.map((e) => (
                  <Pressable
                    key={e}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setProfEsp(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);
                    }}
                    style={[styles.espChip, profEsp.includes(e) && styles.espChipAtivo]}
                  >
                    <Text style={[styles.espChipText, profEsp.includes(e) && styles.espChipTextAtivo]}>{e}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Text style={styles.fieldLabel}>Anos de experiência</Text>
              <TextInput style={styles.modalInput} placeholder="Ex: 5" placeholderTextColor={Colors.muted} value={profAnos} onChangeText={setProfAnos} keyboardType="number-pad" />
              <Text style={styles.fieldLabel}>Preço por mês</Text>
              <TextInput style={styles.modalInput} placeholder="Ex: R$ 200" placeholderTextColor={Colors.muted} value={profPreco} onChangeText={setProfPreco} />
              <Text style={styles.fieldLabel}>Contato (WhatsApp, Instagram, etc.)</Text>
              <TextInput style={styles.modalInput} placeholder="@seuinstagram ou (11) 99999-9999" placeholderTextColor={Colors.muted} value={profContato} onChangeText={setProfContato} />
              <Pressable
                onPress={handleSalvarPerfil}
                disabled={salvandoPerf || !profNome.trim() || !profBio.trim()}
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
              >
                <LinearGradient colors={profNome.trim() && profBio.trim() ? [Colors.goldDark, Colors.gold] : [Colors.border, Colors.border]} style={styles.modalBtn}>
                  {salvandoPerf ? <ActivityIndicator size="small" color={Colors.black} /> : <Text style={[styles.modalBtnText, (!profNome.trim() || !profBio.trim()) && { color: Colors.muted }]}>Publicar Perfil</Text>}
                </LinearGradient>
              </Pressable>
            </ScrollView>
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
  abaTab: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
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
  premiumBanner: { borderRadius: 22, padding: 20, borderWidth: 1, borderColor: "rgba(212,175,55,0.25)", alignItems: "center", marginBottom: 24 },
  premiumTitle: { fontFamily: "Outfit_800ExtraBold", fontSize: 22, color: Colors.gold, marginBottom: 8 },
  premiumDesc: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.textSecondary, textAlign: "center", lineHeight: 20, marginBottom: 16 },
  premiumBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 16, width: "100%" },
  premiumBtnText: { fontFamily: "Outfit_700Bold", fontSize: 15, color: Colors.black },
  lockPremium: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(212,175,55,0.08)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(212,175,55,0.15)" },
  lockPremiumText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: Colors.gold },
  sectionTitle: { fontFamily: "Outfit_700Bold", fontSize: 18, color: Colors.text, marginBottom: 14, letterSpacing: -0.3 },
  trainerCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.card, borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  trainerAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: "rgba(212,175,55,0.15)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(212,175,55,0.25)" },
  trainerInfo: { flex: 1 },
  trainerNome: { fontFamily: "Outfit_600SemiBold", fontSize: 15, color: Colors.text, marginBottom: 2 },
  trainerEsp: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.textSecondary, marginBottom: 6 },
  trainerMeta: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  trainerBadge: { backgroundColor: "rgba(212,175,55,0.12)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  trainerBadgeText: { fontFamily: "Outfit_500Medium", fontSize: 11, color: Colors.gold },
  espChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  espChipAtivo: { backgroundColor: "rgba(212,175,55,0.15)", borderColor: "rgba(212,175,55,0.4)" },
  espChipText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: Colors.muted },
  espChipTextAtivo: { color: Colors.gold, fontFamily: "Outfit_600SemiBold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: Colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, borderTopWidth: 1, borderColor: Colors.border, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  modalTitle: { fontFamily: "Outfit_700Bold", fontSize: 20, color: Colors.text },
  modalInput: { backgroundColor: Colors.black, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: Colors.border, fontFamily: "Outfit_400Regular", fontSize: 14, color: Colors.text, marginBottom: 16 },
  modalBtn: { paddingVertical: 15, borderRadius: 14, alignItems: "center" },
  modalBtnText: { fontFamily: "Outfit_700Bold", fontSize: 15, color: Colors.black },
  loadingBox: { alignItems: "center", paddingVertical: 40, gap: 16 },
  loadingText: { fontFamily: "Outfit_500Medium", fontSize: 14, color: Colors.textSecondary },
  iaResult: { fontFamily: "Outfit_400Regular", fontSize: 14, color: Colors.text, lineHeight: 22, paddingBottom: 20 },
});
