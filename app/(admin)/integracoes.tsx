import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Switch,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  enabled: boolean;
  status: "connected" | "disconnected" | "error" | "beta";
  apiKey?: string;
  webhookUrl?: string;
  docs?: string;
}

const INITIAL_INTEGRATIONS: Integration[] = [
  {
    id: "openai",
    name: "OpenAI GPT-4.1",
    description: "Motor principal do Atlas IA — prescrições, análise nutricional, chat científico e scan de produtos",
    category: "IA e Machine Learning",
    icon: "flash-outline",
    color: "#10B981",
    enabled: true,
    status: "connected",
    docs: "https://platform.openai.com/docs",
  },
  {
    id: "gemini",
    name: "Google Gemini 2.0",
    description: "IA alternativa do Google para análises multimodais — texto e imagem — via Atlas IA",
    category: "IA e Machine Learning",
    icon: "logo-google",
    color: "#4285F4",
    enabled: false,
    status: "disconnected",
    docs: "https://ai.google.dev/gemini-api",
    webhookUrl: "/api/ai/gemini",
  },
  {
    id: "atlas_scanner",
    name: "Atlas Scanner",
    description: "Reconhecimento visual de alimentos, equipamentos e postura corporal",
    category: "IA e Machine Learning",
    icon: "scan-circle-outline",
    color: "#D4AF37",
    enabled: true,
    status: "connected",
    webhookUrl: "https://atlas-scanner-v-3--caiocavagnollic.replit.app/scanner",
    docs: "https://atlas-scanner-v-3--caiocavagnollic.replit.app",
  },
  {
    id: "stripe",
    name: "Stripe Payments",
    description: "Processamento de pagamentos por cartão de crédito e débito",
    category: "Pagamentos",
    icon: "card-outline",
    color: "#6366F1",
    enabled: false,
    status: "disconnected",
    docs: "https://stripe.com/docs",
  },
  {
    id: "mercadopago",
    name: "Mercado Pago",
    description: "Pagamentos via PIX, cartão, boleto — integração brasileira nativa",
    category: "Pagamentos",
    icon: "cash-outline",
    color: "#00B1EA",
    enabled: false,
    status: "beta",
    docs: "https://www.mercadopago.com.br/developers",
  },
  {
    id: "paypal",
    name: "PayPal",
    description: "Pagamentos internacionais e contas PayPal Business",
    category: "Pagamentos",
    icon: "logo-paypal",
    color: "#003087",
    enabled: false,
    status: "disconnected",
    docs: "https://developer.paypal.com",
  },
  {
    id: "firebase",
    name: "Firebase / FCM",
    description: "Notificações push para iOS e Android via Firebase Cloud Messaging",
    category: "Notificações",
    icon: "notifications-outline",
    color: "#F59E0B",
    enabled: false,
    status: "disconnected",
    docs: "https://firebase.google.com/docs/cloud-messaging",
  },
  {
    id: "resend",
    name: "Resend",
    description: "Envio de e-mails transacionais — confirmação de cadastro, recuperação de senha, notificações",
    category: "Comunicação",
    icon: "mail-outline",
    color: "#FF4040",
    enabled: false,
    status: "disconnected",
    docs: "https://resend.com/docs",
  },
  {
    id: "sendgrid",
    name: "SendGrid",
    description: "Envio de e-mails transacionais e marketing por e-mail",
    category: "Comunicação",
    icon: "send-outline",
    color: "#1A82E2",
    enabled: false,
    status: "disconnected",
    docs: "https://docs.sendgrid.com",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business API",
    description: "Mensagens automáticas e notificações via WhatsApp",
    category: "Comunicação",
    icon: "logo-whatsapp",
    color: "#25D366",
    enabled: false,
    status: "beta",
    docs: "https://developers.facebook.com/docs/whatsapp",
  },
  {
    id: "analytics",
    name: "Google Analytics 4",
    description: "Métricas de uso, comportamento de usuários e funil de conversão",
    category: "Analytics",
    icon: "bar-chart-outline",
    color: "#E8710A",
    enabled: false,
    status: "disconnected",
    docs: "https://developers.google.com/analytics",
  },
  {
    id: "mixpanel",
    name: "Mixpanel",
    description: "Analytics avançado de produto e análise de retenção de usuários",
    category: "Analytics",
    icon: "analytics-outline",
    color: "#7C3AED",
    enabled: false,
    status: "disconnected",
    docs: "https://docs.mixpanel.com",
  },
  {
    id: "posthog",
    name: "PostHog",
    description: "Analytics de produto open-source — funnels, session replay, feature flags e A/B testing",
    category: "Analytics",
    icon: "eye-outline",
    color: "#F54E00",
    enabled: false,
    status: "disconnected",
    docs: "https://posthog.com/docs",
  },
  {
    id: "strava",
    name: "Strava",
    description: "Importação de treinos e atividades externas — corrida, ciclismo, natação, musculação",
    category: "Saúde e Fitness",
    icon: "bicycle-outline",
    color: "#FC4C02",
    enabled: false,
    status: "disconnected",
    docs: "https://developers.strava.com",
    webhookUrl: "/api/health/strava/activities",
  },
  {
    id: "apple_health",
    name: "Apple Health Kit",
    description: "Sincronização com dados de saúde do iPhone — passos, frequência cardíaca, VO2 max",
    category: "Saúde e Fitness",
    icon: "heart-outline",
    color: "#FF3B30",
    enabled: false,
    status: "beta",
    docs: "https://developer.apple.com/documentation/healthkit",
  },
  {
    id: "garmin",
    name: "Garmin Connect",
    description: "Dados de smartwatch Garmin — FC, HRV, sono, stress, Body Battery e treinos GPS",
    category: "Saúde e Fitness",
    icon: "watch-outline",
    color: "#007CC3",
    enabled: false,
    status: "disconnected",
    docs: "https://developer.garmin.com/gc-developer-program/overview",
  },
  {
    id: "google_fit",
    name: "Google Fit",
    description: "Integração com dados de saúde e atividade física Android — passos, FC, calorias, peso",
    category: "Saúde e Fitness",
    icon: "fitness-outline",
    color: "#4285F4",
    enabled: true,
    status: "beta",
    docs: "https://developers.google.com/fit",
    webhookUrl: "/api/health/google-fit/sync",
  },
  {
    id: "samsung_health",
    name: "Samsung Health",
    description: "Sincronização com Galaxy Watch e app Samsung Health — FC, sono, estresse, SpO2, composição corporal",
    category: "Saúde e Fitness",
    icon: "pulse-outline",
    color: "#1428A0",
    enabled: false,
    status: "beta",
    docs: "https://shealth.samsung.com/developer",
  },
  {
    id: "cloudinary",
    name: "Cloudinary",
    description: "Upload e CDN para fotos de perfil, vídeos de exercício e conteúdo da loja",
    category: "Armazenamento",
    icon: "cloud-upload-outline",
    color: "#3448C5",
    enabled: false,
    status: "disconnected",
    docs: "https://cloudinary.com/documentation",
  },
  {
    id: "sentry",
    name: "Sentry",
    description: "Monitoramento de erros e crashes em tempo real no app e backend",
    category: "Monitoramento",
    icon: "bug-outline",
    color: "#362D59",
    enabled: false,
    status: "disconnected",
    docs: "https://docs.sentry.io",
  },
];

