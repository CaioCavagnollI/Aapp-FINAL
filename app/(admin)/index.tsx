import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
  ActivityIndicator, Alert, TextInput, Modal, FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useAdmin } from "@/contexts/AdminContext";
import { getApiUrl } from "@/lib/query-client";
import Colors from "@/constants/colors";

const SECTIONS = ["Visão Geral","Analytics","Colaboradores","Workspaces","Tenants","Billing","Configurações"];

interface Metrics {
  total_users: number; paid_users: number;
  total_sessions: number; total_scans: number; total_prescriptions: number;
  new_users_7d: number; plan_distribution: { plan: string; count: string }[];
  estimated_monthly_revenue: number; growth_30d: { day: string; count: string }[];
  workspaces: number; tenants: number;
}

interface AdminUser {
  id: string; username: string; email?: string; plan: string; is_admin: boolean;
  workspace_id?: string; tenant_id?: string; created_at: string;
}

interface Workspace {
  id: string; name: string; description?: string; owner_name?: string;
  plan: string; max_users: number; is_active: boolean; created_at: string;
}

interface Tenant {
  id: string; name: string; domain?: string; plan: string;
  max_workspaces: number; max_users: number; is_active: boolean;
  billing_email?: string; created_at: string;
}

const PLAN_LABELS: Record<string, string> = {
  free: "Free", pro_monthly: "Pro Mensal", pro_annual: "Pro Anual",
  pro_plus_monthly: "Pro+ Mensal", pro_plus_annual: "Pro+ Anual",
  university_monthly: "University Mensal", university_annual: "University Anual",
  vitalicio: "Vitalício",
};
const PLAN_COLORS: Record<string, string> = {
  free: "#6B6B75", pro_monthly: "#3B82F6", pro_annual: "#2563EB",
  pro_plus_monthly: "#8B5CF6", pro_plus_annual: "#7C3AED",
  university_monthly: "#D4AF37", university_annual: "#A8892B",
  vitalicio: "#F59E0B",
};

function StatCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <Animated.View entering={FadeInDown.springify()} style={styles.statCard}>
      <LinearGradient colors={[color + "22", color + "08"]} style={styles.statGrad}>
        <View style={[styles.statIcon, { backgroundColor: color + "22" }]}>
          <Ionicons name={icon as any} size={22} color={color} />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
        {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
      </LinearGradient>
    </Animated.View>
  );
}

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} style={styles.sectionAction}>
          <Text style={styles.sectionActionText}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const color = PLAN_COLORS[plan] || "#6B6B75";
  const label = PLAN_LABELS[plan] || plan;
  return (
    <View style={[styles.planBadge, { backgroundColor: color + "22", borderColor: color + "44" }]}>
      <Text style={[styles.planBadgeText, { color }]}>{label}</Text>
    </View>
  );
}

