import React, { useState } from "react";
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
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import Colors from "@/constants/colors";

const PROGRAMS = [
  {
    id: "1",
    name: "Linear Progression",
    level: "Beginner",
    duration: "12 weeks",
    frequency: "3x / week",
    focus: "Strength",
    description: "Classic LP for novices. Add weight every session using the basic compound lifts.",
    principles: ["Progressive Overload", "Motor Learning", "Neural Adaptation"],
    primaryLifts: ["Squat", "Bench Press", "Deadlift", "Overhead Press"],
    aiQuestion: "Design a 12-week linear progression program for a beginner with no equipment except a barbell. Include sets, reps, and weekly progression scheme based on current research.",
  },
  {
    id: "2",
    name: "Undulating Periodization",
    level: "Intermediate",
    duration: "16 weeks",
    frequency: "4x / week",
    focus: "Hypertrophy + Strength",
    description: "Daily undulating periodization to balance hypertrophy and strength stimuli.",
    principles: ["DUP", "Metabolic Stress", "Mechanical Tension"],
    primaryLifts: ["Squat", "RDL", "Press", "Row", "Pull-up"],
    aiQuestion: "Design a 16-week daily undulating periodization (DUP) program for an intermediate lifter. Alternate between hypertrophy (8-12 reps) and strength (3-5 reps) days. Include volume landmarks.",
  },
  {
    id: "3",
    name: "Block Periodization",
    level: "Advanced",
    duration: "20 weeks",
    frequency: "5x / week",
    focus: "Peak Strength",
    description: "Accumulation → Transmutation → Realization blocks for advanced strength athletes.",
    principles: ["Block Periodization", "Supercompensation", "Peak Performance"],
    primaryLifts: ["Competition Squat", "Bench", "Deadlift"],
    aiQuestion: "Design a 20-week block periodization program for an advanced powerlifter preparing for competition. Include accumulation (hypertrophy), transmutation (strength), and realization (peaking) blocks with specific percentages and volume.",
  },
  {
    id: "4",
    name: "Hypertrophy Specialization",
    level: "Intermediate",
    duration: "8 weeks",
    frequency: "4-5x / week",
    focus: "Muscle Growth",
    description: "Maximum hypertrophy focus using optimal volume, frequency, and proximity to failure.",
    principles: ["Mechanical Tension", "Metabolic Stress", "Muscle Damage"],
    primaryLifts: ["All Major Muscle Groups"],
    aiQuestion: "Design an 8-week hypertrophy specialization program based on Schoenfeld's three mechanisms of muscle growth. Include optimal volume (sets per muscle group per week), frequency, and exercise selection with scientific rationale.",
  },
];

const LEVEL_COLORS: Record<string, string> = {
  "Beginner": "#4ADE80",
  "Intermediate": "#D4AF37",
  "Advanced": "#F87171",
};

const FOCUS_ICONS: Record<string, string> = {
  "Strength": "barbell-outline",
  "Hypertrophy + Strength": "fitness-outline",
  "Peak Strength": "trophy-outline",
  "Muscle Growth": "body-outline",
};

