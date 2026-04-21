import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
  ActivityIndicator, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetch } from "expo/fetch";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { getApiUrl } from "@/lib/query-client";

type Folder = "Todos" | "Geral" | "IA/RAG" | "Atlas Market" | "Scanner" | "Editorial" | "Acadêmico";
const FOLDERS: { key: Folder; icon: string; color: string }[] = [
  { key: "Todos", icon: "apps-outline", color: Colors.gold },
  { key: "Geral", icon: "folder-outline", color: "#60A5FA" },
  { key: "IA/RAG", icon: "flask-outline", color: "#D4AF37" },
  { key: "Atlas Market", icon: "storefront-outline", color: "#8B5CF6" },
  { key: "Scanner", icon: "scan-outline", color: "#4ADE80" },
  { key: "Editorial", icon: "newspaper-outline", color: "#F472B6" },
  { key: "Acadêmico", icon: "school-outline", color: "#3B82F6" },
];

interface UserFile {
  id: string; filename: string; original_name: string; size: number;
  mime_type: string; uploaded_at: string; ext: string; url: string; folder?: string;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getFileIcon(ext: string): { icon: string; color: string } {
  const map: Record<string, { icon: string; color: string }> = {
    ".pdf": { icon: "document-text", color: "#F87171" },
    ".doc": { icon: "document", color: "#60A5FA" },
    ".docx": { icon: "document", color: "#60A5FA" },
    ".png": { icon: "image", color: "#4ADE80" },
    ".jpg": { icon: "image", color: "#4ADE80" },
    ".jpeg": { icon: "image", color: "#4ADE80" },
    ".txt": { icon: "reader", color: "#FBBF24" },
    ".mp3": { icon: "musical-notes", color: "#A78BFA" },
    ".mp4": { icon: "videocam", color: "#F472B6" },
  };
  return map[ext.toLowerCase()] ?? { icon: "document-outline", color: Colors.muted };
}

export default function ArquivosScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { token } = useAuth();
  const { colors, isDark } = useTheme();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [folderFilter, setFolderFilter] = useState<Folder>("Todos");
  const [selectedFolder, setSelectedFolder] = useState<Folder>("Geral");
  const [showFolderPicker, setShowFolderPicker] = useState(false);

  const bg = isDark ? Colors.black : Colors.lightBg;
  const cardBg = isDark ? Colors.card : Colors.lightCard;
  const textColor = isDark ? Colors.text : Colors.lightText;
  const textSec = isDark ? Colors.textSecondary : Colors.lightTextSecondary;
  const borderColor = isDark ? Colors.border : Colors.lightBorder;

