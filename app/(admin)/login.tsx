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
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withSequence, withTiming, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useAdmin } from "@/contexts/AdminContext";
import Colors from "@/constants/colors";

export default function AdminLoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAdmin();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<TextInput>(null);

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
    if (!password.trim() || isLoading) return;
    setIsLoading(true);
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const result = await login(password);
    setIsLoading(false);

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(admin)");
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(result.error || "Senha incorreta");
      setPassword("");
      shake();
    }
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <Animated.View entering={FadeInDown.springify()} style={styles.inner}>
        <LinearGradient
          colors={["rgba(212,175,55,0.12)", "rgba(212,175,55,0.03)"]}
          style={styles.iconBg}
        >
          <Ionicons name="shield-checkmark" size={40} color={Colors.gold} />
        </LinearGradient>

        <Text style={styles.title}>Área Restrita</Text>
        <Text style={styles.subtitle}>
          Insira a senha de administrador para acessar o painel de upload de arquivos.
        </Text>

        <Animated.View style={[styles.inputWrapper, shakeStyle]}>
          <View style={[styles.inputRow, error ? styles.inputError : null]}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.muted} />
            <TextInput
              ref={inputRef}
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

        <Pressable
          onPress={handleLogin}
          disabled={!password.trim() || isLoading}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        >
          <LinearGradient
            colors={
              !password.trim() || isLoading
                ? [Colors.border, Colors.border]
                : [Colors.goldDark, Colors.gold]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.loginBtn}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={Colors.black} />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={18} color={password.trim() ? Colors.black : Colors.muted} />
                <Text style={[styles.loginBtnText, !password.trim() && { color: Colors.muted }]}>
                  Entrar
                </Text>
              </>
            )}
          </LinearGradient>
        </Pressable>

        <View style={styles.hint}>
          <Ionicons name="information-circle-outline" size={13} color={Colors.muted} />
          <Text style={styles.hintText}>
            A senha é definida nas configurações do servidor.
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
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
    marginBottom: 8,
  },
  title: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 26,
    color: Colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 8,
  },
  inputWrapper: {
    width: "100%",
    gap: 8,
  },
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
  inputError: {
    borderColor: "#F87171",
  },
  input: {
    flex: 1,
    fontFamily: "Outfit_400Regular",
    fontSize: 16,
    color: Colors.text,
  },
  eyeBtn: {
    padding: 4,
  },
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
    marginTop: 4,
  },
  hintText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.muted,
    flex: 1,
  },
});
