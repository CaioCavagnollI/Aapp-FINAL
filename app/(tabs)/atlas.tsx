import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { fetch } from "expo/fetch";
import { getApiUrl } from "@/lib/query-client";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useLocalSearchParams } from "expo-router";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

let counter = 0;
function uid() {
  counter++;
  return `m-${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 9)}`;
}

const SUGESTOES = [
  "Qual a faixa de repetições ideal para hipertrofia?",
  "Como programar um bloco de força máxima?",
  "Explique RIR e como usar de forma eficaz",
  "O que a ciência diz sobre treinar até a falha?",
  "Como organizar periodização ondulatória?",
  "Diferença entre RPE e %1RM na prática",
];

const CATEGORIAS = [
  { icon: "flask-outline", label: "Fisiologia", color: "#D4AF37" },
  { icon: "barbell-outline", label: "Biomecânica", color: "#60A5FA" },
  { icon: "nutrition-outline", label: "Nutrição", color: "#4ADE80" },
  { icon: "bed-outline", label: "Recuperação", color: "#F472B6" },
  { icon: "pulse-outline", label: "Periodização", color: "#FB923C" },
  { icon: "analytics-outline", label: "Performance", color: "#A78BFA" },
  { icon: "book-outline", label: "Research", color: "#22D3EE" },
  { icon: "star-outline", label: "Favoritos", color: "#FBBF24" },
];

const EDITORIAIS = [
  { title: "Hipertrofia vs Força: O que a ciência realmente diz", tag: "Revisão", min: "12 min" },
  { title: "Proteína, timing e síntese muscular pós-treino", tag: "Nutrição", min: "8 min" },
  { title: "Estratégias de deload para atletas avançados", tag: "Programação", min: "10 min" },
  { title: "RIR vs RPE: Guia prático completo", tag: "Intensidade", min: "6 min" },
];

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

function TypingIndicator() {
  const d1 = useSharedValue(0);
  const d2 = useSharedValue(0);
  const d3 = useSharedValue(0);
  useEffect(() => {
    d1.value = withRepeat(withTiming(1, { duration: 400 }), -1, true);
    setTimeout(() => { d2.value = withRepeat(withTiming(1, { duration: 400 }), -1, true); }, 150);
    setTimeout(() => { d3.value = withRepeat(withTiming(1, { duration: 400 }), -1, true); }, 300);
  }, []);
  const s1 = useAnimatedStyle(() => ({ opacity: 0.3 + d1.value * 0.7 }));
  const s2 = useAnimatedStyle(() => ({ opacity: 0.3 + d2.value * 0.7 }));
  const s3 = useAnimatedStyle(() => ({ opacity: 0.3 + d3.value * 0.7 }));
  return (
    <View style={styles.typingRow}>
      <View style={styles.aiIcon}><Ionicons name="flask" size={12} color={Colors.gold} /></View>
      <View style={styles.typingBubble}>
        <Animated.View style={[styles.dot, s1]} />
        <Animated.View style={[styles.dot, s2]} />
        <Animated.View style={[styles.dot, s3]} />
      </View>
    </View>
  );
}

function Bubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <Animated.View entering={FadeInUp.duration(200).springify()} style={[styles.msgRow, isUser && styles.msgRowUser]}>
      {!isUser && <View style={styles.aiIcon}><Ionicons name="flask" size={12} color={Colors.gold} /></View>}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
        <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAI]}>{msg.content}</Text>
      </View>
    </Animated.View>
  );
}

