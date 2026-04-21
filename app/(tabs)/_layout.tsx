import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";

function TabIcon({ name, color }: { name: string; color: string }) {
  return <Ionicons name={name as any} size={24} color={color} />;
}

export default function TabLayout() {
  const { colors, isDark } = useTheme();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS && isDark ? "transparent" : colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          height: isWeb ? 88 : 64,
          paddingBottom: isWeb ? 18 : 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: "Outfit_500Medium",
          fontSize: 10,
          marginTop: 0,
        },
        tabBarBackground: () =>
          isIOS && isDark ? (
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.tabBar }]} />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <TabIcon name="grid-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="atlas"
        options={{
          title: "Atlas Brain",
          tabBarIcon: ({ color }) => <TabIcon name="flask-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: "Scanner",
          tabBarIcon: ({ color }) => <TabIcon name="scan-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="meus-treinos"
        options={{
          title: "Meus Treinos",
          tabBarIcon: ({ color }) => <TabIcon name="barbell-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="loja"
        options={{
          title: "Atlas Store",
          tabBarIcon: ({ color }) => <TabIcon name="storefront-outline" color={color} />,
        }}
      />
      {/* Hidden screens - accessible via navigation */}
      <Tabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
          href: null,
          tabBarIcon: ({ color }) => <TabIcon name="person-circle-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="uploads"
        options={{
          title: "Arquivos",
          href: null,
          tabBarIcon: ({ color }) => <TabIcon name="cloud-upload-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="treino"
        options={{
          title: "Treino",
          href: null,
        }}
      />
      <Tabs.Screen
        name="prescrever"
        options={{
          title: "Prescrever",
          href: null,
        }}
      />
    </Tabs>
  );
}
