import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";

type CatLoja = "Planos" | "Programas" | "Conteudo";
const CATS_LOJA: CatLoja[] = ["Planos", "Programas", "Conteudo"];

type MetodoPgto = "cartao" | "pix" | "paypal" | "stripe";

const PROGRAMAS_LOJA = [
  { nome: "Hipertrofia Maxima 16 semanas", preco: "R$ 97", nivel: "Avancado", avaliacao: "4.9" },
  { nome: "Powerlifting Competicao 20 semanas", preco: "R$ 147", nivel: "Elite", avaliacao: "4.8" },
  { nome: "Base de Forca 8 semanas", preco: "R$ 47", nivel: "Iniciante", avaliacao: "4.7" },
];

const CONTEUDOS = [
  { nome: "Guia Completo de Periodizacao", tipo: "PDF", preco: "R$ 27", paginas: "87 paginas" },
  { nome: "Banco de Exercicios Cientificos", tipo: "Video", preco: "R$ 67", paginas: "120 videos" },
  { nome: "Calculadora de Volume Semanal", tipo: "Ferramenta", preco: "R$ 37", paginas: "Web App" },
];

interface Plano {
  id: string;
  nome: string;
  precoMensal: string | null;
  precoAnual: string | null;
  cor: string;
  corDark: string;
  tag: string;
  adminOnly: boolean;
  recursos: string[];
}

const PLANOS: Plano[] = [
  {
    id: "vitalicio",
    nome: "Vitalicio Nexus",
    precoMensal: null,
    precoAnual: null,
    cor: Colors.gold,
    corDark: Colors.goldDark,
    tag: "ADMIN EXCLUSIVO",
    adminOnly: true,
    recursos: [
      "Atlas IA ilimitado vitaliciamente",
      "Todos os programas cientificos",
      "Scanner nutricional avancado",
      "Prescricoes ilimitadas para clientes",
      "Acesso antecipado a novas funcionalidades",
      "Painel administrativo completo",
    ],
  },
  {
    id: "pro",
    nome: "Pro Nexus",
    precoMensal: "R$ 99",
    precoAnual: "R$ 990",
    cor: "#60A5FA",
    corDark: "#2563EB",
    tag: "MAIS POPULAR",
    adminOnly: false,
    recursos: [
      "Atlas IA com 500 perguntas/mes",
      "10 programas cientificos",
      "Scanner nutricional completo",
      "Ate 20 clientes ativos",
      "Prescricoes com IA ilimitadas",
      "Atualizacoes mensais",
    ],
  },
  {
    id: "starter",
    nome: "Starter",
    precoMensal: "R$ 19",
    precoAnual: "R$ 190",
    cor: "#4ADE80",
    corDark: "#16A34A",
    tag: "COMECE AGORA",
    adminOnly: false,
    recursos: [
      "Atlas IA com 50 perguntas/mes",
      "3 programas cientificos",
      "Scanner nutricional basico",
      "Ate 5 clientes ativos",
    ],
  },
  {
    id: "free",
    nome: "Gratuito",
    precoMensal: "R$ 0",
    precoAnual: "R$ 0",
    cor: Colors.muted,
    corDark: "#4B4B55",
    tag: "PLANO ATUAL",
    adminOnly: false,
    recursos: [
      "Atlas IA basico (10x/mes)",
      "1 programa de treino",
      "Sem scanner nutricional",
      "Sem clientes",
    ],
  },
];

const METODOS_PGTO = [
  { key: "cartao" as MetodoPgto, label: "Cartao de Credito", icon: "card-outline", sub: "Visa, Master, Elo, Amex" },
  { key: "pix" as MetodoPgto, label: "PIX", icon: "qr-code-outline", sub: "Aprovacao instantanea" },
  { key: "paypal" as MetodoPgto, label: "PayPal", icon: "logo-paypal", sub: "Conta PayPal" },
  { key: "stripe" as MetodoPgto, label: "Stripe", icon: "flash-outline", sub: "Stripe Checkout" },
];

