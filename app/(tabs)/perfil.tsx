import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { fetch } from "expo/fetch";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { getApiUrl } from "@/lib/query-client";

interface MenuItemProps {
  icon: string;
  label: string;
  sub?: string;
  color?: string;
  onPress: () => void;
  danger?: boolean;
  value?: boolean;
  toggle?: boolean;
  onToggle?: (v: boolean) => void;
}

function MenuItem({ icon, label, sub, color, onPress, danger, value, toggle, onToggle }: MenuItemProps) {
  const col = danger ? "#F87171" : color || Colors.gold;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.menuItem, { opacity: pressed ? 0.8 : 1 }]}>
      <View style={[styles.menuIcon, { backgroundColor: `${col}15`, borderColor: `${col}25` }]}>
        <Ionicons name={icon as any} size={18} color={col} />
      </View>
      <View style={styles.menuText}>
        <Text style={[styles.menuLabel, danger && { color: "#F87171" }]}>{label}</Text>
        {sub ? <Text style={styles.menuSub}>{sub}</Text> : null}
      </View>
      {toggle ? (
        <Switch
          value={value}
          onValueChange={onToggle}
          thumbColor={value ? Colors.gold : Colors.muted}
          trackColor={{ false: Colors.border, true: "rgba(212,175,55,0.3)" }}
        />
      ) : (
        <Ionicons name="chevron-forward" size={14} color={Colors.muted} />
      )}
    </Pressable>
  );
}

function MenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.menuSection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </Animated.View>
  );
}

const PLAN_LABELS: Record<string, string> = {
  free: "Gratuito",
  starter_monthly: "Starter Mensal",
  starter_annual: "Starter Anual",
  pro_monthly: "Pro Nexus Mensal",
  pro_annual: "Pro Nexus Anual",
  vitalicio: "Vitalício Nexus",
};

