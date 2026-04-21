import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Switch,
  Alert,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/query-client";
import { useAdmin } from "@/contexts/AdminContext";

interface PlanConfig {
  id: string;
  label: string;
  price_brl: number;
  price_usd: number;
  interval: string;
  features: string[];
  active: boolean;
  stripe_price_id?: string;
}

const PLANS: PlanConfig[] = [
  {
    id: "starter_monthly",
    label: "Starter Mensal",
    price_brl: 29.90,
    price_usd: 5.99,
    interval: "month",
    features: ["Treinos ilimitados", "Atlas IA básico", "Scanner nutricional"],
    active: true,
    stripe_price_id: "price_starter_monthly",
  },
  {
    id: "starter_annual",
    label: "Starter Anual",
    price_brl: 239.90,
    price_usd: 47.90,
    interval: "year",
    features: ["Treinos ilimitados", "Atlas IA básico", "Scanner nutricional", "2 meses grátis"],
    active: true,
    stripe_price_id: "price_starter_annual",
  },
  {
    id: "pro_monthly",
    label: "Pro Mensal",
    price_brl: 59.90,
    price_usd: 11.99,
    interval: "month",
    features: ["Tudo do Starter", "Atlas IA avançado", "Prescrições ilimitadas", "Loja premium", "PubMed integrado"],
    active: true,
    stripe_price_id: "price_pro_monthly",
  },
  {
    id: "pro_annual",
    label: "Pro Anual",
    price_brl: 479.90,
    price_usd: 95.90,
    interval: "year",
    features: ["Tudo do Starter", "Atlas IA avançado", "Prescrições ilimitadas", "Loja premium", "PubMed integrado", "2 meses grátis"],
    active: true,
    stripe_price_id: "price_pro_annual",
  },
  {
    id: "vitalicio",
    label: "Vitalício",
    price_brl: 997.00,
    price_usd: 199.00,
    interval: "once",
    features: ["Tudo do Pro", "Acesso vitalício", "Suporte prioritário", "Features beta antecipadas"],
    active: true,
    stripe_price_id: "price_vitalicio",
  },
];

const PAYMENT_METHODS = [
  { id: "stripe_card", label: "Cartão de Crédito/Débito", icon: "card-outline", color: "#60A5FA", enabled: true, desc: "Via Stripe — Visa, Master, Amex" },
  { id: "pix", label: "PIX", icon: "qr-code-outline", color: "#4ADE80", enabled: true, desc: "Transferência instantânea" },
  { id: "paypal", label: "PayPal", icon: "logo-paypal", color: "#22D3EE", enabled: false, desc: "Pagamentos internacionais" },
  { id: "boleto", label: "Boleto Bancário", icon: "barcode-outline", color: "#FBBF24", enabled: false, desc: "Em breve" },
];

function PlanCard({ plan }: { plan: PlanConfig }) {
  return (
    <Animated.View entering={FadeInDown.springify()} style={styles.planCard}>
      <View style={styles.planHeader}>
        <View>
          <Text style={styles.planLabel}>{plan.label}</Text>
          <Text style={styles.planInterval}>{plan.interval === "once" ? "Pagamento único" : plan.interval === "month" ? "Por mês" : "Por ano"}</Text>
        </View>
        <View style={styles.planPrices}>
          <Text style={styles.planPriceBRL}>R$ {plan.price_brl.toFixed(2)}</Text>
          <Text style={styles.planPriceUSD}>USD {plan.price_usd.toFixed(2)}</Text>
        </View>
      </View>
      <View style={styles.planFeatures}>
        {plan.features.map((f) => (
          <View key={f} style={styles.planFeature}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.gold} />
            <Text style={styles.planFeatureText}>{f}</Text>
          </View>
        ))}
      </View>
      {plan.stripe_price_id && (
        <View style={styles.planStripeId}>
          <Ionicons name="key-outline" size={12} color={Colors.muted} />
          <Text style={styles.planStripeIdText}>{plan.stripe_price_id}</Text>
        </View>
      )}
      <View style={styles.planStatus}>
        <View style={[styles.statusDot, { backgroundColor: plan.active ? "#4ADE80" : Colors.muted }]} />
        <Text style={[styles.statusText, { color: plan.active ? "#4ADE80" : Colors.muted }]}>
          {plan.active ? "Ativo" : "Inativo"}
        </Text>
      </View>
    </Animated.View>
  );
}

