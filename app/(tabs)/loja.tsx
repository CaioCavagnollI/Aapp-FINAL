import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

type CatLoja = "Planos" | "Programas" | "Conteúdo" | "Ferramentas";

const CATS_LOJA: CatLoja[] = ["Planos", "Programas", "Conteúdo", "Ferramentas"];

const PLANOS = [
  {
    nome: "Vitalício Nexus",
    preco: "R$ 997",
    parcelado: "ou 12x R$ 97",
    cor: Colors.gold,
    corDark: Colors.goldDark,
    tag: "MELHOR OPÇÃO",
    badge: true,
    recursos: [
      "Atlas IA ilimitado vitaliciamente",
      "Todos os programas científicos",
      "Scanner nutricional avançado",
      "Prescrições ilimitadas para clientes",
      "Acesso antecipado a novas funcionalidades",
      "Suporte prioritário vitalício",
    ],
  },
  {
    nome: "Pro Nexus",
    preco: "R$ 97",
    parcelado: "por mês",
    cor: "#60A5FA",
    corDark: "#2563EB",
    tag: "MAIS POPULAR",
    badge: false,
    recursos: [
      "Atlas IA com 500 perguntas/mês",
      "10 programas científicos",
      "Scanner nutricional básico",
      "Até 20 clientes ativos",
      "Atualizações mensais",
    ],
  },
  {
    nome: "Starter",
    preco: "R$ 37",
    parcelado: "por mês",
    cor: "#4ADE80",
    corDark: "#16A34A",
    tag: "GRATUITO 7 DIAS",
    badge: false,
    recursos: [
      "Atlas IA com 50 perguntas/mês",
      "3 programas científicos",
      "Scanner básico",
      "Até 5 clientes ativos",
    ],
  },
];

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