  const { data, isLoading, refetch } = useQuery<{ files: UserFile[] }>({
    queryKey: ["/api/user/files"],
    queryFn: async () => {
      const res = await fetch(`${getApiUrl()}api/user/files`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Falha");
      return res.json();
    },
    enabled: !!token,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${getApiUrl()}api/user/files/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/user/files"] }),
  });

  const pickAndUpload = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/png", "image/jpeg", "text/plain", "audio/mpeg", "video/mp4"],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const file = result.assets[0];
      setUploading(true);
      const formData = new FormData();
      formData.append("file", { uri: file.uri, name: file.name, type: file.mimeType ?? "application/octet-stream" } as any);
      formData.append("folder", selectedFolder);
      const res = await fetch(`${getApiUrl()}api/user/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error("Upload falhou");
      await qc.invalidateQueries({ queryKey: ["/api/user/files"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("Erro", e.message || "Falha ao enviar arquivo.");
    } finally {
      setUploading(false);
    }
  }, [token, qc, selectedFolder]);

  const filteredFiles = (data?.files || []).filter(f =>
    folderFilter === "Todos" || f.folder === folderFilter
  );

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: borderColor, backgroundColor: bg }]}>
        <View>
          <Text style={[styles.title, { color: textColor }]}>Arquivos</Text>
          <Text style={[styles.subtitle, { color: textSec }]}>Documentos para IA, Scanner, Loja e mais</Text>
        </View>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowFolderPicker(true); }}
          style={[styles.uploadBtn, { backgroundColor: Colors.gold, opacity: uploading ? 0.7 : 1 }]}
          disabled={uploading}
        >
          {uploading ? <ActivityIndicator size="small" color="#000" /> : <Ionicons name="cloud-upload-outline" size={18} color="#000" />}
        </Pressable>
      </View>

      {/* Upload Drop Zone */}
      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowFolderPicker(true); }}
        style={[styles.dropZone, { backgroundColor: isDark ? Colors.card : Colors.lightCard, borderColor: uploading ? Colors.gold : borderColor }]}
      >
        <LinearGradient colors={[Colors.gold + "11", "transparent"]} style={StyleSheet.absoluteFill} />
        <Ionicons name="cloud-upload-outline" size={32} color={Colors.gold} />
        <Text style={[styles.dropZoneText, { color: textColor }]}>Arraste arquivos aqui ou toque para selecionar</Text>
        <Text style={[styles.dropZoneSub, { color: textSec }]}>PDF, DOCX, TXT, imagens e mais · Máx. 50MB</Text>
        <View style={{ flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {[".pdf", ".docx", ".txt", ".png", ".jpg", ".mp3"].map(ext => (
            <View key={ext} style={[styles.extBadge, { backgroundColor: isDark ? Colors.cardElevated : "#E5E5EA" }]}>
              <Text style={[styles.extBadgeText, { color: textSec }]}>{ext}</Text>
            </View>
          ))}
        </View>
      </Pressable>

      {/* Folder Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 50, marginVertical: 8 }}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {FOLDERS.map(f => (
          <Pressable key={f.key} onPress={() => setFolderFilter(f.key)}
            style={[styles.folderChip, { borderColor: folderFilter === f.key ? f.color : borderColor, backgroundColor: folderFilter === f.key ? f.color + "22" : "transparent" }]}>
            <Ionicons name={f.icon as any} size={13} color={folderFilter === f.key ? f.color : textSec} />
            <Text style={[styles.folderChipText, { color: folderFilter === f.key ? f.color : textSec }]}>{f.key}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Files List */}
      {isLoading ? (
        <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />
      ) : filteredFiles.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="cloud-outline" size={48} color={textSec} />
          <Text style={[styles.emptyText, { color: textSec }]}>
            {folderFilter === "Todos" ? "Nenhum arquivo ainda" : `Nenhum arquivo em "${folderFilter}"`}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: botPad + 80 }}>
          {filteredFiles.map((file, i) => {
            const { icon, color } = getFileIcon(file.ext);
            const folderInfo = FOLDERS.find(f => f.key === (file.folder || "Geral")) || FOLDERS[0];
            return (
              <Animated.View key={file.id} entering={FadeInDown.delay(i * 40)} style={[styles.fileCard, { backgroundColor: cardBg, borderColor }]}>
                <View style={[styles.fileIconBox, { backgroundColor: color + "22" }]}>
                  <Ionicons name={(icon + "-outline") as any} size={22} color={color} />
                </View>
                <View style={styles.fileInfo}>
                  <Text style={[styles.fileName, { color: textColor }]} numberOfLines={1}>{file.original_name}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3 }}>
                    <Text style={[styles.fileMeta, { color: textSec }]}>{formatSize(file.size)} · {formatDate(file.uploaded_at)}</Text>
                    <View style={[styles.folderTag, { backgroundColor: folderInfo.color + "22" }]}>
                      <Ionicons name={folderInfo.icon as any} size={10} color={folderInfo.color} />
                      <Text style={[styles.folderTagText, { color: folderInfo.color }]}>{file.folder || "Geral"}</Text>
                    </View>
                  </View>
                </View>
                <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); deleteMutation.mutate(file.id); }} style={styles.deleteBtn} hitSlop={8}>
                  <Ionicons name="trash-outline" size={16} color="#F87171" />
                </Pressable>
              </Animated.View>
            );
          })}
        </ScrollView>
      )}

      {/* Folder Picker Modal */}
      {showFolderPicker && (
        <View style={styles.folderPickerOverlay}>
          <View style={[styles.folderPickerModal, { backgroundColor: isDark ? Colors.card : "#fff" }]}>
            <Text style={[styles.folderPickerTitle, { color: textColor }]}>Pasta destino</Text>
            <Text style={[styles.folderPickerSub, { color: textSec }]}>Escolha onde este arquivo será armazenado</Text>
            <View style={{ gap: 8, marginVertical: 12 }}>
              {FOLDERS.filter(f => f.key !== "Todos").map(f => (
                <Pressable
                  key={f.key}
                  onPress={() => { setSelectedFolder(f.key as Folder); }}
                  style={[styles.folderPickerOption, { backgroundColor: selectedFolder === f.key ? f.color + "22" : (isDark ? Colors.cardElevated : "#F5F5F7"), borderColor: selectedFolder === f.key ? f.color : borderColor }]}
                >
                  <View style={[styles.folderPickerIcon, { backgroundColor: f.color + "22" }]}>
                    <Ionicons name={f.icon as any} size={18} color={f.color} />
                  </View>
                  <Text style={[styles.folderPickerOptionText, { color: selectedFolder === f.key ? f.color : textColor }]}>{f.key}</Text>
                  {selectedFolder === f.key && <Ionicons name="checkmark-circle" size={20} color={f.color} style={{ marginLeft: "auto" as any }} />}
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable onPress={() => setShowFolderPicker(false)} style={[styles.modalCancelBtn, { borderColor }]}>
                <Text style={[styles.modalCancelText, { color: textSec }]}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={async () => { setShowFolderPicker(false); await pickAndUpload(); }}
                style={[styles.modalConfirmBtn, { backgroundColor: Colors.gold }]}
              >
                <Text style={styles.modalConfirmText}>Selecionar Arquivo</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontFamily: "Outfit_800ExtraBold", fontSize: 26 },
  subtitle: { fontFamily: "Outfit_400Regular", fontSize: 13, marginTop: 2 },
  uploadBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  dropZone: { marginHorizontal: 16, marginTop: 12, borderRadius: 14, borderWidth: 2, borderStyle: "dashed", padding: 24, alignItems: "center", overflow: "hidden" },
  dropZoneText: { fontFamily: "Outfit_600SemiBold", fontSize: 15, marginTop: 10, textAlign: "center" },
  dropZoneSub: { fontFamily: "Outfit_400Regular", fontSize: 12, marginTop: 4, textAlign: "center" },
  extBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  extBadgeText: { fontFamily: "Outfit_400Regular", fontSize: 11 },
  folderChip: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5 },
  folderChipText: { fontFamily: "Outfit_600SemiBold", fontSize: 12 },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontFamily: "Outfit_600SemiBold", fontSize: 16 },
  fileCard: { flexDirection: "row", alignItems: "center", borderRadius: 12, padding: 12, borderWidth: 1, marginBottom: 8 },
  fileIconBox: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  fileInfo: { flex: 1, marginLeft: 12 },
  fileName: { fontFamily: "Outfit_600SemiBold", fontSize: 14 },
  fileMeta: { fontFamily: "Outfit_400Regular", fontSize: 11 },
  folderTag: { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  folderTagText: { fontFamily: "Outfit_500Medium", fontSize: 10 },
  deleteBtn: { padding: 4 },
  folderPickerOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  folderPickerModal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  folderPickerTitle: { fontFamily: "Outfit_700Bold", fontSize: 18, marginBottom: 4 },
  folderPickerSub: { fontFamily: "Outfit_400Regular", fontSize: 13 },
  folderPickerOption: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, padding: 12, borderWidth: 1 },
  folderPickerIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  folderPickerOptionText: { fontFamily: "Outfit_600SemiBold", fontSize: 14, flex: 1 },
  modalCancelBtn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  modalCancelText: { fontFamily: "Outfit_600SemiBold", fontSize: 14 },
  modalConfirmBtn: { flex: 2, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  modalConfirmText: { color: "#000", fontFamily: "Outfit_700Bold", fontSize: 14 },
});
