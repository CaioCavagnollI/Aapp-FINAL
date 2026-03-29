import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  FadeIn,
  FadeInUp,
} from "react-native-reanimated";
import { fetch } from "expo/fetch";
import { getApiUrl } from "@/lib/query-client";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useLocalSearchParams } from "expo-router";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

let messageCounter = 0;
function generateId(): string {
  messageCounter++;
  return `msg-${Date.now()}-${messageCounter}-${Math.random().toString(36).substr(2, 9)}`;
}

const SUGGESTED_QUESTIONS = [
  "Qual é a faixa de repetições ideal para hipertrofia?",
  "Como programar um bloco de pico de força?",
  "Explique RIR e como usar de forma eficaz",
  "O que a pesquisa diz sobre treinar até a falha?",
];

function TypingIndicator() {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    dot1.value = withRepeat(withTiming(1, { duration: 400 }), -1, true);
    setTimeout(() => {
      dot2.value = withRepeat(withTiming(1, { duration: 400 }), -1, true);
    }, 150);
    setTimeout(() => {
      dot3.value = withRepeat(withTiming(1, { duration: 400 }), -1, true);
    }, 300);
  }, []);

  const d1Style = useAnimatedStyle(() => ({ opacity: 0.3 + dot1.value * 0.7 }));
  const d2Style = useAnimatedStyle(() => ({ opacity: 0.3 + dot2.value * 0.7 }));
  const d3Style = useAnimatedStyle(() => ({ opacity: 0.3 + dot3.value * 0.7 }));

  return (
    <View style={styles.typingContainer}>
      <View style={styles.aiIcon}>
        <Ionicons name="flask" size={14} color={Colors.gold} />
      </View>
      <View style={styles.typingBubble}>
        <Animated.View style={[styles.dot, d1Style]} />
        <Animated.View style={[styles.dot, d2Style]} />
        <Animated.View style={[styles.dot, d3Style]} />
      </View>
    </View>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <Animated.View
      entering={FadeInUp.duration(200).springify()}
      style={[styles.messageRow, isUser && styles.messageRowUser]}
    >
      {!isUser && (
        <View style={styles.aiIconSmall}>
          <Ionicons name="flask" size={12} color={Colors.gold} />
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
        <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAI]}>
          {message.content}
        </Text>
      </View>
    </Animated.View>
  );
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { initialMessage } = useLocalSearchParams<{ initialMessage?: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const initialMessageHandled = useRef(false);

  const sendScale = useSharedValue(1);
  const sendAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: sendScale.value }] }));

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : 0;

  const handleSend = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    sendScale.value = withSpring(0.9, {}, () => { sendScale.value = withSpring(1); });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const currentMessages = [...messages];
    const userMsg: Message = { id: generateId(), role: "user", content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setIsStreaming(true);
    setShowTyping(true);

    let fullContent = "";
    let assistantAdded = false;

    try {
      const baseUrl = getApiUrl();
      const chatHistory = [
        ...currentMessages.map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: trimmed },
      ];

      const response = await fetch(`${baseUrl}api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
        },
        body: JSON.stringify({ messages: chatHistory }),
      });

      if (!response.ok) throw new Error("Falha na requisição");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Sem corpo na resposta");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullContent += parsed.content;
              if (!assistantAdded) {
                setShowTyping(false);
                setMessages(prev => [
                  ...prev,
                  { id: generateId(), role: "assistant", content: fullContent },
                ]);
                assistantAdded = true;
              } else {
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: fullContent,
                  };
                  return updated;
                });
              }
            }
          } catch {}
        }
      }
    } catch {
      setShowTyping(false);
      setMessages(prev => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          content: "Ocorreu um erro. Por favor, tente novamente.",
        },
      ]);
    } finally {
      setIsStreaming(false);
      setShowTyping(false);
    }
  }, [messages, isStreaming]);

  useEffect(() => {
    if (initialMessage && !initialMessageHandled.current) {
      initialMessageHandled.current = true;
      setTimeout(() => handleSend(initialMessage), 500);
    }
  }, [initialMessage]);

  const reversedMessages = [...messages].reverse();
  const isEmpty = messages.length === 0;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Ionicons name="flask" size={18} color={Colors.gold} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Lab IA</Text>
            <Text style={styles.headerSubtitle}>Assistente Científico de Treino</Text>
          </View>
        </View>
        {messages.length > 0 && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setMessages([]);
              initialMessageHandled.current = false;
            }}
            style={styles.clearBtn}
          >
            <Ionicons name="trash-outline" size={16} color={Colors.muted} />
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        {isEmpty ? (
          <View style={styles.emptyContainer}>
            <Animated.View entering={FadeIn.duration(400)} style={styles.emptyInner}>
              <LinearGradient
                colors={["rgba(212,175,55,0.12)", "rgba(212,175,55,0.04)"]}
                style={styles.emptyIconBg}
              >
                <Ionicons name="flask" size={36} color={Colors.gold} />
              </LinearGradient>
              <Text style={styles.emptyTitle}>Atlas IA</Text>
              <Text style={styles.emptySubtitle}>
                Pergunte qualquer coisa sobre ciência do treino, programação ou fisiologia do exercício.
              </Text>
              <View style={styles.suggestionsGrid}>
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <Pressable
                    key={i}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      handleSend(q);
                    }}
                    style={({ pressed }) => [styles.suggestion, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Text style={styles.suggestionText}>{q}</Text>
                    <Ionicons name="arrow-forward-circle" size={16} color={Colors.gold} />
                  </Pressable>
                ))}
              </View>
            </Animated.View>
          </View>
        ) : (
          <FlatList
            data={reversedMessages}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <MessageBubble message={item} />}
            inverted={messages.length > 0}
            ListHeaderComponent={showTyping ? <TypingIndicator /> : null}
            contentContainerStyle={styles.messageList}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        )}

        <View style={[styles.inputContainer, { paddingBottom: bottomPadding + 12 }]}>
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Pergunte sobre ciência do treino..."
              placeholderTextColor={Colors.muted}
              multiline
              maxLength={2000}
              blurOnSubmit={false}
              onSubmitEditing={() => {
                handleSend(inputText);
                inputRef.current?.focus();
              }}
            />
            <Animated.View style={sendAnimStyle}>
              <Pressable
                onPress={() => {
                  handleSend(inputText);
                  inputRef.current?.focus();
                }}
                disabled={!inputText.trim() || isStreaming}
                style={[
                  styles.sendBtn,
                  (!inputText.trim() || isStreaming) && styles.sendBtnDisabled,
                ]}
              >
                {isStreaming ? (
                  <ActivityIndicator size="small" color={Colors.black} />
                ) : (
                  <Ionicons
                    name="arrow-up"
                    size={18}
                    color={inputText.trim() ? Colors.black : Colors.muted}
                  />
                )}
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(212, 175, 55, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.2)",
  },
  headerTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: Colors.text,
  },
  headerSubtitle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  clearBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyInner: {
    alignItems: "center",
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.15)",
  },
  emptyTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 22,
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  suggestionsGrid: {
    width: "100%",
    gap: 10,
  },
  suggestion: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.card,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  suggestionText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: Colors.text,
    flex: 1,
    lineHeight: 20,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginVertical: 4,
  },
  messageRowUser: {
    justifyContent: "flex-end",
  },
  aiIconSmall: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "rgba(212, 175, 55, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.2)",
    marginBottom: 2,
  },
  bubble: {
    maxWidth: "80%",
    padding: 13,
    borderRadius: 18,
  },
  bubbleUser: {
    backgroundColor: Colors.gold,
    borderBottomRightRadius: 6,
  },
  bubbleAI: {
    backgroundColor: Colors.cardElevated,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
  },
  bubbleTextUser: {
    fontFamily: "Outfit_400Regular",
    color: Colors.black,
  },
  bubbleTextAI: {
    fontFamily: "Outfit_400Regular",
    color: Colors.text,
  },
  typingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    marginVertical: 4,
  },
  aiIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "rgba(212, 175, 55, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.2)",
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.cardElevated,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.gold,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.black,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    color: Colors.text,
    maxHeight: 100,
    minHeight: 36,
    paddingTop: 6,
    paddingBottom: 6,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: Colors.border,
  },
});
