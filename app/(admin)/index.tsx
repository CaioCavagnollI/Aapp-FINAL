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
import { fetch } from "expo/fetch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useAdmin } from "@/contexts/AdminContext";
import { getApiUrl } from "@/lib/query-client";
import Colors from "@/constants/colors";

interface UploadedFile {
  filename: string;
  originalName: string;
  size: number;
  uploadedAt: string;
  ext: string;
}

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

function getFileIcon(ext: string): string {
  const map: Record<string, string> = {
    ".pdf": "document-text",
    ".doc": "document",
    ".docx": "document",
    ".txt": "reader",
    ".csv": "grid",
    ".xlsx": "grid",
    ".xls": "grid",
    ".png": "image",
    ".jpg": "image",
    ".jpeg": "image",
    ".mp4": "videocam",
    ".mp3": "musical-notes",
    ".zip": "archive",
    ".json": "code",
  };
  return (map[ext] || "attach") + "-outline";
}

function FileCard({ file, onDelete }: { file: UploadedFile; onDelete: (filename: string) => void }) {
  return (
    <Animated.View entering={FadeInDown.springify()} style={styles.fileCard}>
      <View style={styles.fileIconBox}>
        <Ionicons name={getFileIcon(file.ext) as any} size={22} color={Colors.gold} />
      </View>
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>{file.originalName}</Text>
        <Text style={styles.fileMeta}>
          {formatSize(file.size)} · {formatDate(file.uploadedAt)}
        </Text>
      </View>
      <Pressable
        onPress={() => onDelete(file.filename)}
        style={styles.deleteBtn}
        hitSlop={8}
      >
        <Ionicons name="trash-outline" size={16} color="#F87171" />
      </Pressable>
    </Animated.View>
  );
}

