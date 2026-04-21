import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, Modal, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import Colors from "@/constants/colors";

interface Plan {
  id: string;
  name: string;
  subtitle?: string;
  monthly: number | null;
  annual: number | null;
  monthlyId: string;
  annualId: string;
  color: string;
  icon: string;
  badge?: string;
  features: string[];
  adminOnly?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    monthly: 0,
    annual: null,
    monthlyId: "free",
    annualId: "free",
    color: "#6B6B75",
    icon: "leaf-outline",
    features: [
      "Insight Científico e Editorial",
      "Scanner 5× por dia",
      "Atlas IA 5× por mês",
      "1 Programa de Treino",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthly: 19,
    annual: 190.90,
    monthlyId: "pro_monthly",
    annualId: "pro_annual",
    color: "#3B82F6",
    icon: "rocket-outline",
    badge: "Popular",
    features: [
      "Tudo do Free",
      "Atlas IA 50× por mês",
      "Scanner 50× por dia",
      "10 Clientes",
      "Atlas Tools completo e ilimitado",
      "Prescrição IA ilimitada",
      "10 Programas de Treino",
    ],
  },
  {
    id: "pro_plus",
    name: "Pro+ Nexus",
    monthly: 59.90,
    annual: 590.90,
    monthlyId: "pro_plus_monthly",
    annualId: "pro_plus_annual",
    color: "#8B5CF6",
    icon: "diamond-outline",
    badge: "Recomendado",
    features: [
      "Tudo do Pro",
      "Atlas IA 500× por mês",
      "Clientes Ilimitados",
      "Mentorias Nexus — acesso completo",
      "Loja: publicar produtos",
      "Programas Ilimitados",
      "Acadêmico completo e ilimitado",
    ],
  },
  {
    id: "university",
    name: "University",
    monthly: 99.90,
    annual: 899.90,
    monthlyId: "university_monthly",
    annualId: "university_annual",
    color: "#D4AF37",
    icon: "school-outline",
    features: [
      "Tudo do Pro+",
      "Editorial Pro",
      "API Access",
      "Suporte Prioritário",
      "Multi-user",
    ],
  },
  {
    id: "vitalicio",
    name: "Vitalício / White-label",
    subtitle: "Exclusivo Admin",
    monthly: null,
    annual: 997,
    monthlyId: "vitalicio",
    annualId: "vitalicio",
    color: "#F59E0B",
    icon: "infinite-outline",
    adminOnly: true,
    features: [
      "Tudo dos outros planos",
      "Completamente Ilimitado",
      "Acesso Admin",
      "Suporte Prioritário",
      "White-label",
      "Exclusivo do Administrador",
    ],
  },
];

const PAYMENT_METHODS = [
  { id: "card", label: "Cartão de Crédito", icon: "card-outline" },
  { id: "pix", label: "Pix", icon: "qr-code-outline" },
  { id: "paypal", label: "PayPal", icon: "logo-paypal" },
];