export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const { user, token, logout, isPro, isVitalicio } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [notifs, setNotifs] = useState(true);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const baseUrl = getApiUrl();
  const authHeaders = { Authorization: `Bearer ${token}` };

  const { data: stats, isLoading: statsLoading } = useQuery<{
    sessions_this_month: number;
    total_volume_kg: number;
    streak_days: number;
    active_prescriptions: number;
  }>({
    queryKey: ["/api/stats"],
    queryFn: async () => {
      const res = await fetch(`${baseUrl}api/stats`, { headers: authHeaders });
      if (!res.ok) throw new Error("Falha");
      return res.json();
    },
    enabled: !!token,
  });

  const { data: clients } = useQuery<{ id: number }[]>({
    queryKey: ["/api/clients"],
    enabled: !!token,
  });

  const handleLogout = () => {
    if (Platform.OS === "web") {
      logout();
    } else {
      Alert.alert("Sair da conta", "Tem certeza que deseja sair?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Sair", style: "destructive", onPress: logout },
      ]);
    }
  };

  const nome = user?.username || "Atleta";
  const inicial = nome.charAt(0).toUpperCase();
  const planLabel = PLAN_LABELS[user?.plan || "free"] || "Gratuito";
  const showUpgrade = !isPro;

  const profileStats = [
    { label: "Treinos", value: statsLoading ? "—" : String(stats?.sessions_this_month ?? 0) },
    { label: "Sequência", value: statsLoading ? "—" : `${stats?.streak_days ?? 0}d` },
    { label: "Clientes", value: statsLoading ? "—" : String(clients?.length ?? 0) },
    { label: "Plano", value: planLabel.split(" ")[0] },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 12, paddingBottom: botPad + 100 }]}
      >
        <Animated.View entering={FadeIn.duration(500)}>
          <LinearGradient
            colors={["rgba(212,175,55,0.12)", "rgba(212,175,55,0.03)"]}
            style={styles.profileCard}
          >
            <View style={styles.avatarRow}>
              <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={styles.avatar}>
                <Text style={styles.avatarText}>{inicial}</Text>
              </LinearGradient>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{nome}</Text>
                <View style={styles.planBadge}>
                  <Ionicons name={isVitalicio ? "shield-checkmark" : isPro ? "diamond" : "flask"} size={11} color={Colors.gold} />
                  <Text style={styles.planBadgeText}>{planLabel}</Text>
                </View>
                {user?.is_admin && (
                  <View style={styles.adminBadge}>
                    <Ionicons name="shield-outline" size={10} color="#A78BFA" />
                    <Text style={styles.adminBadgeText}>Administrador</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.profileStats}>
              {profileStats.map((s) => (
                <View key={s.label} style={styles.pStat}>
                  {statsLoading && s.label !== "Plano" ? (
                    <ActivityIndicator size="small" color={Colors.gold} />
                  ) : (
                    <Text style={styles.pStatValue}>{s.value}</Text>
                  )}
                  <Text style={styles.pStatLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {showUpgrade && (
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/(tabs)/planos"); }}
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
              >
                <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={styles.upgradeBtn}>
                  <Ionicons name="rocket-outline" size={16} color={Colors.black} />
                  <Text style={styles.upgradeBtnText}>Fazer Upgrade do Plano</Text>
                </LinearGradient>
              </Pressable>
            )}

            {isPro && (
              <View style={styles.proBanner}>
                <Ionicons name="checkmark-circle" size={16} color={isVitalicio ? Colors.gold : "#60A5FA"} />
                <Text style={[styles.proBannerText, { color: isVitalicio ? Colors.gold : "#60A5FA" }]}>
                  {isVitalicio ? "Acesso Vitalício — todos os recursos desbloqueados" : "Plano Pro Nexus ativo — recursos avançados disponíveis"}
                </Text>
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        <MenuSection title="Conta">
          <MenuItem icon="person-outline" label="Editar Perfil" sub="Nome e informações" onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} />
          <View style={styles.divider} />
          <MenuItem icon="lock-closed-outline" label="Segurança" sub="Senha e autenticação" onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} />
        </MenuSection>

        <MenuSection title="Assinatura">
          <MenuItem
            icon="diamond-outline"
            label="Meu Plano"
            sub={planLabel}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/planos"); }}
          />
          <View style={styles.divider} />
          <MenuItem
            icon="card-outline"
            label="Pagamento"
            sub={isPro ? "Plano ativo" : "Nenhum método cadastrado"}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/planos"); }}
          />
        </MenuSection>

        <MenuSection title="Preferências">
          <MenuItem
            icon="notifications-outline"
            label="Notificações"
            sub="Lembretes e atualizações"
            onPress={() => {}}
            toggle
            value={notifs}
            onToggle={(v) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setNotifs(v); }}
          />
          <View style={styles.divider} />
          <MenuItem
            icon="moon-outline"
            label="Modo Escuro"
            sub="Sempre ativo"
            onPress={() => {}}
            toggle
            value={isDark}
            onToggle={(v) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleTheme(); }}
          />
          <View style={styles.divider} />
          <MenuItem icon="language-outline" label="Idioma" sub="Português (Brasil)" onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} />
        </MenuSection>

        {user?.is_admin && (
          <MenuSection title="Administração">
            <MenuItem
              icon="shield-outline"
              label="Painel Admin"
              sub="Gerenciar usuários e configurações"
              color="#A78BFA"
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/(admin)"); }}
            />
          </MenuSection>
        )}

        <MenuSection title="Sobre">
          <MenuItem icon="information-circle-outline" label="Sobre o Nexus" sub="A Plataforma Científica do Treinamento de Força" onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} />
          <View style={styles.divider} />
          <MenuItem icon="document-text-outline" label="Termos de Uso" onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} />
          <View style={styles.divider} />
          <MenuItem icon="shield-checkmark-outline" label="Política de Privacidade" onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} />
        </MenuSection>

        <Animated.View entering={FadeInDown.delay(300).springify()} style={{ marginTop: 8 }}>
          <MenuItem icon="log-out-outline" label="Sair da Conta" onPress={handleLogout} danger />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(350).springify()} style={styles.footer}>
          <Text style={styles.footerText}>Nexus · Powered by Atlas</Text>
          <Text style={styles.footerVersion}>v1.0.0 · A Plataforma Científica do Treinamento de Força</Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  scroll: { paddingHorizontal: 20 },
  profileCard: { borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "rgba(212,175,55,0.2)", marginBottom: 24 },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 20 },
  avatar: { width: 64, height: 64, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "Outfit_800ExtraBold", fontSize: 26, color: Colors.black },
  profileInfo: { flex: 1, gap: 4 },
  profileName: { fontFamily: "Outfit_700Bold", fontSize: 20, color: Colors.text, letterSpacing: -0.3, marginBottom: 2 },
  planBadge: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", backgroundColor: "rgba(212,175,55,0.12)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1, borderColor: "rgba(212,175,55,0.25)" },
  planBadgeText: { fontFamily: "Outfit_600SemiBold", fontSize: 11, color: Colors.gold },
  adminBadge: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", backgroundColor: "rgba(167,139,250,0.12)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1, borderColor: "rgba(167,139,250,0.25)" },
  adminBadgeText: { fontFamily: "Outfit_600SemiBold", fontSize: 11, color: "#A78BFA" },
  profileStats: { flexDirection: "row", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  pStat: { flex: 1, alignItems: "center" },
  pStatValue: { fontFamily: "Outfit_700Bold", fontSize: 18, color: Colors.text, letterSpacing: -0.5 },
  pStatLabel: { fontFamily: "Outfit_400Regular", fontSize: 10, color: Colors.muted, marginTop: 2 },
  upgradeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 14 },
  upgradeBtnText: { fontFamily: "Outfit_700Bold", fontSize: 14, color: Colors.black },
  proBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(96,165,250,0.08)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(96,165,250,0.2)" },
  proBannerText: { fontFamily: "Outfit_500Medium", fontSize: 12, flex: 1, lineHeight: 18 },
  menuSection: { marginBottom: 20 },
  sectionTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: Colors.muted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10, paddingHorizontal: 4 },
  sectionCard: { backgroundColor: Colors.card, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  menuItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  menuIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  menuText: { flex: 1 },
  menuLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.text },
  menuSub: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.muted, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: 66 },
  footer: { alignItems: "center", paddingVertical: 20 },
  footerText: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.muted },
  footerVersion: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.border, marginTop: 4 },
});
