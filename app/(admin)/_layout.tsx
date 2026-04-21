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
      <Stack.Screen name="usuarios" options={{ title: "Gerenciar Usuários", headerBackTitle: "Painel" }} />
      <Stack.Screen name="loja-mod" options={{ title: "Moderação da Loja", headerBackTitle: "Painel" }} />
      <Stack.Screen name="integracoes" options={{ title: "Integrações", headerBackTitle: "Painel" }} />
      <Stack.Screen name="faturamento" options={{ title: "Faturamento", headerBackTitle: "Painel" }} />
      <Stack.Screen name="arquivos" options={{ title: "Arquivos", headerBackTitle: "Painel" }} />
    </Stack>
  );
}
