import { Stack } from "expo-router";
import Colors from "@/constants/colors";

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.black },
        headerTintColor: Colors.gold,
        headerTitleStyle: { fontFamily: "Outfit_700Bold", color: Colors.text },
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: Colors.black },
      }}
    >
      <Stack.Screen name="login" options={{ title: "Acesso Admin", headerBackTitle: "Voltar" }} />
      <Stack.Screen name="index" options={{ title: "Painel Admin", headerBackTitle: "Sair" }} />
    </Stack>
  );
}
