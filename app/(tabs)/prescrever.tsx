import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

type Aba = "Nova" | "Clientes" | "Templates" | "Histórico";

const ABAS: Aba[] = ["Nova", "Clientes", "Templates", "Histórico"];

const TEMPLATES = [
  { nome: "Hipertrofia 4x Intermediário", exercicios: 16, semanas: 12, nivel: "Intermediário", tag: "Hipertrofia" },
  { nome: "Força PPL Avançado", exercicios: 18, semanas: 16, nivel: "Avançado", tag: "Força" },
  { nome: "Iniciante Full Body", exercicios: 8, semanas: 8, nivel: "Iniciante", tag: "Condicionamento" },
  { nome: "Powerlifting Competição", exercicios: 12, semanas: 20, nivel: "Elite", tag: "Powerlifting" },
];

const CLIENTES = [
  { nome: "João Silva", ativo: true, treinos: 24, plano: "Premium" },
  { nome: "Maria Costa", ativo: true, treinos: 12, plano: "Mensal" },
  { nome: "Pedro Santos", ativo: false, treinos: 6, plano: "Básico" },
];

const HISTORICO = [
  { cliente: "João Silva", programa: "Hipertrofia 4x", criado: "15/03/2026", status: "Ativo" },
  { cliente: "Maria Costa", programa: "Full Body Iniciante", criado: "10/03/2026", status: "Ativo" },
  { cliente: "Pedro Santos", programa: "Força 5x5", criado: "01/03/2026", status: "Concluído" },
];