export default function FaturamentoScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { adminToken } = useAdmin();
  const [activeTab, setActiveTab] = useState<"planos" | "metodos" | "config">("planos");
  const [stripeKey, setStripeKey] = useState("sk_live_••••••••••••••••••••••••");
  const [webhookSecret, setWebhookSecret] = useState("whsec_••••••••••••••••••••");
  const [pixKey, setPixKey] = useState("");
  const [paymentMethods, setPaymentMethods] = useState(PAYMENT_METHODS);

  const { data: statsData } = useQuery<{ totalRevenue?: number; activeSubscriptions?: number; mrr?: number }>({
    queryKey: ["/api/admin/billing/stats"],
    enabled: !!adminToken,
  });

  const toggleMethod = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPaymentMethods((prev) => prev.map((m) => m.id === id ? { ...m, enabled: !m.enabled } : m));
  };

  const TABS = [
    { id: "planos" as const, label: "Planos", icon: "pricetag-outline" },
    { id: "metodos" as const, label: "Métodos", icon: "card-outline" },
    { id: "config" as const, label: "Config", icon: "settings-outline" },
  ];

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 80 }]}>
        <Animated.View entering={FadeIn.duration(400)}>
          <View style={styles.metricsRow}>
            <LinearGradient colors={["#1A1A1C", "#111113"]} style={styles.metricCard}>
              <Ionicons name="trending-up-outline" size={20} color="#4ADE80" />
              <Text style={styles.metricVal}>R$ {(statsData?.mrr ?? 0).toLocaleString("pt-BR")}</Text>
              <Text style={styles.metricLabel}>MRR</Text>
            </LinearGradient>
            <LinearGradient colors={["#1A1A1C", "#111113"]} style={styles.metricCard}>
              <Ionicons name="people-outline" size={20} color={Colors.gold} />
              <Text style={styles.metricVal}>{statsData?.activeSubscriptions ?? 0}</Text>
              <Text style={styles.metricLabel}>Assinantes</Text>
            </LinearGradient>
            <LinearGradient colors={["#1A1A1C", "#111113"]} style={styles.metricCard}>
              <Ionicons name="cash-outline" size={20} color="#60A5FA" />
              <Text style={styles.metricVal}>R$ {(statsData?.totalRevenue ?? 0).toLocaleString("pt-BR")}</Text>
              <Text style={styles.metricLabel}>Receita Total</Text>
            </LinearGradient>
          </View>
        </Animated.View>

        <View style={styles.tabBar}>
          {TABS.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab(t.id); }}
              style={[styles.tab, activeTab === t.id && styles.tabActive]}
            >
              <Ionicons name={t.icon as any} size={14} color={activeTab === t.id ? Colors.gold : Colors.muted} />
              <Text style={[styles.tabText, activeTab === t.id && styles.tabTextActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        {activeTab === "planos" && (
          <Animated.View entering={FadeInDown.springify()}>
            <Text style={styles.sectionTitle}>Planos de Assinatura</Text>
            {PLANS.map((plan) => <PlanCard key={plan.id} plan={plan} />)}
          </Animated.View>
        )}

        {activeTab === "metodos" && (
          <Animated.View entering={FadeInDown.springify()}>
            <Text style={styles.sectionTitle}>Métodos de Pagamento</Text>
            {paymentMethods.map((method) => (
              <View key={method.id} style={styles.methodCard}>
                <View style={[styles.methodIcon, { backgroundColor: `${method.color}18`, borderColor: `${method.color}30` }]}>
                  <Ionicons name={method.icon as any} size={22} color={method.color} />
                </View>
                <View style={styles.methodInfo}>
                  <Text style={styles.methodLabel}>{method.label}</Text>
                  <Text style={styles.methodDesc}>{method.desc}</Text>
                </View>
                <Switch
                  value={method.enabled}
                  onValueChange={() => toggleMethod(method.id)}
                  trackColor={{ false: Colors.border, true: `${Colors.gold}60` }}
                  thumbColor={method.enabled ? Colors.gold : Colors.muted}
                />
              </View>
            ))}

            <LinearGradient colors={["#1A1A1C", "#111113"]} style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.gold} />
              <Text style={styles.infoText}>
                Stripe processa cartões de crédito e débito. PIX é nativo via integração bancária. PayPal suporta pagamentos internacionais em USD.
              </Text>
            </LinearGradient>
          </Animated.View>
        )}

        {activeTab === "config" && (
          <Animated.View entering={FadeInDown.springify()}>
            <Text style={styles.sectionTitle}>Configuração Stripe</Text>

            <View style={styles.configCard}>
              <Text style={styles.configLabel}>Chave Secreta (sk_live_...)</Text>
              <TextInput
                style={styles.configInput}
                value={stripeKey}
                onChangeText={setStripeKey}
                secureTextEntry
                placeholder="sk_live_..."
                placeholderTextColor={Colors.muted}
              />
              <Text style={styles.configHint}>Configure via variáveis de ambiente: STRIPE_SECRET_KEY</Text>
            </View>

            <View style={styles.configCard}>
              <Text style={styles.configLabel}>Webhook Secret</Text>
              <TextInput
                style={styles.configInput}
                value={webhookSecret}
                onChangeText={setWebhookSecret}
                secureTextEntry
                placeholder="whsec_..."
                placeholderTextColor={Colors.muted}
              />
              <Text style={styles.configHint}>Configure via variáveis de ambiente: STRIPE_WEBHOOK_SECRET</Text>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Configuração PIX</Text>
            <View style={styles.configCard}>
              <Text style={styles.configLabel}>Chave PIX</Text>
              <TextInput
                style={styles.configInput}
                value={pixKey}
                onChangeText={setPixKey}
                placeholder="CPF, CNPJ, e-mail ou chave aleatória"
                placeholderTextColor={Colors.muted}
              />
            </View>

            <Pressable
              onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); Alert.alert("Configurações salvas", "Reinicie o backend para aplicar as mudanças."); }}
              style={({ pressed }) => [styles.saveBtn, { opacity: pressed ? 0.8 : 1 }]}
            >
              <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={styles.saveBtnGrad}>
                <Ionicons name="save-outline" size={16} color={Colors.black} />
                <Text style={styles.saveBtnText}>Salvar Configurações</Text>
              </LinearGradient>
            </Pressable>

            <LinearGradient colors={["#1A1A1C", "#111113"]} style={[styles.infoCard, { marginTop: 16 }]}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#4ADE80" />
              <Text style={styles.infoText}>
                Nunca armazene chaves secretas no código-fonte. Use variáveis de ambiente (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET) configuradas no ambiente de produção.
              </Text>
            </LinearGradient>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  metricsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  metricCard: { flex: 1, borderRadius: 16, padding: 14, alignItems: "center", gap: 4, borderWidth: 1, borderColor: Colors.border },
  metricVal: { fontFamily: "Outfit_700Bold", fontSize: 15, color: Colors.text, textAlign: "center" },
  metricLabel: { fontFamily: "Outfit_400Regular", fontSize: 10, color: Colors.muted, textAlign: "center" },
  tabBar: { flexDirection: "row", gap: 8, marginBottom: 20, flexWrap: "wrap" },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  tabActive: { backgroundColor: "rgba(212,175,55,0.12)", borderColor: "rgba(212,175,55,0.3)" },
  tabText: { fontFamily: "Outfit_500Medium", fontSize: 13, color: Colors.muted },
  tabTextActive: { color: Colors.gold },
  sectionTitle: { fontFamily: "Outfit_700Bold", fontSize: 16, color: Colors.text, marginBottom: 14 },
  planCard: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  planHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  planLabel: { fontFamily: "Outfit_700Bold", fontSize: 15, color: Colors.text },
  planInterval: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.muted, marginTop: 2 },
  planPrices: { alignItems: "flex-end" },
  planPriceBRL: { fontFamily: "Outfit_700Bold", fontSize: 16, color: Colors.gold },
  planPriceUSD: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.muted, marginTop: 2 },
  planFeatures: { gap: 6, marginBottom: 12 },
  planFeature: { flexDirection: "row", alignItems: "center", gap: 8 },
  planFeatureText: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.textSecondary },
  planStripeId: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  planStripeIdText: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.muted, fontStyle: "italic" },
  planStatus: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontFamily: "Outfit_500Medium", fontSize: 12 },
  methodCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.card, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  methodIcon: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  methodInfo: { flex: 1 },
  methodLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.text },
  methodDesc: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.muted, marginTop: 2 },
  infoCard: { borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, flexDirection: "row", gap: 10, marginTop: 8 },
  infoText: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.textSecondary, flex: 1, lineHeight: 18 },
  configCard: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  configLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.text, marginBottom: 8 },
  configInput: { backgroundColor: Colors.black, borderRadius: 10, padding: 12, fontFamily: "Outfit_400Regular", fontSize: 14, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  configHint: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.muted, marginTop: 6 },
  saveBtn: { borderRadius: 14, overflow: "hidden" },
  saveBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14 },
  saveBtnText: { fontFamily: "Outfit_700Bold", fontSize: 15, color: Colors.black },
});