export default function AdminIndexScreen() {
  const insets = useSafeAreaInsets();
  const { token, logout } = useAdmin();
  const qc = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");

  const baseUrl = getApiUrl();
  const headers = { "x-admin-token": token || "" };

  const { data, isLoading, isError, refetch } = useQuery<{ files: UploadedFile[] }>({
    queryKey: ["admin-files"],
    queryFn: async () => {
      const res = await fetch(`${baseUrl}api/admin/files`, { headers });
      if (!res.ok) throw new Error("Falha ao buscar arquivos");
      return res.json() as Promise<{ files: UploadedFile[] }>;
    },
    staleTime: 0,
  });

  const deleteMutation = useMutation({
    mutationFn: async (filename: string) => {
      const res = await fetch(`${baseUrl}api/admin/files/${encodeURIComponent(filename)}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error("Falha ao excluir");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-files"] }); },
  });

  const handleDelete = useCallback((filename: string) => {
    Alert.alert(
      "Excluir arquivo",
      "Tem certeza que deseja excluir este arquivo?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            deleteMutation.mutate(filename);
          },
        },
      ]
    );
  }, []);

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIsUploading(true);
      setUploadProgress(`Enviando "${asset.name}"...`);

      const formData = new FormData();
      formData.append("file", {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType || "application/octet-stream",
      } as any);

      const res = await fetch(`${baseUrl}api/admin/upload`, {
        method: "POST",
        headers: { "x-admin-token": token || "" },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error || "Erro no upload");
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setUploadProgress("Upload concluído!");
      qc.invalidateQueries({ queryKey: ["admin-files"] });

      setTimeout(() => setUploadProgress(""), 2000);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Erro no upload", err.message || "Falha ao enviar o arquivo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Sair do Admin", "Deseja encerrar a sessão de administrador?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.dismissAll();
        },
      },
    ]);
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const files = data?.files || [];

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === "web" ? 34 : 40 },
        ]}
      >
        <Animated.View entering={FadeInDown.springify()}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.pageTitle}>Painel Admin</Text>
              <Text style={styles.pageSubtitle}>Gerenciar arquivos e documentos</Text>
            </View>
            <Pressable onPress={handleLogout} style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={18} color="#F87171" />
            </Pressable>
          </View>
          <Pressable
            onPress={() => router.replace("/(tabs)/perfil")}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back-outline" size={20} color={Colors.gold} />
          </Pressable>
        </Animated.View>

        {/* Quick Navigation */}
        <Animated.View entering={FadeInDown.delay(80).springify()}>
          <Text style={styles.navSectionTitle}>Gerenciamento</Text>
          <View style={styles.navGrid}>
            {[
              { label: "Usuários", icon: "people-outline", color: "#60A5FA", route: "/(admin)/usuarios" as const },
              { label: "Moderação Loja", icon: "storefront-outline", color: "#F472B6", route: "/(admin)/loja-mod" as const },
              { label: "Integrações", icon: "extension-puzzle-outline", color: "#A78BFA", route: "/(admin)/integracoes" as const },
              { label: "Upload Arquivos", icon: "cloud-upload-outline", color: Colors.gold, route: null as any },
            ].map((item) => (
              <Pressable
                key={item.label}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  if (item.route) { router.push(item.route); } else { handleUpload(); }
                }}
                style={({ pressed }) => [styles.navCard, { opacity: pressed ? 0.85 : 1 }]}
              >
                <View style={[styles.navIcon, { backgroundColor: `${item.color}15`, borderColor: `${item.color}25` }]}>
                  <Ionicons name={item.icon as any} size={22} color={item.color} />
                </View>
                <Text style={styles.navLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={12} color={Colors.muted} />
              </Pressable>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).springify()}>
          <Pressable
            onPress={handleUpload}
            disabled={isUploading}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          >
            <LinearGradient
              colors={isUploading ? [Colors.border, Colors.border] : [Colors.goldDark, Colors.gold]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.uploadBtn}
            >
              {isUploading ? (
                <>
                  <ActivityIndicator size="small" color={Colors.black} />
                  <Text style={styles.uploadBtnText}>{uploadProgress || "Enviando..."}</Text>
                </>
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={20} color={Colors.black} />
                  <Text style={styles.uploadBtnText}>Selecionar e Enviar Arquivo</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).springify()}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Arquivos Enviados</Text>
            <Pressable onPress={() => refetch()} style={styles.refreshBtn}>
              <Ionicons name="refresh-outline" size={16} color={Colors.gold} />
            </Pressable>
          </View>
        </Animated.View>

        {isLoading ? (
          <Animated.View entering={FadeIn} style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.gold} />
            <Text style={styles.loadingText}>Carregando arquivos...</Text>
          </Animated.View>
        ) : isError ? (
          <Animated.View entering={FadeIn} style={styles.emptyState}>
            <Ionicons name="cloud-offline-outline" size={40} color={Colors.muted} />
            <Text style={styles.emptyText}>Erro ao carregar arquivos</Text>
            <Pressable onPress={() => refetch()} style={styles.retryBtn}>
              <Text style={styles.retryText}>Tentar novamente</Text>
            </Pressable>
          </Animated.View>
        ) : files.length === 0 ? (
          <Animated.View entering={FadeIn} style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={44} color={Colors.muted} />
            <Text style={styles.emptyTitle}>Nenhum arquivo enviado</Text>
            <Text style={styles.emptyText}>
              Toque em "Selecionar e Enviar Arquivo" para fazer upload do primeiro documento.
            </Text>
          </Animated.View>
        ) : (
          <View style={styles.fileList}>
            <Text style={styles.fileCount}>{files.length} arquivo{files.length !== 1 ? "s" : ""}</Text>
            {files.map((file) => (
              <FileCard key={file.filename} file={file} onDelete={handleDelete} />
            ))}
          </View>
        )}
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
    marginBottom: 24,
  },
  pageTitle: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 26,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(248,113,113,0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.2)",
  },
  backBtn: {
    alignSelf: "center",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(212,175,55,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.2)",
    marginBottom: 20,
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 28,
  },
  uploadBtnText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 15,
    color: Colors.black,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 18,
    color: Colors.text,
  },
  refreshBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  centered: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 16,
  },
  loadingText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 12,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 16,
    color: Colors.text,
    textAlign: "center",
  },
  emptyText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 4,
  },
  retryText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 14,
    color: Colors.gold,
  },
  navSectionTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: Colors.text,
    marginBottom: 12,
    marginTop: 4,
  },
  navGrid: {
    gap: 8,
    marginBottom: 28,
  },
  navCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  navIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  navLabel: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  fileList: {
    gap: 10,
  },
  fileCount: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.muted,
    marginBottom: 4,
  },
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fileIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(212, 175, 55, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.2)",
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontFamily: "Outfit_500Medium",
    fontSize: 14,
    color: Colors.text,
    marginBottom: 3,
  },
  fileMeta: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.muted,
  },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(248,113,113,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.15)",
  },
});