function LabCalculators({ botPad }: { botPad: number }) {
  const [activeTool, setActiveTool] = useState<"volume" | "rm" | "imc" | "rpe">("volume");

  const [volSets, setVolSets] = useState("");
  const [volReps, setVolReps] = useState("");
  const [volLoad, setVolLoad] = useState("");
  const [volResult, setVolResult] = useState<string | null>(null);

  const [rmWeight, setRmWeight] = useState("");
  const [rmReps, setRmReps] = useState("");
  const [rmResult, setRm1Result] = useState<number | null>(null);
  const [rmPct, setRmPct] = useState("80");

  const [imcWeight, setImcWeight] = useState("");
  const [imcHeight, setImcHeight] = useState("");
  const [imcResult, setImcResult] = useState<number | null>(null);

  function calcVolume() {
    const s = parseFloat(volSets);
    const r = parseFloat(volReps);
    const l = parseFloat(volLoad);
    if (!s || !r || !l) { Alert.alert("Preencha todos os campos"); return; }
    const total = s * r * l;
    const perSet = r * l;
    setVolResult(`Volume total: ${total.toFixed(0)} kg\nPor série: ${perSet.toFixed(0)} kg\nTotal de reps: ${(s * r).toFixed(0)}`);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function calc1RM() {
    const w = parseFloat(rmWeight);
    const r = parseFloat(rmReps);
    if (!w || !r) { Alert.alert("Preencha peso e repetições"); return; }
    const epley = w * (1 + r / 30);
    const brzycki = w * (36 / (37 - r));
    const avg = (epley + brzycki) / 2;
    setRm1Result(avg);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function calcIMC() {
    const w = parseFloat(imcWeight);
    const h = parseFloat(imcHeight) / 100;
    if (!w || !h) { Alert.alert("Preencha peso e altura"); return; }
    const imc = w / (h * h);
    setImcResult(imc);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function imcCategory(imc: number): { label: string; color: string } {
    if (imc < 18.5) return { label: "Abaixo do peso", color: "#60A5FA" };
    if (imc < 25) return { label: "Peso normal", color: "#4ADE80" };
    if (imc < 30) return { label: "Sobrepeso", color: "#FBBF24" };
    if (imc < 35) return { label: "Obesidade grau I", color: "#FB923C" };
    if (imc < 40) return { label: "Obesidade grau II", color: "#F87171" };
    return { label: "Obesidade grau III", color: "#EF4444" };
  }

  const tools = [
    { id: "volume" as const, label: "Volume", icon: "layers-outline" },
    { id: "rm" as const, label: "%1RM", icon: "barbell-outline" },
    { id: "imc" as const, label: "IMC", icon: "body-outline" },
    { id: "rpe" as const, label: "RPE", icon: "speedometer-outline" },
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[labStyles.scroll, { paddingBottom: botPad + 100 }]}>
      <Animated.View entering={FadeInDown.delay(60).springify()}>
        <View style={labStyles.toolBar}>
          {tools.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTool(t.id); }}
              style={[labStyles.toolBtn, activeTool === t.id && labStyles.toolBtnActive]}
            >
              <Ionicons name={t.icon as any} size={16} color={activeTool === t.id ? Colors.gold : Colors.muted} />
              <Text style={[labStyles.toolLabel, activeTool === t.id && labStyles.toolLabelActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>

      {activeTool === "volume" && (
        <Animated.View entering={FadeInDown.delay(80).springify()} style={labStyles.card}>
          <View style={labStyles.cardHeader}>
            <Ionicons name="layers-outline" size={20} color={Colors.gold} />
            <Text style={labStyles.cardTitle}>Calculadora de Volume</Text>
          </View>
          <Text style={labStyles.cardDesc}>Calcule o volume total de treino por exercício ou sessão</Text>
          <View style={labStyles.inputGroup}>
            <View style={labStyles.inputItem}>
              <Text style={labStyles.inputLabel}>Séries</Text>
              <TextInput
                style={labStyles.input}
                value={volSets}
                onChangeText={setVolSets}
                keyboardType="numeric"
                placeholder="Ex: 4"
                placeholderTextColor={Colors.muted}
              />
            </View>
            <View style={labStyles.inputItem}>
              <Text style={labStyles.inputLabel}>Repetições</Text>
              <TextInput
                style={labStyles.input}
                value={volReps}
                onChangeText={setVolReps}
                keyboardType="numeric"
                placeholder="Ex: 8"
                placeholderTextColor={Colors.muted}
              />
            </View>
            <View style={labStyles.inputItem}>
              <Text style={labStyles.inputLabel}>Carga (kg)</Text>
              <TextInput
                style={labStyles.input}
                value={volLoad}
                onChangeText={setVolLoad}
                keyboardType="numeric"
                placeholder="Ex: 100"
                placeholderTextColor={Colors.muted}
              />
            </View>
          </View>
          <Pressable onPress={calcVolume} style={({ pressed }) => [labStyles.calcBtn, { opacity: pressed ? 0.8 : 1 }]}>
            <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={labStyles.calcBtnGrad}>
              <Text style={labStyles.calcBtnText}>Calcular</Text>
            </LinearGradient>
          </Pressable>
          {volResult && (
            <Animated.View entering={FadeIn.duration(300)} style={labStyles.resultBox}>
              {volResult.split("\n").map((line, i) => (
                <Text key={i} style={[labStyles.resultText, i === 0 && labStyles.resultMain]}>{line}</Text>
              ))}
            </Animated.View>
          )}
        </Animated.View>
      )}

      {activeTool === "rm" && (
        <Animated.View entering={FadeInDown.delay(80).springify()} style={labStyles.card}>
          <View style={labStyles.cardHeader}>
            <Ionicons name="barbell-outline" size={20} color={Colors.gold} />
            <Text style={labStyles.cardTitle}>Calculadora de %1RM</Text>
          </View>
          <Text style={labStyles.cardDesc}>Estime seu 1RM e calcule cargas por percentual (Epley + Brzycki)</Text>
          <View style={labStyles.inputGroup}>
            <View style={labStyles.inputItem}>
              <Text style={labStyles.inputLabel}>Peso (kg)</Text>
              <TextInput
                style={labStyles.input}
                value={rmWeight}
                onChangeText={setRmWeight}
                keyboardType="numeric"
                placeholder="Ex: 100"
                placeholderTextColor={Colors.muted}
              />
            </View>
            <View style={labStyles.inputItem}>
              <Text style={labStyles.inputLabel}>Reps realizadas</Text>
              <TextInput
                style={labStyles.input}
                value={rmReps}
                onChangeText={setRmReps}
                keyboardType="numeric"
                placeholder="Ex: 5"
                placeholderTextColor={Colors.muted}
              />
            </View>
          </View>
          <Pressable onPress={calc1RM} style={({ pressed }) => [labStyles.calcBtn, { opacity: pressed ? 0.8 : 1 }]}>
            <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={labStyles.calcBtnGrad}>
              <Text style={labStyles.calcBtnText}>Estimar 1RM</Text>
            </LinearGradient>
          </Pressable>
          {rmResult != null && (
            <Animated.View entering={FadeIn.duration(300)} style={labStyles.resultBox}>
              <Text style={labStyles.resultMain}>1RM estimado: {rmResult.toFixed(1)} kg</Text>
              <Text style={labStyles.resultSub}>Percentuais de carga:</Text>
              {[90, 85, 80, 75, 70, 65, 60].map((pct) => (
                <View key={pct} style={labStyles.pctRow}>
                  <Text style={labStyles.pctLabel}>{pct}%</Text>
                  <Text style={labStyles.pctValue}>{(rmResult * pct / 100).toFixed(1)} kg</Text>
                </View>
              ))}
            </Animated.View>
          )}
        </Animated.View>
      )}

      {activeTool === "imc" && (
        <Animated.View entering={FadeInDown.delay(80).springify()} style={labStyles.card}>
          <View style={labStyles.cardHeader}>
            <Ionicons name="body-outline" size={20} color={Colors.gold} />
            <Text style={labStyles.cardTitle}>Calculadora de IMC</Text>
          </View>
          <Text style={labStyles.cardDesc}>Índice de Massa Corporal — referência para composição corporal</Text>
          <View style={labStyles.inputGroup}>
            <View style={labStyles.inputItem}>
              <Text style={labStyles.inputLabel}>Peso (kg)</Text>
              <TextInput
                style={labStyles.input}
                value={imcWeight}
                onChangeText={setImcWeight}
                keyboardType="numeric"
                placeholder="Ex: 80"
                placeholderTextColor={Colors.muted}
              />
            </View>
            <View style={labStyles.inputItem}>
              <Text style={labStyles.inputLabel}>Altura (cm)</Text>
              <TextInput
                style={labStyles.input}
                value={imcHeight}
                onChangeText={setImcHeight}
                keyboardType="numeric"
                placeholder="Ex: 175"
                placeholderTextColor={Colors.muted}
              />
            </View>
          </View>
          <Pressable onPress={calcIMC} style={({ pressed }) => [labStyles.calcBtn, { opacity: pressed ? 0.8 : 1 }]}>
            <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={labStyles.calcBtnGrad}>
              <Text style={labStyles.calcBtnText}>Calcular IMC</Text>
            </LinearGradient>
          </Pressable>
          {imcResult != null && (() => {
            const cat = imcCategory(imcResult);
            return (
              <Animated.View entering={FadeIn.duration(300)} style={labStyles.resultBox}>
                <Text style={labStyles.resultMain}>IMC: {imcResult.toFixed(1)}</Text>
                <View style={[labStyles.imcCatBadge, { backgroundColor: `${cat.color}20`, borderColor: `${cat.color}40` }]}>
                  <Text style={[labStyles.imcCatText, { color: cat.color }]}>{cat.label}</Text>
                </View>
                <View style={labStyles.imcScale}>
                  {[
                    { label: "< 18.5", cat: "Abaixo", color: "#60A5FA" },
                    { label: "18.5-24.9", cat: "Normal", color: "#4ADE80" },
                    { label: "25-29.9", cat: "Sobrepeso", color: "#FBBF24" },
                    { label: "≥ 30", cat: "Obeso", color: "#F87171" },
                  ].map((row) => (
                    <View key={row.cat} style={labStyles.imcScaleRow}>
                      <View style={[labStyles.imcScaleDot, { backgroundColor: row.color }]} />
                      <Text style={labStyles.imcScaleRange}>{row.label}</Text>
                      <Text style={labStyles.imcScaleCat}>{row.cat}</Text>
                    </View>
                  ))}
                </View>
              </Animated.View>
            );
          })()}
        </Animated.View>
      )}

      {activeTool === "rpe" && (
        <Animated.View entering={FadeInDown.delay(80).springify()} style={labStyles.card}>
          <View style={labStyles.cardHeader}>
            <Ionicons name="speedometer-outline" size={20} color={Colors.gold} />
            <Text style={labStyles.cardTitle}>Tabela RPE / RIR</Text>
          </View>
          <Text style={labStyles.cardDesc}>Escala de Percepção de Esforço e Repetições em Reserva</Text>
          {RPE_TABLE.map((row) => (
            <View key={row.rpe} style={labStyles.rpeRow}>
              <View style={labStyles.rpeBadges}>
                <View style={labStyles.rpeBadge}>
                  <Text style={labStyles.rpeBadgeLabel}>RPE</Text>
                  <Text style={labStyles.rpeBadgeVal}>{row.rpe}</Text>
                </View>
                <View style={[labStyles.rpeBadge, { backgroundColor: "rgba(96,165,250,0.12)", borderColor: "rgba(96,165,250,0.25)" }]}>
                  <Text style={[labStyles.rpeBadgeLabel, { color: "#60A5FA" }]}>RIR</Text>
                  <Text style={[labStyles.rpeBadgeVal, { color: "#60A5FA" }]}>{row.rir}</Text>
                </View>
              </View>
              <Text style={labStyles.rpeDesc}>{row.desc}</Text>
            </View>
          ))}
          <LinearGradient colors={["#1A1A1C", "#111113"]} style={labStyles.rpeTip}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.gold} />
            <Text style={labStyles.rpeTipText}>RPE e RIR são ferramentas de auto-regulação. Use consistentemente para calibrar sua percepção de esforço ao longo das semanas.</Text>
          </LinearGradient>
        </Animated.View>
      )}

      <Animated.View entering={FadeInDown.delay(200).springify()} style={[labStyles.card, { marginTop: 4 }]}>
        <View style={labStyles.cardHeader}>
          <Ionicons name="time-outline" size={18} color={Colors.muted} />
          <Text style={[labStyles.cardTitle, { color: Colors.textSecondary, fontSize: 13 }]}>Em breve no Lab</Text>
        </View>
        <View style={labStyles.comingSoon}>
          {["Estimativa TDEE / GET", "Calculadora de carga de treino (TSS)", "Periodização automática", "Análise de deload"].map((item) => (
            <View key={item} style={labStyles.comingSoonItem}>
              <Ionicons name="add-circle-outline" size={14} color={Colors.muted} />
              <Text style={labStyles.comingSoonText}>{item}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

export default function AtlasScreen() {
  const insets = useSafeAreaInsets();
  const { initialMessage } = useLocalSearchParams<{ initialMessage?: string }>();
  const [activeTab, setActiveTab] = useState<"chat" | "conteudo" | "lab">("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const userMsg: Message = { id: uid(), role: "user", content: trimmed };
    const currentMessages = [...messages, userMsg];
    setMessages(currentMessages);
    setInput("");
    setIsSending(true);
    setStreamContent("");
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: currentMessages.map((m) => ({ role: m.role, content: m.content })) }),
      });
      if (!res.ok) throw new Error("Erro na resposta");
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data) as { content?: string };
            if (parsed.content) { full += parsed.content; setStreamContent(full); }
          } catch {}
        }
      }
      if (full) {
        setMessages((prev) => [...prev, { id: uid(), role: "assistant", content: full }]);
      }
    } catch {
      setMessages((prev) => [...prev, { id: uid(), role: "assistant", content: "Erro ao conectar com o Lab IA. Verifique sua conexão e tente novamente." }]);
    } finally {
      setIsSending(false);
      setStreamContent("");
    }
  }, [messages, isSending]);

  useEffect(() => {
    if (initialMessage && messages.length === 0) {
      sendMessage(initialMessage);
    }
  }, [initialMessage]);

  const showTyping = isSending && !streamContent;
  const showStreaming = isSending && !!streamContent;
  const listData: Message[] = showStreaming
    ? [...messages, { id: "stream", role: "assistant", content: streamContent }]
    : messages;

  const TABS = [
    { id: "chat" as const, label: "Lab IA", icon: "chatbubble-outline" },
    { id: "conteudo" as const, label: "Conteúdo", icon: "library-outline" },
    { id: "lab" as const, label: "Lab", icon: "calculator-outline" },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.headerLeft}>
          <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={styles.headerLogo}>
            <Ionicons name="flask" size={18} color={Colors.black} />
          </LinearGradient>
          <View>
            <Text style={styles.headerTitle}>Nexus</Text>
            <Text style={styles.headerSub}>Powered by Atlas</Text>
          </View>
        </View>
      </View>

      <View style={styles.modeTabs}>
        {TABS.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab(t.id); }}
            style={[styles.modeTab, activeTab === t.id && styles.modeTabActive]}
          >
            <Ionicons name={t.icon as any} size={14} color={activeTab === t.id ? Colors.gold : Colors.muted} />
            <Text style={[styles.modeTabText, activeTab === t.id && styles.modeTabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {activeTab === "chat" ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
          <FlatList
            ref={listRef}
            data={listData}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => <Bubble msg={item} />}
            inverted
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.chatList, { paddingBottom: botPad + 80 }]}
            ListHeaderComponent={showTyping ? <TypingIndicator /> : null}
            ListEmptyComponent={
              <Animated.View entering={FadeIn.duration(600)} style={styles.emptyState}>
                <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={styles.emptyLogo}>
                  <Ionicons name="flask" size={28} color={Colors.black} />
                </LinearGradient>
                <Text style={styles.emptyTitle}>Atlas IA</Text>
                <Text style={styles.emptySub}>Pergunte qualquer coisa sobre ciência do treino, periodização, nutrição esportiva e fisiologia do exercício.</Text>
                <Text style={styles.emptyPowered}>Powered by Nexus</Text>
                <View style={styles.suggestions}>
                  {SUGESTOES.map((q) => (
                    <Pressable key={q} onPress={() => sendMessage(q)} style={({ pressed }) => [styles.suggestionChip, { opacity: pressed ? 0.75 : 1 }]}>
                      <Text style={styles.suggestionText}>{q}</Text>
                    </Pressable>
                  ))}
                </View>
              </Animated.View>
            }
          />
          <View style={[styles.inputArea, { paddingBottom: Math.max(botPad, Platform.OS === "web" ? 34 : 8) + 8 }]}>
            <View style={styles.inputRow}>
              <TextInput
                ref={inputRef}
                style={styles.textInput}
                placeholder="Pergunte à ciência..."
                placeholderTextColor={Colors.muted}
                value={input}
                onChangeText={setInput}
                multiline
                returnKeyType="send"
                onSubmitEditing={() => sendMessage(input)}
              />
              <Pressable
                onPress={() => sendMessage(input)}
                disabled={isSending || !input.trim()}
                style={({ pressed }) => [styles.sendBtn, { opacity: pressed || isSending || !input.trim() ? 0.5 : 1 }]}
              >
                <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={styles.sendBtnGrad}>
                  {isSending ? <ActivityIndicator size="small" color={Colors.black} /> : <Ionicons name="arrow-up" size={18} color={Colors.black} />}
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      ) : activeTab === "lab" ? (
        <LabCalculators botPad={botPad} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.contentScroll, { paddingBottom: botPad + 100 }]}>
          <Animated.View entering={FadeInDown.delay(60).springify()}>
            <Text style={styles.contentSection}>Categorias</Text>
            <View style={styles.catGrid}>
              {CATEGORIAS.map((c) => (
                <Pressable key={c.label} style={({ pressed }) => [styles.catCard, { opacity: pressed ? 0.8 : 1 }]} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                  <View style={[styles.catIcon, { backgroundColor: `${c.color}18`, borderColor: `${c.color}30` }]}>
                    <Ionicons name={c.icon as any} size={20} color={c.color} />
                  </View>
                  <Text style={styles.catLabel}>{c.label}</Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).springify()}>
            <View style={styles.sectionRow}>
              <Text style={styles.contentSection}>Editorial</Text>
              <Text style={styles.seeAll}>Ver tudo</Text>
            </View>
            {EDITORIAIS.map((e) => (
              <Pressable key={e.title} style={({ pressed }) => [styles.editCard, { opacity: pressed ? 0.85 : 1 }]} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                <View style={styles.editLeft}>
                  <View style={styles.editTag}><Text style={styles.editTagText}>{e.tag}</Text></View>
                  <Text style={styles.editTitle}>{e.title}</Text>
                  <View style={styles.editMeta}>
                    <Ionicons name="time-outline" size={11} color={Colors.muted} />
                    <Text style={styles.editMin}>{e.min} leitura</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.muted} />
              </Pressable>
            ))}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(180).springify()}>
            <Text style={styles.contentSection}>Research Acadêmico</Text>
            <LinearGradient colors={["#1A1A1C", "#111113"]} style={styles.researchCard}>
              <Ionicons name="school-outline" size={28} color={Colors.gold} style={{ marginBottom: 12 }} />
              <Text style={styles.researchTitle}>Biblioteca Científica</Text>
              <Text style={styles.researchSub}>Acesse artigos do PubMed, Crossref e OpenAlex diretamente integrados ao Atlas.</Text>
              <Pressable onPress={() => setActiveTab("chat")} style={styles.researchBtn}>
                <Text style={styles.researchBtnText}>Perguntar ao Lab IA</Text>
                <Ionicons name="arrow-forward" size={14} color={Colors.gold} />
              </Pressable>
            </LinearGradient>
          </Animated.View>
        </ScrollView>
      )}
    </View>
  );
}