function PlanCard({ plan, isCurrent, isAnnual, onSelect }: {
  plan: Plan; isCurrent: boolean; isAnnual: boolean; onSelect: () => void;
}) {
  const price = isAnnual ? plan.annual : plan.monthly;
  const perMonth = isAnnual && plan.annual ? plan.annual / 12 : null;

  return (
    <Animated.View entering={FadeInDown.springify().delay(100)}>
      <Pressable
        onPress={!plan.adminOnly ? onSelect : undefined}
        style={[styles.planCard, isCurrent && styles.planCardActive, { borderColor: isCurrent ? plan.color : "#232327" }]}
      >
        {plan.badge && (
          <View style={[styles.badge, { backgroundColor: plan.color }]}>
            <Text style={styles.badgeText}>{plan.badge}</Text>
          </View>
        )}
        {isCurrent && (
          <View style={[styles.currentBadge, { backgroundColor: plan.color + "22", borderColor: plan.color + "44" }]}>
            <Text style={[styles.currentBadgeText, { color: plan.color }]}>Seu plano atual</Text>
          </View>
        )}

        <LinearGradient colors={[plan.color + "18", plan.color + "05"]} style={styles.planGrad}>
          {/* Header */}
          <View style={styles.planHeader}>
            <View style={[styles.planIcon, { backgroundColor: plan.color + "22" }]}>
              <Ionicons name={plan.icon as any} size={24} color={plan.color} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.planName}>{plan.name}</Text>
              {plan.subtitle && <Text style={styles.planSubtitle}>{plan.subtitle}</Text>}
            </View>
          </View>

          {/* Price */}
          <View style={styles.priceRow}>
            {plan.adminOnly ? (
              <Text style={[styles.planPrice, { color: plan.color }]}>Exclusivo</Text>
            ) : price === 0 ? (
              <Text style={[styles.planPrice, { color: plan.color }]}>Grátis</Text>
            ) : isAnnual && plan.annual ? (
              <View>
                <Text style={[styles.planPrice, { color: plan.color }]}>R$ {plan.annual.toFixed(2)}<Text style={styles.pricePer}>/ano</Text></Text>
                {perMonth && <Text style={styles.pricePerMonth}>≈ R$ {perMonth.toFixed(2)}/mês</Text>}
              </View>
            ) : plan.monthly ? (
              <Text style={[styles.planPrice, { color: plan.color }]}>R$ {plan.monthly.toFixed(2)}<Text style={styles.pricePer}>/mês</Text></Text>
            ) : null}
          </View>

          {/* Features */}
          <View style={styles.featuresList}>
            {plan.features.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={16} color={plan.color} />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>

          {/* CTA */}
          {!plan.adminOnly && (
            <Pressable
              style={[styles.planCta, { backgroundColor: isCurrent ? plan.color + "22" : plan.color }]}
              onPress={onSelect}
            >
              <Text style={[styles.planCtaText, { color: isCurrent ? plan.color : "#000" }]}>
                {isCurrent ? "Plano Atual" : price === 0 ? "Usar Free" : "Assinar Agora"}
              </Text>
              {!isCurrent && <Ionicons name="arrow-forward" size={16} color="#000" style={{ marginLeft: 6 }} />}
            </Pressable>
          )}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

export default function PlanosScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [isAnnual, setIsAnnual] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const currentPlan = user?.plan || "free";

  const visiblePlans = PLANS.filter(p => !p.adminOnly || user?.is_admin);

  const handleSelectPlan = (plan: Plan) => {
    if (plan.id === "free") { Alert.alert("Plano Free", "Você já tem acesso ao plano Free."); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const handlePayment = () => {
    const price = isAnnual ? selectedPlan?.annual : selectedPlan?.monthly;
    const planName = isAnnual ? selectedPlan?.annualId : selectedPlan?.monthlyId;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowPaymentModal(false);
    Alert.alert(
      "Pagamento Simulado",
      `Plano ${selectedPlan?.name} via ${PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label}.\n\nEm produção, aqui seria processado o pagamento de R$ ${price?.toFixed(2)} via ${paymentMethod === "pix" ? "Pix" : paymentMethod === "paypal" ? "PayPal" : "Cartão"}.\n\nID do plano: ${planName}`,
      [{ text: "Entendido" }]
    );
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const botPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const planLabel: Record<string, string> = {
    free: "Free", pro_monthly: "Pro Mensal", pro_annual: "Pro Anual",
    pro_plus_monthly: "Pro+ Mensal", pro_plus_annual: "Pro+ Anual",
    university_monthly: "University Mensal", university_annual: "University Anual",
    vitalicio: "Vitalício",
  };

  const currentColor = PLANS.find(p => p.monthlyId === currentPlan || p.annualId === currentPlan || p.id === currentPlan.split("_")[0])?.color || Colors.gold;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <LinearGradient colors={["#0B0B0C", "#111113"]} style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Planos & Pagamentos</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Current Plan Banner */}
        <LinearGradient colors={[currentColor + "22", currentColor + "08"]} style={[styles.currentPlanBanner, { borderColor: currentColor + "44" }]}>
          <Ionicons name="star" size={16} color={currentColor} />
          <Text style={styles.currentPlanText}>Plano atual: <Text style={{ color: currentColor, fontFamily: "Outfit_700Bold" }}>{planLabel[currentPlan] || currentPlan}</Text></Text>
        </LinearGradient>

        {/* Billing Toggle */}
        <View style={styles.toggleRow}>
          <Pressable style={[styles.toggleBtn, !isAnnual && styles.toggleActive]} onPress={() => setIsAnnual(false)}>
            <Text style={[styles.toggleText, !isAnnual && styles.toggleTextActive]}>Mensal</Text>
          </Pressable>
          <Pressable style={[styles.toggleBtn, isAnnual && styles.toggleActive]} onPress={() => setIsAnnual(true)}>
            <Text style={[styles.toggleText, isAnnual && styles.toggleTextActive]}>Anual</Text>
            <View style={styles.saveBadge}><Text style={styles.saveText}>Economize</Text></View>
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: botPadding + 24 }]}
      >
        <Text style={styles.compareTitle}>Escolha o plano ideal para você</Text>

        {visiblePlans.map(plan => {
          const isCurrent = plan.monthlyId === currentPlan || plan.annualId === currentPlan || plan.id === currentPlan;
          return (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={isCurrent}
              isAnnual={isAnnual}
              onSelect={() => handleSelectPlan(plan)}
            />
          );
        })}

        {/* Comparison Table */}
        <View style={styles.compareSection}>
          <Text style={styles.compareTitle}>Comparativo de Recursos</Text>
          <View style={styles.compareTable}>
            {[
              { feature: "IA Atlas", free: "5×/mês", pro: "50×/mês", proPlus: "500×/mês", uni: "Ilimitado" },
              { feature: "Scanner", free: "5×/dia", pro: "50×/dia", proPlus: "Ilimitado", uni: "Ilimitado" },
              { feature: "Clientes", free: "0", pro: "10", proPlus: "∞", uni: "∞" },
              { feature: "Programas", free: "1", pro: "10", proPlus: "∞", uni: "∞" },
              { feature: "Mentorias", free: "—", pro: "—", proPlus: "✓", uni: "✓" },
              { feature: "Editorial Pro", free: "—", pro: "—", proPlus: "—", uni: "✓" },
              { feature: "API Access", free: "—", pro: "—", proPlus: "—", uni: "✓" },
              { feature: "Acadêmico", free: "—", pro: "—", proPlus: "✓", uni: "✓" },
            ].map((r, i) => (
              <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                <Text style={styles.tableFeature}>{r.feature}</Text>
                <Text style={styles.tableCell}>{r.free}</Text>
                <Text style={[styles.tableCell, { color: "#3B82F6" }]}>{r.pro}</Text>
                <Text style={[styles.tableCell, { color: "#8B5CF6" }]}>{r.proPlus}</Text>
                <Text style={[styles.tableCell, { color: Colors.gold }]}>{r.uni}</Text>
              </View>
            ))}
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderCell}>Recurso</Text>
              <Text style={styles.tableHeaderCell}>Free</Text>
              <Text style={[styles.tableHeaderCell, { color: "#3B82F6" }]}>Pro</Text>
              <Text style={[styles.tableHeaderCell, { color: "#8B5CF6" }]}>Pro+</Text>
              <Text style={[styles.tableHeaderCell, { color: Colors.gold }]}>Uni</Text>
            </View>
          </View>
        </View>

        <View style={styles.faqSection}>
          <Text style={styles.compareTitle}>Dúvidas Frequentes</Text>
          {[
            { q: "Posso cancelar a qualquer momento?", a: "Sim. Você pode cancelar sua assinatura quando quiser. O acesso continua até o fim do período pago." },
            { q: "Como funciona o plano anual?", a: "Você paga uma vez e tem acesso pelo ano todo com um valor mais acessível comparado ao mensal." },
            { q: "Quais formas de pagamento são aceitas?", a: "Aceitamos Cartão de Crédito, Pix e PayPal." },
            { q: "O plano Vitalício é para todos?", a: "O plano Vitalício/White-label é exclusivo para o administrador da plataforma." },
          ].map((faq, i) => (
            <View key={i} style={styles.faqCard}>
              <Text style={styles.faqQ}>{faq.q}</Text>
              <Text style={styles.faqA}>{faq.a}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Payment Modal */}
      <Modal visible={showPaymentModal} transparent animationType="slide" onRequestClose={() => setShowPaymentModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowPaymentModal(false)} />
        <View style={[styles.payModal, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Assinar {selectedPlan?.name}</Text>
          {selectedPlan && (
            <View style={[styles.modalPriceBox, { borderColor: selectedPlan.color + "44", backgroundColor: selectedPlan.color + "11" }]}>
              <Text style={[styles.modalPrice, { color: selectedPlan.color }]}>
                R$ {(isAnnual ? selectedPlan.annual : selectedPlan.monthly)?.toFixed(2)}
              </Text>
              <Text style={styles.modalPriceSub}>{isAnnual ? "por ano" : "por mês"}</Text>
            </View>
          )}

          <Text style={styles.payMethodLabel}>Forma de Pagamento</Text>
          <View style={styles.payMethods}>
            {PAYMENT_METHODS.map(m => (
              <Pressable
                key={m.id}
                style={[styles.payMethod, paymentMethod === m.id && styles.payMethodActive]}
                onPress={() => setPaymentMethod(m.id)}
              >
                <Ionicons name={m.icon as any} size={22} color={paymentMethod === m.id ? Colors.gold : "#6B6B75"} />
                <Text style={[styles.payMethodText, paymentMethod === m.id && { color: Colors.gold }]}>{m.label}</Text>
              </Pressable>
            ))}
          </View>

          {paymentMethod === "pix" && (
            <View style={styles.pixInfo}>
              <Ionicons name="qr-code-outline" size={20} color={Colors.gold} />
              <Text style={styles.pixText}>O QR Code Pix será gerado após a confirmação.</Text>
            </View>
          )}
          {paymentMethod === "card" && (
            <Text style={styles.cardInfo}>Você será redirecionado ao checkout seguro (Stripe).</Text>
          )}
          {paymentMethod === "paypal" && (
            <Text style={styles.cardInfo}>Você será redirecionado ao PayPal para completar o pagamento.</Text>
          )}

          <Pressable style={styles.payBtn} onPress={handlePayment}>
            <LinearGradient colors={[Colors.gold, Colors.goldDark]} style={styles.payBtnGrad}>
              <Ionicons name="lock-closed" size={16} color="#000" />
              <Text style={styles.payBtnText}>Confirmar Pagamento</Text>
            </LinearGradient>
          </Pressable>
          <Text style={styles.secureText}>🔒 Pagamento seguro · SSL · PCI DSS</Text>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#232327", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Outfit_700Bold", fontSize: 18, color: "#FFF" },
  currentPlanBanner: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, marginBottom: 14 },
  currentPlanText: { fontFamily: "Outfit_400Regular", fontSize: 13, color: "#A1A1AA" },
  toggleRow: { flexDirection: "row", backgroundColor: "#18181A", borderRadius: 30, padding: 4, alignSelf: "center" },
  toggleBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 26 },
  toggleActive: { backgroundColor: Colors.gold + "22", borderWidth: 1, borderColor: Colors.gold + "44" },
  toggleText: { fontFamily: "Outfit_500Medium", fontSize: 14, color: "#6B6B75" },
  toggleTextActive: { color: Colors.gold },
  saveBadge: { backgroundColor: "#22C55E22", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  saveText: { fontFamily: "Outfit_600SemiBold", fontSize: 9, color: "#22C55E" },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  planCard: { borderRadius: 18, borderWidth: 1.5, marginBottom: 16, overflow: "hidden", position: "relative" },
  planCardActive: { borderWidth: 2 },
  planGrad: { padding: 20 },
  planHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  planIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  planName: { fontFamily: "Outfit_700Bold", fontSize: 18, color: "#FFF" },
  planSubtitle: { fontFamily: "Outfit_400Regular", fontSize: 12, color: "#A1A1AA", marginTop: 2 },
  priceRow: { marginBottom: 14 },
  planPrice: { fontFamily: "Outfit_700Bold", fontSize: 28 },
  pricePer: { fontFamily: "Outfit_400Regular", fontSize: 14, color: "#A1A1AA" },
  pricePerMonth: { fontFamily: "Outfit_400Regular", fontSize: 12, color: "#A1A1AA", marginTop: 2 },
  featuresList: { gap: 8, marginBottom: 20 },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  featureText: { fontFamily: "Outfit_400Regular", fontSize: 13, color: "#A1A1AA", flex: 1 },
  planCta: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 14, paddingVertical: 14 },
  planCtaText: { fontFamily: "Outfit_700Bold", fontSize: 15 },
  badge: { position: "absolute", top: 16, right: 16, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, zIndex: 1 },
  badgeText: { fontFamily: "Outfit_700Bold", fontSize: 11, color: "#FFF" },
  currentBadge: { position: "absolute", top: 16, left: 16, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, zIndex: 1 },
  currentBadgeText: { fontFamily: "Outfit_600SemiBold", fontSize: 11 },
  compareSection: { marginTop: 8 },
  compareTitle: { fontFamily: "Outfit_700Bold", fontSize: 18, color: "#FFF", marginBottom: 14 },
  compareTable: { backgroundColor: "#111113", borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "#232327" },
  tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#232327", paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#18181A" },
  tableHeaderCell: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: "#A1A1AA", flex: 1, textAlign: "center" },
  tableRow: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10 },
  tableRowAlt: { backgroundColor: "#18181A" },
  tableFeature: { fontFamily: "Outfit_500Medium", fontSize: 12, color: "#A1A1AA", flex: 1.2 },
  tableCell: { fontFamily: "Outfit_400Regular", fontSize: 11, color: "#6B6B75", flex: 1, textAlign: "center" },
  faqSection: { marginTop: 20, marginBottom: 8 },
  faqCard: { backgroundColor: "#111113", borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "#232327" },
  faqQ: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: "#FFF", marginBottom: 6 },
  faqA: { fontFamily: "Outfit_400Regular", fontSize: 13, color: "#A1A1AA", lineHeight: 20 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "#00000090" },
  payModal: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#111113", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
  modalHandle: { width: 40, height: 4, backgroundColor: "#333", borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  modalTitle: { fontFamily: "Outfit_700Bold", fontSize: 20, color: "#FFF", marginBottom: 14 },
  modalPriceBox: { borderRadius: 14, padding: 16, borderWidth: 1, alignItems: "center", marginBottom: 20 },
  modalPrice: { fontFamily: "Outfit_700Bold", fontSize: 32 },
  modalPriceSub: { fontFamily: "Outfit_400Regular", fontSize: 13, color: "#A1A1AA", marginTop: 4 },
  payMethodLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: "#FFF", marginBottom: 10 },
  payMethods: { flexDirection: "row", gap: 10, marginBottom: 16 },
  payMethod: { flex: 1, alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#232327", backgroundColor: "#18181A", gap: 6 },
  payMethodActive: { borderColor: Colors.gold, backgroundColor: Colors.gold + "11" },
  payMethodText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: "#6B6B75", textAlign: "center" },
  pixInfo: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.gold + "11", borderRadius: 12, padding: 12, marginBottom: 12 },
  pixText: { fontFamily: "Outfit_400Regular", fontSize: 13, color: "#A1A1AA", flex: 1 },
  cardInfo: { fontFamily: "Outfit_400Regular", fontSize: 13, color: "#A1A1AA", textAlign: "center", marginBottom: 12 },
  payBtn: { borderRadius: 16, overflow: "hidden", marginTop: 4 },
  payBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  payBtnText: { fontFamily: "Outfit_700Bold", fontSize: 16, color: "#000" },
  secureText: { fontFamily: "Outfit_400Regular", fontSize: 12, color: "#6B6B75", textAlign: "center", marginTop: 12 },
});
