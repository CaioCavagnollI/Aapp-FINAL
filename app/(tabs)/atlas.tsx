import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TextInput, Pressable,
  Platform, ScrollView, ActivityIndicator, Alert, Modal,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, FadeInDown } from "react-native-reanimated";
import { fetch } from "expo/fetch";
import { getApiUrl } from "@/lib/query-client";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useQuery } from "@tanstack/react-query";

type MainTab = "academico" | "prescricao" | "tools" | "acervo";

interface Message {
  id: string; role: "user" | "assistant"; content: string;
}

let counter = 0;
function uid() { counter++; return `m-${Date.now()}-${counter}`; }

// ============ TYPING INDICATOR ============
function TypingIndicator() {
  const d1 = useSharedValue(0); const d2 = useSharedValue(0); const d3 = useSharedValue(0);
  useEffect(() => {
    d1.value = withRepeat(withTiming(1, { duration: 400 }), -1, true);
    setTimeout(() => { d2.value = withRepeat(withTiming(1, { duration: 400 }), -1, true); }, 150);
    setTimeout(() => { d3.value = withRepeat(withTiming(1, { duration: 400 }), -1, true); }, 300);
  }, []);
  const s1 = useAnimatedStyle(() => ({ opacity: 0.3 + d1.value * 0.7 }));
  const s2 = useAnimatedStyle(() => ({ opacity: 0.3 + d2.value * 0.7 }));
  const s3 = useAnimatedStyle(() => ({ opacity: 0.3 + d3.value * 0.7 }));
  return (
    <View style={{ flexDirection: "row", alignItems: "center", padding: 12, gap: 8 }}>
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.gold + "22", justifyContent: "center", alignItems: "center" }}>
        <Ionicons name="flask" size={12} color={Colors.gold} />
      </View>
      <View style={{ flexDirection: "row", gap: 4, backgroundColor: Colors.card, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 }}>
        <Animated.View style={[{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.gold }, s1]} />
        <Animated.View style={[{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.gold }, s2]} />
        <Animated.View style={[{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.gold }, s3]} />
      </View>
    </View>
  );
}

