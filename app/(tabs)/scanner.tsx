import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
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
import Colors from "@/constants/colors";

const SCANNER_URL = "https://qr.nexusatlas.app";

const SCAN_TIPOS = [
  { icon: "barcode-outline", label: "Código de Barras", sub: "Alimentos e suplementos", color: "#D4AF37" },
  { icon: "qr-code-outline", label: "QR Code", sub: "Programas e prescrições", color: "#60A5FA" },
  { icon: "body-outline", label: "Análise Corporal", sub: "Composição e medidas", color: "#4ADE80" },
  { icon: "nutrition-outline", label: "Rótulo Nutricional", sub: "OCR de tabela nutricional", color: "#F472B6" },
];

const RECENTES = [
  { nome: "Whey Protein Gold Standard", tipo: "Suplemento", data: "Hoje, 08:14" },
  { nome: "Creatina Monohidratada", tipo: "Suplemento", data: "Ontem, 19:42" },
  { nome: "Programa PPL — Avançado", tipo: "QR Code", data: "25/03, 10:30" },
];

function ScannerFrame() {
  const pulse = useSharedValue(1);
  const lineY = useSharedValue(0);

  React.useEffect(() => {
    pulse.value = withRepeat(withSequence(withTiming(1.04, { duration: 900 }), withTiming(1, { duration: 900 })), -1, false);
    lineY.value = withRepeat(withSequence(withTiming(180, { duration: 1800 }), withTiming(0, { duration: 1800 })), -1, false);
  }, []);

  const frameStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const lineStyle = useAnimatedStyle(() => ({ transform: [{ translateY: lineY.value }] }));

  return (
    <Animated.View style={[styles.scanFrame, frameStyle]}>
      {/* Corners */}
      <View style={[styles.corner, styles.cornerTL]} />
      <View style={[styles.corner, styles.cornerTR]} />
      <View style={[styles.corner, styles.cornerBL]} />
      <View style={[styles.corner, styles.cornerBR]} />
      {/* Scan line */}
      <Animated.View style={[styles.scanLine, lineStyle]} />
      {/* Center icon */}
      <View style={styles.scanCenter}>
        <Ionicons name="scan-outline" size={40} color="rgba(212,175,55,0.3)" />
      </View>
    </Animated.View>
  );
}

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const [scanAtivo, setScanAtivo] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleScan = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setScanAtivo(true);
    if (Platform.OS !== "web") {
      Linking.openURL(SCANNER_URL).catch(() => setScanAtivo(false));
      setTimeout(() => setScanAtivo(false), 2000);
    } else {
      setTimeout(() => setScanAtivo(false), 3000);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View>
          <Text style={styles.pageTitle}>Scanner</Text>
          <Text style={styles.pageSubtitle}>Digitalizar e analisar</Text>
        </View>
        <Pressable
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          style={styles.histBtn}
        >
          <Ionicons name="time-outline" size={20} color={Colors.gold} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 100 }]}
      >
        {/* Scanner Area */}
        <Animated.View entering={FadeIn.duration(500)} style={styles.scanArea}>
          {Platform.OS === "web" ? (
            <View style={styles.webScanBox}>
              <LinearGradient
                colors={["rgba(212,175,55,0.08)", "rgba(212,175,55,0.02)"]}
                style={styles.webScanInner}
              >
                <ScannerFrame />
                <Text style={styles.scanLabel}>
                  {scanAtivo ? "Processando scan..." : "Toque para ativar a câmera"}
                </Text>
              </LinearGradient>
            </View>
          ) : (
            <View style={styles.nativeScanBox}>
              <ScannerFrame />
              <Text style={styles.scanLabel}>
                {scanAtivo ? "Abrindo câmera..." : "Posicione o código na área"}
              </Text>
            </View>
          )}

          <Pressable onPress={handleScan} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
            <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={styles.scanBtn}>
              <Ionicons name={scanAtivo ? "hourglass-outline" : "camera-outline"} size={22} color={Colors.black} />
              <Text style={styles.scanBtnText}>{scanAtivo ? "Escaneando..." : "Iniciar Scan"}</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* Tipos de Scan */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Text style={styles.section}>Tipo de Scan</Text>
          <View style={styles.tiposGrid}>
            {SCAN_TIPOS.map((t) => (
              <Pressable
                key={t.label}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleScan(); }}
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

        {/* Scans Recentes */}
        <Animated.View entering={FadeInDown.delay(160).springify()}>
          <View style={styles.sectionRow}>
            <Text style={styles.section}>Scans Recentes</Text>
            <Text style={styles.seeAll}>Ver histórico</Text>
          </View>
          {RECENTES.map((r) => (
            <Pressable
              key={r.nome}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              style={({ pressed }) => [styles.recentCard, { opacity: pressed ? 0.85 : 1 }]}
            >
              <View style={styles.recentIcon}>
                <Ionicons name="scan-outline" size={16} color={Colors.gold} />
              </View>
              <View style={styles.recentInfo}>
                <Text style={styles.recentNome}>{r.nome}</Text>
                <Text style={styles.recentTipo}>{r.tipo} · {r.data}</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={Colors.muted} />
            </Pressable>
          ))}
        </Animated.View>
      </ScrollView>
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
  scroll: { paddingHorizontal: 20, paddingTop: 20 },
  scanArea: { alignItems: "center", marginBottom: 32 },
  webScanBox: { width: "100%", marginBottom: 20 },
  webScanInner: { borderRadius: 24, padding: 24, alignItems: "center", borderWidth: 1, borderColor: "rgba(212,175,55,0.2)" },
  nativeScanBox: { alignItems: "center", marginBottom: 20 },
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
  seeAll: { fontFamily: "Outfit_500Medium", fontSize: 13, color: Colors.gold },
  tiposGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 28 },
  tipoCard: { width: "47%", backgroundColor: Colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border },
  tipoIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 10, borderWidth: 1 },
  tipoLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.text, marginBottom: 3 },
  tipoSub: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.muted, lineHeight: 16 },
  recentCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.card, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  recentIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: "rgba(212,175,55,0.1)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(212,175,55,0.2)" },
  recentInfo: { flex: 1 },
  recentNome: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.text, marginBottom: 2 },
  recentTipo: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.muted },
});
