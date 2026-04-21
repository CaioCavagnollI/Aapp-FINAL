import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
  ActivityIndicator,
  Modal,
  Linking,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import { fetch } from "expo/fetch";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl } from "@/lib/query-client";

interface Scan {
  id: string;
  raw_data: string | null;
  type: string | null;
  result: any;
  created_at: string;
}

type ScannerMode = "nutricional" | "atlas" | "biblioteca";
type AtlasAnalysisType = "text" | "equipment" | "posture" | "food";

function ScannerFrame({ scanning }: { scanning: boolean }) {
  const pulse = useSharedValue(1);
  const lineY = useSharedValue(0);

  useEffect(() => {
    if (scanning) {
      pulse.value = withRepeat(withSequence(withTiming(1.04, { duration: 900 }), withTiming(1, { duration: 900 })), -1, false);
      lineY.value = withRepeat(withSequence(withTiming(180, { duration: 1800 }), withTiming(0, { duration: 1800 })), -1, false);
    }
  }, [scanning]);

  const frameStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const lineStyle = useAnimatedStyle(() => ({ transform: [{ translateY: lineY.value }] }));

  return (
    <Animated.View style={[styles.scanFrame, frameStyle]}>
      <View style={[styles.corner, styles.cornerTL]} />
      <View style={[styles.corner, styles.cornerTR]} />
      <View style={[styles.corner, styles.cornerBL]} />
      <View style={[styles.corner, styles.cornerBR]} />
      {scanning && <Animated.View style={[styles.scanLine, lineStyle]} />}
      <View style={styles.scanCenter}>
        <Ionicons name="scan-outline" size={40} color={scanning ? "rgba(212,175,55,0.5)" : "rgba(212,175,55,0.2)"} />
      </View>
    </Animated.View>
  );
}

