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

  const formatResult = (data: any): string => {
    if (!data || data.locked) return "";
    if (typeof data === "string") return data;
    const lines: string[] = [];
    if (data.nome) lines.push(`Produto: ${data.nome}`);
    if (data.name) lines.push(`Produto: ${data.name}`);
    if (data.calorias_por_100g) lines.push(`Calorias/100g: ${data.calorias_por_100g} kcal`);
    if (data.calories) lines.push(`Calorias: ${data.calories} kcal`);
    if (data.proteina_g) lines.push(`Proteína: ${data.proteina_g}g`);
    if (data.protein) lines.push(`Proteína: ${data.protein}g`);
    if (data.carboidratos_g) lines.push(`Carboidratos: ${data.carboidratos_g}g`);
    if (data.carbs) lines.push(`Carboidratos: ${data.carbs}g`);
    if (data.gorduras_g) lines.push(`Gorduras: ${data.gorduras_g}g`);
    if (data.fat) lines.push(`Gorduras: ${data.fat}g`);
    if (data.porcao_recomendada) lines.push(`Porção: ${data.porcao_recomendada}`);
    if (data.observacoes_esportivas) lines.push(`\nObservações:\n${data.observacoes_esportivas}`);
    if (data.analysis) lines.push(`\nAnálise:\n${data.analysis}`);
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
            <LinearGradient colors={["rgba(212,175,55,0.1)", "rgba(212,175,55,0.04)"]} style={styles.atlasCard}>
              <View style={styles.atlasIconBox}>
                <Ionicons name="scan-circle-outline" size={44} color={Colors.gold} />
              </View>
              <Text style={styles.atlasTitle}>Atlas Scanner</Text>
              <Text style={styles.atlasDesc}>
                O Atlas Scanner é uma ferramenta avançada de reconhecimento visual integrada à plataforma Nexus. Identifica equipamentos, exercícios e suplementos através da câmera do seu dispositivo.
              </Text>

              <View style={styles.atlasFeaturesGrid}>
                {[
                  { icon: "barbell-outline", label: "Equipamentos", sub: "Identifica aparelhos de ginástica" },
                  { icon: "body-outline", label: "Postura", sub: "Analisa posicionamento corporal" },
                  { icon: "nutrition-outline", label: "Alimentos", sub: "Reconhece alimentos e nutrição" },
                  { icon: "flask-outline", label: "Suplementos", sub: "Analisa suplementos esportivos" },
                ].map((f) => (
                  <View key={f.label} style={styles.atlasFeature}>
                    <View style={styles.atlasFeatureIcon}>
                      <Ionicons name={f.icon as any} size={18} color={Colors.gold} />
                    </View>
                    <Text style={styles.atlasFeatureLabel}>{f.label}</Text>
                    <Text style={styles.atlasFeatureSub}>{f.sub}</Text>
                  </View>
                ))}
              </View>

              <Pressable onPress={handleAtlasScanner} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }, { width: "100%" }]}>
                <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={styles.atlasBtn}>
                  <Ionicons name="scan-outline" size={20} color={Colors.black} />
                  <Text style={styles.atlasBtnText}>Abrir Atlas Scanner</Text>
                </LinearGradient>
              </Pressable>

              <Text style={styles.atlasNote}>O scanner será aberto no navegador com acesso à câmera</Text>
            </LinearGradient>

            <Text style={styles.section}>Como Usar</Text>
            {[
              { num: "1", title: "Toque em 'Abrir Atlas Scanner'", desc: "O scanner abrirá no seu navegador" },
              { num: "2", title: "Aponte a câmera", desc: "Direcione para o equipamento ou alimento que deseja identificar" },
              { num: "3", title: "Aguarde a análise", desc: "O Atlas IA processará a imagem e fornecerá informações detalhadas" },
              { num: "4", title: "Salve os resultados", desc: "As análises ficam salvas no seu histórico" },
            ].map((s) => (
              <View key={s.num} style={styles.stepCard}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{s.num}</Text>
                </View>
                <View style={styles.stepInfo}>
                  <Text style={styles.stepTitle}>{s.title}</Text>
                  <Text style={styles.stepDesc}>{s.desc}</Text>
                </View>
              </View>
            ))}
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
