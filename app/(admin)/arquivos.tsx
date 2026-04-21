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
  TextInput,
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
import { useAdmin } from "@/contexts/AdminContext";
import { getApiUrl } from "@/lib/query-client";

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
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function getFileIcon(ext: string): { icon: string; color: string } {
  const map: Record<string, { icon: string; color: string }> = {
    ".pdf": { icon: "document-text", color: "#F87171" },
    ".doc": { icon: "document", color: "#60A5FA" },
    ".docx": { icon: "document", color: "#60A5FA" },
    ".txt": { icon: "reader", color: Colors.gold },
    ".csv": { icon: "grid", color: "#4ADE80" },
    ".xlsx": { icon: "grid", color: "#4ADE80" },
    ".png": { icon: "image", color: "#A78BFA" },
    ".jpg": { icon: "image", color: "#A78BFA" },
    ".jpeg": { icon: "image", color: "#A78BFA" },
  };
  return map[ext.toLowerCase()] ?? { icon: "document-outline", color: Colors.muted };
}

export default function ArquivosAdminScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { adminToken } = useAdmin();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch } = useQuery<{ files: UploadedFile[] }>({
    queryKey: ["/api/admin/files"],
    enabled: !!adminToken,
  });

  const allFiles = data?.files ?? [];
  const files = search
    ? allFiles.filter((f) => f.originalName.toLowerCase().includes(search.toLowerCase()))
    : allFiles;

  const deleteMutation = useMutation({
    mutationFn: async (filename: string) => {
      const res = await fetch(`${getApiUrl()}api/admin/files/${encodeURIComponent(filename)}`, {
        method: "DELETE",
        headers: { "x-admin-token": adminToken! },
      });
      if (!res.ok) throw new Error("Erro ao excluir");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/files"] }),
    onError: () => Alert.alert("Erro", "Não foi possível excluir o arquivo"),
  });

  const handleUpload = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      setUploading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const formData = new FormData();
      formData.append("file", { uri: asset.uri, name: asset.name, type: asset.mimeType || "application/octet-stream" } as any);
      const res = await fetch(`${getApiUrl()}api/admin/upload`, {
        method: "POST",
        headers: { "x-admin-token": adminToken! },
        body: formData,
      });
      if (!res.ok) throw new Error("Erro ao enviar");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/files"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Sucesso", "Arquivo enviado!");
    } catch (e: any) {
      Alert.alert("Erro", e.message);
    } finally {
      setUploading(false);
    }
  }, [adminToken, queryClient]);

  const handleDelete = (file: UploadedFile) => {
    Alert.alert("Excluir", `Excluir "${file.originalName}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); deleteMutation.mutate(file.filename); } },
    ]);
  };

  const totalSize = allFiles.reduce((s, f) => s + f.size, 0);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="documents-outline" size={18} color={Colors.gold} />
          <Text style={styles.statVal}>{allFiles.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="server-outline" size={18} color="#60A5FA" />
          <Text style={styles.statVal}>{formatSize(totalSize)}</Text>
          <Text style={styles.statLabel}>Tamanho</Text>
        </View>
        <Pressable
          onPress={handleUpload}
          disabled={uploading}
          style={({ pressed }) => [styles.uploadCard, { opacity: pressed ? 0.8 : 1 }]}
        >
          <LinearGradient colors={[Colors.goldDark, Colors.gold]} style={styles.uploadCardGrad}>
            {uploading ? <ActivityIndicator size="small" color={Colors.black} /> : <Ionicons name="cloud-upload-outline" size={22} color={Colors.black} />}
            <Text style={styles.uploadCardText}>Upload</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color={Colors.muted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar arquivos..."
          placeholderTextColor={Colors.muted}
        />
        {search ? <Pressable onPress={() => setSearch("")}><Ionicons name="close-circle" size={16} color={Colors.muted} /></Pressable> : null}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 80 }]}
      >
        {isLoading ? (
          <View style={styles.center}><ActivityIndicator color={Colors.gold} /></View>
        ) : files.length === 0 ? (
          <Animated.View entering={FadeIn.duration(400)} style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={40} color={Colors.muted} />
            <Text style={styles.emptyText}>{search ? "Nenhum arquivo encontrado" : "Nenhum arquivo enviado"}</Text>
          </Animated.View>
        ) : (
          files.map((file, i) => {
            const { icon, color } = getFileIcon(file.ext);
            return (
              <Animated.View key={file.filename} entering={FadeInDown.delay(i * 40).springify()}>
                <View style={styles.fileCard}>
                  <View style={[styles.fileIcon, { backgroundColor: `${color}18`, borderColor: `${color}30` }]}>
                    <Ionicons name={icon as any} size={22} color={color} />
                  </View>
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileName} numberOfLines={1}>{file.originalName}</Text>
                    <View style={styles.fileMeta}>
                      <Text style={styles.fileExt}>{file.ext.toUpperCase().replace(".", "")}</Text>
                      <View style={styles.metaDot} />
                      <Text style={styles.fileSize}>{formatSize(file.size)}</Text>
                      <View style={styles.metaDot} />
                      <Text style={styles.fileDate}>{formatDate(file.uploadedAt)}</Text>
                    </View>
                  </View>
                  <Pressable onPress={() => handleDelete(file)} style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.6 : 1 }]}>
                    <Ionicons name="trash-outline" size={18} color="#F87171" />
                  </Pressable>
                </View>
              </Animated.View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  statCard: { flex: 1, backgroundColor: Colors.card, borderRadius: 14, padding: 12, alignItems: "center", gap: 4, borderWidth: 1, borderColor: Colors.border },
  statVal: { fontFamily: "Outfit_700Bold", fontSize: 16, color: Colors.text },
  statLabel: { fontFamily: "Outfit_400Regular", fontSize: 10, color: Colors.muted },
  uploadCard: { flex: 1, borderRadius: 14, overflow: "hidden" },
  uploadCardGrad: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4, padding: 12 },
  uploadCardText: { fontFamily: "Outfit_700Bold", fontSize: 12, color: Colors.black },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginBottom: 10, backgroundColor: Colors.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, fontFamily: "Outfit_400Regular", fontSize: 14, color: Colors.text },
  scroll: { paddingHorizontal: 16 },
  center: { paddingTop: 60, alignItems: "center" },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontFamily: "Outfit_400Regular", fontSize: 14, color: Colors.muted },
  fileCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  fileIcon: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  fileInfo: { flex: 1, gap: 4 },
  fileName: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.text },
  fileMeta: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  fileExt: { fontFamily: "Outfit_700Bold", fontSize: 10, color: Colors.gold, backgroundColor: "rgba(212,175,55,0.1)", paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  fileSize: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.muted },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.border },
  fileDate: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.muted },
  deleteBtn: { padding: 8 },
});
