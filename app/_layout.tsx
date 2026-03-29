import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { StatusBar } from "expo-status-bar";
import { AdminProvider } from "@/contexts/AdminContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import {
  useFonts,
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
} from "@expo-google-fonts/outfit";

SplashScreen.preventAutoHideAsync();

function AuthGuard() {
  const { isLoggedIn, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isLoggedIn && !inAuthGroup) {
      router.replace("/(auth)");
    } else if (isLoggedIn && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isLoggedIn, isLoading, segments]);

  return null;
}

function RootLayoutNav() {
  return (
    <>
      <AuthGuard />
      <Stack screenOptions={{ headerBackTitle: "Voltar" }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AdminProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <StatusBar style="light" />
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </AdminProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
