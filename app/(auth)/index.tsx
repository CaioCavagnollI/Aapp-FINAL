import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";

type Mode = "login" | "register";

const FUNCIONALIDADES = [
  { icon: "flask-outline", label: "Atlas IA", sub: "Prescricoes cientificas com IA", color: "#D4AF37" },
  { icon: "scan-outline", label: "Scanner Nutricional", sub: "Analise de alimentos com camera", color: "#60A5FA" },
  { icon: "barbell-outline", label: "Programas de Treino", sub: "Periodizacao cientifica", color: "#4ADE80" },
  { icon: "people-outline", label: "Gestao de Clientes", sub: "Prescricoes para seus alunos", color: "#F472B6" },
];

const PLANOS = [
  { nome: "Free", preco: "Gratis", cor: Colors.muted, recursos: ["Atlas IA basico", "1 programa de treino"] },
  { nome: "Starter", preco: "R$ 19/mes", cor: "#4ADE80", recursos: ["Atlas IA 50x/mes", "Scanner nutricional", "5 clientes"] },
  { nome: "Pro Nexus", preco: "R$ 99/mes", cor: "#60A5FA", recursos: ["Atlas IA 500x/mes", "Prescricoes ilimitadas", "20 clientes"] },
  { nome: "Vitalicio", preco: "Admin", cor: Colors.gold, recursos: ["Tudo ilimitado", "Acesso admin", "Suporte prioritario"] },
];

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const switchMode = (next: Mode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode(next);
    setError("");
    setUsername("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async () => {
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Preencha todos os campos");
      return;
    }
    if (mode === "register" && password !== confirmPassword) {
      setError("As senhas nao coincidem");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    const result = mode === "login"
      ? await login(username.trim(), password)
      : await register(username.trim(), password);
    setLoading(false);
    if (!result.success) {
      setError(result.error || "Ocorreu um erro");
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0B0B0C", "#111113", "#0B0B0C"]} style={StyleSheet.absoluteFillObject} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: botPad + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo e identidade */}
          <Animated.View entering={FadeIn.duration(600)} style={styles.logoArea}>
            <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={styles.logoBox}>
              <Ionicons name="flask" size={32} color={Colors.black} />
            </LinearGradient>
            <Text style={styles.appName}>Nexus</Text>
            <Text style={styles.appTagline}>A Plataforma Cientifica do Treinamento de Forca</Text>
            <View style={styles.poweredRow}>
              <View style={styles.poweredDot} />
              <Text style={styles.appPowered}>Powered by Atlas IA</Text>
              <View style={styles.poweredDot} />
            </View>
          </Animated.View>

          {/* Funcionalidades em destaque */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.featuresRow}>
            {FUNCIONALIDADES.map((f) => (
              <View key={f.label} style={styles.featureCard}>
                <View style={[styles.featureIcon, { backgroundColor: `${f.color}15`, borderColor: `${f.color}25` }]}>
                  <Ionicons name={f.icon as any} size={20} color={f.color} />
                </View>
                <Text style={styles.featureLabel}>{f.label}</Text>
                <Text style={styles.featureSub}>{f.sub}</Text>
              </View>
            ))}
          </Animated.View>

          {/* Planos resumidos */}
          <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.planosSection}>
            <Text style={styles.planosSectionTitle}>Planos Disponiveis</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {PLANOS.map((p) => (
                <View key={p.nome} style={[styles.planoCard, { borderColor: `${p.cor}35` }]}>
                  <Text style={[styles.planoNome, { color: p.cor }]}>{p.nome}</Text>
                  <Text style={styles.planoPreco}>{p.preco}</Text>
                  <View style={styles.planoDivider} />
                  {p.recursos.map((r) => (
                    <View key={r} style={styles.planoRecursoRow}>
                      <Ionicons name="checkmark" size={11} color={p.cor} />
                      <Text style={styles.planoRecurso}>{r}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>
          </Animated.View>

          {/* Card de login */}
          <Animated.View entering={FadeInDown.delay(220).springify()} style={styles.card}>
            <View style={styles.tabRow}>
              <Pressable onPress={() => switchMode("login")} style={[styles.tab, mode === "login" && styles.tabActive]}>
                <Text style={[styles.tabText, mode === "login" && styles.tabTextActive]}>Entrar</Text>
              </Pressable>
              <Pressable onPress={() => switchMode("register")} style={[styles.tab, mode === "register" && styles.tabActive]}>
                <Text style={[styles.tabText, mode === "register" && styles.tabTextActive]}>Criar Conta</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Usuario</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={18} color={Colors.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Seu nome de usuario"
                placeholderTextColor={Colors.muted}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>

            <Text style={styles.label}>Senha</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.muted} style={styles.inputIcon} />
              <TextInput
                ref={passwordRef}
                style={[styles.input, styles.inputWithAction]}
                placeholder="Sua senha"
                placeholderTextColor={Colors.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                returnKeyType={mode === "register" ? "next" : "done"}
                onSubmitEditing={() => mode === "register" ? confirmRef.current?.focus() : handleSubmit()}
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={Colors.muted} />
              </Pressable>
            </View>

            {mode === "register" && (
              <Animated.View entering={FadeInDown.delay(320).springify()}>
                <Text style={styles.label}>Confirmar Senha</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={18} color={Colors.muted} style={styles.inputIcon} />
                  <TextInput
                    ref={confirmRef}
                    style={styles.input}
                    placeholder="Repita sua senha"
                    placeholderTextColor={Colors.muted}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                  />
                </View>
              </Animated.View>
            )}

            {error !== "" && (
              <Animated.View entering={FadeInDown.springify()} style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={15} color="#FF6B6B" />
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            )}

            <Pressable onPress={handleSubmit} disabled={loading} style={({ pressed }) => [styles.submitBtn, { opacity: pressed ? 0.85 : 1 }]}>
              <LinearGradient colors={[Colors.goldDark, Colors.gold]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitGradient}>
                {loading ? (
                  <ActivityIndicator color={Colors.black} size="small" />
                ) : (
                  <>
                    <Text style={styles.submitText}>{mode === "login" ? "Entrar" : "Criar Conta"}</Text>
                    <Ionicons name={mode === "login" ? "arrow-forward" : "checkmark"} size={18} color={Colors.black} />
                  </>
                )}
              </LinearGradient>
            </Pressable>

            {mode === "register" && (
              <View style={styles.freeInfo}>
                <Ionicons name="gift-outline" size={13} color={Colors.gold} />
                <Text style={styles.freeInfoText}>Conta gratuita criada automaticamente. Faca upgrade quando quiser.</Text>
              </View>
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(450).springify()} style={styles.footer}>
            <View style={styles.footerBadge}>
              <Ionicons name="shield-checkmark-outline" size={12} color={Colors.gold} />
              <Text style={styles.footerText}>Seus dados sao protegidos e criptografados</Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  scroll: { flexGrow: 1, paddingHorizontal: 20, alignItems: "stretch" },
  logoArea: { alignItems: "center", marginBottom: 28 },
  logoBox: { width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  appName: { fontFamily: "Outfit_800ExtraBold", fontSize: 32, color: Colors.text, letterSpacing: -0.5, marginBottom: 6 },
  appTagline: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.textSecondary, textAlign: "center", lineHeight: 20, marginBottom: 8 },
  poweredRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  poweredDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.gold, opacity: 0.5 },
  appPowered: { fontFamily: "Outfit_500Medium", fontSize: 11, color: Colors.gold, letterSpacing: 0.5 },
  featuresRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  featureCard: { width: "47%", backgroundColor: Colors.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.border },
  featureIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 8, borderWidth: 1 },
  featureLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.text, marginBottom: 3 },
  featureSub: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.muted, lineHeight: 16 },
  planosSection: { marginBottom: 24 },
  planosSectionTitle: { fontFamily: "Outfit_700Bold", fontSize: 16, color: Colors.text, marginBottom: 12 },
  planoCard: { width: 150, backgroundColor: Colors.card, borderRadius: 16, padding: 14, borderWidth: 1, flexShrink: 0 },
  planoNome: { fontFamily: "Outfit_700Bold", fontSize: 14, marginBottom: 3 },
  planoPreco: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: Colors.textSecondary, marginBottom: 10 },
  planoDivider: { height: 1, backgroundColor: Colors.border, marginBottom: 10 },
  planoRecursoRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 5 },
  planoRecurso: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.muted, flex: 1, lineHeight: 16 },
  card: { backgroundColor: Colors.card, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: Colors.border },
  tabRow: { flexDirection: "row", backgroundColor: "#0B0B0C", borderRadius: 14, padding: 4, marginBottom: 24, borderWidth: 1, borderColor: Colors.border },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
  tabActive: { backgroundColor: "rgba(212, 175, 55, 0.15)", borderWidth: 1, borderColor: "rgba(212, 175, 55, 0.3)" },
  tabText: { fontFamily: "Outfit_500Medium", fontSize: 14, color: Colors.muted },
  tabTextActive: { fontFamily: "Outfit_700Bold", color: Colors.gold },
  label: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.textSecondary, marginBottom: 8, marginTop: 4 },
  inputWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: "#0B0B0C", borderRadius: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 16 },
  inputIcon: { paddingLeft: 14, paddingRight: 4 },
  input: { flex: 1, height: 52, fontFamily: "Outfit_400Regular", fontSize: 15, color: Colors.text, paddingHorizontal: 10 },
  inputWithAction: { paddingRight: 0 },
  eyeBtn: { padding: 14 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255, 107, 107, 0.1)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255, 107, 107, 0.25)", padding: 12, marginBottom: 16 },
  errorText: { fontFamily: "Outfit_400Regular", fontSize: 13, color: "#FF6B6B", flex: 1 },
  submitBtn: { borderRadius: 14, overflow: "hidden", marginTop: 4 },
  submitGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  submitText: { fontFamily: "Outfit_700Bold", fontSize: 16, color: Colors.black },
  freeInfo: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, backgroundColor: "rgba(212,175,55,0.08)", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "rgba(212,175,55,0.15)" },
  freeInfoText: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.gold, flex: 1, lineHeight: 16 },
  footer: { alignItems: "center", marginTop: 20 },
  footerBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  footerText: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.muted },
});
