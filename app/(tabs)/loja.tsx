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
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetch } from "expo/fetch";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl } from "@/lib/query-client";

type CatLoja = "Planos" | "Programas" | "Conteudo" | "Livros" | "Artigos" | "Cursos" | "Vender";
const CATS_LOJA: CatLoja[] = ["Planos", "Programas", "Conteudo", "Livros", "Artigos", "Cursos", "Vender"];

type MetodoPgto = "cartao" | "pix" | "paypal" | "stripe";

const PROGRAMAS_LOJA = [
  { nome: "Hipertrofia Máxima 16 semanas", preco: "R$ 97", nivel: "Avançado", avaliacao: "4.9" },
  { nome: "Powerlifting Competição 20 semanas", preco: "R$ 147", nivel: "Elite", avaliacao: "4.8" },
  { nome: "Base de Força 8 semanas", preco: "R$ 47", nivel: "Iniciante", avaliacao: "4.7" },
];

const CONTEUDOS = [
  { nome: "Guia Completo de Periodização", tipo: "PDF", preco: "R$ 27", paginas: "87 páginas" },
  { nome: "Banco de Exercícios Científicos", tipo: "Vídeo", preco: "R$ 67", paginas: "120 vídeos" },
  { nome: "Calculadora de Volume Semanal", tipo: "Ferramenta", preco: "R$ 37", paginas: "Web App" },
];

const LIVROS = [
  { nome: "Ciência do Treinamento de Força", autor: "Dr. Mike Israetel", preco: "R$ 49", avaliacao: "4.9" },
  { nome: "Periodização para o Esporte", autor: "Tudor Bompa", preco: "R$ 39", avaliacao: "4.8" },
  { nome: "Nutrição para Alta Performance", autor: "Lyle McDonald", preco: "R$ 35", avaliacao: "4.7" },
];

const ARTIGOS = [
  { nome: "Hipertrofia Muscular: O que a Ciência Diz", tipo: "Artigo", preco: "Grátis", paginas: "12 min leitura" },
  { nome: "Periodização Ondulatória vs Linear", tipo: "Artigo Científico", preco: "R$ 9", paginas: "28 min leitura" },
  { nome: "Suplementação Baseada em Evidências", tipo: "E-book", preco: "R$ 19", paginas: "45 páginas" },
];

const CURSOS = [
  { nome: "Personal Trainer Científico", duracao: "40 horas", preco: "R$ 297", nivel: "Completo" },
  { nome: "Nutrição Esportiva Avançada", duracao: "20 horas", preco: "R$ 197", nivel: "Intermediário" },
  { nome: "Biomecânica Aplicada", duracao: "15 horas", preco: "R$ 147", nivel: "Avançado" },
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
    nome: "Vitalício Nexus",
    precoMensal: null,
    precoAnual: null,
    cor: Colors.gold,
    corDark: Colors.goldDark,
    tag: "ADMIN EXCLUSIVO",
    adminOnly: true,
    recursos: [
      "Atlas IA ilimitado vitaliciamente",
      "Todos os programas científicos",
      "Scanner nutricional avançado",
      "Prescrições ilimitadas para clientes",
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
      "Atlas IA com 500 perguntas/mês",
      "10 programas científicos",
      "Scanner nutricional completo",
      "Até 20 clientes ativos",
      "Prescrições com IA ilimitadas",
      "Vender na loja",
      "Atualizações mensais",
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
      "Atlas IA com 50 perguntas/mês",
      "3 programas científicos",
      "Scanner nutricional básico",
      "Até 5 clientes ativos",
      "Vender na loja",
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
      "Atlas IA básico (10x/mês)",
      "1 programa de treino",
      "Sem scanner nutricional",
      "Sem clientes",
    ],
  },
];

const METODOS_PGTO = [
  { key: "cartao" as MetodoPgto, label: "Cartão de Crédito", icon: "card-outline", sub: "Visa, Master, Elo, Amex" },
  { key: "pix" as MetodoPgto, label: "PIX", icon: "qr-code-outline", sub: "Aprovação instantânea" },
  { key: "paypal" as MetodoPgto, label: "PayPal", icon: "logo-paypal", sub: "Conta PayPal" },
  { key: "stripe" as MetodoPgto, label: "Stripe", icon: "flash-outline", sub: "Stripe Checkout" },
];