export default function LojaScreen() {
  const insets = useSafeAreaInsets();
  const { user, isPro, isVitalicio } = useAuth();
  const [catAtiva, setCatAtiva] = useState<CatLoja>("Planos");
  const [periodoAnual, setPeriodoAnual] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [planoSel, setPlanoSel] = useState<Plano | null>(null);
  const [metodoPgto, setMetodoPgto] = useState<MetodoPgto>("pix");
  const [step, setStep] = useState<"metodo" | "dados" | "confirmacao">("metodo");
  const [cardNum, setCardNum] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExp, setCardExp] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [processing, setProcessing] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const getCurrentPlanLabel = () => {
    if (isVitalicio) return "Vitalicio Nexus";
    if (user?.plan === "pro_monthly" || user?.plan === "pro_annual") return "Pro Nexus";
    if (user?.plan === "starter_monthly" || user?.plan === "starter_annual") return "Starter";
    return "Gratuito";
  };

  const handleAssinar = (plano: Plano) => {
    if (plano.adminOnly) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPlanoSel(plano);
    setStep("metodo");
    setShowPayModal(true);
  };

  const handleConfirmarPgto = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 2000));
    setProcessing(false);
    setStep("confirmacao");
  };

  const planoAtual = getCurrentPlanLabel();
  const preco = planoSel ? (periodoAnual ? planoSel.precoAnual : planoSel.precoMensal) : null;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View>
          <Text style={styles.pageTitle}>Loja</Text>
          <Text style={styles.pageSubtitle}>Planos, programas e conteudo</Text>
        </View>
        <View style={styles.planBadge}>
          <Text style={styles.planBadgeText}>{planoAtual}</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
        {CATS_LOJA.map((c) => (
          <Pressable
            key={c}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCatAtiva(c); }}
            style={[styles.catTab, catAtiva === c && styles.catTabAtiva]}
          >
            <Text style={[styles.catText, catAtiva === c && styles.catTextAtivo]}>{c}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 100 }]}>
        {catAtiva === "Planos" && (
          <Animated.View entering={FadeInDown.delay(60).springify()}>
            <View style={styles.toggleRow}>
              <Pressable onPress={() => setPeriodoAnual(false)} style={[styles.toggleBtn, !periodoAnual && styles.toggleActive]}>
                <Text style={[styles.toggleText, !periodoAnual && styles.toggleTextActive]}>Mensal</Text>
              </Pressable>
              <Pressable onPress={() => setPeriodoAnual(true)} style={[styles.toggleBtn, periodoAnual && styles.toggleActive]}>
                <Text style={[styles.toggleText, periodoAnual && styles.toggleTextActive]}>Anual</Text>
                <View style={styles.descontoBadge}><Text style={styles.descontoText}>-17%</Text></View>
              </Pressable>
            </View>

            {PLANOS.map((p, idx) => {
              const isCurrent = planoAtual === p.nome;
              const precoExib = p.adminOnly ? null : periodoAnual ? p.precoAnual : p.precoMensal;
              const isFree = p.id === "free";

              return (
                <Animated.View key={p.id} entering={FadeInDown.delay(60 + idx * 50).springify()} style={styles.planoWrapper}>
                  {!isFree && (
                    <View style={styles.tagInlineRow}>
                      <View style={[styles.tagInline, { backgroundColor: `${p.cor}15`, borderColor: `${p.cor}30` }]}>
                        <Text style={[styles.tagInlineText, { color: p.cor }]}>{p.tag}</Text>
                      </View>
                    </View>
                  )}
                  <LinearGradient
                    colors={[`${p.cor}10`, `${p.cor}04`]}
                    style={[styles.planoCard, { borderColor: `${p.cor}30` }]}
                  >
                    <Text style={[styles.planoNome, { color: p.cor }]}>{p.nome}</Text>

                    {p.adminOnly ? (
                      <View style={styles.adminOnlyBox}>
                        <Ionicons name="shield-checkmark" size={16} color={Colors.gold} />
                        <Text style={styles.adminOnlyText}>Concedido a administradores automaticamente</Text>
                      </View>
                    ) : (
                      <View style={styles.planoPrecoRow}>
                        <Text style={[styles.planoPreco, { color: p.cor }]}>{precoExib}</Text>
                        <Text style={styles.planoParcelado}>{periodoAnual ? "/ano" : "/mes"}</Text>
                      </View>
                    )}

                    <View style={styles.divisor} />
                    {p.recursos.map((r) => (
                      <View key={r} style={styles.recursoRow}>
                        <Ionicons name="checkmark-circle" size={15} color={p.cor} />
                        <Text style={styles.recursoText}>{r}</Text>
                      </View>
                    ))}

                    {!p.adminOnly && (
                      <Pressable
                        onPress={() => { if (!isCurrent) handleAssinar(p); }}
                        disabled={isCurrent}
                        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }, { marginTop: 16 }]}
                      >
                        <LinearGradient
                          colors={isCurrent ? [Colors.border, Colors.border] : [p.corDark, p.cor]}
                          style={styles.planoBtn}
                        >
                          <Text style={[styles.planoBtnText, isCurrent && { color: Colors.muted }]}>
                            {isCurrent ? "Plano Atual" : isFree ? "Continuar Gratis" : `Assinar ${p.nome}`}
                          </Text>
                        </LinearGradient>
                      </Pressable>
                    )}
                  </LinearGradient>
                </Animated.View>
              );
            })}

            <Animated.View entering={FadeInDown.delay(340).springify()} style={styles.garantiaCard}>
              <Ionicons name="shield-checkmark-outline" size={24} color={Colors.gold} />
              <View style={styles.garantiaText}>
                <Text style={styles.garantiaTitulo}>Garantia de 7 dias</Text>
                <Text style={styles.garantiaSub}>Satisfacao garantida ou reembolso total sem perguntas.</Text>
              </View>
            </Animated.View>
          </Animated.View>
        )}

        {catAtiva === "Programas" && (
          <Animated.View entering={FadeInDown.delay(60).springify()}>
            {PROGRAMAS_LOJA.map((p) => (
              <Pressable key={p.nome} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} style={({ pressed }) => [styles.prodCard, { opacity: pressed ? 0.85 : 1 }]}>
                <View style={styles.prodIconBox}>
                  <Ionicons name="barbell-outline" size={22} color={Colors.gold} />
                </View>
                <View style={styles.prodInfo}>
                  <Text style={styles.prodNome}>{p.nome}</Text>
                  <View style={styles.prodMetaRow}>
                    <Text style={styles.prodNivel}>{p.nivel}</Text>
                    <View style={styles.prodRating}>
                      <Ionicons name="star" size={11} color={Colors.gold} />
                      <Text style={styles.prodRatingText}>{p.avaliacao}</Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.prodPreco}>{p.preco}</Text>
              </Pressable>
            ))}
          </Animated.View>
        )}

        {catAtiva === "Conteudo" && (
          <Animated.View entering={FadeInDown.delay(60).springify()}>
            {CONTEUDOS.map((c) => (
              <Pressable key={c.nome} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} style={({ pressed }) => [styles.prodCard, { opacity: pressed ? 0.85 : 1 }]}>
                <View style={[styles.prodIconBox, { backgroundColor: "rgba(96,165,250,0.1)", borderColor: "rgba(96,165,250,0.2)" }]}>
                  <Ionicons name={c.tipo === "PDF" ? "document-text-outline" : c.tipo === "Video" ? "play-circle-outline" : "construct-outline"} size={22} color="#60A5FA" />
                </View>
                <View style={styles.prodInfo}>
                  <Text style={styles.prodNome}>{c.nome}</Text>
                  <Text style={styles.prodNivel}>{c.tipo} - {c.paginas}</Text>
                </View>
                <Text style={styles.prodPreco}>{c.preco}</Text>
              </Pressable>
            ))}
          </Animated.View>
        )}
      </ScrollView>

      {/* Modal de Pagamento */}
      <Modal visible={showPayModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: "90%" }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{planoSel?.nome}</Text>
                {preco && <Text style={styles.modalSubtitle}>{preco}{periodoAnual ? "/ano" : "/mes"}</Text>}
              </View>
              <Pressable onPress={() => { setShowPayModal(false); setStep("metodo"); }}>
                <Ionicons name="close" size={22} color={Colors.muted} />
              </Pressable>
            </View>

            {step === "metodo" && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.stepLabel}>Escolha a forma de pagamento</Text>
                {METODOS_PGTO.map((m) => (
                  <Pressable
                    key={m.key}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMetodoPgto(m.key); }}
                    style={[styles.metodoCard, metodoPgto === m.key && styles.metodoCardAtivo]}
                  >
                    <View style={[styles.metodoIcon, metodoPgto === m.key && styles.metodoIconAtivo]}>
                      <Ionicons name={m.icon as any} size={22} color={metodoPgto === m.key ? Colors.gold : Colors.muted} />
                    </View>
                    <View style={styles.metodoInfo}>
                      <Text style={[styles.metodoLabel, metodoPgto === m.key && { color: Colors.gold }]}>{m.label}</Text>
                      <Text style={styles.metodoSub}>{m.sub}</Text>
                    </View>
                    {metodoPgto === m.key && <Ionicons name="checkmark-circle" size={20} color={Colors.gold} />}
                  </Pressable>
                ))}
                <Pressable onPress={() => setStep("dados")} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }, { marginTop: 16 }]}>
                  <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={styles.modalBtn}>
                    <Text style={styles.modalBtnText}>Continuar</Text>
                  </LinearGradient>
                </Pressable>
              </ScrollView>
            )}

            {step === "dados" && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {metodoPgto === "pix" && (
                  <View style={styles.pixBox}>
                    <View style={styles.pixQr}>
                      <Ionicons name="qr-code-outline" size={80} color={Colors.gold} />
                    </View>
                    <Text style={styles.pixKey}>Chave PIX: pagamentos@nexus.app</Text>
                    <Text style={styles.pixInstr}>Abra o app do seu banco, selecione PIX e escaneie o codigo QR ou use a chave acima. O acesso sera liberado em ate 5 minutos apos confirmacao.</Text>
                    <Pressable onPress={handleConfirmarPgto} disabled={processing} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }, { marginTop: 16 }]}>
                      <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={styles.modalBtn}>
                        {processing ? <ActivityIndicator size="small" color={Colors.black} /> : <Text style={styles.modalBtnText}>Ja paguei via PIX</Text>}
                      </LinearGradient>
                    </Pressable>
                  </View>
                )}

                {metodoPgto === "cartao" && (
                  <View>
                    <Text style={styles.stepLabel}>Dados do Cartao</Text>
                    <TextInput style={styles.payInput} placeholder="Numero do cartao" placeholderTextColor={Colors.muted} value={cardNum} onChangeText={setCardNum} keyboardType="number-pad" maxLength={19} />
                    <TextInput style={styles.payInput} placeholder="Nome no cartao" placeholderTextColor={Colors.muted} value={cardName} onChangeText={setCardName} autoCapitalize="characters" />
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      <TextInput style={[styles.payInput, { flex: 1 }]} placeholder="MM/AA" placeholderTextColor={Colors.muted} value={cardExp} onChangeText={setCardExp} keyboardType="number-pad" maxLength={5} />
                      <TextInput style={[styles.payInput, { flex: 1 }]} placeholder="CVV" placeholderTextColor={Colors.muted} value={cardCvv} onChangeText={setCardCvv} keyboardType="number-pad" maxLength={4} secureTextEntry />
                    </View>
                    <Pressable onPress={handleConfirmarPgto} disabled={processing} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }, { marginTop: 8 }]}>
                      <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={styles.modalBtn}>
                        {processing ? <ActivityIndicator size="small" color={Colors.black} /> : <Text style={styles.modalBtnText}>Pagar {preco}</Text>}
                      </LinearGradient>
                    </Pressable>
                  </View>
                )}

                {(metodoPgto === "paypal" || metodoPgto === "stripe") && (
                  <View style={styles.redirectBox}>
                    <Ionicons name={metodoPgto === "paypal" ? "logo-paypal" : "flash"} size={48} color={Colors.gold} style={{ marginBottom: 16 }} />
                    <Text style={styles.redirectTitle}>Redirecionando para {metodoPgto === "paypal" ? "PayPal" : "Stripe"}</Text>
                    <Text style={styles.redirectSub}>Voce sera redirecionado para a pagina segura de pagamento. Apos a confirmacao, seu acesso sera liberado automaticamente.</Text>
                    <Pressable onPress={handleConfirmarPgto} disabled={processing} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }, { marginTop: 20 }]}>
                      <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={styles.modalBtn}>
                        {processing ? <ActivityIndicator size="small" color={Colors.black} /> : <Text style={styles.modalBtnText}>Abrir {metodoPgto === "paypal" ? "PayPal" : "Stripe"}</Text>}
                      </LinearGradient>
                    </Pressable>
                  </View>
                )}
              </ScrollView>
            )}

            {step === "confirmacao" && (
              <View style={styles.successBox}>
                <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={styles.successIcon}>
                  <Ionicons name="checkmark" size={40} color={Colors.black} />
                </LinearGradient>
                <Text style={styles.successTitle}>Pagamento Processado!</Text>
                <Text style={styles.successSub}>Seu plano {planoSel?.nome} foi ativado com sucesso. Aproveite todos os recursos disponíveis.</Text>
                <Pressable onPress={() => { setShowPayModal(false); setStep("metodo"); router.push("/(tabs)"); }} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }, { marginTop: 20, width: "100%" }]}>
                  <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={styles.modalBtn}>
                    <Text style={styles.modalBtnText}>Comecando agora</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            )}
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
  planBadge: { backgroundColor: "rgba(212,175,55,0.12)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "rgba(212,175,55,0.25)" },
  planBadgeText: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: Colors.gold },
  catScroll: { paddingVertical: 12 },
  catTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  catTabAtiva: { backgroundColor: "rgba(212,175,55,0.15)", borderColor: "rgba(212,175,55,0.35)" },
  catText: { fontFamily: "Outfit_500Medium", fontSize: 13, color: Colors.muted },
  catTextAtivo: { fontFamily: "Outfit_700Bold", color: Colors.gold },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  toggleRow: { flexDirection: "row", backgroundColor: Colors.card, borderRadius: 14, padding: 4, marginBottom: 20, borderWidth: 1, borderColor: Colors.border },
  toggleBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 11 },
  toggleActive: { backgroundColor: "rgba(212,175,55,0.15)" },
  toggleText: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.muted },
  toggleTextActive: { color: Colors.gold },
  descontoBadge: { backgroundColor: "rgba(74,222,128,0.2)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  descontoText: { fontFamily: "Outfit_700Bold", fontSize: 10, color: "#4ADE80" },
  planoWrapper: { marginBottom: 14 },
  tagInlineRow: { flexDirection: "row", marginBottom: 4 },
  tagInline: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  tagInlineText: { fontFamily: "Outfit_700Bold", fontSize: 10, letterSpacing: 0.5 },
  planoCard: { borderRadius: 22, padding: 20, borderWidth: 1 },
  planoNome: { fontFamily: "Outfit_800ExtraBold", fontSize: 20, letterSpacing: -0.5, marginBottom: 8 },
  adminOnlyBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(212,175,55,0.08)", borderRadius: 12, padding: 12, marginBottom: 4 },
  adminOnlyText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: Colors.gold, flex: 1, lineHeight: 18 },
  planoPrecoRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: 4 },
  planoPreco: { fontFamily: "Outfit_800ExtraBold", fontSize: 26, letterSpacing: -0.5 },
  planoParcelado: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.muted },
  divisor: { height: 1, backgroundColor: Colors.border, marginVertical: 14 },
  recursoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  recursoText: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.text, flex: 1, lineHeight: 18 },
  planoBtn: { paddingVertical: 15, borderRadius: 14, alignItems: "center" },
  planoBtnText: { fontFamily: "Outfit_700Bold", fontSize: 15, color: Colors.black },
  garantiaCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: Colors.card, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: Colors.border, marginTop: 4, marginBottom: 16 },
  garantiaText: { flex: 1 },
  garantiaTitulo: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.text, marginBottom: 3 },
  garantiaSub: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  prodCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.card, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  prodIconBox: { width: 50, height: 50, borderRadius: 14, backgroundColor: "rgba(212,175,55,0.1)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(212,175,55,0.2)" },
  prodInfo: { flex: 1 },
  prodNome: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.text, marginBottom: 4, lineHeight: 20 },
  prodMetaRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  prodNivel: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.muted },
  prodRating: { flexDirection: "row", alignItems: "center", gap: 3 },
  prodRatingText: { fontFamily: "Outfit_600SemiBold", fontSize: 11, color: Colors.gold },
  prodPreco: { fontFamily: "Outfit_700Bold", fontSize: 15, color: Colors.gold },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: Colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, borderTopWidth: 1, borderColor: Colors.border, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 },
  modalTitle: { fontFamily: "Outfit_700Bold", fontSize: 20, color: Colors.text },
  modalSubtitle: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.gold, marginTop: 2 },
  stepLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 15, color: Colors.text, marginBottom: 16 },
  metodoCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.black, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: Colors.border, gap: 14 },
  metodoCardAtivo: { borderColor: "rgba(212,175,55,0.5)", backgroundColor: "rgba(212,175,55,0.06)" },
  metodoIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.card, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border },
  metodoIconAtivo: { backgroundColor: "rgba(212,175,55,0.1)", borderColor: "rgba(212,175,55,0.3)" },
  metodoInfo: { flex: 1 },
  metodoLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 15, color: Colors.text, marginBottom: 2 },
  metodoSub: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.muted },
  modalBtn: { paddingVertical: 16, borderRadius: 16, alignItems: "center" },
  modalBtnText: { fontFamily: "Outfit_700Bold", fontSize: 15, color: Colors.black },
  pixBox: { alignItems: "center", paddingVertical: 8 },
  pixQr: { width: 120, height: 120, borderRadius: 20, backgroundColor: Colors.black, alignItems: "center", justifyContent: "center", marginBottom: 16, borderWidth: 2, borderColor: "rgba(212,175,55,0.3)" },
  pixKey: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.gold, marginBottom: 12 },
  pixInstr: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.textSecondary, textAlign: "center", lineHeight: 20, paddingHorizontal: 10 },
  payInput: { backgroundColor: Colors.black, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1, borderColor: Colors.border, fontFamily: "Outfit_400Regular", fontSize: 15, color: Colors.text, marginBottom: 12 },
  redirectBox: { alignItems: "center", paddingVertical: 16 },
  redirectTitle: { fontFamily: "Outfit_700Bold", fontSize: 18, color: Colors.text, marginBottom: 10 },
  redirectSub: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.textSecondary, textAlign: "center", lineHeight: 20, paddingHorizontal: 10 },
  successBox: { alignItems: "center", paddingVertical: 16 },
  successIcon: { width: 80, height: 80, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  successTitle: { fontFamily: "Outfit_800ExtraBold", fontSize: 22, color: Colors.text, marginBottom: 10 },
  successSub: { fontFamily: "Outfit_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 22, paddingHorizontal: 10 },
});