const labStyles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 8 },
  toolBar: { flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  toolBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  toolBtnActive: { backgroundColor: "rgba(212,175,55,0.12)", borderColor: "rgba(212,175,55,0.3)" },
  toolLabel: { fontFamily: "Outfit_500Medium", fontSize: 13, color: Colors.muted },
  toolLabelActive: { color: Colors.gold },
  card: { backgroundColor: Colors.card, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: Colors.border, marginBottom: 14 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  cardTitle: { fontFamily: "Outfit_700Bold", fontSize: 16, color: Colors.text },
  cardDesc: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginBottom: 16 },
  inputGroup: { flexDirection: "row", gap: 10, marginBottom: 14 },
  inputItem: { flex: 1 },
  inputLabel: { fontFamily: "Outfit_500Medium", fontSize: 11, color: Colors.muted, marginBottom: 6 },
  input: { backgroundColor: Colors.black, borderRadius: 12, padding: 12, fontFamily: "Outfit_400Regular", fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border, textAlign: "center" },
  calcBtn: { borderRadius: 14, overflow: "hidden" },
  calcBtnGrad: { padding: 14, alignItems: "center" },
  calcBtnText: { fontFamily: "Outfit_700Bold", fontSize: 15, color: Colors.black },
  resultBox: { marginTop: 14, backgroundColor: "rgba(212,175,55,0.06)", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "rgba(212,175,55,0.2)" },
  resultMain: { fontFamily: "Outfit_700Bold", fontSize: 16, color: Colors.gold, marginBottom: 4 },
  resultText: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.textSecondary, marginBottom: 2 },
  resultSub: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.textSecondary, marginTop: 8, marginBottom: 6 },
  pctRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pctLabel: { fontFamily: "Outfit_500Medium", fontSize: 13, color: Colors.muted },
  pctValue: { fontFamily: "Outfit_700Bold", fontSize: 13, color: Colors.text },
  imcCatBadge: { alignSelf: "flex-start", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, marginVertical: 8 },
  imcCatText: { fontFamily: "Outfit_600SemiBold", fontSize: 13 },
  imcScale: { marginTop: 8, gap: 6 },
  imcScaleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  imcScaleDot: { width: 10, height: 10, borderRadius: 5 },
  imcScaleRange: { fontFamily: "Outfit_500Medium", fontSize: 12, color: Colors.muted, flex: 1 },
  imcScaleCat: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.textSecondary },
  rpeRow: { borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: 12, gap: 6 },
  rpeBadges: { flexDirection: "row", gap: 8 },
  rpeBadge: { backgroundColor: "rgba(212,175,55,0.12)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: "rgba(212,175,55,0.25)", alignItems: "center", minWidth: 52 },
  rpeBadgeLabel: { fontFamily: "Outfit_400Regular", fontSize: 9, color: Colors.gold, letterSpacing: 0.5 },
  rpeBadgeVal: { fontFamily: "Outfit_700Bold", fontSize: 14, color: Colors.gold },
  rpeDesc: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  rpeTip: { borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border, marginTop: 12, flexDirection: "row", gap: 8 },
  rpeTipText: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.textSecondary, flex: 1, lineHeight: 18 },
  comingSoon: { gap: 10 },
  comingSoonItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  comingSoonText: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.muted },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerLogo: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Outfit_700Bold", fontSize: 18, color: Colors.text, letterSpacing: -0.3 },
  headerSub: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.gold, marginTop: 1 },
  modeTabs: { flexDirection: "row", paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  modeTab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  modeTabActive: { backgroundColor: "rgba(212,175,55,0.12)", borderColor: "rgba(212,175,55,0.3)" },
  modeTabText: { fontFamily: "Outfit_500Medium", fontSize: 13, color: Colors.muted },
  modeTabTextActive: { color: Colors.gold, fontFamily: "Outfit_600SemiBold" },
  chatList: { flexDirection: "column-reverse", paddingHorizontal: 16, paddingTop: 16 },
  emptyState: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 20 },
  emptyLogo: { width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  emptyTitle: { fontFamily: "Outfit_700Bold", fontSize: 22, color: Colors.text, textAlign: "center", letterSpacing: -0.5, marginBottom: 8 },
  emptySub: { fontFamily: "Outfit_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 22, marginBottom: 8 },
  emptyPowered: { fontFamily: "Outfit_500Medium", fontSize: 11, color: Colors.gold, textAlign: "center", letterSpacing: 0.5, marginBottom: 20 },
  suggestions: { width: "100%", gap: 8 },
  suggestionChip: { backgroundColor: Colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border },
  suggestionText: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.text, lineHeight: 18 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 12, gap: 8 },
  msgRowUser: { flexDirection: "row-reverse" },
  aiIcon: { width: 26, height: 26, borderRadius: 8, backgroundColor: "rgba(212,175,55,0.15)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(212,175,55,0.2)" },
  bubble: { maxWidth: "80%", borderRadius: 16, padding: 14 },
  bubbleAI: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderBottomLeftRadius: 4 },
  bubbleUser: { borderBottomRightRadius: 4, backgroundColor: Colors.gold },
  bubbleText: { fontFamily: "Outfit_400Regular", fontSize: 14, lineHeight: 22 },
  bubbleTextAI: { color: Colors.text },
  bubbleTextUser: { color: Colors.black },
  typingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  typingBubble: { flexDirection: "row", gap: 5, backgroundColor: Colors.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.border },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.gold },
  inputArea: { paddingHorizontal: 16, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.black },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  textInput: { flex: 1, backgroundColor: Colors.card, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, fontFamily: "Outfit_400Regular", fontSize: 15, color: Colors.text, maxHeight: 120, borderWidth: 1, borderColor: Colors.border },
  sendBtn: { borderRadius: 14, overflow: "hidden" },
  sendBtnGrad: { width: 46, height: 46, alignItems: "center", justifyContent: "center" },
  contentScroll: { paddingHorizontal: 20, paddingTop: 8 },
  contentSection: { fontFamily: "Outfit_700Bold", fontSize: 18, color: Colors.text, marginBottom: 14, letterSpacing: -0.3 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  seeAll: { fontFamily: "Outfit_500Medium", fontSize: 13, color: Colors.gold },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 28 },
  catCard: { width: "22%", alignItems: "center", gap: 8 },
  catIcon: { width: 54, height: 54, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  catLabel: { fontFamily: "Outfit_500Medium", fontSize: 11, color: Colors.textSecondary, textAlign: "center" },
  editCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  editLeft: { flex: 1 },
  editTag: { alignSelf: "flex-start", backgroundColor: "rgba(212,175,55,0.12)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, borderWidth: 1, borderColor: "rgba(212,175,55,0.2)", marginBottom: 6 },
  editTagText: { fontFamily: "Outfit_500Medium", fontSize: 10, color: Colors.gold },
  editTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.text, lineHeight: 20, marginBottom: 6 },
  editMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  editMin: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.muted },
  researchCard: { borderRadius: 20, padding: 20, borderWidth: 1, borderColor: Colors.border, marginBottom: 28 },
  researchTitle: { fontFamily: "Outfit_700Bold", fontSize: 18, color: Colors.text, marginBottom: 8 },
  researchSub: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 20, marginBottom: 16 },
  researchBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  researchBtnText: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.gold },
});