export default function LojaScreen() {
  const insets = useSafeAreaInsets();
  const [catAtiva, setCatAtiva] = useState<CatLoja>("Planos");
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View>
          <Text style={styles.pageTitle}>Loja</Text>
          <Text style={styles.pageSubtitle}>Planos, programas e conteúdo</Text>
        </View>
        <Pressable
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          style={styles.cartBtn}
        >
          <Ionicons name="bag-outline" size={20} color={Colors.gold} />
        </Pressable>
      </View>

      {/* Categorias */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catScroll}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
      >
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 100 }]}
      >
        {/* Planos */}
        {catAtiva === "Planos" && (
          <Animated.View entering={FadeInDown.delay(60).springify()}>
            {PLANOS.map((p, idx) => (
              <Animated.View key={p.nome} entering={FadeInDown.delay(60 + idx * 60).springify()}>
                {p.badge && (
                  <View style={styles.tagBadgeOuter}>
                    <LinearGradient colors={[p.corDark, p.cor]} style={styles.tagBadge}>
                      <Text style={styles.tagBadgeText}>{p.tag}</Text>
                    </LinearGradient>
                  </View>
                )}
                <LinearGradient
                  colors={p.badge ? [`${p.cor}18`, `${p.cor}08`] : ["#111113", "#0F0F11"]}
                  style={[styles.planoCard, p.badge && { borderColor: `${p.cor}40` }]}
                >
                  {!p.badge && (
                    <View style={[styles.tagInline, { backgroundColor: `${p.cor}15`, borderColor: `${p.cor}30` }]}>
                      <Text style={[styles.tagInlineText, { color: p.cor }]}>{p.tag}</Text>
                    </View>
                  )}
                  <Text style={[styles.planoNome, p.badge && { fontSize: 22 }]}>{p.nome}</Text>
                  <View style={styles.planoPrecoRow}>
                    <Text style={[styles.planoPreco, { color: p.cor }]}>{p.preco}</Text>
                    <Text style={styles.planoParcelado}>{p.parcelado}</Text>
                  </View>
                  <View style={styles.divisor} />
                  {p.recursos.map((r) => (
                    <View key={r} style={styles.recursoRow}>
                      <Ionicons name="checkmark-circle" size={16} color={p.cor} />
                      <Text style={styles.recursoText}>{r}</Text>
                    </View>
                  ))}
                  <Pressable
                    onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)}
                    style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }, { marginTop: 16 }]}
                  >
                    <LinearGradient colors={[p.corDark, p.cor]} style={styles.planoBtn}>
                      <Text style={styles.planoBtnText}>
                        {p.badge ? "Garantir Acesso Vitalício" : "Assinar Agora"}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                </LinearGradient>
              </Animated.View>
            ))}

            {/* Garantia */}
            <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.garantiaCard}>
              <Ionicons name="shield-checkmark-outline" size={24} color={Colors.gold} />
              <View style={styles.garantiaText}>
                <Text style={styles.garantiaTitulo}>Garantia de 7 dias</Text>
                <Text style={styles.garantiaSub}>Satisfação garantida ou reembolso total sem perguntas.</Text>
              </View>
            </Animated.View>
          </Animated.View>
        )}

        {/* Programas */}
        {catAtiva === "Programas" && (
          <Animated.View entering={FadeInDown.delay(60).springify()}>
            {PROGRAMAS_LOJA.map((p) => (
              <Pressable
                key={p.nome}
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                style={({ pressed }) => [styles.prodCard, { opacity: pressed ? 0.85 : 1 }]}
              >
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

        {/* Conteúdo */}
        {catAtiva === "Conteúdo" && (
          <Animated.View entering={FadeInDown.delay(60).springify()}>
            {CONTEUDOS.map((c) => (
              <Pressable
                key={c.nome}
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                style={({ pressed }) => [styles.prodCard, { opacity: pressed ? 0.85 : 1 }]}
              >
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

        {/* Ferramentas */}
        {catAtiva === "Ferramentas" && (
          <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.emptySection}>
            <Ionicons name="construct-outline" size={40} color={Colors.muted} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>Em breve</Text>
            <Text style={styles.emptySub}>Ferramentas premium para otimizar sua prescrição e monitoramento.</Text>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pageTitle: { fontFamily: "Outfit_800ExtraBold", fontSize: 26, color: Colors.text, letterSpacing: -0.5, marginBottom: 2 },
  pageSubtitle: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.textSecondary },
  cartBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, alignItems: "center", justifyContent: "center" },
  catScroll: { paddingVertical: 12 },
  catTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  catTabAtiva: { backgroundColor: "rgba(212,175,55,0.15)", borderColor: "rgba(212,175,55,0.35)" },
  catText: { fontFamily: "Outfit_500Medium", fontSize: 13, color: Colors.muted },
  catTextAtivo: { fontFamily: "Outfit_700Bold", color: Colors.gold },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  tagBadgeOuter: { alignItems: "center", marginBottom: -12, zIndex: 10 },
  tagBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  tagBadgeText: { fontFamily: "Outfit_700Bold", fontSize: 11, color: Colors.black, letterSpacing: 1 },
  tagInline: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, marginBottom: 10 },
  tagInlineText: { fontFamily: "Outfit_700Bold", fontSize: 10, letterSpacing: 0.5 },
  planoCard: { borderRadius: 24, padding: 24, borderWidth: 1, borderColor: Colors.border, marginBottom: 16 },
  planoNome: { fontFamily: "Outfit_800ExtraBold", fontSize: 20, color: Colors.text, letterSpacing: -0.5, marginBottom: 8 },
  planoPrecoRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: 4 },
  planoPreco: { fontFamily: "Outfit_800ExtraBold", fontSize: 28, letterSpacing: -0.5 },
  planoParcelado: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.muted },
  divisor: { height: 1, backgroundColor: Colors.border, marginVertical: 16 },
  recursoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  recursoText: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.text, flex: 1, lineHeight: 18 },
  planoBtn: { paddingVertical: 16, borderRadius: 16, alignItems: "center" },
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
  emptySection: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 16, color: Colors.textSecondary, marginBottom: 8 },
  emptySub: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.muted, textAlign: "center", lineHeight: 20, paddingHorizontal: 20 },
});
