import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useAdmin } from "@/contexts/AdminContext";
import { useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";

export default function AdminLoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAdmin();
  const { setUserFromAdmin } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const usernameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  const shake = () => {
    shakeX.value = withSequence(
      withTiming(-10, { duration: 60 }),
      withTiming(10, { duration: 60 }),
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(0, { duration: 60 })
    );
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim() || isLoading) return;
    setIsLoading(true);
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const result = await login(username.trim(), password);
    setIsLoading(false);

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (result.userToken && result.user) {
        await setUserFromAdmin(result.user, result.userToken);
      }
      router.replace("/(admin)");
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(result.error || "Credenciais inválidas");
      setPassword("");
      shake();
    }
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const canSubmit = username.trim().length > 0 && password.trim().length > 0 && !isLoading;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <Animated.View entering={FadeInDown.springify()} style={styles.inner}>

        {/* Logo */}
        <LinearGradient
          colors={["rgba(212,175,55,0.15)", "rgba(212,175,55,0.04)"]}
          style={styles.iconBg}
        >
          <Ionicons name="shield-checkmark" size={40} color={Colors.gold} />
        </LinearGradient>

        <View style={styles.titleArea}>
          <Text style={styles.title}>Área Admin</Text>
          <Text style={styles.subtitle}>Nexus · Powered by Atlas</Text>
          <Text style={styles.desc}>Entre com suas credenciais de administrador</Text>
        </View>

        {/* Campos */}
        <Animated.View style={[styles.fields, shakeStyle]}>
          {/* Username */}
          <View style={[styles.inputRow, error ? styles.inputError : null]}>
            <Ionicons name="person-outline" size={18} color={Colors.muted} />
            <TextInput
              ref={usernameRef}
              style={styles.input}
              value={username}
              onChangeText={(t) => { setUsername(t); setError(""); }}
              placeholder="Usuário administrador"
              placeholderTextColor={Colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          </View>

          {/* Password */}
          <View style={[styles.inputRow, error ? styles.inputError : null]}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.muted} />
            <TextInput
              ref={passwordRef}
              style={styles.input}
              value={password}
              onChangeText={(t) => { setPassword(t); setError(""); }}
              placeholder="Senha de administrador"
              placeholderTextColor={Colors.muted}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={Colors.muted}
              />
            </Pressable>
          </View>

          {error ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle-outline" size={14} color="#F87171" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </Animated.View>

        {/* Botão */}
        <Pressable
          onPress={handleLogin}
          disabled={!canSubmit}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, width: "100%" }]}
        >
          <LinearGradient
            colors={canSubmit ? [Colors.goldDark, Colors.gold] : [Colors.border, Colors.border]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.loginBtn}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={Colors.black} />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={18} color={canSubmit ? Colors.black : Colors.muted} />
                <Text style={[styles.loginBtnText, !canSubmit && { color: Colors.muted }]}>
                  Entrar no Painel
                </Text>
              </>
            )}
          </LinearGradient>
        </Pressable>

        <View style={styles.hint}>
          <Ionicons name="information-circle-outline" size={13} color={Colors.muted} />
          <Text style={styles.hintText}>Acesso restrito a administradores autorizados.</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  iconBg: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.2)",
  },
  titleArea: { alignItems: "center", gap: 4 },
  title: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 28,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
    color: Colors.gold,
    letterSpacing: 0.3,
  },
  desc: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
  },
  fields: { width: "100%", gap: 12 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputError: { borderColor: "#F87171" },
  input: {
    flex: 1,
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    color: Colors.text,
  },
  eyeBtn: { padding: 4 },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  errorText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: "#F87171",
  },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
  },
  loginBtnText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: Colors.black,
  },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  hintText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.muted,
    flex: 1,
  },
});
