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
      setError("As senhas não coincidem");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    const result =
      mode === "login"
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
      <LinearGradient
        colors={["#0B0B0C", "#111113", "#0B0B0C"]}
        style={StyleSheet.absoluteFillObject}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: topPad + 24, paddingBottom: botPad + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            entering={FadeIn.duration(600)}
            style={styles.logoArea}
          >
            <LinearGradient
              colors={[Colors.goldDark, Colors.gold]}
              style={styles.logoBox}
            >
              <Ionicons name="flask" size={32} color={Colors.black} />
            </LinearGradient>
            <Text style={styles.appName}>Nexus</Text>
            <Text style={styles.appTagline}>
              A Plataforma Científica do Treinamento de Força
            </Text>
            <Text style={styles.appPowered}>Powered by Atlas</Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(150).springify()}
            style={styles.card}
          >
            <View style={styles.tabRow}>
              <Pressable
                onPress={() => switchMode("login")}
                style={[styles.tab, mode === "login" && styles.tabActive]}
              >
                <Text
                  style={[
                    styles.tabText,
                    mode === "login" && styles.tabTextActive,
                  ]}
                >
                  Entrar
                </Text>
              </Pressable>
              <Pressable
                onPress={() => switchMode("register")}
                style={[styles.tab, mode === "register" && styles.tabActive]}
              >
                <Text
                  style={[
                    styles.tabText,
                    mode === "register" && styles.tabTextActive,
                  ]}
                >
                  Criar Conta
                </Text>
              </Pressable>
            </View>

            <Animated.View entering={FadeInDown.delay(220).springify()}>
              <Text style={styles.label}>Usuário</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={Colors.muted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Seu nome de usuário"
                  placeholderTextColor={Colors.muted}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(280).springify()}>
              <Text style={styles.label}>Senha</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={Colors.muted}
                  style={styles.inputIcon}
                />
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
                  onSubmitEditing={() =>
                    mode === "register"
                      ? confirmRef.current?.focus()
                      : handleSubmit()
                  }
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={Colors.muted}
                  />
                </Pressable>
              </View>
            </Animated.View>

            {mode === "register" && (
              <Animated.View entering={FadeInDown.delay(320).springify()}>
                <Text style={styles.label}>Confirmar Senha</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={Colors.muted}
                    style={styles.inputIcon}
                  />
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
              <Animated.View
                entering={FadeInDown.springify()}
                style={styles.errorBox}
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={15}
                  color="#FF6B6B"
                />
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            )}

            <Animated.View entering={FadeInDown.delay(360).springify()}>
              <Pressable
                onPress={handleSubmit}
                disabled={loading}
                style={({ pressed }) => [
                  styles.submitBtn,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <LinearGradient
                  colors={[Colors.goldDark, Colors.gold]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitGradient}
                >
                  {loading ? (
                    <ActivityIndicator color={Colors.black} size="small" />
                  ) : (
                    <>
                      <Text style={styles.submitText}>
                        {mode === "login" ? "Entrar" : "Criar Conta"}
                      </Text>
                      <Ionicons
                        name={mode === "login" ? "arrow-forward" : "checkmark"}
                        size={18}
                        color={Colors.black}
                      />
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(450).springify()}
            style={styles.footer}
          >
            <View style={styles.footerBadge}>
              <Ionicons
                name="shield-checkmark-outline"
                size={12}
                color={Colors.gold}
              />
              <Text style={styles.footerText}>
                Seus dados são protegidos e criptografados
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    alignItems: "stretch",
  },
  logoArea: {
    alignItems: "center",
    marginBottom: 36,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  appName: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 28,
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  appTagline: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 2,
  },
  appPowered: {
    fontFamily: "Outfit_500Medium",
    fontSize: 11,
    color: Colors.gold,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#0B0B0C",
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: "rgba(212, 175, 55, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.3)",
  },
  tabText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 14,
    color: Colors.muted,
  },
  tabTextActive: {
    fontFamily: "Outfit_700Bold",
    color: Colors.gold,
  },
  label: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0B0B0C",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  inputIcon: {
    paddingLeft: 14,
    paddingRight: 4,
  },
  input: {
    flex: 1,
    height: 52,
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    color: Colors.text,
    paddingHorizontal: 10,
  },
  inputWithAction: {
    paddingRight: 0,
  },
  eyeBtn: {
    padding: 14,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 107, 0.25)",
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: "#FF6B6B",
    flex: 1,
  },
  submitBtn: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 4,
  },
  submitGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  submitText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: Colors.black,
  },
  footer: {
    alignItems: "center",
    marginTop: 24,
  },
  footerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.muted,
  },
});
