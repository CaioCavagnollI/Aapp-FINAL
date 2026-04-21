import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
  Modal, TextInput, ActivityIndicator,
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
import { useTheme } from "@/contexts/ThemeContext";
import { getApiUrl } from "@/lib/query-client";

type StoreTab = "planos" | "produtos" | "mentores" | "vender";

const PLANOS = [
  {
    id: "free", nome: "Gratuito", precoMensal: null, precoAnual: null,
    cor: Colors.muted, tag: "Atual",
    recursos: ["Atlas Brain (limitado)", "5 prescrições/mês", "Scanner básico", "Biblioteca de exercícios"],
  },
  {
    id: "starter_monthly", nome: "Starter", precoMensal: "R$ 29/mês", precoAnual: "R$ 249/ano",
    cor: "#60A5FA", tag: "Popular",
    recursos: ["Atlas Brain completo", "Prescrições ilimitadas", "Scanner avançado", "Meus Treinos completo", "Atlas Tools"],
  },
  {
    id: "pro_monthly", nome: "Pro", precoMensal: "R$ 59/mês", precoAnual: "R$ 499/ano",
    cor: "#A78BFA", tag: "Recomendado",
    recursos: ["Tudo do Starter", "Clientes ilimitados", "Acervo Atlas completo", "Exportação de prescrições", "Mentores Atlas", "Orientação Acadêmica"],
  },
  {
    id: "vitalicio", nome: "Vitalício", precoMensal: null, precoAnual: "R$ 997 (único)",
    cor: Colors.gold, tag: "Melhor Valor",
    recursos: ["Tudo do Pro", "Acesso vitalício", "Todas as futuras atualizações", "Suporte prioritário", "Badge exclusivo"],
  },
];

const PRODUTOS_MOCK = [
  { nome: "Programa Hipertrofia Máxima 16 sem", tipo: "Programa", preco: "R$ 97", avaliacao: "4.9", autor: "Carlos M.", icon: "barbell-outline" },
  { nome: "Fundamentos do Treinamento de Força", tipo: "Audiobook", preco: "R$ 49", avaliacao: "4.8", autor: "Ana R.", icon: "headset-outline" },
  { nome: "Guia Completo de Periodização", tipo: "E-book", preco: "R$ 27", avaliacao: "4.7", autor: "Pedro S.", icon: "book-outline" },
  { nome: "Powerlifting Competição 20 sem", tipo: "Programa", preco: "R$ 147", avaliacao: "4.8", autor: "Rafael B.", icon: "barbell-outline" },
  { nome: "Nutrição Esportiva Baseada em Evidências", tipo: "Curso", preco: "R$ 197", avaliacao: "4.9", autor: "Dra. Marina L.", icon: "school-outline" },
  { nome: "Base de Força para Iniciantes", tipo: "Programa", preco: "R$ 47", avaliacao: "4.7", autor: "João F.", icon: "barbell-outline" },
];

const TIPO_ICONS: Record<string, string> = {
  Programa: "barbell-outline",
  Audiobook: "headset-outline",
  "E-book": "book-outline",
  Curso: "school-outline",
  Artigo: "document-text-outline",
};

const TIPO_CORES: Record<string, string> = {
  Programa: "#D4AF37",
  Audiobook: "#60A5FA",
  "E-book": "#4ADE80",
  Curso: "#A78BFA",
  Artigo: "#F472B6",
};

const MENTORES = [
  { nome: "Dr. Carlos Mendes", especialidade: "Fisiologia do Exercício", avaliacao: "4.9", preco: "R$ 300/mês", clientes: 42, badge: "Verificado" },
  { nome: "Ana Paula Rocha", especialidade: "Emagrecimento & Nutrição", avaliacao: "4.8", preco: "R$ 250/mês", clientes: 38, badge: "Top Mentor" },
  { nome: "Rafael Borges", especialidade: "Powerlifting & Força", avaliacao: "5.0", preco: "R$ 350/mês", clientes: 25, badge: "Elite" },
  { nome: "Marina Lima", especialidade: "Orientação Acadêmica", avaliacao: "4.9", preco: "R$ 200/mês", clientes: 15, badge: "Acadêmico" },
];

