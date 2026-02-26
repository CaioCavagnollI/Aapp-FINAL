import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  FadeInDown,
} from "react-native-reanimated";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

const FEATURED_ITEMS = [
  {
    id: "1",
    title: "Sobrecarga Progressiva",
    subtitle: "O pilar central da hipertrofia",
    tag: "Fundamental",
    icon: "trending-up" as const,
    question: "Explique a sobrecarga progressiva e como implementá-la de forma otimizada para hipertrofia com base na pesquisa atual.",
  },
  {
    id: "2",
    title: "RPE e Autorregulação",
    subtitle: "Treine com mais inteligência",
    tag: "Intermediário",
    icon: "pulse" as const,
    question: "O que é treino baseado em RPE e como a autorregulação otimiza os ganhos de força em comparação a programas com percentuais fixos?",
  },
  {
    id: "3",
    title: "Recrutamento de Unidades Motoras",
    subtitle: "Ciência neuromuscular desvendada",
    tag: "Avançado",
    icon: "flash" as const,
    question: "Explique o recrutamento de unidades motoras, o princípio do tamanho e como isso se aplica à seleção de exercícios e faixas de repetições para força máxima.",
  },
];

const QUICK_TOPICS = [
  { label: "Volume", icon: "layers-outline" as const, question: "Qual é o volume de treino semanal ideal para hipertrofia segundo as pesquisas atuais?" },
  { label: "Intervalos", icon: "timer-outline" as const, question: "O que a ciência diz sobre os intervalos de descanso ideais entre séries para hipertrofia vs força?" },
  { label: "Frequência", icon: "calendar-outline" as const, question: "Quantas vezes por semana devo treinar cada grupo muscular para otimizar a hipertrofia?" },
  { label: "Intensidade", icon: "barbell-outline" as const, question: "Qual intensidade (% de 1RM) devo usar para hipertrofia vs força máxima?" },
  { label: "Deload", icon: "battery-charging-outline" as const, question: "Quando e como fazer deload? O que as pesquisas dizem sobre estratégias de semana de deload?" },
  { label: "Periodização", icon: "git-branch-outline" as const, question: "Compare periodização linear, ondulatória e em blocos para levantadores intermediários. Qual é a melhor?" },
];

function StatCard({ value, label, icon }: { value: string; label: string; icon: string }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon as any} size={18} color={Colors.gold} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function FeaturedCard({ item, index }: { item: typeof FEATURED_ITEMS[0]; index: number }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    scale.value = withSequence(withSpring(0.96), withSpring(1));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/(tabs)/chat", params: { initialMessage: item.question } });
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 100).springify()} style={animStyle}>
      <Pressable onPress={handlePress}>
        <LinearGradient
          colors={["#1A1A1C", "#111113"]}
          style={styles.featuredCard}
        >
          <View style={styles.featuredCardHeader}>
            <View style={styles.featuredIconWrapper}>
              <Ionicons name={item.icon} size={20} color={Colors.gold} />
            </View>
            <View style={styles.tagBadge}>
              <Text style={styles.tagText}>{item.tag}</Text>
            </View>
          </View>
          <Text style={styles.featuredTitle}>{item.title}</Text>
          <Text style={styles.featuredSubtitle}>{item.subtitle}</Text>
          <View style={styles.featuredFooter}>
            <Text style={styles.exploreText}>Perguntar ao Lab IA</Text>
            <Ionicons name="arrow-forward" size={14} color={Colors.gold} />
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

function QuickTopicChip({ item }: { item: typeof QUICK_TOPICS[0] }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    scale.value = withSequence(withTiming(0.94, { duration: 80 }), withSpring(1));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/(tabs)/chat", params: { initialMessage: item.question } });
  };

  return (
    <Animated.View style={animStyle}>
      <Pressable onPress={handlePress} style={styles.chip}>
        <Ionicons name={item.icon} size={14} color={Colors.gold} />
        <Text style={styles.chipText}>{item.label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: topPadding + 16, paddingBottom: Platform.OS === "web" ? 34 : 100 },
        ]}
      >
        <Animated.View entering={FadeInDown.springify()}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>Bom treino,</Text>
              <Text style={styles.appTitle}>Fitversum Lab</Text>
            </View>
            <LinearGradient
              colors={[Colors.goldDark, Colors.gold]}
              style={styles.avatarBadge}
            >
              <Ionicons name="flask" size={20} color={Colors.black} />
            </LinearGradient>
          </View>

          <View style={styles.taglineRow}>
            <View style={styles.scienceBadge}>
              <Ionicons name="checkmark-circle" size={12} color={Colors.gold} />
              <Text style={styles.scienceBadgeText}>Ciência Baseada em Evidências</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).springify()}>
          <View style={styles.statsRow}>
            <StatCard value="gpt-5.2" label="Modelo IA" icon="sparkles-outline" />
            <StatCard value="RAG" label="Governado" icon="shield-checkmark-outline" />
            <StatCard value="1000+" label="Estudos" icon="library-outline" />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).springify()}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tópicos Científicos</Text>
            <Text style={styles.sectionSubtitle}>Perguntar ao Lab IA</Text>
          </View>
        </Animated.View>

        <View style={styles.featuredList}>
          {FEATURED_ITEMS.map((item, i) => (
            <FeaturedCard key={item.id} item={item} index={i} />
          ))}
        </View>

        <Animated.View entering={FadeInDown.delay(400).springify()}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Consulta Rápida</Text>
            <Text style={styles.sectionSubtitle}>Toque para perguntar</Text>
          </View>
          <View style={styles.chipGrid}>
            {QUICK_TOPICS.map((item) => (
              <QuickTopicChip key={item.label} item={item} />
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(500).springify()}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/(tabs)/chat");
            }}
            style={({ pressed }) => [styles.ctaButton, { opacity: pressed ? 0.85 : 1 }]}
          >
            <LinearGradient
              colors={[Colors.goldDark, Colors.gold, Colors.goldLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Ionicons name="chatbubble-ellipses" size={18} color={Colors.black} />
              <Text style={styles.ctaText}>Abrir Lab IA</Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.black} />
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  greeting: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    letterSpacing: 0.3,
  },
  appTitle: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 28,
    color: Colors.text,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  avatarBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  taglineRow: {
    marginBottom: 24,
  },
  scienceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "rgba(212, 175, 55, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.2)",
  },
  scienceBadgeText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 12,
    color: Colors.gold,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: {
    fontFamily: "Outfit_700Bold",
    fontSize: 13,
    color: Colors.text,
    marginTop: 2,
  },
  statLabel: {
    fontFamily: "Outfit_400Regular",
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 18,
    color: Colors.text,
  },
  sectionSubtitle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.gold,
  },
  featuredList: {
    gap: 12,
    marginBottom: 28,
  },
  featuredCard: {
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  featuredCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  featuredIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(212, 175, 55, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.2)",
  },
  tagBadge: {
    backgroundColor: "rgba(212, 175, 55, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.15)",
  },
  tagText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 11,
    color: Colors.gold,
  },
  featuredTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 18,
    color: Colors.text,
    marginBottom: 4,
  },
  featuredSubtitle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  featuredFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  exploreText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: Colors.gold,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 28,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.card,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: Colors.text,
  },
  ctaButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 8,
  },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  ctaText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: Colors.black,
    flex: 1,
    textAlign: "center",
  },
});