function ProgramCard({ program, index }: { program: typeof PROGRAMS[0]; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handleToggle = () => {
    scale.value = withSpring(0.97, {}, () => { scale.value = withSpring(1); });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(prev => !prev);
  };

  const handleAskAI = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/(tabs)/chat", params: { initialMessage: program.aiQuestion } });
  };

  const levelColor = LEVEL_COLORS[program.level] || Colors.gold;
  const focusIcon = FOCUS_ICONS[program.focus] || "barbell-outline";

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).springify()}
      style={animStyle}
    >
      <Pressable onPress={handleToggle}>
        <View style={styles.programCard}>
          <View style={styles.cardTop}>
            <View style={styles.cardTopLeft}>
              <View style={styles.cardMeta}>
                <View style={[styles.levelBadge, { borderColor: `${levelColor}40`, backgroundColor: `${levelColor}12` }]}>
                  <Text style={[styles.levelText, { color: levelColor }]}>{program.level}</Text>
                </View>
                <View style={styles.focusBadge}>
                  <Ionicons name={focusIcon as any} size={11} color={Colors.gold} />
                  <Text style={styles.focusText}>{program.focus}</Text>
                </View>
              </View>
              <Text style={styles.programName}>{program.name}</Text>
              <Text style={styles.programDescription}>{program.description}</Text>
            </View>
            <View style={styles.expandIcon}>
              <Ionicons
                name={expanded ? "chevron-up" : "chevron-down"}
                size={16}
                color={Colors.muted}
              />
            </View>
          </View>

          <View style={styles.programStats}>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={13} color={Colors.gold} />
              <Text style={styles.statText}>{program.duration}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="calendar-outline" size={13} color={Colors.gold} />
              <Text style={styles.statText}>{program.frequency}</Text>
            </View>
          </View>

          {expanded && (
            <View style={styles.expandedContent}>
              <View style={styles.divider} />

              <Text style={styles.expandLabel}>Scientific Principles</Text>
              <View style={styles.principlesList}>
                {program.principles.map((p) => (
                  <View key={p} style={styles.principleTag}>
                    <Ionicons name="flask-outline" size={11} color={Colors.gold} />
                    <Text style={styles.principleText}>{p}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.expandLabel}>Primary Lifts</Text>
              <View style={styles.liftsList}>
                {program.primaryLifts.map((lift) => (
                  <View key={lift} style={styles.liftTag}>
                    <Text style={styles.liftText}>{lift}</Text>
                  </View>
                ))}
              </View>

              <Pressable onPress={handleAskAI} style={({ pressed }) => [styles.aiBtn, { opacity: pressed ? 0.8 : 1 }]}>
                <LinearGradient
                  colors={[Colors.goldDark, Colors.gold]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.aiBtnGradient}
                >
                  <Ionicons name="flask" size={14} color={Colors.black} />
                  <Text style={styles.aiBtnText}>Generate Full Program with AI</Text>
                  <Ionicons name="arrow-forward" size={14} color={Colors.black} />
                </LinearGradient>
              </Pressable>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function ProgramsScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: topPadding + 16, paddingBottom: Platform.OS === "web" ? 34 : 100 },
        ]}
      >
        <Animated.View entering={FadeInDown.springify()}>
          <Text style={styles.pageTitle}>Training Programs</Text>
          <Text style={styles.pageSubtitle}>Evidence-based prescriptions, auditable by science</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).springify()}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push({
                pathname: "/(tabs)/chat",
                params: {
                  initialMessage: "I need a custom training program. Ask me about my goals, experience level, available equipment, and schedule, then design a complete evidence-based program.",
                },
              });
            }}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          >
            <LinearGradient
              colors={["rgba(212,175,55,0.15)", "rgba(212,175,55,0.05)"]}
              style={styles.customBanner}
            >
              <View style={styles.customBannerLeft}>
                <Text style={styles.customBannerTitle}>Custom Program Builder</Text>
                <Text style={styles.customBannerSubtitle}>AI designs a program tailored exactly to you</Text>
              </View>
              <View style={styles.customBannerIcon}>
                <Ionicons name="sparkles" size={22} color={Colors.gold} />
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(140).springify()} style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Program Library</Text>
          <Text style={styles.sectionCount}>{PROGRAMS.length} programs</Text>
        </Animated.View>

        <View style={styles.programList}>
          {PROGRAMS.map((program, i) => (
            <ProgramCard key={program.id} program={program} index={i} />
          ))}
        </View>
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
  pageTitle: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 26,
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  customBanner: {
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.2)",
    marginBottom: 24,
  },
  customBannerLeft: {
    flex: 1,
  },
  customBannerTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: Colors.gold,
    marginBottom: 4,
  },
  customBannerSubtitle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  customBannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(212, 175, 55, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.2)",
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
  sectionCount: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.muted,
  },
  programList: {
    gap: 12,
  },
  programCard: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTop: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  cardTopLeft: {
    flex: 1,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  levelText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 11,
  },
  focusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: "rgba(212, 175, 55, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.15)",
  },
  focusText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 11,
    color: Colors.gold,
  },
  expandIcon: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  programName: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: Colors.text,
    marginBottom: 6,
  },
  programDescription: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  programStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 12,
    backgroundColor: Colors.border,
  },
  expandedContent: {
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 16,
  },
  expandLabel: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 12,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  principlesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  principleTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(212, 175, 55, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.15)",
  },
  principleText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 12,
    color: Colors.gold,
  },
  liftsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  liftTag: {
    backgroundColor: Colors.cardElevated,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  liftText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.text,
  },
  aiBtn: {
    borderRadius: 12,
    overflow: "hidden",
  },
  aiBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  aiBtnText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.black,
    flex: 1,
    textAlign: "center",
  },
});