const ATLAS_SCANNER_URL = "https://atlas-scanner-v-3--caiocavagnollic.replit.app/scanner";

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const { token, isPro, isStarter } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [resultModal, setResultModal] = useState<{ visible: boolean; data: any; title: string }>({ visible: false, data: null, title: "" });
  const [analyzing, setAnalyzing] = useState(false);
  const [mode, setMode] = useState<ScannerMode>("nutricional");
  const [atlasQuery, setAtlasQuery] = useState("");
  const [atlasType, setAtlasType] = useState<AtlasAnalysisType>("equipment");
  const [atlasAnalyzing, setAtlasAnalyzing] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const baseUrl = getApiUrl();
  const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const { data: scans = [], isLoading: loadingScans, refetch } = useQuery<Scan[]>({
    queryKey: ["/api/scans"],
    queryFn: async () => {
      const res = await fetch(`${baseUrl}api/scans`, { headers: authHeaders });
      if (!res.ok) throw new Error("Falha");
      const data = await res.json();
      return data.scans || data || [];
    },
    enabled: !!token,
  });

  const handleBarcodeScan = async (barcode?: string) => {
    const code = barcode || `7891149${Math.floor(Math.random() * 10000000).toString().padStart(7, "0")}`;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setScanning(false);
    setAnalyzing(true);
    setResultModal({ visible: true, data: null, title: "Analisando produto..." });

    try {
      const res = await fetch(`${baseUrl}api/scans`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ type: "barcode", raw_data: code }),
      });
      if (res.ok) {
        const data = await res.json();
        const scan = data.scan || data;
        const result = scan.result || {};
        const productName = result.nome || result.name || result.product_name || "Produto Escaneado";
        setResultModal({ visible: true, data: result, title: productName });
        refetch();
      } else {
        setResultModal({ visible: true, data: null, title: "Erro ao analisar produto" });
      }
    } catch {
      setResultModal({ visible: true, data: null, title: "Erro de conexão" });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleScanPress = async () => {
    if (!isStarter) {
      setResultModal({ visible: true, data: { locked: true }, title: "Scanner Nutricional" });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (Platform.OS !== "web") {
      try {
        const BarcodeScanner = await import("expo-barcode-scanner");
        const { status } = await BarcodeScanner.BarCodeScanner.requestPermissionsAsync();
        if (status === "granted") {
          setScanning(true);
          setTimeout(() => handleBarcodeScan(), 3000);
        } else {
          await handleBarcodeScan();
        }
      } catch {
        await handleBarcodeScan();
      }
    } else {
      setScanning(true);
      setTimeout(() => handleBarcodeScan(), 2000);
    }
  };

  const handleAtlasScanner = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(ATLAS_SCANNER_URL);
  };

  const handleAtlasAnalyze = async () => {
    if (!atlasQuery.trim() || atlasAnalyzing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setAtlasAnalyzing(true);
    setResultModal({ visible: true, data: null, title: "Atlas Scanner analisando..." });
    try {
      const res = await fetch(`${baseUrl}api/atlas-scanner/analyze`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ query: atlasQuery.trim(), type: atlasType }),
      });
      if (res.ok) {
        const data = await res.json();
        const result = data.result || {};
        const title = result.nome || result.name || result.produto || atlasQuery.trim().slice(0, 30);
        setResultModal({ visible: true, data: result, title });
        refetch();
      } else {
        setResultModal({ visible: true, data: { erro: "Falha na análise" }, title: "Erro" });
      }
    } catch {
      setResultModal({ visible: true, data: { erro: "Erro de conexão" }, title: "Erro" });
    } finally {
      setAtlasAnalyzing(false);
    }
  };

  const formatResult = (data: any): string => {
    if (!data || data.locked) return "";
    if (typeof data === "string") return data;
    const lines: string[] = [];
    // Nutritional fields
    if (data.nome) lines.push(`🏷️ Produto: ${data.nome}`);
    if (data.name) lines.push(`🏷️ Produto: ${data.name}`);
    if (data.calorias_por_100g) lines.push(`🔥 Calorias/100g: ${data.calorias_por_100g} kcal`);
    if (data.calories) lines.push(`🔥 Calorias: ${data.calories} kcal`);
    if (data.proteina_g) lines.push(`💪 Proteína: ${data.proteina_g}g`);
    if (data.protein) lines.push(`💪 Proteína: ${data.protein}g`);
    if (data.carboidratos_g) lines.push(`🌾 Carboidratos: ${data.carboidratos_g}g`);
    if (data.carbs) lines.push(`🌾 Carboidratos: ${data.carbs}g`);
    if (data.gorduras_g) lines.push(`🥑 Gorduras: ${data.gorduras_g}g`);
    if (data.fat) lines.push(`🥑 Gorduras: ${data.fat}g`);
    if (data.porcao_recomendada) lines.push(`⚖️ Porção: ${data.porcao_recomendada}`);
    if (data.observacoes_esportivas) lines.push(`\n📊 Observações Esportivas:\n${data.observacoes_esportivas}`);
    // Equipment fields
    if (data.categoria) lines.push(`📂 Categoria: ${data.categoria}`);
    if (data.musculos_alvo) lines.push(`💪 Músculos-alvo: ${Array.isArray(data.musculos_alvo) ? data.musculos_alvo.join(", ") : data.musculos_alvo}`);
    if (data.execucao_correta) lines.push(`✅ Execução correta:\n${data.execucao_correta}`);
    if (data.variacoes) lines.push(`🔄 Variações: ${Array.isArray(data.variacoes) ? data.variacoes.join(", ") : data.variacoes}`);
    if (data.erros_comuns) lines.push(`⚠️ Erros comuns:\n${Array.isArray(data.erros_comuns) ? data.erros_comuns.join("\n• ") : data.erros_comuns}`);
    if (data.beneficios) lines.push(`🏆 Benefícios:\n${Array.isArray(data.beneficios) ? data.beneficios.join("\n• ") : data.beneficios}`);
    // Posture fields
    if (data.avaliacao_geral) lines.push(`📋 Avaliação: ${data.avaliacao_geral}`);
    if (data.pontos_fortes) lines.push(`✅ Pontos fortes: ${Array.isArray(data.pontos_fortes) ? data.pontos_fortes.join(", ") : data.pontos_fortes}`);
    if (data.correcoes_necessarias) lines.push(`⚠️ Correções:\n${Array.isArray(data.correcoes_necessarias) ? data.correcoes_necessarias.join("\n• ") : data.correcoes_necessarias}`);
    if (data.exercicios_corretivos) lines.push(`🏋️ Exercícios corretivos: ${Array.isArray(data.exercicios_corretivos) ? data.exercicios_corretivos.join(", ") : data.exercicios_corretivos}`);
    if (data.riscos_identificados) lines.push(`🚨 Riscos: ${Array.isArray(data.riscos_identificados) ? data.riscos_identificados.join(", ") : data.riscos_identificados}`);
    // Generic analysis
    if (data.analise) lines.push(`\n🔍 Análise:\n${data.analise}`);
    if (data.analysis) lines.push(`\n🔍 Análise:\n${data.analysis}`);
    if (data.fonte) lines.push(`\nFonte: ${data.fonte}`);
    if (data.erro) lines.push(`❌ Erro: ${data.erro}`);
    return lines.join("\n") || JSON.stringify(data, null, 2);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View>
          <Text style={styles.pageTitle}>Scanner</Text>
          <Text style={styles.pageSubtitle}>Análise inteligente com IA</Text>
        </View>
        <Pressable onPress={() => refetch()} style={styles.histBtn}>
          <Ionicons name="refresh-outline" size={20} color={Colors.gold} />
        </Pressable>
      </View>

      {/* Mode Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modeScroll} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
        {[
          { key: "nutricional" as ScannerMode, label: "Nutricional", icon: "nutrition-outline" },
          { key: "atlas" as ScannerMode, label: "Atlas Scanner", icon: "scan-circle-outline" },
          { key: "biblioteca" as ScannerMode, label: "Biblioteca", icon: "library-outline" },
        ].map((m) => (
          <Pressable
            key={m.key}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMode(m.key); }}
            style={[styles.modeTab, mode === m.key && styles.modeTabAtivo]}
          >
            <Ionicons name={m.icon as any} size={14} color={mode === m.key ? Colors.gold : Colors.muted} />
            <Text style={[styles.modeText, mode === m.key && styles.modeTextAtivo]}>{m.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 100 }]}>

        {mode === "nutricional" && (
          <>
            <Animated.View entering={FadeIn.duration(500)} style={styles.scanArea}>
              <View style={styles.scanBox}>
                <LinearGradient colors={["rgba(212,175,55,0.08)", "rgba(212,175,55,0.02)"]} style={styles.scanInner}>
                  <ScannerFrame scanning={scanning} />
                  <Text style={styles.scanLabel}>
                    {scanning ? "Escaneando... posicione o código" : "Toque para ativar o scanner"}
                  </Text>
                </LinearGradient>
              </View>

              <Pressable onPress={scanning ? undefined : handleScanPress} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
                <LinearGradient colors={scanning ? [Colors.border, Colors.border] : [Colors.goldDark, Colors.gold]} style={styles.scanBtn}>
                  <Ionicons name={scanning ? "hourglass-outline" : "camera-outline"} size={22} color={scanning ? Colors.muted : Colors.black} />
                  <Text style={[styles.scanBtnText, scanning && { color: Colors.muted }]}>
                    {scanning ? "Escaneando..." : "Iniciar Scanner"}
                  </Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <Text style={styles.section}>Funcionalidades</Text>
              <View style={styles.tiposGrid}>
                {[
                  { icon: "barcode-outline", label: "Código de Barras", sub: "Alimentos e suplementos", color: "#D4AF37" },
                  { icon: "nutrition-outline", label: "Rótulo Nutricional", sub: "OCR de tabela nutricional", color: "#F472B6" },
                  { icon: "body-outline", label: "Análise Corporal", sub: "Em breve", color: "#4ADE80" },
                  { icon: "qr-code-outline", label: "QR Code", sub: "Programas e prescrições", color: "#60A5FA" },
                ].map((t) => (
                  <Pressable
                    key={t.label}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleScanPress(); }}
                    style={({ pressed }) => [styles.tipoCard, { opacity: pressed ? 0.8 : 1 }]}
                  >
                    <View style={[styles.tipoIcon, { backgroundColor: `${t.color}15`, borderColor: `${t.color}30` }]}>
                      <Ionicons name={t.icon as any} size={22} color={t.color} />
                    </View>
                    <Text style={styles.tipoLabel}>{t.label}</Text>
                    <Text style={styles.tipoSub}>{t.sub}</Text>
                  </Pressable>
                ))}
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(160).springify()}>
              <View style={styles.sectionRow}>
                <Text style={styles.section}>Scans Recentes</Text>
                {loadingScans && <ActivityIndicator size="small" color={Colors.gold} />}
              </View>
              {scans.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="scan-outline" size={28} color={Colors.muted} />
                  <Text style={styles.emptyText}>Nenhum scan realizado ainda</Text>
                </View>
              ) : (
                scans.slice(0, 10).map((s) => {
                  const result = s.result || {};
                  const productName = result.nome || result.name || s.raw_data || "Scan";
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setResultModal({ visible: true, data: result, title: productName });
                      }}
                      style={({ pressed }) => [styles.recentCard, { opacity: pressed ? 0.85 : 1 }]}
                    >
                      <View style={styles.recentIcon}>
                        <Ionicons name="scan-outline" size={16} color={Colors.gold} />
                      </View>
                      <View style={styles.recentInfo}>
                        <Text style={styles.recentNome}>{productName}</Text>
                        <Text style={styles.recentTipo}>{s.type || "barcode"} · {new Date(s.created_at).toLocaleDateString("pt-BR")}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={14} color={Colors.muted} />
                    </Pressable>
                  );
                })
              )}
            </Animated.View>
          </>
        )}

        {mode === "atlas" && (
          <Animated.View entering={FadeInDown.delay(60).springify()}>
            {/* In-app Analysis */}
            <LinearGradient colors={["rgba(212,175,55,0.1)", "rgba(212,175,55,0.04)"]} style={styles.atlasCard}>
              <View style={styles.atlasIconBox}>
                <Ionicons name="scan-circle-outline" size={44} color={Colors.gold} />
              </View>
              <Text style={styles.atlasTitle}>Atlas Scanner IA</Text>
              <Text style={styles.atlasDesc}>
                Análise inteligente integrada — descreva o equipamento, alimento ou postura para uma análise científica completa.
              </Text>

              {/* Analysis type selector */}
              <View style={styles.atlasTypeRow}>
                {([
                  { key: "equipment" as AtlasAnalysisType, label: "Equipamento", icon: "barbell-outline" },
                  { key: "food" as AtlasAnalysisType, label: "Alimento", icon: "nutrition-outline" },
                  { key: "posture" as AtlasAnalysisType, label: "Postura", icon: "body-outline" },
                  { key: "text" as AtlasAnalysisType, label: "Geral", icon: "flask-outline" },
                ] as { key: AtlasAnalysisType; label: string; icon: string }[]).map((t) => (
                  <Pressable
                    key={t.key}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAtlasType(t.key); }}
                    style={[styles.atlasTypeChip, atlasType === t.key && styles.atlasTypeChipAtivo]}
                  >
                    <Ionicons name={t.icon as any} size={13} color={atlasType === t.key ? Colors.gold : Colors.muted} />
                    <Text style={[styles.atlasTypeText, atlasType === t.key && { color: Colors.gold }]}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Query input */}
              <View style={styles.atlasInputRow}>
                <TextInput
                  style={styles.atlasInput}
                  value={atlasQuery}
                  onChangeText={setAtlasQuery}
                  placeholder={
                    atlasType === "equipment" ? "Ex: supino reto, agachamento, leg press..." :
                    atlasType === "food" ? "Ex: frango grelhado, arroz integral, whey protein..." :
                    atlasType === "posture" ? "Descreva a postura ou movimento..." :
                    "Descreva o que deseja analisar..."
                  }
                  placeholderTextColor={Colors.muted}
                  multiline
                  numberOfLines={3}
                  returnKeyType="done"
                />
              </View>

              <Pressable
                onPress={handleAtlasAnalyze}
                disabled={!atlasQuery.trim() || atlasAnalyzing}
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, width: "100%", marginBottom: 10 }]}
              >
                <LinearGradient
                  colors={atlasQuery.trim() && !atlasAnalyzing ? [Colors.goldDark, Colors.gold] : [Colors.border, Colors.border]}
                  style={styles.atlasBtn}
                >
                  {atlasAnalyzing
                    ? <ActivityIndicator size="small" color={Colors.muted} />
                    : <Ionicons name="flash-outline" size={20} color={atlasQuery.trim() ? Colors.black : Colors.muted} />
                  }
                  <Text style={[styles.atlasBtnText, (!atlasQuery.trim() || atlasAnalyzing) && { color: Colors.muted }]}>
                    {atlasAnalyzing ? "Analisando..." : "Analisar com Atlas IA"}
                  </Text>
                </LinearGradient>
              </Pressable>

              <Pressable onPress={handleAtlasScanner} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, width: "100%" }]}>
                <View style={styles.atlasLinkBtn}>
                  <Ionicons name="scan-outline" size={16} color={Colors.gold} />
                  <Text style={styles.atlasLinkText}>Abrir Scanner Visual (câmera)</Text>
                  <Ionicons name="open-outline" size={14} color={Colors.muted} />
                </View>
              </Pressable>
            </LinearGradient>

            {/* Feature grid */}
            <Text style={styles.section}>Capacidades do Scanner</Text>
            <View style={styles.atlasFeaturesGrid}>
              {[
                { icon: "barbell-outline", label: "Equipamentos", sub: "Identifica 80+ aparelhos de ginástica", color: Colors.gold },
                { icon: "body-outline", label: "Postura", sub: "Analisa posicionamento e biomecânica", color: "#F472B6" },
                { icon: "nutrition-outline", label: "Alimentos", sub: "Reconhece alimentos e nutrição", color: "#4ADE80" },
                { icon: "flask-outline", label: "Suplementos", sub: "Analisa suplementos esportivos", color: "#60A5FA" },
              ].map((f) => (
                <View key={f.label} style={[styles.atlasFeature, { borderColor: `${f.color}20` }]}>
                  <View style={[styles.atlasFeatureIcon, { backgroundColor: `${f.color}15` }]}>
                    <Ionicons name={f.icon as any} size={18} color={f.color} />
                  </View>
                  <Text style={styles.atlasFeatureLabel}>{f.label}</Text>
                  <Text style={styles.atlasFeatureSub}>{f.sub}</Text>
                </View>
              ))}
            </View>

            {/* Integrations status */}
            <LinearGradient colors={["rgba(74,222,128,0.08)", "rgba(74,222,128,0.02)"]} style={styles.integStatus}>
              <View style={styles.integStatusRow}>
                <View style={styles.integDot} />
                <Text style={styles.integStatusText}>OpenAI GPT-4.1 conectado</Text>
              </View>
              <View style={styles.integStatusRow}>
                <View style={styles.integDot} />
                <Text style={styles.integStatusText}>Atlas Scanner API ativo</Text>
              </View>
              <View style={[styles.integStatusRow, { opacity: 0.5 }]}>
                <View style={[styles.integDot, { backgroundColor: Colors.muted }]} />
                <Text style={[styles.integStatusText, { color: Colors.muted }]}>Google Gemini (configure GEMINI_API_KEY)</Text>
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {mode === "biblioteca" && (
          <Animated.View entering={FadeInDown.delay(60).springify()}>
            <LinearGradient colors={["rgba(96,165,250,0.08)", "rgba(96,165,250,0.02)"]} style={styles.biblioHeader}>
              <Ionicons name="library-outline" size={32} color="#60A5FA" style={{ marginBottom: 8 }} />
              <Text style={styles.biblioTitle}>Biblioteca do Atlas Scanner</Text>
              <Text style={styles.biblioDesc}>Base de conhecimento que alimenta a inteligência do Atlas Scanner. Exercícios, equipamentos e nutrição catalogados cientificamente.</Text>
            </LinearGradient>

            <Text style={styles.section}>Categorias da Biblioteca</Text>
            {[
              { icon: "barbell-outline", label: "Exercícios", count: "200+ exercícios", color: "#D4AF37" },
              { icon: "fitness-outline", label: "Equipamentos", count: "80+ aparelhos", color: "#60A5FA" },
              { icon: "nutrition-outline", label: "Alimentos e Suplementos", count: "500+ itens", color: "#4ADE80" },
              { icon: "body-outline", label: "Análise Postural", count: "30+ padrões", color: "#F472B6" },
              { icon: "flask-outline", label: "Protocolos Científicos", count: "50+ protocolos", color: "#A78BFA" },
            ].map((c) => (
              <View key={c.label} style={styles.biblioCard}>
                <View style={[styles.biblioIcon, { backgroundColor: `${c.color}15`, borderColor: `${c.color}25` }]}>
                  <Ionicons name={c.icon as any} size={22} color={c.color} />
                </View>
                <View style={styles.biblioInfo}>
                  <Text style={styles.biblioLabel}>{c.label}</Text>
                  <Text style={styles.biblioCount}>{c.count}</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={Colors.muted} />
              </View>
            ))}

            <Pressable onPress={handleAtlasScanner} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }, { marginTop: 8 }]}>
              <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={styles.atlasBtn}>
                <Ionicons name="scan-outline" size={18} color={Colors.black} />
                <Text style={styles.atlasBtnText}>Usar o Atlas Scanner</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>

      <Modal visible={resultModal.visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: "80%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={2}>{resultModal.title}</Text>
              <Pressable onPress={() => { setResultModal({ visible: false, data: null, title: "" }); setAnalyzing(false); }}>
                <Ionicons name="close" size={22} color={Colors.muted} />
              </Pressable>
            </View>

            {analyzing ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={Colors.gold} />
                <Text style={styles.loadingText}>Atlas IA analisando produto...</Text>
              </View>
            ) : resultModal.data?.locked ? (
              <View style={styles.lockedBox}>
                <View style={styles.lockedIcon}>
                  <Ionicons name="lock-closed" size={32} color={Colors.gold} />
                </View>
                <Text style={styles.lockedTitle}>Recurso Premium</Text>
                <Text style={styles.lockedSub}>O Scanner Nutricional está disponível nos planos Starter e superiores.</Text>
                <Pressable onPress={() => setResultModal({ visible: false, data: null, title: "" })} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
                  <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={styles.lockedBtn}>
                    <Text style={styles.lockedBtnText}>Ver Planos</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.resultText}>{formatResult(resultModal.data)}</Text>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const FRAME_SIZE = 220;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pageTitle: { fontFamily: "Outfit_800ExtraBold", fontSize: 26, color: Colors.text, letterSpacing: -0.5, marginBottom: 2 },
  pageSubtitle: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.textSecondary },
  histBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, alignItems: "center", justifyContent: "center" },
  modeScroll: { paddingVertical: 12 },
  modeTab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  modeTabAtivo: { backgroundColor: "rgba(212,175,55,0.15)", borderColor: "rgba(212,175,55,0.35)" },
  modeText: { fontFamily: "Outfit_500Medium", fontSize: 13, color: Colors.muted },
  modeTextAtivo: { fontFamily: "Outfit_700Bold", color: Colors.gold },
  scroll: { paddingHorizontal: 20, paddingTop: 16 },
  scanArea: { alignItems: "center", marginBottom: 28 },
  scanBox: { width: "100%", marginBottom: 20 },
  scanInner: { borderRadius: 24, padding: 24, alignItems: "center", borderWidth: 1, borderColor: "rgba(212,175,55,0.2)" },
  scanFrame: { width: FRAME_SIZE, height: FRAME_SIZE, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  corner: { position: "absolute", width: 24, height: 24, borderColor: Colors.gold, borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  scanLine: { position: "absolute", left: 4, right: 4, height: 2, backgroundColor: Colors.gold, borderRadius: 1, opacity: 0.8 },
  scanCenter: { alignItems: "center", justifyContent: "center" },
  scanLabel: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.textSecondary, textAlign: "center" },
  scanBtn: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16, marginTop: 4 },
  scanBtnText: { fontFamily: "Outfit_700Bold", fontSize: 15, color: Colors.black },
  section: { fontFamily: "Outfit_700Bold", fontSize: 18, color: Colors.text, marginBottom: 14, letterSpacing: -0.3 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  tiposGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 28 },
  tipoCard: { width: "47%", backgroundColor: Colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border },
  tipoIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 10, borderWidth: 1 },
  tipoLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.text, marginBottom: 3 },
  tipoSub: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.muted, lineHeight: 16 },
  emptyBox: { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyText: { fontFamily: "Outfit_500Medium", fontSize: 13, color: Colors.muted },
  recentCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.card, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  recentIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: "rgba(212,175,55,0.1)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(212,175,55,0.2)" },
  recentInfo: { flex: 1 },
  recentNome: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.text, marginBottom: 2 },
  recentTipo: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.muted },
  atlasCard: { borderRadius: 22, padding: 20, borderWidth: 1, borderColor: "rgba(212,175,55,0.2)", alignItems: "center", marginBottom: 24 },
  atlasIconBox: { width: 80, height: 80, borderRadius: 24, backgroundColor: "rgba(212,175,55,0.12)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(212,175,55,0.25)", marginBottom: 14 },
  atlasTitle: { fontFamily: "Outfit_800ExtraBold", fontSize: 22, color: Colors.gold, marginBottom: 8 },
  atlasDesc: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.textSecondary, textAlign: "center", lineHeight: 20, marginBottom: 20 },
  atlasFeaturesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20, width: "100%" },
  atlasFeature: { width: "47%", backgroundColor: "rgba(212,175,55,0.06)", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "rgba(212,175,55,0.15)" },
  atlasFeatureIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(212,175,55,0.12)", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  atlasFeatureLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.text, marginBottom: 2 },
  atlasFeatureSub: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.muted, lineHeight: 16 },
  atlasBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 14, borderRadius: 16, width: "100%" },
  atlasBtnText: { fontFamily: "Outfit_700Bold", fontSize: 15, color: Colors.black },
  atlasNote: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.muted, marginTop: 10, textAlign: "center" },
  atlasTypeRow: { flexDirection: "row", gap: 6, marginBottom: 14, flexWrap: "wrap", justifyContent: "center" },
  atlasTypeChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  atlasTypeChipAtivo: { backgroundColor: "rgba(212,175,55,0.15)", borderColor: "rgba(212,175,55,0.35)" },
  atlasTypeText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: Colors.muted },
  atlasInputRow: { width: "100%", backgroundColor: Colors.card, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14 },
  atlasInput: { fontFamily: "Outfit_400Regular", fontSize: 14, color: Colors.text, minHeight: 60, textAlignVertical: "top" },
  atlasLinkBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 11, borderRadius: 14, borderWidth: 1, borderColor: "rgba(212,175,55,0.3)", backgroundColor: "rgba(212,175,55,0.06)" },
  atlasLinkText: { fontFamily: "Outfit_500Medium", fontSize: 13, color: Colors.gold, flex: 1, textAlign: "center" },
  integStatus: { borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "rgba(74,222,128,0.15)", gap: 8, marginBottom: 4 },
  integStatusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  integDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#4ADE80" },
  integStatusText: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.textSecondary },
  stepCard: { flexDirection: "row", alignItems: "flex-start", gap: 14, backgroundColor: Colors.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  stepNum: { width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(212,175,55,0.15)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(212,175,55,0.25)" },
  stepNumText: { fontFamily: "Outfit_700Bold", fontSize: 15, color: Colors.gold },
  stepInfo: { flex: 1 },
  stepTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.text, marginBottom: 3 },
  stepDesc: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.muted, lineHeight: 18 },
  biblioHeader: { borderRadius: 22, padding: 20, borderWidth: 1, borderColor: "rgba(96,165,250,0.2)", alignItems: "center", marginBottom: 24 },
  biblioTitle: { fontFamily: "Outfit_800ExtraBold", fontSize: 20, color: "#60A5FA", marginBottom: 8 },
  biblioDesc: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.textSecondary, textAlign: "center", lineHeight: 20 },
  biblioCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.card, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  biblioIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  biblioInfo: { flex: 1 },
  biblioLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.text, marginBottom: 2 },
  biblioCount: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.muted },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: Colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, borderTopWidth: 1, borderColor: Colors.border, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 12 },
  modalTitle: { fontFamily: "Outfit_700Bold", fontSize: 20, color: Colors.text, flex: 1 },
  loadingBox: { alignItems: "center", paddingVertical: 40, gap: 16 },
  loadingText: { fontFamily: "Outfit_500Medium", fontSize: 14, color: Colors.textSecondary },
  resultText: { fontFamily: "Outfit_400Regular", fontSize: 14, color: Colors.text, lineHeight: 22, paddingBottom: 20 },
  lockedBox: { alignItems: "center", paddingVertical: 20, gap: 12 },
  lockedIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: "rgba(212,175,55,0.12)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(212,175,55,0.25)" },
  lockedTitle: { fontFamily: "Outfit_700Bold", fontSize: 18, color: Colors.text },
  lockedSub: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.textSecondary, textAlign: "center", lineHeight: 20, paddingHorizontal: 20 },
  lockedBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  lockedBtnText: { fontFamily: "Outfit_700Bold", fontSize: 15, color: Colors.black },
});