function GrowthBar({ data }: { data: { day: string; count: string }[] }) {
  if (!data || data.length === 0) return <Text style={styles.empty}>Sem dados de crescimento</Text>;
  const max = Math.max(...data.map(d => parseInt(d.count)), 1);
  const last7 = data.slice(-7);
  return (
    <View style={styles.growthChart}>
      {last7.map((d, i) => {
        const h = Math.max(4, (parseInt(d.count) / max) * 60);
        const date = new Date(d.day);
        return (
          <View key={i} style={styles.barCol}>
            <View style={[styles.bar, { height: h, backgroundColor: Colors.gold }]} />
            <Text style={styles.barLabel}>{date.getDate()}/{date.getMonth() + 1}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function AdminPanelScreen() {
  const insets = useSafeAreaInsets();
  const { token, logout } = useAdmin();
  const qc = useQueryClient();
  const [activeSection, setActiveSection] = useState(0);
  const baseUrl = getApiUrl();
  const headers = { "x-admin-token": token || "", "Content-Type": "application/json" };

  // Modals
  const [showNewWorkspace, setShowNewWorkspace] = useState(false);
  const [showNewTenant, setShowNewTenant] = useState(false);
  const [wsName, setWsName] = useState(""); const [wsDesc, setWsDesc] = useState("");
  const [tenantName, setTenantName] = useState(""); const [tenantDomain, setTenantDomain] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [newPlan, setNewPlan] = useState("");
  const [showPlanModal, setShowPlanModal] = useState(false);

  const { data: metrics, isLoading: mLoading, refetch: refetchMetrics } = useQuery<Metrics>({
    queryKey: ["admin-metrics"],
    queryFn: async () => {
      const r = await fetch(`${baseUrl}api/admin/metrics`, { headers });
      if (!r.ok) throw new Error("Falha");
      return r.json();
    },
    staleTime: 30000,
  });

  const { data: usersData, isLoading: uLoading, refetch: refetchUsers } = useQuery<{ users: AdminUser[] }>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const r = await fetch(`${baseUrl}api/admin/users`, { headers });
      if (!r.ok) throw new Error("Falha");
      return r.json();
    },
    staleTime: 10000,
  });

  const { data: wsData, isLoading: wsLoading, refetch: refetchWs } = useQuery<{ workspaces: Workspace[] }>({
    queryKey: ["admin-workspaces"],
    queryFn: async () => {
      const r = await fetch(`${baseUrl}api/admin/workspaces`, { headers });
      if (!r.ok) throw new Error("Falha");
      return r.json();
    },
    staleTime: 10000,
  });

  const { data: tenantsData, isLoading: tLoading, refetch: refetchTenants } = useQuery<{ tenants: Tenant[] }>({
    queryKey: ["admin-tenants"],
    queryFn: async () => {
      const r = await fetch(`${baseUrl}api/admin/tenants`, { headers });
      if (!r.ok) throw new Error("Falha");
      return r.json();
    },
    staleTime: 10000,
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, plan }: { id: string; plan: string }) => {
      const r = await fetch(`${baseUrl}api/admin/users/${id}/plan`, {
        method: "PUT", headers, body: JSON.stringify({ plan }),
      });
      if (!r.ok) throw new Error("Falha");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-metrics"] });
      setShowPlanModal(false);
      setSelectedUser(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`${baseUrl}api/admin/users/${id}`, { method: "DELETE", headers });
      if (!r.ok) throw new Error("Falha");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); qc.invalidateQueries({ queryKey: ["admin-metrics"] }); },
  });

  const createWsMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${baseUrl}api/admin/workspaces`, {
        method: "POST", headers, body: JSON.stringify({ name: wsName, description: wsDesc }),
      });
      if (!r.ok) throw new Error("Falha");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-workspaces"] }); setShowNewWorkspace(false); setWsName(""); setWsDesc(""); },
  });

  const deleteWsMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`${baseUrl}api/admin/workspaces/${id}`, { method: "DELETE", headers });
      if (!r.ok) throw new Error("Falha");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-workspaces"] }),
  });

  const createTenantMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${baseUrl}api/admin/tenants`, {
        method: "POST", headers,
        body: JSON.stringify({ name: tenantName, domain: tenantDomain, billing_email: tenantEmail }),
      });
      if (!r.ok) throw new Error("Falha");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-tenants"] }); setShowNewTenant(false); setTenantName(""); setTenantDomain(""); setTenantEmail(""); },
  });

  const deleteTenantMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`${baseUrl}api/admin/tenants/${id}`, { method: "DELETE", headers });
      if (!r.ok) throw new Error("Falha");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-tenants"] }),
  });

  const handleDeleteUser = useCallback((user: AdminUser) => {
    if (user.is_admin) { Alert.alert("Erro", "Não é possível excluir o admin"); return; }
    Alert.alert("Excluir usuário", `Excluir ${user.username}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => deleteUserMutation.mutate(user.id) },
    ]);
  }, []);

  const handleChangePlan = useCallback((user: AdminUser) => {
    setSelectedUser(user); setNewPlan(user.plan); setShowPlanModal(true);
  }, []);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  function renderOverview() {
    if (mLoading) return <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />;
    const m = metrics!;
    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.statsGrid}>
          <StatCard icon="people" label="Usuários" value={m.total_users} sub={`+${m.new_users_7d} esta semana`} color={Colors.gold} />
          <StatCard icon="cash" label="Receita Est." value={`R$ ${m.estimated_monthly_revenue.toFixed(0)}/mês`} color="#22C55E" />
          <StatCard icon="grid" label="Workspaces" value={m.workspaces} color="#3B82F6" />
          <StatCard icon="business" label="Tenants" value={m.tenants} color="#8B5CF6" />
          <StatCard icon="barbell" label="Sessões" value={m.total_sessions} color="#F59E0B" />
          <StatCard icon="document-text" label="Prescrições" value={m.total_prescriptions} color="#EC4899" />
        </View>

        <SectionHeader title="Distribuição de Planos" />
        <View style={styles.planDist}>
          {m.plan_distribution.map((p, i) => (
            <View key={i} style={styles.planRow}>
              <View style={[styles.planDot, { backgroundColor: PLAN_COLORS[p.plan] || "#6B6B75" }]} />
              <Text style={styles.planRowLabel}>{PLAN_LABELS[p.plan] || p.plan}</Text>
              <Text style={styles.planRowCount}>{p.count} usuários</Text>
            </View>
          ))}
        </View>

        <SectionHeader title="Métricas Operacionais" />
        <View style={styles.opMetrics}>
          <View style={styles.opRow}><Ionicons name="scan-outline" size={16} color={Colors.gold} /><Text style={styles.opLabel}>Total de Scans</Text><Text style={styles.opValue}>{m.total_scans}</Text></View>
          <View style={styles.opRow}><Ionicons name="people-outline" size={16} color={Colors.gold} /><Text style={styles.opLabel}>Usuários pagos</Text><Text style={styles.opValue}>{m.paid_users}</Text></View>
          <View style={styles.opRow}><Ionicons name="person-add-outline" size={16} color={Colors.gold} /><Text style={styles.opLabel}>Novos (7 dias)</Text><Text style={styles.opValue}>{m.new_users_7d}</Text></View>
        </View>
      </ScrollView>
    );
  }

  function renderAnalytics() {
    if (mLoading) return <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />;
    const m = metrics!;
    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <SectionHeader title="Crescimento de Usuários (30 dias)" />
        <View style={styles.card}><GrowthBar data={m.growth_30d} /></View>

        <SectionHeader title="Receita por Plano" />
        <View style={styles.card}>
          {m.plan_distribution.map((p, i) => {
            const prices: Record<string, number> = { pro_monthly: 19, pro_annual: 15.9, pro_plus_monthly: 59.90, pro_plus_annual: 49.2, university_monthly: 99.90, university_annual: 74.9, vitalicio: 0, free: 0 };
            const revenue = (prices[p.plan] || 0) * parseInt(p.count);
            const maxRev = Math.max(...m.plan_distribution.map(x => (prices[x.plan] || 0) * parseInt(x.count)), 1);
            const width = revenue / maxRev;
            const color = PLAN_COLORS[p.plan] || "#6B6B75";
            return (
              <View key={i} style={styles.revenueRow}>
                <Text style={styles.revPlan}>{PLAN_LABELS[p.plan] || p.plan}</Text>
                <View style={styles.revBarBg}><View style={[styles.revBar, { width: `${width * 100}%`, backgroundColor: color }]} /></View>
                <Text style={styles.revValue}>R$ {revenue.toFixed(0)}</Text>
              </View>
            );
          })}
        </View>

        <SectionHeader title="Resumo de Engajamento" />
        <View style={styles.engGrid}>
          <View style={styles.engCard}><Text style={styles.engValue}>{m.total_sessions}</Text><Text style={styles.engLabel}>Sessões totais</Text></View>
          <View style={styles.engCard}><Text style={styles.engValue}>{m.total_scans}</Text><Text style={styles.engLabel}>Scans realizados</Text></View>
          <View style={styles.engCard}><Text style={styles.engValue}>{m.total_prescriptions}</Text><Text style={styles.engLabel}>Prescrições IA</Text></View>
          <View style={styles.engCard}><Text style={styles.engValue}>{m.paid_users}</Text><Text style={styles.engLabel}>Usuários pagos</Text></View>
        </View>
      </ScrollView>
    );
  }

  function renderColaboradores() {
    const users = usersData?.users || [];
    return (
      <View style={{ flex: 1 }}>
        {uLoading ? <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} /> : (
          <FlatList
            data={users}
            keyExtractor={u => u.id}
            ListHeaderComponent={<SectionHeader title={`Usuários (${users.length})`} />}
            renderItem={({ item: u }) => (
              <Animated.View entering={FadeInDown.springify()} style={styles.userCard}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userInitial}>{(u.username[0] || "?").toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{u.username}</Text>
                  {u.email ? <Text style={styles.userMeta}>{u.email}</Text> : null}
                  <Text style={styles.userMeta}>{new Date(u.created_at).toLocaleDateString("pt-BR")}</Text>
                  <PlanBadge plan={u.plan} />
                </View>
                <View style={styles.userActions}>
                  <Pressable style={styles.userBtn} onPress={() => handleChangePlan(u)}>
                    <Ionicons name="swap-horizontal-outline" size={16} color={Colors.gold} />
                  </Pressable>
                  {!u.is_admin && (
                    <Pressable style={[styles.userBtn, { marginTop: 6 }]} onPress={() => handleDeleteUser(u)}>
                      <Ionicons name="trash-outline" size={16} color="#F87171" />
                    </Pressable>
                  )}
                </View>
              </Animated.View>
            )}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    );
  }

  function renderWorkspaces() {
    const ws = wsData?.workspaces || [];
    return (
      <View style={{ flex: 1 }}>
        {wsLoading ? <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} /> : (
          <FlatList
            data={ws}
            keyExtractor={w => w.id}
            ListHeaderComponent={
              <SectionHeader title={`Workspaces (${ws.length})`} action="+ Novo" onAction={() => setShowNewWorkspace(true)} />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="grid-outline" size={48} color="#333" />
                <Text style={styles.emptyText}>Nenhum workspace</Text>
                <Text style={styles.emptySub}>Crie espaços de trabalho para equipes</Text>
              </View>
            }
            renderItem={({ item: w }) => (
              <Animated.View entering={FadeInDown.springify()} style={styles.wsCard}>
                <View style={styles.wsIcon}><Ionicons name="grid-outline" size={22} color={Colors.gold} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.wsName}>{w.name}</Text>
                  {w.description ? <Text style={styles.wsMeta}>{w.description}</Text> : null}
                  <Text style={styles.wsMeta}>Dono: {w.owner_name || "—"} · Máx {w.max_users} usuários</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <PlanBadge plan={w.plan} />
                    <View style={[styles.activeDot, { backgroundColor: w.is_active ? "#22C55E" : "#F87171" }]} />
                    <Text style={styles.wsMeta}>{w.is_active ? "Ativo" : "Inativo"}</Text>
                  </View>
                </View>
                <Pressable onPress={() => Alert.alert("Excluir workspace?", w.name, [
                  { text: "Cancelar", style: "cancel" },
                  { text: "Excluir", style: "destructive", onPress: () => deleteWsMutation.mutate(w.id) },
                ])}>
                  <Ionicons name="trash-outline" size={18} color="#F87171" />
                </Pressable>
              </Animated.View>
            )}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    );
  }

  function renderTenants() {
    const tenants = tenantsData?.tenants || [];
    return (
      <View style={{ flex: 1 }}>
        {tLoading ? <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} /> : (
          <FlatList
            data={tenants}
            keyExtractor={t => t.id}
            ListHeaderComponent={
              <SectionHeader title={`Tenants (${tenants.length})`} action="+ Novo" onAction={() => setShowNewTenant(true)} />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="business-outline" size={48} color="#333" />
                <Text style={styles.emptyText}>Nenhum tenant</Text>
                <Text style={styles.emptySub}>Gerencie organizações multi-tenant</Text>
              </View>
            }
            renderItem={({ item: t }) => (
              <Animated.View entering={FadeInDown.springify()} style={styles.wsCard}>
                <View style={[styles.wsIcon, { backgroundColor: "#8B5CF622" }]}><Ionicons name="business-outline" size={22} color="#8B5CF6" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.wsName}>{t.name}</Text>
                  {t.domain ? <Text style={styles.wsMeta}>{t.domain}</Text> : null}
                  {t.billing_email ? <Text style={styles.wsMeta}>{t.billing_email}</Text> : null}
                  <Text style={styles.wsMeta}>Máx {t.max_workspaces} ws · {t.max_users} usuários</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <PlanBadge plan={t.plan} />
                    <View style={[styles.activeDot, { backgroundColor: t.is_active ? "#22C55E" : "#F87171" }]} />
                    <Text style={styles.wsMeta}>{t.is_active ? "Ativo" : "Inativo"}</Text>
                  </View>
                </View>
                <Pressable onPress={() => Alert.alert("Excluir tenant?", t.name, [
                  { text: "Cancelar", style: "cancel" },
                  { text: "Excluir", style: "destructive", onPress: () => deleteTenantMutation.mutate(t.id) },
                ])}>
                  <Ionicons name="trash-outline" size={18} color="#F87171" />
                </Pressable>
              </Animated.View>
            )}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    );
  }

  function renderBilling() {
    if (mLoading) return <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />;
    const m = metrics!;
    const prices: Record<string, number> = { pro_monthly: 19, pro_annual: 190.90, pro_plus_monthly: 59.90, pro_plus_annual: 590.90, university_monthly: 99.90, university_annual: 899.90, vitalicio: 997, free: 0 };
    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <SectionHeader title="Faturamento Centralizado" />
        <LinearGradient colors={["#D4AF3722","#D4AF3708"]} style={styles.billingHero}>
          <Text style={styles.billingLabel}>Receita Mensal Estimada</Text>
          <Text style={styles.billingValue}>R$ {m.estimated_monthly_revenue.toFixed(2)}</Text>
          <Text style={styles.billingSub}>{m.paid_users} assinantes ativos</Text>
        </LinearGradient>

        <SectionHeader title="Receita por Plano" />
        {m.plan_distribution.filter(p => p.plan !== "free").map((p, i) => {
          const monthly = (prices[p.plan] || 0) * parseInt(p.count);
          return (
            <View key={i} style={styles.billingRow}>
              <View style={[styles.planDot, { backgroundColor: PLAN_COLORS[p.plan] || "#6B6B75" }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.billingPlan}>{PLAN_LABELS[p.plan] || p.plan}</Text>
                <Text style={styles.billingCount}>{p.count} assinantes × R$ {prices[p.plan] || 0}</Text>
              </View>
              <Text style={styles.billingAmount}>R$ {monthly.toFixed(0)}</Text>
            </View>
          );
        })}

        <SectionHeader title="Informações de Pagamento" />
        <View style={styles.card}>
          <View style={styles.infoRow}><Ionicons name="card-outline" size={16} color={Colors.gold} /><Text style={styles.infoLabel}>Gateway</Text><Text style={styles.infoValue}>Stripe + Pix</Text></View>
          <View style={styles.infoRow}><Ionicons name="globe-outline" size={16} color={Colors.gold} /><Text style={styles.infoLabel}>Domínio</Text><Text style={styles.infoValue}>acmenexusfit.casa</Text></View>
          <View style={styles.infoRow}><Ionicons name="shield-checkmark-outline" size={16} color={Colors.gold} /><Text style={styles.infoLabel}>Segurança</Text><Text style={styles.infoValue}>JWT + HMAC</Text></View>
          <View style={styles.infoRow}><Ionicons name="time-outline" size={16} color={Colors.gold} /><Text style={styles.infoLabel}>Ciclo</Text><Text style={styles.infoValue}>Mensal / Anual</Text></View>
        </View>
      </ScrollView>
    );
  }

  function renderSettings() {
    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <SectionHeader title="Configurações do Sistema" />
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <Ionicons name="server-outline" size={18} color={Colors.gold} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.settingLabel}>Versão da Plataforma</Text>
              <Text style={styles.settingValue}>Nexus Atlas v1.0.0</Text>
            </View>
          </View>
          <View style={styles.settingRow}>
            <Ionicons name="globe-outline" size={18} color={Colors.gold} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.settingLabel}>Domínio</Text>
              <Text style={styles.settingValue}>acmenexusfit.casa</Text>
            </View>
          </View>
          <View style={styles.settingRow}>
            <Ionicons name="key-outline" size={18} color={Colors.gold} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.settingLabel}>Credenciais Admin</Text>
              <Text style={styles.settingValue}>admin@nexus221177</Text>
            </View>
          </View>
          <View style={styles.settingRow}>
            <Ionicons name="flask-outline" size={18} color={Colors.gold} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.settingLabel}>IA Principal</Text>
              <Text style={styles.settingValue}>GPT-4 Streaming via OpenAI</Text>
            </View>
          </View>
          <View style={styles.settingRow}>
            <Ionicons name="library-outline" size={18} color={Colors.gold} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.settingLabel}>Research APIs</Text>
              <Text style={styles.settingValue}>PubMed · CrossRef · OpenAlex</Text>
            </View>
          </View>
        </View>

        <SectionHeader title="Ações do Sistema" />
        <View style={styles.card}>
          <Pressable style={styles.actionBtn} onPress={() => { refetchMetrics(); refetchUsers(); refetchWs(); refetchTenants(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
            <Ionicons name="refresh-outline" size={18} color={Colors.gold} />
            <Text style={styles.actionBtnText}>Sincronizar Dados</Text>
          </Pressable>
          <Pressable style={[styles.actionBtn, { marginTop: 8 }]} onPress={() => { Alert.alert("Sair do painel admin?", undefined, [{ text: "Cancelar", style: "cancel" }, { text: "Sair", style: "destructive", onPress: () => { logout(); router.replace("/"); } }]); }}>
            <Ionicons name="log-out-outline" size={18} color="#F87171" />
            <Text style={[styles.actionBtnText, { color: "#F87171" }]}>Sair do Painel</Text>
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      {/* Header */}
      <LinearGradient colors={["#0B0B0C", "#111113"]} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Painel Admin</Text>
            <Text style={styles.headerSub}>Nexus Atlas — Gestão Organizacional</Text>
          </View>
          <LinearGradient colors={[Colors.gold, Colors.goldDark]} style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#000" />
            <Text style={styles.adminBadgeText}>ADMIN</Text>
          </LinearGradient>
        </View>

        {/* Section Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
          {SECTIONS.map((s, i) => (
            <Pressable
              key={i}
              style={[styles.tab, activeSection === i && styles.tabActive]}
              onPress={() => { setActiveSection(i); Haptics.selectionAsync(); }}
            >
              <Text style={[styles.tabText, activeSection === i && styles.tabTextActive]}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </LinearGradient>

      {/* Content */}
      <View style={styles.content}>
        {activeSection === 0 && renderOverview()}
        {activeSection === 1 && renderAnalytics()}
        {activeSection === 2 && renderColaboradores()}
        {activeSection === 3 && renderWorkspaces()}
        {activeSection === 4 && renderTenants()}
        {activeSection === 5 && renderBilling()}
        {activeSection === 6 && renderSettings()}
      </View>

      {/* Plan Change Modal */}
      <Modal visible={showPlanModal} transparent animationType="slide" onRequestClose={() => setShowPlanModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowPlanModal(false)} />
        <View style={[styles.modal, { paddingBottom: insets.bottom + 20 }]}>
          <Text style={styles.modalTitle}>Alterar Plano</Text>
          <Text style={styles.modalSub}>{selectedUser?.username}</Text>
          <ScrollView style={{ maxHeight: 320 }}>
            {["free","pro_monthly","pro_annual","pro_plus_monthly","pro_plus_annual","university_monthly","university_annual","vitalicio"].map(p => (
              <Pressable key={p} style={[styles.planOption, newPlan === p && styles.planOptionActive]} onPress={() => setNewPlan(p)}>
                <View style={[styles.planDot, { backgroundColor: PLAN_COLORS[p] || "#6B6B75" }]} />
                <Text style={[styles.planOptionText, newPlan === p && { color: Colors.gold }]}>{PLAN_LABELS[p]}</Text>
                {newPlan === p && <Ionicons name="checkmark-circle" size={18} color={Colors.gold} />}
              </Pressable>
            ))}
          </ScrollView>
          <Pressable
            style={styles.modalBtn}
            onPress={() => { if (selectedUser && newPlan) updatePlanMutation.mutate({ id: selectedUser.id, plan: newPlan }); }}
          >
            {updatePlanMutation.isPending ? <ActivityIndicator color="#000" /> : <Text style={styles.modalBtnText}>Confirmar</Text>}
          </Pressable>
        </View>
      </Modal>

      {/* New Workspace Modal */}
      <Modal visible={showNewWorkspace} transparent animationType="slide" onRequestClose={() => setShowNewWorkspace(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowNewWorkspace(false)} />
        <View style={[styles.modal, { paddingBottom: insets.bottom + 20 }]}>
          <Text style={styles.modalTitle}>Novo Workspace</Text>
          <TextInput style={styles.input} value={wsName} onChangeText={setWsName} placeholder="Nome do workspace" placeholderTextColor="#6B6B75" />
          <TextInput style={[styles.input, { marginTop: 8 }]} value={wsDesc} onChangeText={setWsDesc} placeholder="Descrição (opcional)" placeholderTextColor="#6B6B75" />
          <Pressable style={styles.modalBtn} onPress={() => createWsMutation.mutate()}>
            {createWsMutation.isPending ? <ActivityIndicator color="#000" /> : <Text style={styles.modalBtnText}>Criar Workspace</Text>}
          </Pressable>
        </View>
      </Modal>

      {/* New Tenant Modal */}
      <Modal visible={showNewTenant} transparent animationType="slide" onRequestClose={() => setShowNewTenant(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowNewTenant(false)} />
        <View style={[styles.modal, { paddingBottom: insets.bottom + 20 }]}>
          <Text style={styles.modalTitle}>Novo Tenant</Text>
          <TextInput style={styles.input} value={tenantName} onChangeText={setTenantName} placeholder="Nome da organização" placeholderTextColor="#6B6B75" />
          <TextInput style={[styles.input, { marginTop: 8 }]} value={tenantDomain} onChangeText={setTenantDomain} placeholder="Domínio (ex: empresa.com)" placeholderTextColor="#6B6B75" autoCapitalize="none" />
          <TextInput style={[styles.input, { marginTop: 8 }]} value={tenantEmail} onChangeText={setTenantEmail} placeholder="E-mail de faturamento" placeholderTextColor="#6B6B75" keyboardType="email-address" autoCapitalize="none" />
          <Pressable style={styles.modalBtn} onPress={() => createTenantMutation.mutate()}>
            {createTenantMutation.isPending ? <ActivityIndicator color="#000" /> : <Text style={styles.modalBtnText}>Criar Tenant</Text>}
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B0B0C" },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  headerTitle: { fontFamily: "Outfit_700Bold", fontSize: 22, color: "#FFF" },
  headerSub: { fontFamily: "Outfit_400Regular", fontSize: 12, color: "#6B6B75", marginTop: 2 },
  adminBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  adminBadgeText: { fontFamily: "Outfit_700Bold", fontSize: 11, color: "#000" },
  tabs: { marginHorizontal: -20, paddingLeft: 20 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: "#111113", borderWidth: 1, borderColor: "#232327" },
  tabActive: { backgroundColor: Colors.gold + "22", borderColor: Colors.gold },
  tabText: { fontFamily: "Outfit_500Medium", fontSize: 13, color: "#6B6B75" },
  tabTextActive: { color: Colors.gold },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  statCard: { width: "47%", borderRadius: 14, overflow: "hidden" },
  statGrad: { padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#232327" },
  statIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  statValue: { fontFamily: "Outfit_700Bold", fontSize: 22, color: "#FFF" },
  statLabel: { fontFamily: "Outfit_400Regular", fontSize: 12, color: "#A1A1AA", marginTop: 2 },
  statSub: { fontFamily: "Outfit_400Regular", fontSize: 11, color: "#6B6B75", marginTop: 2 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 20, marginBottom: 10 },
  sectionTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 15, color: "#FFF" },
  sectionAction: { backgroundColor: Colors.gold + "22", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14 },
  sectionActionText: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.gold },
  planDist: { backgroundColor: "#111113", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#232327" },
  planRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  planDot: { width: 10, height: 10, borderRadius: 5 },
  planRowLabel: { fontFamily: "Outfit_400Regular", fontSize: 13, color: "#A1A1AA", flex: 1 },
  planRowCount: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: "#FFF" },
  opMetrics: { backgroundColor: "#111113", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#232327" },
  opRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#1A1A1E" },
  opLabel: { fontFamily: "Outfit_400Regular", fontSize: 13, color: "#A1A1AA", flex: 1 },
  opValue: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: "#FFF" },
  growthChart: { flexDirection: "row", alignItems: "flex-end", gap: 6, height: 80, justifyContent: "center" },
  barCol: { alignItems: "center", gap: 4 },
  bar: { width: 28, borderRadius: 4 },
  barLabel: { fontFamily: "Outfit_400Regular", fontSize: 9, color: "#6B6B75" },
  card: { backgroundColor: "#111113", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#232327", marginBottom: 8 },
  revenueRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  revPlan: { fontFamily: "Outfit_400Regular", fontSize: 12, color: "#A1A1AA", width: 90 },
  revBarBg: { flex: 1, height: 8, backgroundColor: "#232327", borderRadius: 4, overflow: "hidden" },
  revBar: { height: 8, borderRadius: 4 },
  revValue: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: "#FFF", width: 60, textAlign: "right" },
  engGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  engCard: { width: "47%", backgroundColor: "#111113", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#232327", alignItems: "center" },
  engValue: { fontFamily: "Outfit_700Bold", fontSize: 26, color: Colors.gold },
  engLabel: { fontFamily: "Outfit_400Regular", fontSize: 12, color: "#A1A1AA", marginTop: 4, textAlign: "center" },
  userCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: "#111113", borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#232327" },
  userAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.gold + "22", alignItems: "center", justifyContent: "center" },
  userInitial: { fontFamily: "Outfit_700Bold", fontSize: 16, color: Colors.gold },
  userName: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: "#FFF" },
  userMeta: { fontFamily: "Outfit_400Regular", fontSize: 12, color: "#6B6B75", marginTop: 2 },
  userActions: { alignItems: "center" },
  userBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#18181A", alignItems: "center", justifyContent: "center" },
  planBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1, marginTop: 4 },
  planBadgeText: { fontFamily: "Outfit_600SemiBold", fontSize: 10 },
  wsCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: "#111113", borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#232327" },
  wsIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.gold + "22", alignItems: "center", justifyContent: "center" },
  wsName: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: "#FFF" },
  wsMeta: { fontFamily: "Outfit_400Regular", fontSize: 12, color: "#6B6B75", marginTop: 2 },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyText: { fontFamily: "Outfit_600SemiBold", fontSize: 16, color: "#A1A1AA" },
  emptySub: { fontFamily: "Outfit_400Regular", fontSize: 13, color: "#6B6B75" },
  billingHero: { borderRadius: 16, padding: 24, borderWidth: 1, borderColor: Colors.gold + "33", alignItems: "center", marginBottom: 8 },
  billingLabel: { fontFamily: "Outfit_400Regular", fontSize: 13, color: "#A1A1AA" },
  billingValue: { fontFamily: "Outfit_700Bold", fontSize: 36, color: Colors.gold, marginTop: 6 },
  billingSub: { fontFamily: "Outfit_400Regular", fontSize: 13, color: "#6B6B75", marginTop: 4 },
  billingRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#111113", borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "#232327" },
  billingPlan: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: "#FFF" },
  billingCount: { fontFamily: "Outfit_400Regular", fontSize: 12, color: "#6B6B75", marginTop: 2 },
  billingAmount: { fontFamily: "Outfit_700Bold", fontSize: 16, color: Colors.gold },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#1A1A1E" },
  infoLabel: { fontFamily: "Outfit_400Regular", fontSize: 13, color: "#A1A1AA", flex: 1, marginLeft: 6 },
  infoValue: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: "#FFF" },
  settingRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#1A1A1E" },
  settingLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: "#FFF" },
  settingValue: { fontFamily: "Outfit_400Regular", fontSize: 13, color: "#A1A1AA", marginTop: 2 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#18181A", borderRadius: 12, padding: 14 },
  actionBtnText: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.gold },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "#00000080" },
  modal: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#111113", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontFamily: "Outfit_700Bold", fontSize: 18, color: "#FFF", marginBottom: 4 },
  modalSub: { fontFamily: "Outfit_400Regular", fontSize: 13, color: "#A1A1AA", marginBottom: 16 },
  planOption: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, marginBottom: 6, borderWidth: 1, borderColor: "#232327" },
  planOptionActive: { borderColor: Colors.gold, backgroundColor: Colors.gold + "11" },
  planOptionText: { fontFamily: "Outfit_500Medium", fontSize: 14, color: "#A1A1AA", flex: 1 },
  modalBtn: { backgroundColor: Colors.gold, borderRadius: 14, padding: 16, alignItems: "center", marginTop: 16 },
  modalBtnText: { fontFamily: "Outfit_700Bold", fontSize: 15, color: "#000" },
  input: { backgroundColor: "#18181A", borderRadius: 12, padding: 14, fontFamily: "Outfit_400Regular", fontSize: 14, color: "#FFF", borderWidth: 1, borderColor: "#232327" },
  empty: { fontFamily: "Outfit_400Regular", fontSize: 13, color: "#6B6B75", textAlign: "center", marginTop: 20 },
});
