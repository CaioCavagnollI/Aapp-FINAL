import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

function TabIcon({ name, color }: { name: string; color: string }) {
  return <Ionicons name={name as any} size={22} color={color} />;
}

export default function TabLayout() {
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.gold,
        tabBarInactiveTintColor: Colors.muted,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : Colors.black,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          elevation: 0,
          height: isWeb ? 84 : 62,
          paddingBottom: isWeb ? 20 : 8,
        },
        tabBarLabelStyle: {
          fontFamily: "Outfit_500Medium",
          fontSize: 10,
          marginTop: -2,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.black }]} />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Hoje",
          tabBarIcon: ({ color }) => <TabIcon name="today-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="treino"
        options={{
          title: "Treino",
          tabBarIcon: ({ color }) => <TabIcon name="barbell-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="atlas"
        options={{
          title: "Atlas",
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
        name="prescrever"
        options={{
          title: "Prescrever",
          tabBarIcon: ({ color }) => <TabIcon name="document-text-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="loja"
        options={{
          title: "Loja",
          tabBarIcon: ({ color }) => <TabIcon name="storefront-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color }) => <TabIcon name="person-circle-outline" color={color} />,
        }}
      />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="programs" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