export default function PrescreverScreen() {
  const insets = useSafeAreaInsets();
  const [abaAtiva, setAbaAtiva] = useState<Aba>("Nova");
  const [nomeCliente, setNomeCliente] = useState("");
  const [objetivoSel, setObjetivoSel] = useState<string | null>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const OBJETIVOS = ["Hipertrofia", "Força", "Resistência", "Perda de Peso", "Performance", "Reabilitação"];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View>
          <Text style={styles.pageTitle}>Prescrever</Text>
          <Text style={styles.pageSubtitle}>Programas para seus clientes</Text>
        </View>
        <Pressable
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
          style={styles.addBtn}
        >
          <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={styles.addBtnGrad}>
            <Ionicons name="person-add-outline" size={18} color={Colors.black} />
          </LinearGradient>
        </Pressable>
      </View>

      {/* Abas */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.abasScroll}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
      >
        {ABAS.map((a) => (
          <Pressable
            key={a}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAbaAtiva(a); }}
            style={[styles.abaTab, abaAtiva === a && styles.abaTabAtiva]}
          >
            <Text style={[styles.abaText, abaAtiva === a && styles.abaTextAtiva]}>{a}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 100 }]}
      >
        {/* Nova Prescrição */}
        {abaAtiva === "Nova" && (
          <Animated.View entering={FadeInDown.delay(60).springify()}>
            {/* Cliente */}
            <Text style={styles.fieldLabel}>Nome do Cliente</Text>
            <View style={styles.inputBox}>
              <Ionicons name="person-outline" size={16} color={Colors.muted} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.input}
                placeholder="Nome do cliente"
                placeholderTextColor={Colors.muted}
                value={nomeCliente}
                onChangeText={setNomeCliente}
              />
            </View>

            {/* Objetivo */}
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

            {/* Configurações */}
            <Text style={styles.fieldLabel}>Frequência Semanal</Text>
            <View style={styles.freqRow}>
              {[2, 3, 4, 5, 6].map((f) => (
                <Pressable key={f} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} style={styles.freqBtn}>
                  <Text style={styles.freqText}>{f}x</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Duração do Programa</Text>
            <View style={styles.freqRow}>
              {["4 sem", "8 sem", "12 sem", "16 sem", "20 sem"].map((d) => (
                <Pressable key={d} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} style={styles.freqBtn}>
                  <Text style={styles.freqText}>{d}</Text>
                </Pressable>
              ))}
            </View>

            {/* Templates */}
            <Text style={styles.fieldLabel}>Usar Template Base</Text>
            {TEMPLATES.slice(0, 2).map((t) => (
              <Pressable
                key={t.nome}
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                style={({ pressed }) => [styles.templateCard, { opacity: pressed ? 0.85 : 1 }]}
              >
                <View style={styles.templateInfo}>
                  <Text style={styles.templateNome}>{t.nome}</Text>
                  <Text style={styles.templateMeta}>{t.exercicios} exercícios · {t.semanas} semanas · {t.nivel}</Text>
                </View>
                <View style={styles.templateTag}>
                  <Text style={styles.templateTagText}>{t.tag}</Text>
                </View>
              </Pressable>
            ))}

            {/* Botão Gerar */}
            <Pressable
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)}
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }, { marginTop: 8 }]}
            >
              <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={styles.gerarBtn}>
                <Ionicons name="flash-outline" size={20} color={Colors.black} />
                <Text style={styles.gerarBtnText}>Gerar Prescrição com IA</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}

        {/* Clientes */}
        {abaAtiva === "Clientes" && (
          <Animated.View entering={FadeInDown.delay(60).springify()}>
            {CLIENTES.map((c) => (
              <Pressable
                key={c.nome}
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                style={({ pressed }) => [styles.clienteCard, { opacity: pressed ? 0.85 : 1 }]}
              >
                <View style={styles.clienteAvatar}>
                  <Text style={styles.clienteAvatarText}>{c.nome.charAt(0)}</Text>
                </View>
                <View style={styles.clienteInfo}>
                  <Text style={styles.clienteNome}>{c.nome}</Text>
                  <Text style={styles.clienteMeta}>{c.treinos} treinos · Plano {c.plano}</Text>
                </View>
                <View style={[styles.clienteStatus, { backgroundColor: c.ativo ? "rgba(74,222,128,0.15)" : "rgba(107,107,117,0.15)" }]}>
                  <Text style={[styles.clienteStatusText, { color: c.ativo ? "#4ADE80" : Colors.muted }]}>
                    {c.ativo ? "Ativo" : "Inativo"}
                  </Text>
                </View>
              </Pressable>
            ))}
            <Pressable style={styles.addClienteBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}>
              <Ionicons name="person-add-outline" size={18} color={Colors.gold} />
              <Text style={styles.addClienteText}>Adicionar Cliente</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Templates */}
        {abaAtiva === "Templates" && (
          <Animated.View entering={FadeInDown.delay(60).springify()}>
            {TEMPLATES.map((t) => (
              <Pressable
                key={t.nome}
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                style={({ pressed }) => [styles.templateCardFull, { opacity: pressed ? 0.85 : 1 }]}
              >
                <View style={styles.templateCardTop}>
                  <Text style={styles.templateNomeFull}>{t.nome}</Text>
                  <View style={styles.templateTagFull}>
                    <Text style={styles.templateTagText}>{t.tag}</Text>
                  </View>
                </View>
                <View style={styles.templateMetaRow}>
                  <View style={styles.templateMetaItem}><Ionicons name="barbell-outline" size={12} color={Colors.muted} /><Text style={styles.templateMetaFull}>{t.exercicios} exercícios</Text></View>
                  <View style={styles.templateMetaItem}><Ionicons name="calendar-outline" size={12} color={Colors.muted} /><Text style={styles.templateMetaFull}>{t.semanas} semanas</Text></View>
                  <View style={styles.templateMetaItem}><Ionicons name="person-outline" size={12} color={Colors.muted} /><Text style={styles.templateMetaFull}>{t.nivel}</Text></View>
                </View>
              </Pressable>
            ))}
          </Animated.View>
        )}

        {/* Histórico */}
        {abaAtiva === "Histórico" && (
          <Animated.View entering={FadeInDown.delay(60).springify()}>
            {HISTORICO.map((h) => (
              <Pressable
                key={`${h.cliente}-${h.criado}`}
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                style={({ pressed }) => [styles.histCard, { opacity: pressed ? 0.85 : 1 }]}
              >
                <View style={styles.histLeft}>
                  <Text style={styles.histCliente}>{h.cliente}</Text>
                  <Text style={styles.histPrograma}>{h.programa}</Text>
                  <Text style={styles.histData}>{h.criado}</Text>
                </View>
                <View style={[styles.histStatus, { backgroundColor: h.status === "Ativo" ? "rgba(74,222,128,0.15)" : "rgba(107,107,117,0.15)" }]}>
                  <Text style={[styles.histStatusText, { color: h.status === "Ativo" ? "#4ADE80" : Colors.muted }]}>{h.status}</Text>
                </View>
              </Pressable>
            ))}
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
  freqText: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.text },
  templateCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.card, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  templateInfo: { flex: 1 },
  templateNome: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.text, marginBottom: 3 },
  templateMeta: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.muted },
  templateTag: { backgroundColor: "rgba(212,175,55,0.1)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: "rgba(212,175,55,0.2)" },
  templateTagText: { fontFamily: "Outfit_600SemiBold", fontSize: 10, color: Colors.gold },
  gerarBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 18 },
  gerarBtnText: { fontFamily: "Outfit_700Bold", fontSize: 16, color: Colors.black },
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
  templateCardFull: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  templateCardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  templateNomeFull: { fontFamily: "Outfit_600SemiBold", fontSize: 15, color: Colors.text, flex: 1, lineHeight: 22 },
  templateTagFull: { backgroundColor: "rgba(212,175,55,0.1)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: "rgba(212,175,55,0.2)" },
  templateMetaRow: { flexDirection: "row", gap: 16 },
  templateMetaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  templateMetaFull: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.muted },
  histCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.card, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  histLeft: { flex: 1 },
  histCliente: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.text, marginBottom: 3 },
  histPrograma: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.textSecondary, marginBottom: 3 },
  histData: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.muted },
  histStatus: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  histStatusText: { fontFamily: "Outfit_600SemiBold", fontSize: 11 },
});