// ============ ATLAS ACADÊMICO ============
function AtlasAcademico({ colors, isDark, token }: { colors: any; isDark: boolean; token: string | null }) {
  const [subTab, setSubTab] = useState<"chat" | "search" | "analyze">("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [analyzeText, setAnalyzeText] = useState("");
  const [analyzeResult, setAnalyzeResult] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const listRef = useRef<FlatList>(null);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const userMsg: Message = { id: uid(), role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setSending(true);
    setStreaming("");
    try {
      const response = await fetch(`${getApiUrl()}api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
      });
      const reader = response.body?.getReader();
      if (!reader) return;
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) { full += parsed.content; setStreaming(full); }
            } catch {}
          }
        }
      }
      if (full) {
        setMessages(prev => [...prev, { id: uid(), role: "assistant", content: full }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { id: uid(), role: "assistant", content: "Erro ao conectar com Atlas IA. Tente novamente." }]);
    } finally {
      setSending(false);
      setStreaming("");
    }
  };

  const searchArticles = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const query = encodeURIComponent(searchQuery.trim());
      const res = await fetch(`https://api.crossref.org/works?query=${query}&rows=5&filter=type:journal-article&sort=relevance`);
      const data = await res.json() as any;
      const items = (data?.message?.items || []).map((item: any) => ({
        title: item.title?.[0] || "Sem título",
        authors: item.author?.slice(0,2).map((a: any) => a.family).join(", ") || "Autores desconhecidos",
        journal: item["container-title"]?.[0] || "",
        year: item.published?.["date-parts"]?.[0]?.[0] || "",
        doi: item.DOI || "",
        url: item.URL || `https://doi.org/${item.DOI}`,
      }));
      setSearchResults(items);
    } catch {
      Alert.alert("Erro", "Falha ao buscar artigos. Tente novamente.");
    } finally {
      setSearching(false);
    }
  };

  const analyzeArticle = async () => {
    if (!analyzeText.trim()) return;
    setAnalyzing(true);
    setAnalyzeResult("");
    try {
      const res = await fetch(`${getApiUrl()}api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Faça uma análise acadêmica completa do seguinte texto/abstract científico. Responda com:\n\n**📋 Resumo & Explicação**\n[resumo claro e explicação]\n\n**🔬 Revisão Crítica**\n[análise crítica da metodologia e conclusões]\n\n**📊 Nível de Evidência**\n[classificação: RCT, meta-análise, revisão sistemática, estudo observacional, etc.]\n\n**💡 Aplicação Prática**\n[como aplicar no treinamento]\n\nTexto para análise:\n\n${analyzeText}`
          }]
        }),
      });
      const r = res.body?.getReader();
      if (!r) return;
      let full = "";
      while (true) {
        const { done, value } = await r.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ") && line.slice(6) !== "[DONE]") {
            try { const p = JSON.parse(line.slice(6)); if (p.content) { full += p.content; setAnalyzeResult(full); } } catch {}
          }
        }
      }
    } catch { Alert.alert("Erro", "Falha na análise."); }
    finally { setAnalyzing(false); }
  };

  const cardBg = isDark ? Colors.card : Colors.lightCard;
  const textColor = isDark ? Colors.text : Colors.lightText;
  const textSec = isDark ? Colors.textSecondary : Colors.lightTextSecondary;
  const borderColor = isDark ? Colors.border : Colors.lightBorder;
  const inputBg = isDark ? Colors.cardElevated : "#F0F0F5";

  return (
    <View style={{ flex: 1 }}>
      {/* Sub tabs */}
      <View style={[styles.subTabRow, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
        {([["chat", "chatbubbles-outline", "Chat"], ["search", "search-outline", "Buscar Artigos"], ["analyze", "analytics-outline", "Analisar"]] as [string,string,string][]).map(([key, icon, label]) => (
          <Pressable key={key} onPress={() => setSubTab(key as any)} style={[styles.subTab, subTab === key && styles.subTabActive]}>
            <Ionicons name={icon as any} size={15} color={subTab === key ? Colors.gold : textSec} />
            <Text style={[styles.subTabText, { color: subTab === key ? Colors.gold : textSec }]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Chat */}
      {subTab === "chat" && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={m => m.id}
            inverted
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: "column-reverse" }}
            ListHeaderComponent={sending ? <TypingIndicator /> : streaming ? (
              <View style={{ flexDirection: "row", padding: 12, gap: 8 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.gold + "22", justifyContent: "center", alignItems: "center" }}>
                  <Ionicons name="flask" size={12} color={Colors.gold} />
                </View>
                <View style={[styles.msgBubble, { backgroundColor: cardBg, borderColor, maxWidth: "80%" }]}>
                  <Text style={[styles.msgText, { color: textColor }]}>{streaming}</Text>
                </View>
              </View>
            ) : null}
            renderItem={({ item }) => (
              <View style={[styles.msgRow, item.role === "user" && styles.msgRowUser]}>
                {item.role === "assistant" && (
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.gold + "22", justifyContent: "center", alignItems: "center", marginRight: 8 }}>
                    <Ionicons name="flask" size={12} color={Colors.gold} />
                  </View>
                )}
                <View style={[styles.msgBubble, item.role === "user" ? styles.msgBubbleUser : { backgroundColor: cardBg, borderColor, borderWidth: 1 }, { maxWidth: "80%" }]}>
                  <Text style={[styles.msgText, { color: item.role === "user" ? "#fff" : textColor }]}>{item.content}</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={{ alignItems: "center", paddingTop: 40 }}>
                <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: Colors.gold + "22", justifyContent: "center", alignItems: "center", marginBottom: 16 }}>
                  <Ionicons name="flask" size={32} color={Colors.gold} />
                </View>
                <Text style={[styles.emptyTitle, { color: textColor }]}>Atlas Acadêmico</Text>
                <Text style={[styles.emptySub, { color: textSec }]}>IA especializada em ciência do exercício, biomecânica e fisiologia do esforço.</Text>
                <View style={styles.sugestoesGrid}>
                  {["Qual a faixa de reps ideal para hipertrofia?", "Como programar um bloco de força máxima?", "Explique periodização em blocos", "Diferença entre RPE e %1RM na prática"].map((s, i) => (
                    <Pressable key={i} onPress={() => setInput(s)} style={[styles.sugestao, { backgroundColor: cardBg, borderColor }]}>
                      <Text style={[styles.sugestaoText, { color: textSec }]}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            }
          />
          <View style={[styles.inputRow, { backgroundColor: cardBg, borderTopColor: borderColor }]}>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: textColor }]}
              placeholder="Pergunte sobre ciência do exercício..."
              placeholderTextColor={textSec}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={2000}
            />
            <Pressable onPress={sendMessage} disabled={!input.trim() || sending} style={[styles.sendBtn, { backgroundColor: Colors.gold, opacity: !input.trim() || sending ? 0.5 : 1 }]}>
              <Ionicons name="send" size={18} color="#000" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Search Articles */}
      {subTab === "search" && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          <Text style={[styles.sectionTitle, { color: textColor }]}>Buscar Artigos Científicos</Text>
          <Text style={[styles.sectionSub, { color: textSec }]}>PubMed · CrossRef · OpenAlex — Busca integrada de literatura científica</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={[styles.searchInput, { backgroundColor: isDark ? Colors.cardElevated : "#F0F0F5", color: textColor, borderColor }]}
              placeholder="Ex: progressive overload hypertrophy, periodization..."
              placeholderTextColor={textSec}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={searchArticles}
              returnKeyType="search"
            />
            <Pressable onPress={searchArticles} disabled={searching} style={[styles.searchBtn, { backgroundColor: Colors.gold }]}>
              {searching ? <ActivityIndicator size="small" color="#000" /> : <Ionicons name="search" size={20} color="#000" />}
            </Pressable>
          </View>
          {searchResults.map((r, i) => (
            <Animated.View key={i} entering={FadeInDown.delay(i * 50)} style={[styles.articleCard, { backgroundColor: cardBg, borderColor }]}>
              <Text style={[styles.articleTitle, { color: textColor }]}>{r.title}</Text>
              <Text style={[styles.articleMeta, { color: textSec }]}>{r.authors}{r.year ? ` · ${r.year}` : ""}{r.journal ? ` · ${r.journal}` : ""}</Text>
              {r.doi && <Text style={[styles.articleDoi, { color: Colors.gold }]}>DOI: {r.doi}</Text>}
              <Pressable
                onPress={() => {
                  setSubTab("chat");
                  setInput(`Analise este artigo científico:\n\nTítulo: ${r.title}\nAutores: ${r.authors}\nDOI: ${r.doi}\n\nPor favor: resumo, revisão crítica, nível de evidência e aplicação prática.`);
                }}
                style={styles.analyzeArticleBtn}
              >
                <Ionicons name="flask-outline" size={14} color={Colors.gold} />
                <Text style={[styles.analyzeArticleBtnText, { color: Colors.gold }]}>Analisar com Atlas IA</Text>
              </Pressable>
            </Animated.View>
          ))}
          {searchResults.length === 0 && !searching && (
            <View style={{ alignItems: "center", paddingTop: 40 }}>
              <Ionicons name="search-outline" size={48} color={textSec} />
              <Text style={[styles.emptySub, { color: textSec, marginTop: 12 }]}>Busque por tópicos de ciência do esporte, fisiologia, biomecânica e mais.</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Analyze */}
      {subTab === "analyze" && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          <Text style={[styles.sectionTitle, { color: textColor }]}>Análise Acadêmica com IA</Text>
          <Text style={[styles.sectionSub, { color: textSec }]}>Cole um abstract, texto de artigo ou DOI para análise completa com revisão crítica e nível de evidência.</Text>
          <TextInput
            style={[styles.analyzeTextInput, { backgroundColor: isDark ? Colors.cardElevated : "#F0F0F5", color: textColor, borderColor }]}
            placeholder="Cole aqui o abstract, texto do artigo ou DOI para análise..."
            placeholderTextColor={textSec}
            multiline
            value={analyzeText}
            onChangeText={setAnalyzeText}
            textAlignVertical="top"
          />
          <Pressable onPress={analyzeArticle} disabled={!analyzeText.trim() || analyzing} style={[styles.analyzeBtn, { backgroundColor: Colors.gold, opacity: !analyzeText.trim() || analyzing ? 0.5 : 1 }]}>
            {analyzing ? <ActivityIndicator size="small" color="#000" /> : <Ionicons name="analytics-outline" size={18} color="#000" />}
            <Text style={styles.analyzeBtnText}>{analyzing ? "Analisando..." : "Analisar com Atlas IA"}</Text>
          </Pressable>
          {analyzeResult ? (
            <View style={[styles.analyzeResult, { backgroundColor: cardBg, borderColor }]}>
              <Text style={[styles.analyzeResultText, { color: textColor }]}>{analyzeResult}</Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

// ============ PRESCRIÇÃO ATLAS (ANAMNESE) ============
type AnaStep = "form" | "generating" | "result";
const OBJETIVOS = ["Hipertrofia", "Emagrecimento", "Força", "Potência", "Resistência", "Saúde", "Performance"];
const FOCOS = ["Peitoral", "Dorsal", "Ombros", "Bíceps", "Tríceps", "Quadríceps", "Isquiotibiais", "Glúteos", "Core", "Panturrilha"];
const RESTRICOES = ["Sem restrições", "Dor lombar", "Dor no joelho", "Dor no ombro", "Hérnia de disco", "Hipertensão", "Diabetes", "Cardiopatia"];
const FREQ_OPTIONS = [2, 3, 4, 5, 6];
const DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const TEMPOS = ["30-45min", "45-60min", "60-90min", "90min+"];
const STATUS_TREINO = ["Iniciante (< 1 ano)", "Intermediário (1-3 anos)", "Avançado (> 3 anos)", "Inativo (não treina)"];

function PrescricaoAtlas({ colors, isDark, token }: { colors: any; isDark: boolean; token: string | null }) {
  const [step, setStep] = useState<AnaStep>("form");
  const [nome, setNome] = useState("");
  const [idade, setIdade] = useState("");
  const [sexo, setSexo] = useState<"M" | "F" | null>(null);
  const [peso, setPeso] = useState("");
  const [objetivo, setObjetivo] = useState<string | null>(null);
  const [focos, setFocos] = useState<string[]>([]);
  const [restricoes, setRestricoes] = useState<string[]>(["Sem restrições"]);
  const [local, setLocal] = useState<"academia" | "casa" | null>(null);
  const [temMateriais, setTemMateriais] = useState<boolean | null>(null);
  const [freq, setFreq] = useState<number | null>(null);
  const [dias, setDias] = useState<string[]>([]);
  const [tempo, setTempo] = useState<string | null>(null);
  const [statusTreino, setStatusTreino] = useState<string | null>(null);
  const [resultado, setResultado] = useState("");
  const [streaming, setStreaming] = useState("");

  const cardBg = isDark ? Colors.card : Colors.lightCard;
  const textColor = isDark ? Colors.text : Colors.lightText;
  const textSec = isDark ? Colors.textSecondary : Colors.lightTextSecondary;
  const borderColor = isDark ? Colors.border : Colors.lightBorder;

  const toggleArr = (arr: string[], val: string, setArr: (v: string[]) => void) => {
    if (arr.includes(val)) setArr(arr.filter(x => x !== val));
    else setArr([...arr, val]);
  };

  const Chip = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => (
    <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      style={[styles.chip, { borderColor: selected ? Colors.gold : borderColor, backgroundColor: selected ? Colors.gold + "22" : "transparent" }]}>
      <Text style={[styles.chipText, { color: selected ? Colors.gold : textSec }]}>{label}</Text>
    </Pressable>
  );

  const gerar = async () => {
    if (!objetivo || !freq || !statusTreino) {
      Alert.alert("Campos obrigatórios", "Preencha objetivo, frequência e status de treino."); return;
    }
    setStep("generating");
    setStreaming("");
    const prompt = `Gere uma prescrição de treino científica e completa para:\n\n- Nome: ${nome || "Atleta"}\n- Idade: ${idade || "Não informada"}\n- Sexo biológico: ${sexo || "Não informado"}\n- Peso: ${peso ? peso + "kg" : "Não informado"}\n- Objetivo principal: ${objetivo}\n- Foco muscular: ${focos.length ? focos.join(", ") : "Nenhum especificado"}\n- Restrições: ${restricoes.join(", ")}\n- Local de treino: ${local === "academia" ? "Academia" : local === "casa" ? `Casa${temMateriais !== null ? (temMateriais ? " (com equipamentos)" : " (sem equipamentos)") : ""}` : "Não informado"}\n- Frequência semanal: ${freq}x/semana\n- Dias preferidos: ${dias.join(", ") || "Não especificado"}\n- Tempo disponível: ${tempo || "Não especificado"}\n- Status de treino: ${statusTreino}\n\nGere um programa completo com divisão de treinos, exercícios específicos, séries, repetições, %1RM/RPE sugerido, descanso entre séries e observações de progressão.`;
    try {
      const res = await fetch(`${getApiUrl()}api/prescriptions/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ client_name: nome || "Auto-prescrição", goal: objetivo, weeks: 8, days_per_week: freq, level: statusTreino, notes: prompt }),
      });
      const reader = res.body?.getReader();
      if (!reader) { setStep("form"); return; }
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of new TextDecoder().decode(value).split("\n")) {
          if (line.startsWith("data: ") && line.slice(6) !== "[DONE]") {
            try { const p = JSON.parse(line.slice(6)); if (p.content) { full += p.content; setStreaming(full); } } catch {}
          }
        }
      }
      setResultado(full);
      setStep("result");
    } catch { Alert.alert("Erro", "Falha ao gerar prescrição."); setStep("form"); }
  };

  if (step === "generating") return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 32 }}>
      <ActivityIndicator size="large" color={Colors.gold} />
      <Text style={[styles.emptyTitle, { color: textColor, marginTop: 20 }]}>Gerando Prescrição...</Text>
      <Text style={[styles.emptySub, { color: textSec }]}>Atlas IA está criando seu programa personalizado baseado na anamnese</Text>
      {!!streaming && (
        <ScrollView style={{ maxHeight: 200, width: "100%", marginTop: 20 }}>
          <Text style={[styles.streamingText, { color: textSec }]}>{streaming.slice(-400)}</Text>
        </ScrollView>
      )}
    </View>
  );

  if (step === "result") return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
      <View style={[styles.resultHeader, { backgroundColor: cardBg, borderColor }]}>
        <Ionicons name="checkmark-circle" size={28} color="#4ADE80" />
        <Text style={[styles.resultTitle, { color: textColor }]}>Prescrição Gerada!</Text>
        <Pressable onPress={() => setStep("form")} style={styles.novaBtn}>
          <Text style={{ color: Colors.gold, fontFamily: "Outfit_600SemiBold", fontSize: 13 }}>Nova Prescrição</Text>
        </Pressable>
      </View>
      <View style={[styles.resultCard, { backgroundColor: cardBg, borderColor }]}>
        <Text style={[styles.resultText, { color: textColor }]}>{resultado}</Text>
      </View>
    </ScrollView>
  );

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Text style={[styles.sectionTitle, { color: textColor }]}>Anamnese & Prescrição Atlas</Text>
      <Text style={[styles.sectionSub, { color: textSec }]}>Preencha a anamnese para gerar uma prescrição personalizada baseada em evidências científicas.</Text>

      <Text style={[styles.fieldLabel, { color: textSec }]}>Nome completo</Text>
      <TextInput style={[styles.fieldInput, { backgroundColor: isDark ? Colors.cardElevated : "#F0F0F5", color: textColor, borderColor }]} placeholder="Seu nome" placeholderTextColor={textSec} value={nome} onChangeText={setNome} />

      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.fieldLabel, { color: textSec }]}>Idade</Text>
          <TextInput style={[styles.fieldInput, { backgroundColor: isDark ? Colors.cardElevated : "#F0F0F5", color: textColor, borderColor }]} placeholder="25" placeholderTextColor={textSec} keyboardType="numeric" value={idade} onChangeText={setIdade} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.fieldLabel, { color: textSec }]}>Peso (kg)</Text>
          <TextInput style={[styles.fieldInput, { backgroundColor: isDark ? Colors.cardElevated : "#F0F0F5", color: textColor, borderColor }]} placeholder="80" placeholderTextColor={textSec} keyboardType="numeric" value={peso} onChangeText={setPeso} />
        </View>
      </View>

      <Text style={[styles.fieldLabel, { color: textSec }]}>Sexo biológico</Text>
      <View style={styles.chipRow}>
        <Chip label="Masculino" selected={sexo === "M"} onPress={() => setSexo("M")} />
        <Chip label="Feminino" selected={sexo === "F"} onPress={() => setSexo("F")} />
      </View>

      <Text style={[styles.fieldLabel, { color: textSec }]}>Objetivo principal *</Text>
      <View style={styles.chipRow}>
        {OBJETIVOS.map(o => <Chip key={o} label={o} selected={objetivo === o} onPress={() => setObjetivo(o)} />)}
      </View>

      <Text style={[styles.fieldLabel, { color: textSec }]}>Foco muscular (opcional)</Text>
      <View style={styles.chipRow}>
        {FOCOS.map(f => <Chip key={f} label={f} selected={focos.includes(f)} onPress={() => toggleArr(focos, f, setFocos)} />)}
      </View>

      <Text style={[styles.fieldLabel, { color: textSec }]}>Restrições / Histórico médico</Text>
      <View style={styles.chipRow}>
        {RESTRICOES.map(r => <Chip key={r} label={r} selected={restricoes.includes(r)} onPress={() => {
          if (r === "Sem restrições") setRestricoes(["Sem restrições"]);
          else toggleArr(restricoes.filter(x => x !== "Sem restrições"), r, setRestricoes);
        }} />)}
      </View>

      <Text style={[styles.fieldLabel, { color: textSec }]}>Local de treino</Text>
      <View style={styles.chipRow}>
        <Chip label="Academia" selected={local === "academia"} onPress={() => setLocal("academia")} />
        <Chip label="Em casa" selected={local === "casa"} onPress={() => setLocal("casa")} />
      </View>
      {local === "casa" && (
        <>
          <Text style={[styles.fieldLabel, { color: textSec }]}>Possui equipamentos em casa?</Text>
          <View style={styles.chipRow}>
            <Chip label="Sim" selected={temMateriais === true} onPress={() => setTemMateriais(true)} />
            <Chip label="Não" selected={temMateriais === false} onPress={() => setTemMateriais(false)} />
          </View>
        </>
      )}

      <Text style={[styles.fieldLabel, { color: textSec }]}>Frequência semanal *</Text>
      <View style={styles.chipRow}>
        {FREQ_OPTIONS.map(f => <Chip key={f} label={`${f}x`} selected={freq === f} onPress={() => setFreq(f)} />)}
      </View>

      <Text style={[styles.fieldLabel, { color: textSec }]}>Dias preferidos</Text>
      <View style={styles.chipRow}>
        {DIAS_SEMANA.map(d => <Chip key={d} label={d} selected={dias.includes(d)} onPress={() => toggleArr(dias, d, setDias)} />)}
      </View>

      <Text style={[styles.fieldLabel, { color: textSec }]}>Tempo disponível por sessão</Text>
      <View style={styles.chipRow}>
        {TEMPOS.map(t => <Chip key={t} label={t} selected={tempo === t} onPress={() => setTempo(t)} />)}
      </View>

      <Text style={[styles.fieldLabel, { color: textSec }]}>Status de treinamento *</Text>
      <View style={styles.chipRow}>
        {STATUS_TREINO.map(s => <Chip key={s} label={s} selected={statusTreino === s} onPress={() => setStatusTreino(s)} />)}
      </View>

      <Pressable onPress={gerar} style={[styles.gerarBtn, { backgroundColor: Colors.gold }]}>
        <Ionicons name="flash-outline" size={18} color="#000" />
        <Text style={styles.gerarBtnText}>Gerar Prescrição com IA</Text>
      </Pressable>
    </ScrollView>
  );
}

// ============ ATLAS TOOLS ============
function AtlasTools({ colors, isDark }: { colors: any; isDark: boolean }) {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const cardBg = isDark ? Colors.card : Colors.lightCard;
  const textColor = isDark ? Colors.text : Colors.lightText;
  const textSec = isDark ? Colors.textSecondary : Colors.lightTextSecondary;
  const borderColor = isDark ? Colors.border : Colors.lightBorder;
  const inputBg = isDark ? Colors.cardElevated : "#F0F0F5";

  // Tool states
  const [peso, setPeso] = useState(""); const [altura, setAltura] = useState(""); const [idade, setIdade] = useState(""); const [sexo, setSexo] = useState<"M" | "F">("M");
  const [nivelAtividade, setNivelAtividade] = useState("1.55");
  const [tmb, setTmb] = useState<number | null>(null); const [tdee, setTdee] = useState<number | null>(null);
  const [rm1, setRm1] = useState(""); const [reps1, setReps1] = useState(""); const [rm1Result, setRm1Result] = useState<number | null>(null);
  const [macroCalGol, setMacroCalGol] = useState(""); const [macroProt, setMacroProt] = useState<number | null>(null); const [macroCarb, setMacroCarb] = useState<number | null>(null); const [macroGord, setMacroGord] = useState<number | null>(null);
  const [tssHR, setTssHR] = useState(""); const [tssDur, setTssDur] = useState(""); const [tssResult, setTssResult] = useState<number | null>(null);

  const calcTMB = () => {
    const p = parseFloat(peso); const h = parseFloat(altura); const i = parseFloat(idade);
    if (isNaN(p) || isNaN(h) || isNaN(i)) return;
    const t = sexo === "M" ? 88.362 + 13.397 * p + 4.799 * h - 5.677 * i : 447.593 + 9.247 * p + 3.098 * h - 4.330 * i;
    setTmb(Math.round(t));
    setTdee(Math.round(t * parseFloat(nivelAtividade)));
  };

  const calc1RM = () => {
    const w = parseFloat(rm1); const r = parseFloat(reps1);
    if (isNaN(w) || isNaN(r)) return;
    setRm1Result(Math.round(w * (1 + r / 30)));
  };

  const calcMacros = () => {
    const cal = parseFloat(macroCalGol);
    if (isNaN(cal)) return;
    setMacroProt(Math.round(cal * 0.30 / 4));
    setMacroCarb(Math.round(cal * 0.45 / 4));
    setMacroGord(Math.round(cal * 0.25 / 9));
  };

  const calcTSS = () => {
    const hr = parseFloat(tssHR); const dur = parseFloat(tssDur);
    if (isNaN(hr) || isNaN(dur)) return;
    const hrFactor = hr / 85;
    setTssResult(Math.round(dur * hrFactor * hrFactor * 100 / 3600));
  };

  const tools = [
    { id: "tmb", icon: "flame-outline", label: "TMB & TDEE", sublabel: "Taxa Metabólica Basal e Gasto Total" },
    { id: "1rm", icon: "barbell-outline", label: "1RM", sublabel: "Carga máxima de repetição" },
    { id: "macros", icon: "nutrition-outline", label: "Macronutrientes", sublabel: "Proteína, carb e gordura" },
    { id: "tss", icon: "analytics-outline", label: "TSS / Carga", sublabel: "Training Stress Score" },
    { id: "rpe", icon: "pulse-outline", label: "Tabela RPE/RIR", sublabel: "Escala de esforço percebido" },
    { id: "periodizacao", icon: "calendar-outline", label: "Periodização", sublabel: "Modelo automatizado" },
    { id: "dose", icon: "stats-chart-outline", label: "Dose-Resposta", sublabel: "Relação volume-hipertrofia" },
    { id: "pesquisa", icon: "book-outline", label: "Centro de Pesquisa", sublabel: "Resumos e revisões" },
  ];

  const Input = ({ label, value, onChange, placeholder, keyboardType = "numeric" }: any) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={[styles.fieldLabel, { color: textSec }]}>{label}</Text>
      <TextInput style={[styles.fieldInput, { backgroundColor: inputBg, color: textColor, borderColor }]} placeholder={placeholder} placeholderTextColor={textSec} value={value} onChangeText={onChange} keyboardType={keyboardType} />
    </View>
  );

  const RPE_TABLE = [
    { rpe: "10", rir: "0", desc: "Máximo absoluto — sem repetições sobrando" },
    { rpe: "9.5", rir: "0-1", desc: "Quase máximo — talvez 1 rep sobrando" },
    { rpe: "9", rir: "1", desc: "Muito difícil — 1 repetição sobrando" },
    { rpe: "8.5", rir: "1-2", desc: "Difícil — entre 1 e 2 reps sobrando" },
    { rpe: "8", rir: "2", desc: "Moderado-alto — 2 repetições sobrando" },
    { rpe: "7", rir: "3", desc: "Moderado — 3 repetições sobrando" },
    { rpe: "6", rir: "4+", desc: "Leve — 4 ou mais repetições sobrando" },
    { rpe: "5", rir: "5+", desc: "Aquecimento — muito confortável" },
  ];

  const DOSE_DATA = [
    { vol: "< 10 séries/semana", resp: "Manutenção", cor: "#F87171" },
    { vol: "10-15 séries/semana", resp: "Hipertrofia moderada", cor: "#FBBF24" },
    { vol: "15-20 séries/semana", resp: "Hipertrofia ótima", cor: "#4ADE80" },
    { vol: "20-25 séries/semana", resp: "Alta — monitorar recuperação", cor: "#60A5FA" },
    { vol: "> 25 séries/semana", resp: "Risco de overreaching", cor: "#F472B6" },
  ];

  const PERIODIZACAO_MODELS = [
    { name: "Linear Simples", desc: "Progressão constante de carga. Ideal para iniciantes.", semanas: "4-8 sem", volume: "Baixo → Médio", intensidade: "Baixa → Alta" },
    { name: "Ondulatória Diária (DUP)", desc: "Variação diária de volume e intensidade. Para intermediários/avançados.", semanas: "8-12 sem", volume: "Variável", intensidade: "Variável" },
    { name: "Em Blocos", desc: "Fases: Acumulação → Intensificação → Realização. Para avançados.", semanas: "12-20 sem", volume: "Alto → Médio → Baixo", intensidade: "Baixa → Alta → Máxima" },
    { name: "Conjugada (Westside)", desc: "Combina esforço máximo e dinâmico simultaneamente. Para powerlifters.", semanas: "4-8 sem", volume: "Médio", intensidade: "Alta/Máxima" },
  ];

  const PESQUISA_ITEMS = [
    { titulo: "Síntese Proteica e Hipertrofia", fonte: "Meta-análise 2023", resumo: "32 RCTs confirmam: 1.6-2.2g/kg/dia de proteína otimiza ganhos musculares. Proteína pós-treino crucial nas primeiras 2h." },
    { titulo: "Volume Semanal Ótimo", fonte: "Schoenfeld et al. 2022", resumo: "Relação dose-resposta: mais séries = mais hipertrofia até ~20-25 séries/semana/músculo. Acima disso, rendimentos decrescentes." },
    { titulo: "Frequência de Treino", fonte: "Revisão Sistemática 2024", resumo: "2x/semana por músculo é mínimo eficaz. Aumentar para 3x/semana pode trazer benefícios adicionais para avançados." },
    { titulo: "Periodização e Performance", fonte: "NSCA Position Stand", resumo: "Periodização ondulatória supera linear em 28% para ganhos de força em 12 semanas segundo meta-análise de 12 estudos." },
  ];

  if (!activeTool) return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
      <Text style={[styles.sectionTitle, { color: textColor }]}>Atlas Tools</Text>
      <Text style={[styles.sectionSub, { color: textSec }]}>Ferramentas científicas para cálculos avançados de treino e nutrição.</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {tools.map((t, i) => (
          <Pressable key={t.id} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTool(t.id); }}
            style={[styles.toolCard, { backgroundColor: cardBg, borderColor, width: "47%" }]}>
            <Ionicons name={t.icon as any} size={26} color={Colors.gold} />
            <Text style={[styles.toolLabel, { color: textColor }]}>{t.label}</Text>
            <Text style={[styles.toolSub, { color: textSec }]}>{t.sublabel}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => setActiveTool(null)} style={styles.backBtn}>
        <Ionicons name="arrow-back-outline" size={18} color={Colors.gold} />
        <Text style={[styles.backBtnText, { color: Colors.gold }]}>Todas as ferramentas</Text>
      </Pressable>

      {activeTool === "tmb" && (
        <View>
          <Text style={[styles.sectionTitle, { color: textColor }]}>TMB & TDEE</Text>
          <Text style={[styles.sectionSub, { color: textSec }]}>Fórmula de Harris-Benedict revisada (Mifflin-St Jeor)</Text>
          <Input label="Peso (kg)" value={peso} onChange={setPeso} placeholder="80" />
          <Input label="Altura (cm)" value={altura} onChange={setAltura} placeholder="175" />
          <Input label="Idade (anos)" value={idade} onChange={setIdade} placeholder="25" />
          <Text style={[styles.fieldLabel, { color: textSec }]}>Sexo biológico</Text>
          <View style={styles.chipRow}>
            {(["M", "F"] as ("M" | "F")[]).map(s => (
              <Pressable key={s} onPress={() => setSexo(s)} style={[styles.chip, { borderColor: sexo === s ? Colors.gold : borderColor, backgroundColor: sexo === s ? Colors.gold + "22" : "transparent" }]}>
                <Text style={[styles.chipText, { color: sexo === s ? Colors.gold : textSec }]}>{s === "M" ? "Masculino" : "Feminino"}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.fieldLabel, { color: textSec }]}>Nível de atividade</Text>
          <View style={styles.chipRow}>
            {[["1.2","Sedentário"],["1.375","Leve"],["1.55","Moderado"],["1.725","Ativo"],["1.9","Muito Ativo"]].map(([v, l]) => (
              <Pressable key={v} onPress={() => setNivelAtividade(v)} style={[styles.chip, { borderColor: nivelAtividade === v ? Colors.gold : borderColor, backgroundColor: nivelAtividade === v ? Colors.gold + "22" : "transparent" }]}>
                <Text style={[styles.chipText, { color: nivelAtividade === v ? Colors.gold : textSec }]}>{l}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={calcTMB} style={[styles.calcBtn, { backgroundColor: Colors.gold }]}>
            <Text style={styles.calcBtnText}>Calcular</Text>
          </Pressable>
          {tmb && (
            <View style={[styles.resultBox, { backgroundColor: cardBg, borderColor }]}>
              <Text style={[styles.resultItem, { color: textColor }]}>TMB: <Text style={{ color: Colors.gold }}>{tmb} kcal/dia</Text></Text>
              <Text style={[styles.resultItem, { color: textColor }]}>TDEE (GET): <Text style={{ color: Colors.gold }}>{tdee} kcal/dia</Text></Text>
              <Text style={[styles.resultNote, { color: textSec }]}>Para hipertrofia: +300-500kcal. Para emagrecimento: -300-500kcal.</Text>
            </View>
          )}
        </View>
      )}

      {activeTool === "1rm" && (
        <View>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Calculadora 1RM</Text>
          <Text style={[styles.sectionSub, { color: textSec }]}>Fórmula de Epley. Calcule sua carga máxima estimada.</Text>
          <Input label="Carga utilizada (kg)" value={rm1} onChange={setRm1} placeholder="100" />
          <Input label="Repetições realizadas" value={reps1} onChange={setReps1} placeholder="5" />
          <Pressable onPress={calc1RM} style={[styles.calcBtn, { backgroundColor: Colors.gold }]}><Text style={styles.calcBtnText}>Calcular</Text></Pressable>
          {rm1Result && (
            <View style={[styles.resultBox, { backgroundColor: cardBg, borderColor }]}>
              <Text style={[styles.resultItem, { color: textColor }]}>1RM estimado: <Text style={{ color: Colors.gold }}>{rm1Result} kg</Text></Text>
              {[100, 95, 90, 85, 80, 75, 70, 65, 60].map(pct => (
                <Text key={pct} style={[styles.resultItem, { color: textColor, fontSize: 13 }]}>{pct}% = <Text style={{ color: Colors.gold }}>{Math.round(rm1Result * pct / 100)} kg</Text></Text>
              ))}
            </View>
          )}
        </View>
      )}

      {activeTool === "macros" && (
        <View>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Calculadora de Macronutrientes</Text>
          <Text style={[styles.sectionSub, { color: textSec }]}>Distribuição recomendada: 30% proteína · 45% carboidrato · 25% gordura</Text>
          <Input label="Meta calórica diária (kcal)" value={macroCalGol} onChange={setMacroCalGol} placeholder="2500" />
          <Pressable onPress={calcMacros} style={[styles.calcBtn, { backgroundColor: Colors.gold }]}><Text style={styles.calcBtnText}>Calcular</Text></Pressable>
          {macroProt && (
            <View style={[styles.resultBox, { backgroundColor: cardBg, borderColor }]}>
              <Text style={[styles.resultItem, { color: textColor }]}>Proteína: <Text style={{ color: "#4ADE80" }}>{macroProt}g/dia</Text></Text>
              <Text style={[styles.resultItem, { color: textColor }]}>Carboidrato: <Text style={{ color: "#60A5FA" }}>{macroCarb}g/dia</Text></Text>
              <Text style={[styles.resultItem, { color: textColor }]}>Gordura: <Text style={{ color: "#FBBF24" }}>{macroGord}g/dia</Text></Text>
            </View>
          )}
        </View>
      )}

      {activeTool === "tss" && (
        <View>
          <Text style={[styles.sectionTitle, { color: textColor }]}>TSS — Training Stress Score</Text>
          <Text style={[styles.sectionSub, { color: textSec }]}>Quantifique a carga de treino por sessão. Baseado em duração e intensidade.</Text>
          <Input label="Duração do treino (minutos)" value={tssDur} onChange={setTssDur} placeholder="60" />
          <Input label="FC média durante o treino (bpm)" value={tssHR} onChange={setTssHR} placeholder="150" />
          <Pressable onPress={calcTSS} style={[styles.calcBtn, { backgroundColor: Colors.gold }]}><Text style={styles.calcBtnText}>Calcular</Text></Pressable>
          {tssResult !== null && (
            <View style={[styles.resultBox, { backgroundColor: cardBg, borderColor }]}>
              <Text style={[styles.resultItem, { color: textColor }]}>TSS estimado: <Text style={{ color: Colors.gold }}>{tssResult} pts</Text></Text>
              <Text style={[styles.resultNote, { color: textSec }]}>{"< 150: Recuperação fácil · 150-300: Cansaço moderado · > 300: Descanso necessário"}</Text>
            </View>
          )}
        </View>
      )}

      {activeTool === "rpe" && (
        <View>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Tabela RPE / RIR</Text>
          <Text style={[styles.sectionSub, { color: textSec }]}>Rating of Perceived Exertion e Reps in Reserve</Text>
          {RPE_TABLE.map((r, i) => (
            <View key={i} style={[styles.rpeRow, { backgroundColor: cardBg, borderColor }]}>
              <View style={[styles.rpeBadge, { backgroundColor: Colors.gold + "22" }]}>
                <Text style={[styles.rpeBadgeText, { color: Colors.gold }]}>RPE {r.rpe}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.rpeRir, { color: textColor }]}>RIR: {r.rir}</Text>
                <Text style={[styles.rpeDesc, { color: textSec }]}>{r.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {activeTool === "periodizacao" && (
        <View>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Modelos de Periodização</Text>
          <Text style={[styles.sectionSub, { color: textSec }]}>Escolha o modelo mais adequado ao seu nível e objetivo</Text>
          {PERIODIZACAO_MODELS.map((m, i) => (
            <View key={i} style={[styles.periCard, { backgroundColor: cardBg, borderColor }]}>
              <Text style={[styles.periName, { color: Colors.gold }]}>{m.name}</Text>
              <Text style={[styles.periDesc, { color: textColor }]}>{m.desc}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                <View style={styles.periTag}><Text style={{ color: Colors.gold, fontSize: 11 }}>⏱ {m.semanas}</Text></View>
                <View style={styles.periTag}><Text style={{ color: Colors.gold, fontSize: 11 }}>📊 Volume: {m.volume}</Text></View>
                <View style={styles.periTag}><Text style={{ color: Colors.gold, fontSize: 11 }}>⚡ Int: {m.intensidade}</Text></View>
              </View>
            </View>
          ))}
        </View>
      )}

      {activeTool === "dose" && (
        <View>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Relação Dose-Resposta</Text>
          <Text style={[styles.sectionSub, { color: textSec }]}>Volume semanal por músculo vs. resposta adaptativa (baseado em evidências científicas)</Text>
          {DOSE_DATA.map((d, i) => (
            <View key={i} style={[styles.doseRow, { backgroundColor: cardBg, borderColor }]}>
              <View style={[styles.doseDot, { backgroundColor: d.cor }]} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.doseVol, { color: textColor }]}>{d.vol}</Text>
                <Text style={[styles.doseResp, { color: d.cor }]}>{d.resp}</Text>
              </View>
            </View>
          ))}
          <Text style={[styles.resultNote, { color: textSec, marginTop: 12 }]}>Fonte: Schoenfeld et al., 2017; Krieger, 2010; meta-análises recentes de hipertrofia.</Text>
        </View>
      )}

      {activeTool === "pesquisa" && (
        <View>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Centro de Pesquisa</Text>
          <Text style={[styles.sectionSub, { color: textSec }]}>Resumos de estudos e revisões sistemáticas recentes em ciência do exercício</Text>
          {PESQUISA_ITEMS.map((p, i) => (
            <View key={i} style={[styles.pesquisaCard, { backgroundColor: cardBg, borderColor }]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={[styles.pesquisaTitulo, { color: textColor }]}>{p.titulo}</Text>
                <View style={styles.pesquisaFonte}><Text style={{ color: Colors.gold, fontSize: 10 }}>{p.fonte}</Text></View>
              </View>
              <Text style={[styles.pesquisaResumo, { color: textSec }]}>{p.resumo}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// ============ ACERVO ATLAS ============
function AcervoAtlas({ colors, isDark }: { colors: any; isDark: boolean }) {
  const cardBg = isDark ? Colors.card : Colors.lightCard;
  const textColor = isDark ? Colors.text : Colors.lightText;
  const textSec = isDark ? Colors.textSecondary : Colors.lightTextSecondary;
  const borderColor = isDark ? Colors.border : Colors.lightBorder;

  const CATEGORIAS = [
    { icon: "flask-outline", label: "Fisiologia", color: "#D4AF37" },
    { icon: "barbell-outline", label: "Biomecânica", color: "#60A5FA" },
    { icon: "nutrition-outline", label: "Nutrição", color: "#4ADE80" },
    { icon: "bed-outline", label: "Recuperação", color: "#F472B6" },
    { icon: "pulse-outline", label: "Periodização", color: "#FB923C" },
    { icon: "analytics-outline", label: "Performance", color: "#A78BFA" },
    { icon: "book-outline", label: "Research", color: "#22D3EE" },
  ];

  const EDITORIAIS = [
    { title: "Hipertrofia vs Força: O que a ciência realmente diz", tag: "Revisão", min: "12 min", desc: "Meta-análise de 47 estudos sobre diferenças fisiológicas entre protocolos de hipertrofia e força máxima." },
    { title: "Proteína, timing e síntese muscular pós-treino", tag: "Nutrição", min: "8 min", desc: "Revisão das evidências sobre janela anabólica, MPS e distribuição proteica ao longo do dia." },
    { title: "Estratégias de deload para atletas avançados", tag: "Programação", min: "10 min", desc: "Quando e como implementar semanas de descarga para maximizar adaptações e prevenir overtraining." },
    { title: "RIR vs RPE: Guia prático completo", tag: "Intensidade", min: "6 min", desc: "Como usar Reps in Reserve e Rating of Perceived Exertion para autoregular o treinamento." },
    { title: "Frequência ótima de treino por músculo", tag: "Volume", min: "9 min", desc: "Análise de estudos sobre frequência 1x, 2x e 3x por semana por grupo muscular." },
    { title: "Suplementação baseada em evidências", tag: "Nutrição", min: "15 min", desc: "Creatina, cafeína, beta-alanina e proteína whey: o que realmente funciona." },
  ];

  const [catSel, setCatSel] = useState("Todos");

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={[styles.sectionTitle, { color: textColor }]}>Acervo Atlas</Text>
      <Text style={[styles.sectionSub, { color: textSec }]}>Conteúdo científico curado para profissionais do esporte e atletas</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {["Todos", ...CATEGORIAS.map(c => c.label)].map(cat => (
          <Pressable key={cat} onPress={() => setCatSel(cat)} style={[styles.catChip, { borderColor: catSel === cat ? Colors.gold : borderColor, backgroundColor: catSel === cat ? Colors.gold + "22" : "transparent" }]}>
            <Text style={[styles.catChipText, { color: catSel === cat ? Colors.gold : textSec }]}>{cat}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={[{ fontFamily: "Outfit_700Bold", fontSize: 15, color: textColor, marginBottom: 12 }]}>Editoriais Científicos</Text>
      {EDITORIAIS.map((ed, i) => (
        <Animated.View key={i} entering={FadeInDown.delay(i * 60)} style={[styles.editorialCard, { backgroundColor: cardBg, borderColor }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <View style={[styles.editTag, { backgroundColor: Colors.gold + "22" }]}>
              <Text style={[styles.editTagText, { color: Colors.gold }]}>{ed.tag}</Text>
            </View>
            <Text style={[styles.editMin, { color: textSec }]}>{ed.min}</Text>
          </View>
          <Text style={[styles.editTitle, { color: textColor }]}>{ed.title}</Text>
          <Text style={[styles.editDesc, { color: textSec }]}>{ed.desc}</Text>
        </Animated.View>
      ))}
    </ScrollView>
  );
}

// ============ MAIN ============
export default function AtlasBrainScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { colors, isDark } = useTheme();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const [mainTab, setMainTab] = useState<MainTab>("academico");

  const bg = isDark ? Colors.black : Colors.lightBg;
  const cardBg = isDark ? Colors.card : Colors.lightCard;
  const textColor = isDark ? Colors.text : Colors.lightText;
  const textSec = isDark ? Colors.textSecondary : Colors.lightTextSecondary;
  const borderColor = isDark ? Colors.border : Colors.lightBorder;

  const TABS: { key: MainTab; label: string; icon: string }[] = [
    { key: "academico", label: "Acadêmico", icon: "flask-outline" },
    { key: "prescricao", label: "Prescrição", icon: "document-text-outline" },
    { key: "tools", label: "Tools", icon: "construct-outline" },
    { key: "acervo", label: "Acervo", icon: "library-outline" },
  ];

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      {/* Header */}
      <LinearGradient colors={isDark ? [Colors.black, Colors.black] : [Colors.lightBg, Colors.lightBg]} style={[styles.headerBg, { paddingTop: topPad + 8 }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={[styles.headerTitle, { color: textColor }]}>Atlas Brain</Text>
            <Text style={[styles.headerSub, { color: textSec }]}>IA Acadêmica & Prescrição Científica</Text>
          </View>
          <View style={[styles.headerBadge, { backgroundColor: Colors.gold + "22", borderColor: Colors.gold + "44" }]}>
            <Ionicons name="flask" size={16} color={Colors.gold} />
            <Text style={[styles.headerBadgeText, { color: Colors.gold }]}>GPT-4</Text>
          </View>
        </View>
        {/* Main Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {TABS.map(t => (
            <Pressable key={t.key} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMainTab(t.key); }}
              style={[styles.mainTabBtn, { borderColor: mainTab === t.key ? Colors.gold : borderColor, backgroundColor: mainTab === t.key ? Colors.gold + "22" : "transparent" }]}>
              <Ionicons name={t.icon as any} size={15} color={mainTab === t.key ? Colors.gold : textSec} />
              <Text style={[styles.mainTabText, { color: mainTab === t.key ? Colors.gold : textSec }]}>{t.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </LinearGradient>

      <View style={[styles.content, { paddingBottom: botPad + 64 }]}>
        {mainTab === "academico" && <AtlasAcademico colors={colors} isDark={isDark} token={token} />}
        {mainTab === "prescricao" && <PrescricaoAtlas colors={colors} isDark={isDark} token={token} />}
        {mainTab === "tools" && <AtlasTools colors={colors} isDark={isDark} />}
        {mainTab === "acervo" && <AcervoAtlas colors={colors} isDark={isDark} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerBg: { paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20 },
  headerTitle: { fontFamily: "Outfit_800ExtraBold", fontSize: 26 },
  headerSub: { fontFamily: "Outfit_400Regular", fontSize: 13, marginTop: 2 },
  headerBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
  headerBadgeText: { fontFamily: "Outfit_600SemiBold", fontSize: 12 },
  mainTabBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  mainTabText: { fontFamily: "Outfit_600SemiBold", fontSize: 13 },
  content: { flex: 1 },
  subTabRow: { flexDirection: "row", borderBottomWidth: 1 },
  subTab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 12 },
  subTabActive: { borderBottomWidth: 2, borderBottomColor: Colors.gold },
  subTabText: { fontFamily: "Outfit_600SemiBold", fontSize: 11 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 8 },
  msgRowUser: { justifyContent: "flex-end" },
  msgBubble: { borderRadius: 18, padding: 12 },
  msgBubbleUser: { backgroundColor: Colors.gold },
  msgText: { fontFamily: "Outfit_400Regular", fontSize: 15, lineHeight: 22 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", padding: 12, gap: 8, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontFamily: "Outfit_400Regular", fontSize: 15, maxHeight: 120 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center" },
  emptyTitle: { fontFamily: "Outfit_700Bold", fontSize: 20, marginBottom: 8, textAlign: "center" },
  emptySub: { fontFamily: "Outfit_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20, paddingHorizontal: 24 },
  sugestoesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 20, paddingHorizontal: 16, justifyContent: "center" },
  sugestao: { borderWidth: 1, borderRadius: 12, padding: 10, maxWidth: "47%" },
  sugestaoText: { fontFamily: "Outfit_400Regular", fontSize: 12, textAlign: "center" },
  sectionTitle: { fontFamily: "Outfit_700Bold", fontSize: 18, marginBottom: 6 },
  sectionSub: { fontFamily: "Outfit_400Regular", fontSize: 13, marginBottom: 16, lineHeight: 19 },
  searchRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  searchInput: { flex: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontFamily: "Outfit_400Regular", fontSize: 14, borderWidth: 1 },
  searchBtn: { width: 46, height: 46, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  articleCard: { borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 10 },
  articleTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 14, marginBottom: 4 },
  articleMeta: { fontFamily: "Outfit_400Regular", fontSize: 12, marginBottom: 4 },
  articleDoi: { fontFamily: "Outfit_400Regular", fontSize: 11, marginBottom: 8 },
  analyzeArticleBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  analyzeArticleBtnText: { fontFamily: "Outfit_600SemiBold", fontSize: 12 },
  analyzeTextInput: { borderRadius: 12, padding: 14, fontFamily: "Outfit_400Regular", fontSize: 14, minHeight: 140, borderWidth: 1, marginBottom: 12 },
  analyzeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 14, marginBottom: 16 },
  analyzeBtnText: { color: "#000", fontFamily: "Outfit_700Bold", fontSize: 15 },
  analyzeResult: { borderRadius: 14, padding: 14, borderWidth: 1 },
  analyzeResultText: { fontFamily: "Outfit_400Regular", fontSize: 14, lineHeight: 22 },
  fieldLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 13, marginBottom: 6, marginTop: 4 },
  fieldInput: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontFamily: "Outfit_400Regular", fontSize: 14, borderWidth: 1, marginBottom: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontFamily: "Outfit_500Medium", fontSize: 13 },
  gerarBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 14, marginTop: 8 },
  gerarBtnText: { color: "#000", fontFamily: "Outfit_700Bold", fontSize: 15 },
  resultHeader: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 12 },
  resultTitle: { fontFamily: "Outfit_700Bold", fontSize: 17, flex: 1 },
  novaBtn: { borderWidth: 1, borderColor: Colors.gold, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  resultCard: { borderRadius: 14, padding: 16, borderWidth: 1 },
  resultText: { fontFamily: "Outfit_400Regular", fontSize: 14, lineHeight: 22 },
  streamingText: { fontFamily: "Outfit_400Regular", fontSize: 12, lineHeight: 18 },
  toolCard: { borderRadius: 14, padding: 14, borderWidth: 1, alignItems: "flex-start", gap: 4 },
  toolLabel: { fontFamily: "Outfit_700Bold", fontSize: 14 },
  toolSub: { fontFamily: "Outfit_400Regular", fontSize: 11 },
  calcBtn: { borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 8, marginBottom: 12 },
  calcBtnText: { color: "#000", fontFamily: "Outfit_700Bold", fontSize: 15 },
  resultBox: { borderRadius: 12, padding: 14, borderWidth: 1, gap: 4 },
  resultItem: { fontFamily: "Outfit_500Medium", fontSize: 14 },
  resultNote: { fontFamily: "Outfit_400Regular", fontSize: 12, marginTop: 4 },
  rpeRow: { flexDirection: "row", alignItems: "center", borderRadius: 12, padding: 12, borderWidth: 1, marginBottom: 8 },
  rpeBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, minWidth: 70, alignItems: "center" },
  rpeBadgeText: { fontFamily: "Outfit_700Bold", fontSize: 13 },
  rpeRir: { fontFamily: "Outfit_600SemiBold", fontSize: 13 },
  rpeDesc: { fontFamily: "Outfit_400Regular", fontSize: 12 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 },
  backBtnText: { fontFamily: "Outfit_600SemiBold", fontSize: 14 },
  periCard: { borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 10 },
  periName: { fontFamily: "Outfit_700Bold", fontSize: 15, marginBottom: 4 },
  periDesc: { fontFamily: "Outfit_400Regular", fontSize: 13, lineHeight: 19 },
  periTag: { backgroundColor: Colors.gold + "22", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  doseRow: { flexDirection: "row", alignItems: "center", borderRadius: 12, padding: 12, borderWidth: 1, marginBottom: 8 },
  doseDot: { width: 12, height: 12, borderRadius: 6 },
  doseVol: { fontFamily: "Outfit_600SemiBold", fontSize: 13 },
  doseResp: { fontFamily: "Outfit_400Regular", fontSize: 12 },
  pesquisaCard: { borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 10 },
  pesquisaTitulo: { fontFamily: "Outfit_700Bold", fontSize: 14, flex: 1 },
  pesquisaFonte: { backgroundColor: Colors.gold + "22", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  pesquisaResumo: { fontFamily: "Outfit_400Regular", fontSize: 13, lineHeight: 19 },
  catChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8 },
  catChipText: { fontFamily: "Outfit_600SemiBold", fontSize: 13 },
  editorialCard: { borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 10 },
  editTag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  editTagText: { fontFamily: "Outfit_600SemiBold", fontSize: 11 },
  editMin: { fontFamily: "Outfit_400Regular", fontSize: 11 },
  editTitle: { fontFamily: "Outfit_700Bold", fontSize: 14, marginBottom: 6 },
  editDesc: { fontFamily: "Outfit_400Regular", fontSize: 13, lineHeight: 19 },
});