export default function AtlasStoreScreen() {
  const insets = useSafeAreaInsets();
  const { user, token, isPro } = useAuth();
  const { colors, isDark } = useTheme();
  const qc = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const [tab, setTab] = useState<StoreTab>("planos");
  const [tipoFilter, setTipoFilter] = useState("Todos");
  const [showSellModal, setShowSellModal] = useState(false);
  const [prodNome, setProdNome] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodPreco, setProdPreco] = useState("");
  const [prodCategoria, setProdCategoria] = useState("Programa");
  const [prodContato, setProdContato] = useState("");
  const [showCheckout, setShowCheckout] = useState<string | null>(null);
  const [showMentorModal, setShowMentorModal] = useState(false);
  const [mentorNome, setMentorNome] = useState("");
  const [mentorBio, setMentorBio] = useState("");
  const [mentorEsp, setMentorEsp] = useState("");
  const [mentorPreco, setMentorPreco] = useState("");
  const [mentorContato, setMentorContato] = useState("");

  const bg = isDark ? Colors.black : Colors.lightBg;
  const cardBg = isDark ? Colors.card : Colors.lightCard;
  const textColor = isDark ? Colors.text : Colors.lightText;
  const textSec = isDark ? Colors.textSecondary : Colors.lightTextSecondary;
  const borderColor = isDark ? Colors.border : Colors.lightBorder;
  const inputBg = isDark ? Colors.cardElevated : "#F0F0F5";

  const { data: prodData } = useQuery<{ products: any[] }>({
    queryKey: ["/api/store/products"],
    queryFn: async () => {
      const res = await fetch(`${getApiUrl()}api/store/products`);
      return res.json();
    },
  });

  const addProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`${getApiUrl()}api/store/products`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(data) });
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/store/products"] }); setShowSellModal(false); setProdNome(""); setProdDesc(""); setProdPreco(""); },
  });

  const TABS: { key: StoreTab; label: string; icon: string }[] = [
    { key: "planos", label: "Planos", icon: "star-outline" },
    { key: "produtos", label: "Produtos", icon: "grid-outline" },
    { key: "mentores", label: "Mentores Atlas", icon: "people-outline" },
    { key: "vender", label: "Vender", icon: "storefront-outline" },
  ];

  const TIPOS = ["Todos", "Programa", "Audiobook", "E-book", "Curso", "Artigo"];

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: bg, borderBottomColor: borderColor }]}>
        <View>
          <Text style={[styles.title, { color: textColor }]}>Atlas Store</Text>
          <Text style={[styles.subtitle, { color: textSec }]}>Atlas Market — Planos · Produtos · Mentores</Text>
        </View>
        <View style={[styles.planBadge, { backgroundColor: Colors.gold + "22", borderColor: Colors.gold + "44" }]}>
          <Ionicons name="star" size={14} color={Colors.gold} />
          <Text style={[styles.planBadgeText, { color: Colors.gold }]}>{user?.plan === "vitalicio" ? "Vitalício" : user?.plan === "free" ? "Free" : user?.plan?.replace("_", " ") ?? "Free"}</Text>
        </View>
      </View>

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabScroll, { backgroundColor: bg, borderBottomColor: borderColor }]}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {TABS.map(t => (
          <Pressable key={t.key} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTab(t.key); }}
            style={[styles.tabBtn, { borderColor: tab === t.key ? Colors.gold : borderColor, backgroundColor: tab === t.key ? Colors.gold + "22" : "transparent" }]}>
            <Ionicons name={t.icon as any} size={13} color={tab === t.key ? Colors.gold : textSec} />
            <Text style={[styles.tabText, { color: tab === t.key ? Colors.gold : textSec }]}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Planos */}
      {tab === "planos" && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: botPad + 80 }}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Escolha seu Plano</Text>
          <Text style={[styles.sectionSub, { color: textSec }]}>Desbloqueie todo o potencial do Nexus Atlas</Text>
          {PLANOS.map((plano, i) => (
            <Animated.View key={plano.id} entering={FadeInDown.delay(i * 80)}>
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowCheckout(plano.id); }}
                style={[styles.planoCard, { backgroundColor: cardBg, borderColor: plano.id === user?.plan ? plano.cor : borderColor, borderWidth: plano.id === user?.plan ? 2 : 1 }]}
              >
                <LinearGradient colors={[plano.cor + "22", "transparent"]} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} />
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <Text style={[styles.planoNome, { color: plano.cor }]}>{plano.nome}</Text>
                  <View style={[styles.planoTag, { backgroundColor: plano.cor + "22" }]}>
                    <Text style={[styles.planoTagText, { color: plano.cor }]}>{plano.id === user?.plan ? "✓ Atual" : plano.tag}</Text>
                  </View>
                </View>
                {plano.precoMensal && <Text style={[styles.planoPrecoMensal, { color: textColor }]}>{plano.precoMensal}</Text>}
                {plano.precoAnual && <Text style={[styles.planoPrecoAnual, { color: textSec }]}>{plano.precoAnual}</Text>}
                {!plano.precoMensal && !plano.precoAnual && <Text style={[styles.planoPrecoMensal, { color: textColor }]}>Gratuito</Text>}
                <View style={{ marginTop: 12, gap: 6 }}>
                  {plano.recursos.map((r, j) => (
                    <View key={j} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Ionicons name="checkmark-circle" size={14} color={plano.cor} />
                      <Text style={[styles.planoRecurso, { color: textSec }]}>{r}</Text>
                    </View>
                  ))}
                </View>
                {plano.id !== user?.plan && plano.id !== "free" && (
                  <View style={[styles.assinBtn, { backgroundColor: plano.cor }]}>
                    <Text style={styles.assinBtnText}>Assinar {plano.nome}</Text>
                  </View>
                )}
              </Pressable>
            </Animated.View>
          ))}

          {/* Métodos de pagamento */}
          <View style={[styles.pgtoCard, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.pgtoTitle, { color: textColor }]}>Métodos de Pagamento Aceitos</Text>
            <View style={styles.pgtoRow}>
              {[["card-outline", "Cartão de Crédito"], ["qr-code-outline", "Pix"], ["logo-paypal", "PayPal"], ["card", "Stripe"]].map(([icon, label]) => (
                <View key={label} style={[styles.pgtoItem, { borderColor }]}>
                  <Ionicons name={icon as any} size={20} color={Colors.gold} />
                  <Text style={[styles.pgtoLabel, { color: textSec }]}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {/* Produtos */}
      {tab === "produtos" && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: botPad + 80 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {TIPOS.map(t => (
              <Pressable key={t} onPress={() => setTipoFilter(t)} style={[styles.tipoChip, { borderColor: tipoFilter === t ? Colors.gold : borderColor, backgroundColor: tipoFilter === t ? Colors.gold + "22" : "transparent" }]}>
                <Text style={[styles.tipoChipText, { color: tipoFilter === t ? Colors.gold : textSec }]}>{t}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {PRODUTOS_MOCK.filter(p => tipoFilter === "Todos" || p.tipo === tipoFilter).map((p, i) => (
            <Animated.View key={i} entering={FadeInDown.delay(i * 50)} style={[styles.prodCard, { backgroundColor: cardBg, borderColor }]}>
              <View style={[styles.prodIcon, { backgroundColor: (TIPO_CORES[p.tipo] || Colors.gold) + "22" }]}>
                <Ionicons name={(TIPO_ICONS[p.tipo] || "document-outline") as any} size={22} color={TIPO_CORES[p.tipo] || Colors.gold} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.prodNome, { color: textColor }]}>{p.nome}</Text>
                <Text style={[styles.prodAutor, { color: textSec }]}>por {p.autor}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <View style={[styles.tipoTag, { backgroundColor: (TIPO_CORES[p.tipo] || Colors.gold) + "22" }]}>
                    <Text style={[styles.tipoTagText, { color: TIPO_CORES[p.tipo] || Colors.gold }]}>{p.tipo}</Text>
                  </View>
                  <Text style={[styles.prodAvaliacao, { color: textSec }]}>⭐ {p.avaliacao}</Text>
                </View>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.prodPreco, { color: Colors.gold }]}>{p.preco}</Text>
                <Pressable style={[styles.comprarBtn, { backgroundColor: Colors.gold }]}>
                  <Text style={styles.comprarBtnText}>Comprar</Text>
                </Pressable>
              </View>
            </Animated.View>
          ))}
        </ScrollView>
      )}

      {/* Mentores Atlas */}
      {tab === "mentores" && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: botPad + 80 }}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Mentores Atlas</Text>
          <Text style={[styles.sectionSub, { color: textSec }]}>Personal Trainers e Acadêmicos verificados para orientação profissional e acadêmica</Text>

          {/* Academic Guidance Highlight */}
          <View style={[styles.academicCard, { backgroundColor: cardBg, borderColor: "#3B82F6" + "44" }]}>
            <LinearGradient colors={["#3B82F6" + "22", "transparent"]} style={[StyleSheet.absoluteFill, { borderRadius: 14 }]} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <Ionicons name="school-outline" size={22} color="#3B82F6" />
              <Text style={[styles.academicTitle, { color: textColor }]}>Orientação Acadêmica</Text>
              <View style={[styles.proTag, { backgroundColor: "#3B82F6" + "22" }]}>
                <Text style={[styles.proTagText, { color: "#3B82F6" }]}>Pro+</Text>
              </View>
            </View>
            <Text style={[styles.academicDesc, { color: textSec }]}>Submissions para revisão, orientação de trabalhos científicos, correções com patches auditáveis em DOCX, tradução de conteúdo acadêmico e acompanhamento de métricas.</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {["Revisão de TCC/Artigos", "Patches auditáveis DOCX", "Tradução Acadêmica", "Métricas de Progresso"].map((f, i) => (
                <View key={i} style={[styles.featureTag, { backgroundColor: "#3B82F6" + "22" }]}>
                  <Text style={[styles.featureTagText, { color: "#3B82F6" }]}>{f}</Text>
                </View>
              ))}
            </View>
          </View>

          {MENTORES.map((m, i) => (
            <Animated.View key={i} entering={FadeInDown.delay(i * 70)} style={[styles.mentorCard, { backgroundColor: cardBg, borderColor }]}>
              <View style={[styles.mentorAvatar, { backgroundColor: Colors.gold + "22" }]}>
                <Ionicons name="person-outline" size={24} color={Colors.gold} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={[styles.mentorNome, { color: textColor }]}>{m.nome}</Text>
                  <View style={[styles.mentorBadge, { backgroundColor: Colors.gold + "22" }]}>
                    <Text style={[styles.mentorBadgeText, { color: Colors.gold }]}>{m.badge}</Text>
                  </View>
                </View>
                <Text style={[styles.mentorEsp, { color: textSec }]}>{m.especialidade}</Text>
                <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                  <Text style={[styles.mentorMeta, { color: textSec }]}>⭐ {m.avaliacao}</Text>
                  <Text style={[styles.mentorMeta, { color: textSec }]}>👥 {m.clientes} clientes</Text>
                </View>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.mentorPreco, { color: Colors.gold }]}>{m.preco}</Text>
                <Pressable style={[styles.contratarBtn, { borderColor: Colors.gold }]}>
                  <Text style={[styles.contratarBtnText, { color: Colors.gold }]}>Contratar</Text>
                </Pressable>
              </View>
            </Animated.View>
          ))}

          <Pressable onPress={() => setShowMentorModal(true)} style={[styles.tornarseMentorBtn, { borderColor: Colors.gold }]}>
            <Ionicons name="add-circle-outline" size={18} color={Colors.gold} />
            <Text style={[styles.tornarseMentorText, { color: Colors.gold }]}>Tornar-se Mentor Atlas</Text>
          </Pressable>
        </ScrollView>
      )}

      {/* Vender */}
      {tab === "vender" && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: botPad + 80 }}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Vender no Atlas Store</Text>
          <Text style={[styles.sectionSub, { color: textSec }]}>Publique seus programas, audiobooks, e-books, cursos e mais para a comunidade Atlas</Text>
          <View style={[styles.sellInfoCard, { backgroundColor: cardBg, borderColor }]}>
            {[["barbell-outline", "Programas de Treino", "Venda seus programas completos com periodização"], ["headset-outline", "Audiobooks", "Publique conteúdo em áudio para consumo no app"], ["book-outline", "E-books & PDFs", "Materiais educativos em formato digital"], ["school-outline", "Cursos Online", "Sequências estruturadas de aprendizado"], ["document-text-outline", "Artigos Científicos", "Conteúdo científico revisado e premium"]].map(([icon, nome, desc], i) => (
              <View key={i} style={[styles.prodTypeRow, { borderBottomColor: borderColor, borderBottomWidth: i < 4 ? 1 : 0 }]}>
                <View style={[styles.prodTypeIcon, { backgroundColor: Colors.gold + "22" }]}>
                  <Ionicons name={icon as any} size={18} color={Colors.gold} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.prodTypeNome, { color: textColor }]}>{nome}</Text>
                  <Text style={[styles.prodTypeDesc, { color: textSec }]}>{desc}</Text>
                </View>
              </View>
            ))}
          </View>
          <Pressable onPress={() => setShowSellModal(true)} style={[styles.publishBtn, { backgroundColor: Colors.gold }]}>
            <Ionicons name="add-circle-outline" size={18} color="#000" />
            <Text style={styles.publishBtnText}>Publicar Produto</Text>
          </Pressable>
        </ScrollView>
      )}

      {/* Checkout Modal */}
      <Modal visible={!!showCheckout} transparent animationType="slide" onRequestClose={() => setShowCheckout(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: isDark ? Colors.card : "#fff" }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>Finalizar Assinatura</Text>
            {showCheckout && (() => {
              const plano = PLANOS.find(p => p.id === showCheckout);
              if (!plano) return null;
              return (
                <View>
                  <Text style={[styles.checkoutPlan, { color: Colors.gold }]}>{plano.nome}</Text>
                  <Text style={[styles.checkoutPreco, { color: textColor }]}>{plano.precoMensal || plano.precoAnual || "Gratuito"}</Text>
                  <Text style={[styles.modalLabel, { color: textSec }]}>Método de Pagamento</Text>
                  {[["card-outline", "Cartão de Crédito/Débito"], ["qr-code-outline", "Pix (instantâneo)"], ["logo-paypal", "PayPal"]].map(([icon, label]) => (
                    <Pressable key={label} style={[styles.pgtoOption, { borderColor, backgroundColor: isDark ? Colors.cardElevated : "#F5F5F7" }]}>
                      <Ionicons name={icon as any} size={20} color={Colors.gold} />
                      <Text style={[styles.pgtoOptionText, { color: textColor }]}>{label}</Text>
                      <Ionicons name="chevron-forward-outline" size={16} color={textSec} style={{ marginLeft: "auto" as any }} />
                    </Pressable>
                  ))}
                </View>
              );
            })()}
            <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
              <Pressable onPress={() => setShowCheckout(null)} style={[styles.modalCancelBtn, { borderColor }]}>
                <Text style={[styles.modalCancelText, { color: textSec }]}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={() => setShowCheckout(null)} style={[styles.modalConfirmBtn, { backgroundColor: Colors.gold }]}>
                <Text style={styles.modalConfirmText}>Prosseguir</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sell Modal */}
      <Modal visible={showSellModal} transparent animationType="slide" onRequestClose={() => setShowSellModal(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}>
            <View style={[styles.modal, { backgroundColor: isDark ? Colors.card : "#fff" }]}>
              <Text style={[styles.modalTitle, { color: textColor }]}>Publicar Produto</Text>
              <TextInput style={[styles.modalInput, { backgroundColor: inputBg, color: textColor, borderColor }]} placeholder="Nome do produto" placeholderTextColor={textSec} value={prodNome} onChangeText={setProdNome} />
              <TextInput style={[styles.modalInput, { backgroundColor: inputBg, color: textColor, borderColor, minHeight: 80 }]} placeholder="Descrição" placeholderTextColor={textSec} multiline value={prodDesc} onChangeText={setProdDesc} textAlignVertical="top" />
              <TextInput style={[styles.modalInput, { backgroundColor: inputBg, color: textColor, borderColor }]} placeholder="Preço (ex: R$ 97)" placeholderTextColor={textSec} value={prodPreco} onChangeText={setProdPreco} />
              <Text style={[styles.modalLabel, { color: textSec }]}>Categoria</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {["Programa", "Audiobook", "E-book", "Curso", "Artigo"].map(cat => (
                  <Pressable key={cat} onPress={() => setProdCategoria(cat)} style={[styles.modalChip, { borderColor: prodCategoria === cat ? Colors.gold : borderColor, backgroundColor: prodCategoria === cat ? Colors.gold + "22" : "transparent" }]}>
                    <Text style={[styles.modalChipText, { color: prodCategoria === cat ? Colors.gold : textSec }]}>{cat}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <TextInput style={[styles.modalInput, { backgroundColor: inputBg, color: textColor, borderColor }]} placeholder="Contato/Link (WhatsApp, email...)" placeholderTextColor={textSec} value={prodContato} onChangeText={setProdContato} />
              <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
                <Pressable onPress={() => setShowSellModal(false)} style={[styles.modalCancelBtn, { borderColor }]}>
                  <Text style={[styles.modalCancelText, { color: textSec }]}>Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={() => { if (!prodNome || !prodPreco) return; addProductMutation.mutate({ name: prodNome, description: prodDesc, price: prodPreco, category: prodCategoria, contact: prodContato }); }}
                  style={[styles.modalConfirmBtn, { backgroundColor: Colors.gold }]}
                  disabled={addProductMutation.isPending}
                >
                  {addProductMutation.isPending ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.modalConfirmText}>Publicar</Text>}
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontFamily: "Outfit_800ExtraBold", fontSize: 26 },
  subtitle: { fontFamily: "Outfit_400Regular", fontSize: 13, marginTop: 2 },
  planBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
  planBadgeText: { fontFamily: "Outfit_600SemiBold", fontSize: 12 },
  tabScroll: { borderBottomWidth: 1, paddingVertical: 10, maxHeight: 54 },
  tabBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  tabText: { fontFamily: "Outfit_600SemiBold", fontSize: 12 },
  sectionTitle: { fontFamily: "Outfit_700Bold", fontSize: 18, marginBottom: 6 },
  sectionSub: { fontFamily: "Outfit_400Regular", fontSize: 13, marginBottom: 16, lineHeight: 19 },
  planoCard: { borderRadius: 16, padding: 16, marginBottom: 12, overflow: "hidden" },
  planoNome: { fontFamily: "Outfit_800ExtraBold", fontSize: 20 },
  planoTag: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  planoTagText: { fontFamily: "Outfit_700Bold", fontSize: 11 },
  planoPrecoMensal: { fontFamily: "Outfit_700Bold", fontSize: 22, marginTop: 8 },
  planoPrecoAnual: { fontFamily: "Outfit_400Regular", fontSize: 13, marginTop: 2 },
  planoRecurso: { fontFamily: "Outfit_400Regular", fontSize: 13 },
  assinBtn: { borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 16 },
  assinBtnText: { color: "#000", fontFamily: "Outfit_700Bold", fontSize: 14 },
  pgtoCard: { borderRadius: 14, padding: 14, borderWidth: 1, marginTop: 8, marginBottom: 8 },
  pgtoTitle: { fontFamily: "Outfit_700Bold", fontSize: 14, marginBottom: 12 },
  pgtoRow: { flexDirection: "row", justifyContent: "space-around" },
  pgtoItem: { alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 10, padding: 10, flex: 1, marginHorizontal: 3 },
  pgtoLabel: { fontFamily: "Outfit_400Regular", fontSize: 10, textAlign: "center" },
  tipoChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8 },
  tipoChipText: { fontFamily: "Outfit_600SemiBold", fontSize: 13 },
  prodCard: { flexDirection: "row", borderRadius: 14, padding: 12, borderWidth: 1, marginBottom: 10, alignItems: "center" },
  prodIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center" },
  prodNome: { fontFamily: "Outfit_600SemiBold", fontSize: 14 },
  prodAutor: { fontFamily: "Outfit_400Regular", fontSize: 12 },
  tipoTag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  tipoTagText: { fontFamily: "Outfit_600SemiBold", fontSize: 10 },
  prodAvaliacao: { fontFamily: "Outfit_400Regular", fontSize: 12 },
  prodPreco: { fontFamily: "Outfit_700Bold", fontSize: 15, marginBottom: 6 },
  comprarBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  comprarBtnText: { color: "#000", fontFamily: "Outfit_700Bold", fontSize: 12 },
  academicCard: { borderRadius: 14, padding: 14, borderWidth: 1.5, marginBottom: 16, overflow: "hidden" },
  academicTitle: { fontFamily: "Outfit_700Bold", fontSize: 16, flex: 1 },
  proTag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  proTagText: { fontFamily: "Outfit_700Bold", fontSize: 11 },
  academicDesc: { fontFamily: "Outfit_400Regular", fontSize: 13, lineHeight: 19 },
  featureTag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  featureTagText: { fontFamily: "Outfit_500Medium", fontSize: 11 },
  mentorCard: { flexDirection: "row", borderRadius: 14, padding: 12, borderWidth: 1, marginBottom: 10, alignItems: "center" },
  mentorAvatar: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center" },
  mentorNome: { fontFamily: "Outfit_700Bold", fontSize: 14 },
  mentorBadge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  mentorBadgeText: { fontFamily: "Outfit_700Bold", fontSize: 10 },
  mentorEsp: { fontFamily: "Outfit_400Regular", fontSize: 12 },
  mentorMeta: { fontFamily: "Outfit_400Regular", fontSize: 12 },
  mentorPreco: { fontFamily: "Outfit_700Bold", fontSize: 14, marginBottom: 6 },
  contratarBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  contratarBtnText: { fontFamily: "Outfit_600SemiBold", fontSize: 12 },
  tornarseMentorBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderRadius: 14, paddingVertical: 14, marginTop: 8 },
  tornarseMentorText: { fontFamily: "Outfit_700Bold", fontSize: 15 },
  sellInfoCard: { borderRadius: 14, borderWidth: 1, marginBottom: 16, overflow: "hidden" },
  prodTypeRow: { flexDirection: "row", alignItems: "center", padding: 14 },
  prodTypeIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  prodTypeNome: { fontFamily: "Outfit_600SemiBold", fontSize: 14 },
  prodTypeDesc: { fontFamily: "Outfit_400Regular", fontSize: 12, marginTop: 2 },
  publishBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 14 },
  publishBtnText: { color: "#000", fontFamily: "Outfit_700Bold", fontSize: 15 },
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
  checkoutPlan: { fontFamily: "Outfit_800ExtraBold", fontSize: 22, marginBottom: 4 },
  checkoutPreco: { fontFamily: "Outfit_700Bold", fontSize: 18, marginBottom: 16 },
  pgtoOption: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 10 },
  pgtoOptionText: { fontFamily: "Outfit_500Medium", fontSize: 15 },
});
