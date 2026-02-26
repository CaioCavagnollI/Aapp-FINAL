import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Switch,
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

const EXPERTISE_LEVELS = ["Beginner", "Intermediate", "Advanced", "Elite"];

const GOALS = [
  { id: "strength", label: "Maximal Strength", icon: "barbell-outline" },
  { id: "hypertrophy", label: "Hypertrophy", icon: "body-outline" },
  { id: "endurance", label: "Muscular Endurance", icon: "pulse-outline" },
  { id: "power", label: "Power / Athletic", icon: "flash-outline" },
];

const SCIENCE_TOPICS = [
  { label: "Biomechanics", icon: "git-network-outline" },
  { label: "Nutrition", icon: "nutrition-outline" },
  { label: "Recovery", icon: "bed-outline" },
  { label: "Programming", icon: "calendar-outline" },
  { label: "Physiology", icon: "cellular-outline" },
  { label: "Psychology", icon: "brain" },
];

function RowButton({ label, icon, value, onPress }: { label: string; icon: string; value?: string; onPress?: () => void }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={() => {
          if (onPress) {
            scale.value = withSpring(0.97, {}, () => { scale.value = withSpring(1); });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress();
          }
        }}
        style={styles.rowButton}
      >
        <View style={styles.rowLeft}>
          <View style={styles.rowIconBox}>
            <Ionicons name={icon as any} size={16} color={Colors.gold} />
          </View>
          <Text style={styles.rowLabel}>{label}</Text>
        </View>
        <View style={styles.rowRight}>
          {value && <Text style={styles.rowValue}>{value}</Text>}
          {onPress && <Ionicons name="chevron-forward" size={14} color={Colors.muted} />}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [selectedGoals, setSelectedGoals] = useState<string[]>(["hypertrophy"]);
  const [scienceMode, setScienceMode] = useState(true);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const toggleGoal = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedGoals(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const askAboutLevel = () => {
    const levelName = EXPERTISE_LEVELS[selectedLevel];
    router.push({
      pathname: "/(tabs)/chat",
      params: {
        initialMessage: `I'm a ${levelName} level athlete. What should my primary training focus be? What programming style and volume landmarks are appropriate for my level?`,
      },
    });
  };

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
          <Text style={styles.pageTitle}>Profile</Text>
          <Text style={styles.pageSubtitle}>Personalize your scientific training experience</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).springify()}>
          <LinearGradient
            colors={["#1A1A1C", "#111113"]}
            style={styles.profileCard}
          >
            <LinearGradient
              colors={[Colors.goldDark, Colors.gold]}
              style={styles.profileAvatar}
            >
              <Ionicons name="person" size={28} color={Colors.black} />
            </LinearGradient>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>Athlete</Text>
              <View style={styles.profileBadge}>
                <Ionicons name="flask" size={11} color={Colors.gold} />
                <Text style={styles.profileBadgeText}>Fitversum Lab Member</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(140).springify()}>
          <Text style={styles.sectionTitle}>Experience Level</Text>
          <View style={styles.levelSelector}>
            {EXPERTISE_LEVELS.map((level, i) => (
              <Pressable
                key={level}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedLevel(i);
                }}
                style={[
                  styles.levelTab,
                  selectedLevel === i && styles.levelTabActive,
                ]}
              >
                <Text style={[
                  styles.levelTabText,
                  selectedLevel === i && styles.levelTabTextActive,
                ]}>
                  {level}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={askAboutLevel}
            style={({ pressed }) => [styles.levelHint, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="information-circle-outline" size={14} color={Colors.gold} />
            <Text style={styles.levelHintText}>
              {EXPERTISE_LEVELS[selectedLevel]} — Tap to learn what this means for your training
            </Text>
            <Ionicons name="arrow-forward" size={12} color={Colors.gold} />
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Text style={styles.sectionTitle}>Training Goals</Text>
          <View style={styles.goalsGrid}>
            {GOALS.map((goal) => {
              const isActive = selectedGoals.includes(goal.id);
              return (
                <Pressable
                  key={goal.id}
                  onPress={() => toggleGoal(goal.id)}
                  style={[styles.goalCard, isActive && styles.goalCardActive]}
                >
                  <View style={[styles.goalIcon, isActive && styles.goalIconActive]}>
                    <Ionicons
                      name={goal.icon as any}
                      size={20}
                      color={isActive ? Colors.black : Colors.muted}
                    />
                  </View>
                  <Text style={[styles.goalLabel, isActive && styles.goalLabelActive]}>
                    {goal.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(260).springify()}>
          <Text style={styles.sectionTitle}>Explore Science</Text>
          <View style={styles.topicsGrid}>
            {SCIENCE_TOPICS.map((topic) => (
              <Pressable
                key={topic.label}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({
                    pathname: "/(tabs)/chat",
                    params: {
                      initialMessage: `Give me an evidence-based overview of ${topic.label} as it relates to strength training and hypertrophy. Include key research findings and practical applications.`,
                    },
                  });
                }}
                style={({ pressed }) => [styles.topicChip, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Ionicons name={topic.icon as any} size={14} color={Colors.gold} />
                <Text style={styles.topicText}>{topic.label}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(320).springify()}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={styles.rowLeft}>
                <View style={styles.rowIconBox}>
                  <Ionicons name="flask-outline" size={16} color={Colors.gold} />
                </View>
                <View>
                  <Text style={styles.rowLabel}>Scientific Mode</Text>
                  <Text style={styles.settingSubtitle}>Detailed research references</Text>
                </View>
              </View>
              <Switch
                value={scienceMode}
                onValueChange={(v) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setScienceMode(v);
                }}
                trackColor={{ false: Colors.border, true: `${Colors.gold}60` }}
                thumbColor={scienceMode ? Colors.gold : Colors.muted}
              />
            </View>
            <View style={styles.settingsDivider} />
            <RowButton
              label="AI Model"
              icon="sparkles-outline"
              value="gpt-5.2"
            />
            <View style={styles.settingsDivider} />
            <RowButton
              label="Ask About Programming"
              icon="chatbubble-outline"
              onPress={() => {
                router.push({
                  pathname: "/(tabs)/chat",
                  params: {
                    initialMessage: "I want to understand the fundamentals of strength training programming. What are the key variables I should manipulate and how do they interact?",
                  },
                });
              }}
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(380).springify()}>
          <View style={styles.aboutCard}>
            <View style={styles.aboutRow}>
              <LinearGradient
                colors={[Colors.goldDark, Colors.gold]}
                style={styles.aboutLogo}
              >
                <Ionicons name="flask" size={16} color={Colors.black} />
              </LinearGradient>
              <View style={styles.aboutText}>
                <Text style={styles.aboutTitle}>Fitversum Lab</Text>
                <Text style={styles.aboutVersion}>O Multiverso Científico da Musculação</Text>
              </View>
            </View>
            <Text style={styles.aboutDescription}>
              Evidence-based strength training powered by scientific AI. Every answer is grounded in exercise physiology research.
            </Text>
          </View>
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
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 28,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontFamily: "Outfit_700Bold",
    fontSize: 20,
    color: Colors.text,
    marginBottom: 6,
  },
  profileBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "rgba(212, 175, 55, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.2)",
  },
  profileBadgeText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 11,
    color: Colors.gold,
  },
  sectionTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: Colors.text,
    marginBottom: 14,
  },
  levelSelector: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  levelTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 10,
  },
  levelTabActive: {
    backgroundColor: Colors.gold,
  },
  levelTabText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 12,
    color: Colors.muted,
  },
  levelTabTextActive: {
    fontFamily: "Outfit_700Bold",
    color: Colors.black,
  },
  levelHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 28,
  },
  levelHintText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.gold,
    flex: 1,
  },
  goalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 28,
  },
  goalCard: {
    width: "47.5%",
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  goalCardActive: {
    backgroundColor: "rgba(212, 175, 55, 0.12)",
    borderColor: "rgba(212, 175, 55, 0.4)",
  },
  goalIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.cardElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  goalIconActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  goalLabel: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: Colors.muted,
    textAlign: "center",
  },
  goalLabelActive: {
    color: Colors.gold,
    fontFamily: "Outfit_600SemiBold",
  },
  topicsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 28,
  },
  topicChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  topicText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: Colors.text,
  },
  settingsCard: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  rowButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  rowIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(212, 175, 55, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.15)",
  },
  rowLabel: {
    fontFamily: "Outfit_500Medium",
    fontSize: 15,
    color: Colors.text,
  },
  settingSubtitle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowValue: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.gold,
  },
  settingsDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  aboutCard: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 12,
  },
  aboutLogo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  aboutText: {
    flex: 1,
  },
  aboutTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: Colors.text,
  },
  aboutVersion: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    color: Colors.gold,
    marginTop: 2,
  },
  aboutDescription: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
});
