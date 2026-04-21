import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetch } from "expo/fetch";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl } from "@/lib/query-client";

interface UserFile {
  id: string;
  filename: string;
  original_name: string;
  size: number;
  mime_type: string;
  uploaded_at: string;
  ext: string;
  url: string;
}

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/jpg",
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getFileIcon(ext: string): { icon: string; color: string } {
  const map: Record<string, { icon: string; color: string }> = {
    ".pdf": { icon: "document-text", color: "#F87171" },
    ".doc": { icon: "document", color: "#60A5FA" },
    ".docx": { icon: "document", color: "#60A5FA" },
    ".png": { icon: "image", color: "#4ADE80" },
    ".jpg": { icon: "image", color: "#4ADE80" },
    ".jpeg": { icon: "image", color: "#4ADE80" },
  };
  return map[ext.toLowerCase()] ?? { icon: "document-outline", color: Colors.muted };
}

export default function UploadsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data, isLoading, refetch } = useQuery<{ files: UserFile[] }>({
    queryKey: ["/api/user/files"],
    enabled: !!token,
  });

  const files = data?.files ?? [];

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const res = await fetch(`${getApiUrl()}api/user/files/${fileId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erro ao excluir arquivo");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/user/files"] }),
  });

  const handleUpload = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ALLOWED_TYPES,
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const ext = (asset.name.split(".").pop() || "").toLowerCase();
      const allowed = ["pdf", "doc", "docx", "png", "jpg", "jpeg"];
      if (!allowed.includes(ext)) {
        Alert.alert("Tipo não suportado", "Use PDF, DOC, DOCX, PNG ou JPEG");
        return;
      }
      setUploading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const formData = new FormData();
      formData.append("file", {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType || "application/octet-stream",
      } as any);
      const res = await fetch(`${getApiUrl()}api/user/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || "Erro ao enviar arquivo");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/user/files"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Sucesso", "Arquivo enviado com sucesso!");
    } catch (e: any) {
      Alert.alert("Erro", e.message || "Não foi possível enviar o arquivo");
    } finally {
      setUploading(false);
    }
  }, [token, queryClient]);

  const handleDelete = useCallback((file: UserFile) => {
    Alert.alert(
      "Excluir arquivo",
      `Deseja excluir "${file.original_name}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            deleteMutation.mutate(file.id);
          },
        },
      ]
    );
  }, [deleteMutation]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.headerLeft}>
          <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={styles.headerLogo}>
            <Ionicons name="cloud-upload-outline" size={18} color={Colors.black} />
          </LinearGradient>
          <View>
            <Text style={styles.headerTitle}>Arquivos</Text>
            <Text style={styles.headerSub}>Documentos e mídia</Text>
          </View>
        </View>
        <Pressable
          onPress={handleUpload}
          disabled={uploading}
          style={({ pressed }) => [styles.uploadBtn, { opacity: pressed ? 0.8 : 1 }]}
        >
          <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={styles.uploadBtnGrad}>
            {uploading
              ? <ActivityIndicator size="small" color={Colors.black} />
              : <Ionicons name="add" size={20} color={Colors.black} />}
          </LinearGradient>
        </Pressable>
      </View>

      <View style={styles.formatRow}>
        {["PDF", "DOC", "DOCX", "PNG", "JPEG"].map((fmt) => (
          <View key={fmt} style={styles.formatBadge}>
            <Text style={styles.formatText}>{fmt}</Text>
          </View>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: botPad + 100 }]}
        refreshing={isLoading}
        onStartShouldSetResponder={() => false}
      >
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.gold} />
          </View>
        ) : files.length === 0 ? (
          <Animated.View entering={FadeIn.duration(500)} style={styles.emptyState}>
            <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={styles.emptyLogo}>
              <Ionicons name="cloud-upload-outline" size={28} color={Colors.black} />
            </LinearGradient>
            <Text style={styles.emptyTitle}>Nenhum arquivo</Text>
            <Text style={styles.emptySub}>Faça upload de PDFs, documentos e imagens. Todos os seus arquivos ficam seguros aqui.</Text>
            <Pressable
              onPress={handleUpload}
              disabled={uploading}
              style={({ pressed }) => [styles.emptyBtn, { opacity: pressed ? 0.8 : 1 }]}
            >
              <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={styles.emptyBtnGrad}>
                <Ionicons name="cloud-upload-outline" size={16} color={Colors.black} />
                <Text style={styles.emptyBtnText}>Enviar Arquivo</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        ) : (
          <>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Ionicons name="documents-outline" size={18} color={Colors.gold} />
                <Text style={styles.statVal}>{files.length}</Text>
                <Text style={styles.statLabel}>Arquivos</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="server-outline" size={18} color="#60A5FA" />
                <Text style={styles.statVal}>{formatSize(files.reduce((s, f) => s + f.size, 0))}</Text>
                <Text style={styles.statLabel}>Armazenado</Text>
              </View>
            </View>

            {files.map((file, i) => {
              const { icon, color } = getFileIcon(file.ext);
              return (
                <Animated.View key={file.id} entering={FadeInDown.delay(i * 50).springify()}>
                  <View style={styles.fileCard}>
                    <View style={[styles.fileIcon, { backgroundColor: `${color}18`, borderColor: `${color}30` }]}>
                      <Ionicons name={icon as any} size={22} color={color} />
                    </View>
                    <View style={styles.fileInfo}>
                      <Text style={styles.fileName} numberOfLines={1}>{file.original_name}</Text>
                      <View style={styles.fileMeta}>
                        <Text style={styles.fileSize}>{formatSize(file.size)}</Text>
                        <View style={styles.metaDot} />
                        <Text style={styles.fileDate}>{formatDate(file.uploaded_at)}</Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => handleDelete(file)}
                      style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.6 : 1 }]}
                    >
                      <Ionicons name="trash-outline" size={18} color="#F87171" />
                    </Pressable>
                  </View>
                </Animated.View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerLogo: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Outfit_700Bold", fontSize: 18, color: Colors.text, letterSpacing: -0.3 },
  headerSub: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.gold, marginTop: 1 },
  uploadBtn: { borderRadius: 14, overflow: "hidden" },
  uploadBtnGrad: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  formatRow: { flexDirection: "row", gap: 6, paddingHorizontal: 20, paddingVertical: 10, flexWrap: "wrap" },
  formatBadge: { backgroundColor: Colors.card, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: Colors.border },
  formatText: { fontFamily: "Outfit_500Medium", fontSize: 10, color: Colors.muted },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 },
  emptyState: { alignItems: "center", paddingTop: 60, paddingHorizontal: 24 },
  emptyLogo: { width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  emptyTitle: { fontFamily: "Outfit_700Bold", fontSize: 20, color: Colors.text, marginBottom: 8 },
  emptySub: { fontFamily: "Outfit_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  emptyBtn: { borderRadius: 14, overflow: "hidden" },
  emptyBtnGrad: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 14 },
  emptyBtnText: { fontFamily: "Outfit_700Bold", fontSize: 15, color: Colors.black },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: Colors.card, borderRadius: 16, padding: 14, alignItems: "center", gap: 4, borderWidth: 1, borderColor: Colors.border },
  statVal: { fontFamily: "Outfit_700Bold", fontSize: 18, color: Colors.text },
  statLabel: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.muted },
  fileCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.card, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  fileIcon: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  fileInfo: { flex: 1, gap: 4 },
  fileName: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.text },
  fileMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  fileSize: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.muted },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.border },
  fileDate: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.muted },
  deleteBtn: { padding: 8 },
});