const STORE_CATS = ["Programa", "Conteúdo", "Livro", "Artigo", "Curso"];

interface StoreProduct {
  id: string;
  seller_name: string;
  name: string;
  description?: string;
  price: string;
  category: string;
  contact?: string;
}

export default function LojaScreen() {
  const insets = useSafeAreaInsets();
  const { user, token, isPro, isVitalicio, isStarter } = useAuth();
  const qc = useQueryClient();
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
  const [showVenderModal, setShowVenderModal] = useState(false);
  const [prodNome, setProdNome] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodPreco, setProdPreco] = useState("");
  const [prodCat, setProdCat] = useState(STORE_CATS[0]);
  const [prodContato, setProdContato] = useState("");
  const [enviandoProd, setEnviandoProd] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const baseUrl = getApiUrl();

  const { data: communityProducts = [] } = useQuery<StoreProduct[]>({
    queryKey: ["/api/store/products"],
    queryFn: async () => {
      const res = await fetch(`${baseUrl}api/store/products`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.products || [];
    },
  });

  const getCurrentPlanLabel = () => {
    if (isVitalicio) return "Vitalício Nexus";
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

  const handleEnviarProduto = async () => {
    if (!prodNome.trim() || !prodPreco.trim()) return;
    if (!isStarter) return;
    setEnviandoProd(true);
    try {
      const res = await fetch(`${baseUrl}api/store/products`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: prodNome, description: prodDesc, price: prodPreco, category: prodCat, contact: prodContato }),
      });
      if (res.ok) {
        qc.invalidateQueries({ queryKey: ["/api/store/products"] });
        setShowVenderModal(false);
        setProdNome(""); setProdDesc(""); setProdPreco(""); setProdContato("");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {}
    setEnviandoProd(false);
  };

  const planoAtual = getCurrentPlanLabel();
  const preco = planoSel ? (periodoAnual ? planoSel.precoAnual : planoSel.precoMensal) : null;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View>
          <Text style={styles.pageTitle}>Loja</Text>
          <Text style={styles.pageSubtitle}>Planos, conteúdo e comunidade</Text>
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
                  <LinearGradient colors={[`${p.cor}10`, `${p.cor}04`]} style={[styles.planoCard, { borderColor: `${p.cor}30` }]}>
                    <Text style={[styles.planoNome, { color: p.cor }]}>{p.nome}</Text>
                    {p.adminOnly ? (
                      <View style={styles.adminOnlyBox}>
                        <Ionicons name="shield-checkmark" size={16} color={Colors.gold} />
                        <Text style={styles.adminOnlyText}>Concedido a administradores automaticamente</Text>
                      </View>
                    ) : (
                      <View style={styles.planoPrecoRow}>
                        <Text style={[styles.planoPreco, { color: p.cor }]}>{precoExib}</Text>
                        <Text style={styles.planoParcelado}>{periodoAnual ? "/ano" : "/mês"}</Text>
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
                      <Pressable onPress={() => { if (!isCurrent) handleAssinar(p); }} disabled={isCurrent} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }, { marginTop: 16 }]}>
                        <LinearGradient colors={isCurrent ? [Colors.border, Colors.border] : [p.corDark, p.cor]} style={styles.planoBtn}>
                          <Text style={[styles.planoBtnText, isCurrent && { color: Colors.muted }]}>
                            {isCurrent ? "Plano Atual" : isFree ? "Continuar Grátis" : `Assinar ${p.nome}`}
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
                <Text style={styles.garantiaSub}>Satisfação garantida ou reembolso total sem perguntas.</Text>
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
                  <Ionicons name={c.tipo === "PDF" ? "document-text-outline" : c.tipo === "Vídeo" ? "play-circle-outline" : "construct-outline"} size={22} color="#60A5FA" />
                </View>
                <View style={styles.prodInfo}>
                  <Text style={styles.prodNome}>{c.nome}</Text>
                  <Text style={styles.prodNivel}>{c.tipo} · {c.paginas}</Text>
                </View>
                <Text style={styles.prodPreco}>{c.preco}</Text>
              </Pressable>
            ))}
          </Animated.View>
        )}

        {catAtiva === "Livros" && (
          <Animated.View entering={FadeInDown.delay(60).springify()}>
            <Text style={styles.catDesc}>Livros científicos selecionados sobre treinamento e nutrição esportiva</Text>
            {LIVROS.map((l) => (
              <Pressable key={l.nome} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} style={({ pressed }) => [styles.prodCard, { opacity: pressed ? 0.85 : 1 }]}>
                <View style={[styles.prodIconBox, { backgroundColor: "rgba(167,139,250,0.1)", borderColor: "rgba(167,139,250,0.2)" }]}>
                  <Ionicons name="book-outline" size={22} color="#A78BFA" />
                </View>
                <View style={styles.prodInfo}>
                  <Text style={styles.prodNome}>{l.nome}</Text>
                  <View style={styles.prodMetaRow}>
                    <Text style={styles.prodNivel}>{l.autor}</Text>
                    <View style={styles.prodRating}>
                      <Ionicons name="star" size={11} color={Colors.gold} />
                      <Text style={styles.prodRatingText}>{l.avaliacao}</Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.prodPreco}>{l.preco}</Text>
              </Pressable>
            ))}
          </Animated.View>
        )}

        {catAtiva === "Artigos" && (
          <Animated.View entering={FadeInDown.delay(60).springify()}>
            <Text style={styles.catDesc}>Artigos e e-books baseados em evidências científicas</Text>
            {ARTIGOS.map((a) => (
              <Pressable key={a.nome} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} style={({ pressed }) => [styles.prodCard, { opacity: pressed ? 0.85 : 1 }]}>
                <View style={[styles.prodIconBox, { backgroundColor: "rgba(244,114,182,0.1)", borderColor: "rgba(244,114,182,0.2)" }]}>
                  <Ionicons name="newspaper-outline" size={22} color="#F472B6" />
                </View>
                <View style={styles.prodInfo}>
                  <Text style={styles.prodNome}>{a.nome}</Text>
                  <Text style={styles.prodNivel}>{a.tipo} · {a.paginas}</Text>
                </View>
                <Text style={[styles.prodPreco, a.preco === "Grátis" && { color: "#4ADE80" }]}>{a.preco}</Text>
              </Pressable>
            ))}
          </Animated.View>
        )}

        {catAtiva === "Cursos" && (
          <Animated.View entering={FadeInDown.delay(60).springify()}>
            <Text style={styles.catDesc}>Cursos completos de formação em ciências do esporte</Text>
            {CURSOS.map((c) => (
              <Pressable key={c.nome} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} style={({ pressed }) => [styles.prodCard, { opacity: pressed ? 0.85 : 1 }]}>
                <View style={[styles.prodIconBox, { backgroundColor: "rgba(251,146,60,0.1)", borderColor: "rgba(251,146,60,0.2)" }]}>
                  <Ionicons name="school-outline" size={22} color="#FB923C" />
                </View>
                <View style={styles.prodInfo}>
                  <Text style={styles.prodNome}>{c.nome}</Text>
                  <View style={styles.prodMetaRow}>
                    <Text style={styles.prodNivel}>{c.nivel}</Text>
                    <Text style={styles.prodNivel}>{c.duracao}</Text>
                  </View>
                </View>
                <Text style={styles.prodPreco}>{c.preco}</Text>
              </Pressable>
            ))}
          </Animated.View>
        )}

        {catAtiva === "Vender" && (
          <Animated.View entering={FadeInDown.delay(60).springify()}>
            <LinearGradient colors={["rgba(212,175,55,0.1)", "rgba(212,175,55,0.04)"]} style={styles.venderInfoCard}>
              <Ionicons name="storefront-outline" size={28} color={Colors.gold} style={{ marginBottom: 10 }} />
              <Text style={styles.venderTitle}>Venda na Loja Nexus</Text>
              <Text style={styles.venderDesc}>
                Qualquer assinante pode publicar seus produtos — programas, conteúdos, livros, artigos ou cursos. Todos os anúncios passam por revisão do administrador antes de serem publicados.
              </Text>
              {!isStarter ? (
                <View style={styles.lockVender}>
                  <Ionicons name="lock-closed-outline" size={16} color={Colors.gold} />
                  <Text style={styles.lockVenderText}>Disponível para assinantes (Starter ou superior)</Text>
                </View>
              ) : (
                <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowVenderModal(true); }} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }, { width: "100%" }]}>
                  <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={styles.venderBtn}>
                    <Ionicons name="add-circle-outline" size={18} color={Colors.black} />
                    <Text style={styles.venderBtnText}>Publicar Produto</Text>
                  </LinearGradient>
                </Pressable>
              )}
            </LinearGradient>

            {communityProducts.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Produtos da Comunidade</Text>
                {communityProducts.map((p) => (
                  <Pressable key={p.id} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} style={({ pressed }) => [styles.prodCard, { opacity: pressed ? 0.85 : 1 }]}>
                    <View style={[styles.prodIconBox, { backgroundColor: "rgba(212,175,55,0.1)" }]}>
                      <Ionicons name="person-circle-outline" size={22} color={Colors.gold} />
                    </View>
                    <View style={styles.prodInfo}>
                      <Text style={styles.prodNome}>{p.name}</Text>
                      <Text style={styles.prodNivel}>{p.category} · @{p.seller_name}</Text>
                      {p.description ? <Text style={styles.prodDesc} numberOfLines={1}>{p.description}</Text> : null}
                    </View>
                    <Text style={styles.prodPreco}>{p.price}</Text>
                  </Pressable>
                ))}
              </>
            )}

            {communityProducts.length === 0 && (
              <View style={styles.emptyBox}>
                <Ionicons name="bag-outline" size={32} color={Colors.muted} />
                <Text style={styles.emptyText}>Nenhum produto da comunidade ainda</Text>
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>

      {/* Modal Pagamento */}
      <Modal visible={showPayModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: "90%" }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{planoSel?.nome}</Text>
                {preco && <Text style={styles.modalSubtitle}>{preco}{periodoAnual ? "/ano" : "/mês"}</Text>}
              </View>
              <Pressable onPress={() => { setShowPayModal(false); setStep("metodo"); }}>
                <Ionicons name="close" size={22} color={Colors.muted} />
              </Pressable>
            </View>

            {step === "metodo" && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.stepLabel}>Escolha a forma de pagamento</Text>
                {METODOS_PGTO.map((m) => (
                  <Pressable key={m.key} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMetodoPgto(m.key); }} style={[styles.metodoCard, metodoPgto === m.key && styles.metodoCardAtivo]}>
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
                    <View style={styles.pixQr}><Ionicons name="qr-code-outline" size={80} color={Colors.gold} /></View>
                    <Text style={styles.pixKey}>Chave PIX: pagamentos@nexus.app</Text>
                    <Text style={styles.pixInstr}>Abra o app do seu banco, selecione PIX e escaneie o código QR ou use a chave acima. O acesso será liberado em até 5 minutos após confirmação.</Text>
                    <Pressable onPress={handleConfirmarPgto} disabled={processing} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }, { marginTop: 16 }]}>
                      <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={styles.modalBtn}>
                        {processing ? <ActivityIndicator size="small" color={Colors.black} /> : <Text style={styles.modalBtnText}>Já paguei via PIX</Text>}
                      </LinearGradient>
                    </Pressable>
                  </View>
                )}
                {metodoPgto === "cartao" && (
                  <View>
                    <Text style={styles.stepLabel}>Dados do Cartão</Text>
                    <TextInput style={styles.payInput} placeholder="Número do cartão" placeholderTextColor={Colors.muted} value={cardNum} onChangeText={setCardNum} keyboardType="number-pad" maxLength={19} />
                    <TextInput style={styles.payInput} placeholder="Nome no cartão" placeholderTextColor={Colors.muted} value={cardName} onChangeText={setCardName} autoCapitalize="characters" />
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
                    <Text style={styles.redirectSub}>Você será redirecionado para a página segura de pagamento. Após a confirmação, seu acesso será liberado automaticamente.</Text>
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
                    <Text style={styles.modalBtnText}>Começando agora</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Vender */}
      <Modal visible={showVenderModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: "90%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Publicar Produto</Text>
              <Pressable onPress={() => setShowVenderModal(false)}>
                <Ionicons name="close" size={22} color={Colors.muted} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.venderLegal}>Seu produto passará por revisão antes de ser publicado. Certifique-se de que está dentro das categorias permitidas.</Text>
              <Text style={styles.fieldLabel}>Nome do produto *</Text>
              <TextInput style={styles.payInput} placeholder="Ex: Programa 12 semanas Hipertrofia" placeholderTextColor={Colors.muted} value={prodNome} onChangeText={setProdNome} />
              <Text style={styles.fieldLabel}>Descrição</Text>
              <TextInput style={[styles.payInput, { height: 80, textAlignVertical: "top" }]} placeholder="Descreva seu produto..." placeholderTextColor={Colors.muted} value={prodDesc} onChangeText={setProdDesc} multiline />
              <Text style={styles.fieldLabel}>Preço *</Text>
              <TextInput style={styles.payInput} placeholder="Ex: R$ 97" placeholderTextColor={Colors.muted} value={prodPreco} onChangeText={setProdPreco} />
              <Text style={styles.fieldLabel}>Categoria *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
                {STORE_CATS.map((c) => (
                  <Pressable key={c} onPress={() => setProdCat(c)} style={[styles.catChip, prodCat === c && styles.catChipAtivo]}>
                    <Text style={[styles.catChipText, prodCat === c && styles.catChipTextAtivo]}>{c}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Text style={styles.fieldLabel}>Contato (WhatsApp, email, etc.)</Text>
              <TextInput style={styles.payInput} placeholder="Como o comprador pode te contatar" placeholderTextColor={Colors.muted} value={prodContato} onChangeText={setProdContato} />
              <Pressable onPress={handleEnviarProduto} disabled={enviandoProd || !prodNome.trim() || !prodPreco.trim()} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }, { marginTop: 8 }]}>
                <LinearGradient colors={prodNome.trim() && prodPreco.trim() ? [Colors.goldDark, Colors.gold] : [Colors.border, Colors.border]} style={styles.modalBtn}>
                  {enviandoProd ? <ActivityIndicator size="small" color={Colors.black} /> : <Text style={[styles.modalBtnText, (!prodNome.trim() || !prodPreco.trim()) && { color: Colors.muted }]}>Enviar para Revisão</Text>}
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
  planBadge: { backgroundColor: "rgba(212,175,55,0.12)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "rgba(212,175,55,0.25)" },
  planBadgeText: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: Colors.gold },
  catScroll: { paddingVertical: 12 },
  catTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  catTabAtiva: { backgroundColor: "rgba(212,175,55,0.15)", borderColor: "rgba(212,175,55,0.35)" },
  catText: { fontFamily: "Outfit_500Medium", fontSize: 13, color: Colors.muted },
  catTextAtivo: { fontFamily: "Outfit_700Bold", color: Colors.gold },
  catDesc: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.textSecondary, marginBottom: 16, lineHeight: 20 },
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
  garantiaCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: Colors.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 8 },
  garantiaText: { flex: 1 },
  garantiaTitulo: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.text, marginBottom: 3 },
  garantiaSub: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  prodCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.card, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  prodIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(212,175,55,0.1)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(212,175,55,0.2)" },
  prodInfo: { flex: 1 },
  prodNome: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.text, marginBottom: 4 },
  prodDesc: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.muted, marginTop: 2 },
  prodMetaRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  prodNivel: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.muted },
  prodRating: { flexDirection: "row", alignItems: "center", gap: 3 },
  prodRatingText: { fontFamily: "Outfit_500Medium", fontSize: 11, color: Colors.gold },
  prodPreco: { fontFamily: "Outfit_700Bold", fontSize: 14, color: Colors.gold },
  sectionLabel: { fontFamily: "Outfit_700Bold", fontSize: 16, color: Colors.text, marginBottom: 12, marginTop: 4 },
  venderInfoCard: { borderRadius: 22, padding: 20, borderWidth: 1, borderColor: "rgba(212,175,55,0.2)", alignItems: "center", marginBottom: 20 },
  venderTitle: { fontFamily: "Outfit_800ExtraBold", fontSize: 20, color: Colors.gold, marginBottom: 8 },
  venderDesc: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.textSecondary, textAlign: "center", lineHeight: 20, marginBottom: 16 },
  lockVender: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(212,175,55,0.08)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(212,175,55,0.15)" },
  lockVenderText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: Colors.gold },
  venderBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 16, width: "100%" },
  venderBtnText: { fontFamily: "Outfit_700Bold", fontSize: 15, color: Colors.black },
  emptyBox: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyText: { fontFamily: "Outfit_500Medium", fontSize: 13, color: Colors.muted },
  fieldLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.textSecondary, marginBottom: 8, marginTop: 4 },
  venderLegal: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.muted, lineHeight: 18, marginBottom: 16, backgroundColor: "rgba(212,175,55,0.06)", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "rgba(212,175,55,0.15)" },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  catChipAtivo: { backgroundColor: "rgba(212,175,55,0.15)", borderColor: "rgba(212,175,55,0.4)" },
  catChipText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: Colors.muted },
  catChipTextAtivo: { color: Colors.gold, fontFamily: "Outfit_600SemiBold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: Colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, borderTopWidth: 1, borderColor: Colors.border, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 12 },
  modalTitle: { fontFamily: "Outfit_700Bold", fontSize: 20, color: Colors.text, flex: 1 },
  modalSubtitle: { fontFamily: "Outfit_400Regular", fontSize: 14, color: Colors.gold, marginTop: 2 },
  stepLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.textSecondary, marginBottom: 14 },
  metodoCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: Colors.black, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  metodoCardAtivo: { borderColor: "rgba(212,175,55,0.4)", backgroundColor: "rgba(212,175,55,0.06)" },
  metodoIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: Colors.card, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border },
  metodoIconAtivo: { borderColor: "rgba(212,175,55,0.3)", backgroundColor: "rgba(212,175,55,0.1)" },
  metodoInfo: { flex: 1 },
  metodoLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.text, marginBottom: 2 },
  metodoSub: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.muted },
  modalBtn: { paddingVertical: 15, borderRadius: 14, alignItems: "center" },
  modalBtnText: { fontFamily: "Outfit_700Bold", fontSize: 15, color: Colors.black },
  pixBox: { alignItems: "center" },
  pixQr: { width: 140, height: 140, borderRadius: 20, backgroundColor: "rgba(212,175,55,0.1)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(212,175,55,0.2)", marginBottom: 16 },
  pixKey: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.gold, marginBottom: 10 },
  pixInstr: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.textSecondary, textAlign: "center", lineHeight: 18, marginBottom: 4 },
  redirectBox: { alignItems: "center", paddingVertical: 10 },
  redirectTitle: { fontFamily: "Outfit_700Bold", fontSize: 18, color: Colors.text, marginBottom: 10 },
  redirectSub: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.textSecondary, textAlign: "center", lineHeight: 20 },
  successBox: { alignItems: "center", paddingVertical: 20 },
  successIcon: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  successTitle: { fontFamily: "Outfit_800ExtraBold", fontSize: 22, color: Colors.text, marginBottom: 10 },
  successSub: { fontFamily: "Outfit_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 20, paddingHorizontal: 10 },
  payInput: { backgroundColor: Colors.black, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: Colors.border, fontFamily: "Outfit_400Regular", fontSize: 14, color: Colors.text, marginBottom: 12 },
});