const CATS = ["Todas", "IA e Machine Learning", "Pagamentos", "Comunicação", "Analytics", "Saúde e Fitness", "Armazenamento", "Monitoramento", "Notificações"];

const STATUS_CONFIG = {
  connected: { label: "Conectada", color: "#4ADE80", bg: "rgba(74,222,128,0.12)" },
  disconnected: { label: "Desconectada", color: Colors.muted, bg: "rgba(107,107,117,0.12)" },
  error: { label: "Erro", color: "#F87171", bg: "rgba(248,113,113,0.12)" },
  beta: { label: "Beta", color: "#60A5FA", bg: "rgba(96,165,250,0.12)" },
};

export default function IntegracoesScreen() {
  const insets = useSafeAreaInsets();
  const [integrations, setIntegrations] = useState<Integration[]>(INITIAL_INTEGRATIONS);
  const [catSel, setCatSel] = useState("Todas");
  const [detailModal, setDetailModal] = useState<Integration | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [webhookInput, setWebhookInput] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCat, setNewCat] = useState(CATS[1]);
  const [newApiKey, setNewApiKey] = useState("");
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const filtered = catSel === "Todas" ? integrations : integrations.filter((i) => i.category === catSel);
  const connected = integrations.filter((i) => i.enabled && i.status === "connected").length;
  const total = integrations.length;

  const toggleIntegration = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIntegrations((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const newEnabled = !i.enabled;
        return { ...i, enabled: newEnabled, status: newEnabled && i.status === "disconnected" ? "beta" : i.status };
      })
    );
  };

  const handleOpenDetail = (integration: Integration) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setApiKeyInput(integration.apiKey || "");
    setWebhookInput(integration.webhookUrl || "");
    setDetailModal(integration);
  };

  const handleSaveConfig = () => {
    if (!detailModal) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIntegrations((prev) =>
      prev.map((i) => i.id === detailModal.id ? { ...i, apiKey: apiKeyInput, webhookUrl: webhookInput, status: apiKeyInput ? "connected" : i.status, enabled: !!apiKeyInput || i.enabled } : i)
    );
    setDetailModal(null);
  };

  const handleAddIntegration = () => {
    if (!newName.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newIntegration: Integration = {
      id: `custom_${Date.now()}`,
      name: newName,
      description: newDesc,
      category: newCat,
      icon: "link-outline",
      color: Colors.gold,
      enabled: !!newApiKey,
      status: newApiKey ? "connected" : "disconnected",
      apiKey: newApiKey || undefined,
    };
    setIntegrations((prev) => [...prev, newIntegration]);
    setShowAddModal(false);
    setNewName(""); setNewDesc(""); setNewApiKey("");
  };

  return (
    <View style={styles.container}>
      <View style={[styles.headerBox, { paddingTop: topPad + 12 }]}>
        <View style={styles.metricRow}>
          <LinearGradient colors={["rgba(74,222,128,0.15)", "rgba(74,222,128,0.05)"]} style={styles.metricCard}>
            <Text style={[styles.metricNum, { color: "#4ADE80" }]}>{connected}</Text>
            <Text style={styles.metricLabel}>Ativas</Text>
          </LinearGradient>
          <LinearGradient colors={["rgba(212,175,55,0.12)", "rgba(212,175,55,0.04)"]} style={styles.metricCard}>
            <Text style={[styles.metricNum, { color: Colors.gold }]}>{total}</Text>
            <Text style={styles.metricLabel}>Total</Text>
          </LinearGradient>
          <LinearGradient colors={["rgba(96,165,250,0.12)", "rgba(96,165,250,0.04)"]} style={styles.metricCard}>
            <Text style={[styles.metricNum, { color: "#60A5FA" }]}>{integrations.filter((i) => i.status === "beta").length}</Text>
            <Text style={styles.metricLabel}>Beta</Text>
          </LinearGradient>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
        {CATS.map((c) => (
          <Pressable key={c} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCatSel(c); }} style={[styles.catChip, catSel === c && styles.catChipAtivo]}>
            <Text style={[styles.catChipText, catSel === c && styles.catChipTextAtivo]}>{c}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 100 }]}>
        {filtered.map((integration, idx) => {
          const statusCfg = STATUS_CONFIG[integration.status];
          return (
            <Animated.View key={integration.id} entering={FadeInDown.delay(idx * 30).springify()}>
              <Pressable onPress={() => handleOpenDetail(integration)} style={({ pressed }) => [styles.intCard, { opacity: pressed ? 0.85 : 1 }]}>
                <View style={[styles.intIcon, { backgroundColor: `${integration.color}15`, borderColor: `${integration.color}25` }]}>
                  <Ionicons name={integration.icon as any} size={22} color={integration.color} />
                </View>
                <View style={styles.intInfo}>
                  <View style={styles.intTitleRow}>
                    <Text style={styles.intName}>{integration.name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
                      <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.intDesc} numberOfLines={2}>{integration.description}</Text>
                  <Text style={styles.intCat}>{integration.category}</Text>
                </View>
                <Switch
                  value={integration.enabled}
                  onValueChange={() => toggleIntegration(integration.id)}
                  trackColor={{ false: Colors.border, true: `${integration.color}50` }}
                  thumbColor={integration.enabled ? integration.color : Colors.muted}
                />
              </Pressable>
            </Animated.View>
          );
        })}

        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowAddModal(true); }} style={styles.addIntBtn}>
          <Ionicons name="add-circle-outline" size={20} color={Colors.gold} />
          <Text style={styles.addIntText}>Adicionar Nova Integração</Text>
        </Pressable>
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={!!detailModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: "85%" }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                {detailModal && (
                  <View style={[styles.intIcon, { backgroundColor: `${detailModal.color}15`, borderColor: `${detailModal.color}25` }]}>
                    <Ionicons name={detailModal.icon as any} size={20} color={detailModal.color} />
                  </View>
                )}
                <View>
                  <Text style={styles.modalTitle}>{detailModal?.name}</Text>
                  <Text style={styles.modalSubtitle}>{detailModal?.category}</Text>
                </View>
              </View>
              <Pressable onPress={() => setDetailModal(null)}>
                <Ionicons name="close" size={22} color={Colors.muted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.intDetailDesc}>{detailModal?.description}</Text>

              <View style={styles.statusRow}>
                <Text style={styles.fieldLabel}>Status</Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_CONFIG[detailModal?.status || "disconnected"].bg }]}>
                  <Text style={[styles.statusText, { color: STATUS_CONFIG[detailModal?.status || "disconnected"].color }]}>
                    {STATUS_CONFIG[detailModal?.status || "disconnected"].label}
                  </Text>
                </View>
              </View>

              <Text style={styles.fieldLabel}>Chave de API</Text>
              <TextInput
                style={styles.inputField}
                placeholder="sk-... ou sua chave de API"
                placeholderTextColor={Colors.muted}
                value={apiKeyInput}
                onChangeText={setApiKeyInput}
                secureTextEntry
              />

              <Text style={styles.fieldLabel}>URL do Webhook (opcional)</Text>
              <TextInput
                style={styles.inputField}
                placeholder="https://..."
                placeholderTextColor={Colors.muted}
                value={webhookInput}
                onChangeText={setWebhookInput}
                autoCapitalize="none"
              />

              {detailModal?.docs && (
                <View style={styles.docsBox}>
                  <Ionicons name="book-outline" size={14} color={Colors.gold} />
                  <Text style={styles.docsText}>Documentação: {detailModal.docs}</Text>
                </View>
              )}

              <View style={styles.toggleRow}>
                <Text style={styles.fieldLabel}>Integração Ativa</Text>
                {detailModal && (
                  <Switch
                    value={integrations.find((i) => i.id === detailModal.id)?.enabled || false}
                    onValueChange={() => { if (detailModal) toggleIntegration(detailModal.id); }}
                    trackColor={{ false: Colors.border, true: `${detailModal.color}50` }}
                    thumbColor={integrations.find((i) => i.id === detailModal.id)?.enabled ? detailModal.color : Colors.muted}
                  />
                )}
              </View>

              <Pressable onPress={handleSaveConfig} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }, { marginTop: 8 }]}>
                <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={styles.modalBtn}>
                  <Text style={styles.modalBtnText}>Salvar Configurações</Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Integration Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nova Integração</Text>
              <Pressable onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={22} color={Colors.muted} />
              </Pressable>
            </View>
            <Text style={styles.fieldLabel}>Nome da Integração *</Text>
            <TextInput style={styles.inputField} placeholder="Ex: Twilio SMS" placeholderTextColor={Colors.muted} value={newName} onChangeText={setNewName} />
            <Text style={styles.fieldLabel}>Descrição</Text>
            <TextInput style={styles.inputField} placeholder="Para que serve esta integração..." placeholderTextColor={Colors.muted} value={newDesc} onChangeText={setNewDesc} multiline />
            <Text style={styles.fieldLabel}>Categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
              {CATS.slice(1).map((c) => (
                <Pressable key={c} onPress={() => setNewCat(c)} style={[styles.catChip, newCat === c && styles.catChipAtivo]}>
                  <Text style={[styles.catChipText, newCat === c && styles.catChipTextAtivo]}>{c}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={styles.fieldLabel}>Chave de API (opcional)</Text>
            <TextInput style={styles.inputField} placeholder="sk-... ou sua chave de API" placeholderTextColor={Colors.muted} value={newApiKey} onChangeText={setNewApiKey} secureTextEntry />
            <Pressable onPress={handleAddIntegration} disabled={!newName.trim()} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
              <LinearGradient colors={newName.trim() ? [Colors.goldDark, Colors.gold] : [Colors.border, Colors.border]} style={styles.modalBtn}>
                <Text style={[styles.modalBtnText, !newName.trim() && { color: Colors.muted }]}>Adicionar Integração</Text>
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
  headerBox: { paddingHorizontal: 20, paddingBottom: 8 },
  metricRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  metricCard: { flex: 1, borderRadius: 16, padding: 14, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  metricNum: { fontFamily: "Outfit_800ExtraBold", fontSize: 22, letterSpacing: -0.5 },
  metricLabel: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.muted, marginTop: 2 },
  catScroll: { paddingVertical: 12 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  catChipAtivo: { backgroundColor: "rgba(212,175,55,0.15)", borderColor: "rgba(212,175,55,0.35)" },
  catChipText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: Colors.muted },
  catChipTextAtivo: { fontFamily: "Outfit_700Bold", color: Colors.gold },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  intCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.card, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  intIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  intInfo: { flex: 1 },
  intTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" },
  intName: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.text },
  intDesc: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.muted, lineHeight: 16, marginBottom: 3 },
  intCat: { fontFamily: "Outfit_400Regular", fontSize: 10, color: Colors.textSecondary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontFamily: "Outfit_600SemiBold", fontSize: 10 },
  addIntBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 18, borderRadius: 16, borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(212,175,55,0.35)", marginTop: 4, marginBottom: 8 },
  addIntText: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.gold },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: Colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, borderTopWidth: 1, borderColor: Colors.border, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  modalTitleRow: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  modalTitle: { fontFamily: "Outfit_700Bold", fontSize: 18, color: Colors.text },
  modalSubtitle: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.muted },
  intDetailDesc: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 20, marginBottom: 16, backgroundColor: Colors.black, borderRadius: 12, padding: 12 },
  fieldLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.textSecondary, marginBottom: 8, marginTop: 4 },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  inputField: { backgroundColor: Colors.black, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: Colors.border, fontFamily: "Outfit_400Regular", fontSize: 14, color: Colors.text, marginBottom: 14 },
  docsBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "rgba(212,175,55,0.06)", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "rgba(212,175,55,0.15)", marginBottom: 12 },
  docsText: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.gold, flex: 1 },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16, padding: 12, backgroundColor: Colors.black, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  modalBtn: { paddingVertical: 15, borderRadius: 14, alignItems: "center" },
  modalBtnText: { fontFamily: "Outfit_700Bold", fontSize: 15, color: Colors.black },
});
