"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/index";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toaster";
import { useMemo, useState } from "react";
import {
  Download, ChevronLeft, ChevronRight, Activity, Server, ShieldAlert, Users,
  Megaphone, Cpu, RefreshCw, CheckCircle2, Clock, MessageSquare, AlertTriangle, Eye
} from "lucide-react";

const MOOD_COLORS: Record<string, string> = {
  HAPPY: "#1baf7a", GOOD: "#2a78d6", NEUTRAL: "#888780",
  SAD: "#eda100", DEPRESSED: "#e34948", ANGRY: "#d85a30",
  ANXIOUS: "#ba7517", EXHAUSTED: "#534ab7",
};

type RoleFilter = "all" | "USER" | "ADMIN";
type CrisisStatus = "all" | "open" | "resolved";
type CrisisSeverity = "all" | "high" | "medium" | "low";
type ActiveTab = "overview" | "users" | "safety" | "ml" | "broadcast";

interface UserItem {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
  _count: { moodLogs: number; journalEntries: number; goals: number; crisisFlags: number };
}

export function AdminDashboardClient({ adminName, adminId }: { adminName: string; adminId?: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");

  // ─── Users state ──────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [userPage, setUserPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // ─── Crisis state ─────────────────────────────────────────────────
  const [crisisStatus, setCrisisStatus] = useState<CrisisStatus>("open");
  const [crisisSeverity, setCrisisSeverity] = useState<CrisisSeverity>("all");
  const [crisisPage, setCrisisPage] = useState(1);
  const [resolutionNote, setResolutionNote] = useState<Record<string, string>>({});
  const [showNoteFor, setShowNoteFor] = useState<string | null>(null);

  // ─── Broadcast state ──────────────────────────────────────────────
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastType, setBroadcastType] = useState<"MOTIVATIONAL_QUOTE" | "MILESTONE" | "INSIGHT" | "DAILY_REMINDER">("MOTIVATIONAL_QUOTE");
  const [broadcastTarget, setBroadcastTarget] = useState<"ALL" | "USER" | "ADMIN">("ALL");

  // ─── Queries ──────────────────────────────────────────────────────
  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => (await fetch("/api/admin/stats")).json(),
  });

  const health = useQuery({
    queryKey: ["admin-health"],
    queryFn: async () => (await fetch("/api/admin/health")).json(),
    refetchInterval: 15000,
  });

  const usersQuery = useQuery({
    queryKey: ["admin-users", search, roleFilter, userPage],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(userPage), limit: "15" });
      if (search) params.set("search", search);
      if (roleFilter !== "all") params.set("role", roleFilter);
      return (await fetch(`/api/admin/users?${params}`)).json();
    },
  });

  const crisisQuery = useQuery({
    queryKey: ["admin-crisis", crisisStatus, crisisSeverity, crisisPage],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(crisisPage), limit: "15", status: crisisStatus, severity: crisisSeverity });
      return (await fetch(`/api/admin/crisis?${params}`)).json();
    },
  });

  const ml = useQuery({
    queryKey: ["admin-ml"],
    queryFn: async () => (await fetch("/api/admin/ml")).json(),
  });

  // ─── Mutations ────────────────────────────────────────────────────
  const roleMutation = useMutation({
    mutationFn: async (payload: { userId: string; role: "USER" | "ADMIN" }) => {
      if (adminId && payload.userId === adminId && payload.role !== "ADMIN") {
        throw new Error("You cannot demote your own admin account");
      }
      const r = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || "Failed to update role");
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast({ title: "User role updated", type: "success" });
    },
    onError: (err: Error) => {
      toast({ title: err.message || "Could not update role", type: "error" });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (payload: { id: string; resolved: boolean; resolutionNote?: string }) => {
      const r = await fetch("/api/admin/crisis", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("Failed to update flag");
      return r.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-crisis"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setShowNoteFor(null);
      setResolutionNote((prev) => { const n = { ...prev }; delete n[vars.id]; return n; });
      toast({ title: vars.resolved ? "Crisis flag resolved" : "Crisis flag reopened", type: "success" });
    },
  });

  const trainMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/ml", { method: "POST" });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Training failed");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ml"] });
      toast({ title: "ML model retrained successfully!", type: "success" });
    },
  });

  const broadcastMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: broadcastTitle,
          message: broadcastMessage,
          type: broadcastType,
          targetRole: broadcastTarget,
        }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Broadcast failed");
      return json;
    },
    onSuccess: (data) => {
      toast({
        title: `Broadcast sent to ${data.data.recipientsCount} users!`,
        type: "success",
      });
      setBroadcastTitle("");
      setBroadcastMessage("");
    },
    onError: (err: Error) => {
      toast({ title: err.message || "Failed to send broadcast", type: "error" });
    },
  });

  // ─── Derived data ─────────────────────────────────────────────────
  const kpis = stats.data?.data?.kpis;
  const safetyAnalytics = stats.data?.data?.safetyAnalytics;
  const healthData = health.data?.data?.services;

  const moodDistribution = useMemo(
    () =>
      Object.entries(stats.data?.data?.moodDistribution || {}).map(([name, value]) => ({
        name,
        value: value as number,
        color: MOOD_COLORS[name] || "#888",
      })),
    [stats.data]
  );

  const signups = (stats.data?.data?.signups || []).map((d: { date: string; count: number }) => ({
    ...d,
    date: format(new Date(d.date), "MMM d"),
  }));

  const mlInfo = ml.data?.data;
  const metrics = (mlInfo?.metrics || {}) as {
    accuracy?: number; macro_f1?: number; weighted_f1?: number;
    cv_mean_macro_f1?: number; cv_std_macro_f1?: number; cv_scores?: number[];
    best_params?: { C?: number; ngram_range?: number[]; min_df?: number };
    confusion_matrix?: number[][]; classes?: string[];
    n_train?: number; n_test?: number; n_total?: number;
    per_class?: Record<string, { precision?: number; recall?: number; f1?: number; support?: number }>;
  };

  const usersMeta = usersQuery.data?.meta as { total: number; pages: number } | undefined;
  const crisisMeta = crisisQuery.data?.meta as { total: number; pages: number } | undefined;

  const exportUsersCSV = () => {
    const rows = usersQuery.data?.data || [];
    const csv = [
      ["ID", "Name", "Email", "Role", "Joined", "Mood Logs", "Journals", "Goals", "Crisis Flags"].join(","),
      ...rows.map((u: UserItem) =>
        [u.id, `"${u.name || ""}"`, u.email, u.role, u.createdAt.split("T")[0],
          u._count.moodLogs, u._count.journalEntries, u._count.goals, u._count.crisisFlags].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `mindease-users-${new Date().toISOString().split("T")[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="size-6 text-emerald-600 dark:text-emerald-400" />
            Admin Command Center
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Platform health, safety moderation, system broadcasts &amp; ML analytics — signed in as <strong>{adminName}</strong>
          </p>
        </div>

        {/* Live System Health Pill Bar */}
        <div className="flex items-center gap-2.5 bg-card border border-border/80 rounded-2xl px-3.5 py-2 text-xs shadow-sm shrink-0">
          <div className="flex items-center gap-1.5">
            <Server className="size-3.5 text-blue-500" />
            <span>DB:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {healthData?.database?.latencyMs != null ? `${healthData.database.latencyMs}ms` : "OK"}
            </span>
          </div>
          <span className="text-muted-foreground/40">•</span>
          <div className="flex items-center gap-1.5">
            <Cpu className="size-3.5 text-purple-500" />
            <span>ML:</span>
            <Badge variant={healthData?.mlService?.status === "healthy" ? "success" : "warning"} className="text-[10px] py-0 px-1.5">
              {healthData?.mlService?.status || "Live"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-border/80 pb-2">
        <TabButton active={activeTab === "overview"} onClick={() => setActiveTab("overview")} icon={<Activity className="size-4" />}>
          Overview
        </TabButton>
        <TabButton active={activeTab === "users"} onClick={() => setActiveTab("users")} icon={<Users className="size-4" />}>
          User Management ({usersMeta?.total ?? kpis?.users ?? "—"})
        </TabButton>
        <TabButton active={activeTab === "safety"} onClick={() => setActiveTab("safety")} icon={<ShieldAlert className="size-4" />} alert={(kpis?.openCrisis ?? 0) > 0}>
          Safety &amp; Crisis ({kpis?.openCrisis ?? 0} Open)
        </TabButton>
        <TabButton active={activeTab === "ml"} onClick={() => setActiveTab("ml")} icon={<Cpu className="size-4" />}>
          Wellness ML Model
        </TabButton>
        <TabButton active={activeTab === "broadcast"} onClick={() => setActiveTab("broadcast")} icon={<Megaphone className="size-4" />}>
          Broadcast Announcement
        </TabButton>
      </div>

      {/* ─── TAB 1: OVERVIEW ────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Key KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Kpi label="Total Users" value={kpis?.users ?? "—"} icon={<Users className="size-4 text-blue-500" />} />
            <Kpi label="Mood Logs" value={kpis?.moodLogs ?? "—"} icon={<Activity className="size-4 text-emerald-500" />} />
            <Kpi label="Journal Entries" value={kpis?.journals ?? "—"} icon={<MessageSquare className="size-4 text-purple-500" />} />
            <Kpi label="Open Crisis Flags" value={kpis?.openCrisis ?? "—"} alert={(kpis?.openCrisis ?? 0) > 0} icon={<ShieldAlert className="size-4 text-destructive" />} />
          </div>

          {/* Secondary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Kpi label="Active Habits" value={kpis?.activeHabits ?? "—"} />
            <Kpi label="Chat Sessions" value={kpis?.chats ?? "—"} />
            <Kpi label="Avg Resolution Time" value={kpis?.avgResolutionHours != null ? `${kpis.avgResolutionHours}h` : "N/A"} />
            <Kpi label="Admin Users" value={kpis?.admins ?? "—"} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 rounded-2xl">
              <CardHeader><CardTitle className="text-base font-semibold">User Signups — Last 30 Days</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={signups} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                    <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader><CardTitle className="text-base font-semibold">Mood Mix (Last 30 Days)</CardTitle></CardHeader>
              <CardContent>
                {moodDistribution.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-10 text-center">No mood data recorded yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={moodDistribution} dataKey="value" nameKey="name" innerRadius={42} outerRadius={72}>
                        {moodDistribution.map((d) => (
                          <Cell key={d.name} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ─── TAB 2: USERS ──────────────────────────────────────────────── */}
      {activeTab === "users" && (
        <Card className="rounded-2xl border border-border/80">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold">Platform Users</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Search, inspect activity, promote, or demote platform accounts</p>
              </div>
              <Button size="xs" variant="outline" onClick={exportUsersCSV} className="rounded-xl self-start sm:self-auto">
                <Download className="size-3.5 mr-1" /> Export Users CSV
              </Button>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setUserPage(1); }}
                className="h-9 rounded-xl max-w-sm text-xs"
              />
              <div className="flex gap-1">
                {(["all", "USER", "ADMIN"] as RoleFilter[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => { setRoleFilter(r); setUserPage(1); }}
                    className={`px-3 py-1 rounded-xl text-xs font-medium transition-colors ${roleFilter === r
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {r === "all" ? `All (${usersMeta?.total ?? "—"})` : r}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {usersQuery.isLoading && <p className="text-sm text-muted-foreground py-6 text-center">Loading users…</p>}
            {(usersQuery.data?.data || []).map((u: UserItem) => {
              const isSelf = Boolean(adminId && u.id === adminId);
              return (
                <div key={u.id} className="flex items-start justify-between gap-3 py-3 border-b border-border/60 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{u.name || "Unnamed User"}</p>
                      <Badge variant={u.role === "ADMIN" ? "wellness" : "secondary"} className="text-[10px] px-1.5 py-0">
                        {u.role}
                      </Badge>
                      {isSelf && (
                        <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 px-1.5 py-0">
                          You
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {u._count.moodLogs} moods · {u._count.journalEntries} journals · {u._count.goals} goals
                      {u._count.crisisFlags > 0 && (
                        <span className="ml-1 text-destructive font-medium">· ⚠️ {u._count.crisisFlags} crisis flags</span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="xs" variant="ghost" onClick={() => setSelectedUser(u)} className="rounded-xl">
                      <Eye className="size-3.5 mr-1" /> Inspect
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={roleMutation.isPending || isSelf}
                      title={isSelf ? "You cannot demote yourself" : u.role === "ADMIN" ? "Demote to User" : "Promote to Admin"}
                      onClick={() => roleMutation.mutate({ userId: u.id, role: u.role === "ADMIN" ? "USER" : "ADMIN" })}
                      className="rounded-xl text-xs"
                    >
                      {u.role === "ADMIN" ? "Demote" : "Promote"}
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Pagination */}
            {usersMeta && usersMeta.pages > 1 && (
              <div className="flex items-center justify-between pt-3">
                <p className="text-xs text-muted-foreground">
                  Page {userPage} of {usersMeta.pages} · {usersMeta.total} total
                </p>
                <div className="flex gap-1">
                  <Button size="xs" variant="outline" disabled={userPage <= 1} onClick={() => setUserPage((p) => p - 1)}>
                    <ChevronLeft className="size-3.5" />
                  </Button>
                  <Button size="xs" variant="outline" disabled={userPage >= usersMeta.pages} onClick={() => setUserPage((p) => p + 1)}>
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── TAB 3: SAFETY & CRISIS AUDIT ──────────────────────────────── */}
      {activeTab === "safety" && (
        <div className="space-y-6">
          {/* Safety Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Kpi label="Open Safety Flags" value={kpis?.openCrisis ?? 0} alert={(kpis?.openCrisis ?? 0) > 0} icon={<ShieldAlert className="size-4 text-destructive" />} />
            <Kpi label="Resolved Flags" value={safetyAnalytics?.resolvedCount ?? 0} icon={<CheckCircle2 className="size-4 text-emerald-500" />} />
            <Kpi label="Avg Resolution Time" value={kpis?.avgResolutionHours != null ? `${kpis.avgResolutionHours} hours` : "N/A"} icon={<Clock className="size-4 text-blue-500" />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Crisis Table */}
            <Card className="lg:col-span-2 rounded-2xl border border-border/80">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Crisis Moderation Queue</CardTitle>
                <div className="mt-3 flex flex-wrap gap-2">
                  <div className="flex gap-1">
                    {(["open", "all", "resolved"] as CrisisStatus[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => { setCrisisStatus(s); setCrisisPage(1); }}
                        className={`px-3 py-1 rounded-xl text-xs font-medium transition-colors capitalize ${crisisStatus === s
                          ? s === "open" ? "bg-destructive text-destructive-foreground shadow-sm"
                            : s === "resolved" ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {s} {s === "all" && crisisMeta ? `(${crisisMeta.total})` : ""}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-1">
                    {(["all", "high", "medium", "low"] as CrisisSeverity[]).map((sv) => (
                      <button
                        key={sv}
                        onClick={() => { setCrisisSeverity(sv); setCrisisPage(1); }}
                        className={`px-2.5 py-0.5 rounded-xl text-xs font-medium transition-colors capitalize ${crisisSeverity === sv
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {sv}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {crisisQuery.isLoading && <p className="text-sm text-muted-foreground py-6 text-center">Loading crisis flags…</p>}
                {!crisisQuery.isLoading && (crisisQuery.data?.data || []).length === 0 && (
                  <p className="text-sm text-muted-foreground py-8 text-center">No crisis flags recorded for this filter</p>
                )}
                {(crisisQuery.data?.data || []).map((flag: {
                  id: string; severity: string; triggerWords: string[]; resolvedAt: string | null;
                  resolutionNote: string | null; createdAt: string;
                  user: { name: string | null; email: string };
                }) => (
                  <div key={flag.id} className="p-3 rounded-xl border border-border/70 bg-card space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{flag.user.name || flag.user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Logged {format(new Date(flag.createdAt), "MMM d, yyyy HH:mm")}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <Badge variant={flag.severity === "high" ? "destructive" : flag.severity === "medium" ? "warning" : "secondary"} className="text-xs">
                            {flag.severity} severity
                          </Badge>
                          {flag.triggerWords.map((w) => (
                            <span key={w} className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{w}</span>
                          ))}
                        </div>
                        {flag.resolutionNote && (
                          <p className="text-xs text-muted-foreground italic mt-1 bg-muted/30 p-2 rounded-lg">
                            &quot;{flag.resolutionNote}&quot;
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge variant={flag.resolvedAt ? "success" : "destructive"}>
                          {flag.resolvedAt ? "Resolved" : "Open"}
                        </Badge>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => setShowNoteFor(showNoteFor === flag.id ? null : flag.id)}
                          className="rounded-xl"
                        >
                          {flag.resolvedAt ? "Reopen" : "Resolve"}
                        </Button>
                      </div>
                    </div>

                    {/* Inline resolution note input */}
                    {showNoteFor === flag.id && (
                      <div className="flex gap-2 pt-2 border-t border-border/50">
                        <Input
                          className="text-xs h-8 rounded-xl"
                          placeholder={flag.resolvedAt ? "Reason to reopen flag…" : "Add resolution note (optional)…"}
                          value={resolutionNote[flag.id] || ""}
                          onChange={(e) => setResolutionNote((prev) => ({ ...prev, [flag.id]: e.target.value }))}
                        />
                        <Button
                          size="xs"
                          disabled={resolveMutation.isPending}
                          onClick={() =>
                            resolveMutation.mutate({
                              id: flag.id,
                              resolved: !flag.resolvedAt,
                              resolutionNote: resolutionNote[flag.id] || undefined,
                            })
                          }
                          className="rounded-xl shrink-0"
                        >
                          Confirm
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Top Trigger Words Analytics */}
            <Card className="rounded-2xl border border-border/80">
              <CardHeader><CardTitle className="text-base font-semibold">Top Trigger Words</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(safetyAnalytics?.topTriggerWords || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">No safety trigger words recorded yet</p>
                ) : (
                  (safetyAnalytics?.topTriggerWords || []).map((t: { word: string; count: number }) => (
                    <div key={t.word} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0 text-xs">
                      <span className="font-mono text-foreground font-medium">{t.word}</span>
                      <Badge variant="destructive" className="text-[10px]">{t.count} hits</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ─── TAB 4: WELLNESS ML MODEL ───────────────────────────────────── */}
      {activeTab === "ml" && (
        <Card className="rounded-2xl border border-border/80">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Wellness ML Model Engine</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Regularized Logistic Regression with TF-IDF, 5-Fold Stratified Cross-Validation &amp; Anomaly Detection
              </p>
            </div>
            <Button size="sm" onClick={() => trainMutation.mutate()} disabled={trainMutation.isPending} className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">
              {trainMutation.isPending ? "Training Model…" : "Retrain Model"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge variant={mlInfo?.loaded ? "success" : "warning"}>
                {mlInfo?.loaded ? "Model active" : mlInfo?.status || "Offline"}
              </Badge>
              {mlInfo?.algorithm && <Badge variant="wellness">{mlInfo.algorithm}</Badge>}
              {metrics.best_params && (
                <Badge variant="outline" className="text-xs">
                  C={metrics.best_params.C} · n-grams={metrics.best_params.ngram_range?.join("-")}
                </Badge>
              )}
              {mlInfo?.trainedAt && (
                <Badge variant="outline">Trained {format(new Date(mlInfo.trainedAt), "MMM d, yyyy HH:mm")}</Badge>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Kpi label="Test Accuracy" value={pct(metrics.accuracy)} />
              <Kpi label="Test Macro F1" value={pct(metrics.macro_f1)} />
              <Kpi label="5-Fold CV Mean F1" value={metrics.cv_mean_macro_f1 != null ? pct(metrics.cv_mean_macro_f1) : "—"} />
              <Kpi label="Dataset Size" value={metrics.n_total != null ? `${metrics.n_total} samples` : "—"} />
            </div>

            {metrics.per_class && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Per-Class Performance Metrics</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b border-border">
                        <th className="py-2 pr-3 font-medium">Class</th>
                        <th className="py-2 pr-3 font-medium">Precision</th>
                        <th className="py-2 pr-3 font-medium">Recall</th>
                        <th className="py-2 pr-3 font-medium">F1-Score</th>
                        <th className="py-2 font-medium">Support</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(metrics.per_class).map(([label, row]) => (
                        <tr key={label} className="border-b border-border/50">
                          <td className="py-2 pr-3 capitalize font-semibold">{label}</td>
                          <td className="py-2 pr-3">{pct(row.precision)}</td>
                          <td className="py-2 pr-3">{pct(row.recall)}</td>
                          <td className="py-2 pr-3 font-semibold text-emerald-600 dark:text-emerald-400">{pct(row.f1)}</td>
                          <td className="py-2 text-muted-foreground">{row.support ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── TAB 5: BROADCAST ANNOUNCEMENT ──────────────────────────────── */}
      {activeTab === "broadcast" && (
        <Card className="rounded-2xl border border-border/80">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Megaphone className="size-5 text-emerald-600 dark:text-emerald-400" />
              <CardTitle className="text-base font-semibold">Broadcast Platform Announcement</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">Send a system notification to all users or specific roles across MindEase</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Target Audience</Label>
              <select
                value={broadcastTarget}
                onChange={(e) => setBroadcastTarget(e.target.value as "ALL" | "USER" | "ADMIN")}
                className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="ALL">All Users &amp; Admins</option>
                <option value="USER">Standard Users Only</option>
                <option value="ADMIN">Admins Only</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-medium mb-1.5 block">Notification Category</Label>
              <select
                value={broadcastType}
                onChange={(e) => setBroadcastType(e.target.value as "MOTIVATIONAL_QUOTE" | "MILESTONE" | "INSIGHT" | "DAILY_REMINDER")}
                className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="MOTIVATIONAL_QUOTE">Motivational Quote / Wellness Message</option>
                <option value="INSIGHT">System Insight / Feature Update</option>
                <option value="MILESTONE">Platform Milestone</option>
                <option value="DAILY_REMINDER">Daily Wellness Reminder</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-medium mb-1.5 block">Announcement Title</Label>
              <Input
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="e.g. Weekly MindEase Wellness Tip 🌿"
                maxLength={120}
                className="h-10 rounded-xl text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-medium mb-1.5 block">Message Content</Label>
              <textarea
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Type your message here…"
                rows={4}
                maxLength={1000}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>

            <Button
              isLoading={broadcastMutation.isPending}
              onClick={() => broadcastMutation.mutate()}
              disabled={!broadcastTitle.trim() || !broadcastMessage.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs"
            >
              Send Broadcast Announcement
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ─── User Inspection Modal ─────────────────────────────────────── */}
      {selectedUser && (
        <Dialog open={Boolean(selectedUser)} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-md rounded-2xl p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">{selectedUser.name || "Unnamed User"}</DialogTitle>
              <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-muted/40 p-3 rounded-xl">
                <p className="text-muted-foreground">Role</p>
                <p className="font-semibold text-foreground mt-0.5">{selectedUser.role}</p>
              </div>
              <div className="bg-muted/40 p-3 rounded-xl">
                <p className="text-muted-foreground">Joined</p>
                <p className="font-semibold text-foreground mt-0.5">{format(new Date(selectedUser.createdAt), "MMM d, yyyy")}</p>
              </div>
              <div className="bg-muted/40 p-3 rounded-xl">
                <p className="text-muted-foreground">Mood Logs</p>
                <p className="font-semibold text-foreground mt-0.5">{selectedUser._count.moodLogs}</p>
              </div>
              <div className="bg-muted/40 p-3 rounded-xl">
                <p className="text-muted-foreground">Journal Entries</p>
                <p className="font-semibold text-foreground mt-0.5">{selectedUser._count.journalEntries}</p>
              </div>
              <div className="bg-muted/40 p-3 rounded-xl">
                <p className="text-muted-foreground">Active Goals</p>
                <p className="font-semibold text-foreground mt-0.5">{selectedUser._count.goals}</p>
              </div>
              <div className="bg-muted/40 p-3 rounded-xl">
                <p className="text-muted-foreground">Crisis Flags</p>
                <p className={`font-semibold mt-0.5 ${selectedUser._count.crisisFlags > 0 ? "text-destructive" : "text-foreground"}`}>
                  {selectedUser._count.crisisFlags}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedUser(null)} className="rounded-xl text-xs">
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  alert,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  alert?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
      } ${alert ? "border border-destructive/40" : ""}`}
    >
      {icon}
      {children}
    </button>
  );
}

function Kpi({ label, value, alert, icon }: { label: string; value: string | number; alert?: boolean; icon?: React.ReactNode }) {
  return (
    <div className={`rounded-2xl p-3.5 border transition-all ${alert ? "border-destructive/40 bg-destructive/10" : "border-border/80 bg-card"}`}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        {icon}
      </div>
      <p className="text-xl font-bold tracking-tight mt-1 text-foreground">{value}</p>
    </div>
  );
}

function pct(n?: number) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${Math.round(n * 1000) / 10}%`;
}
