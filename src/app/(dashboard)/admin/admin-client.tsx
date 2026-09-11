"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import { Download, ChevronLeft, ChevronRight } from "lucide-react";

const MOOD_COLORS: Record<string, string> = {
  HAPPY: "#1baf7a", GOOD: "#2a78d6", NEUTRAL: "#888780",
  SAD: "#eda100", DEPRESSED: "#e34948", ANGRY: "#d85a30",
  ANXIOUS: "#ba7517", EXHAUSTED: "#534ab7",
};

type RoleFilter = "all" | "USER" | "ADMIN";
type CrisisStatus = "all" | "open" | "resolved";
type CrisisSeverity = "all" | "high" | "medium" | "low";

export function AdminDashboardClient({ adminName }: { adminName: string }) {
  const queryClient = useQueryClient();

  // ─── Users state ──────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [userPage, setUserPage] = useState(1);

  // ─── Crisis state ─────────────────────────────────────────────────
  const [crisisStatus, setCrisisStatus] = useState<CrisisStatus>("open");
  const [crisisSeverity, setCrisisSeverity] = useState<CrisisSeverity>("all");
  const [crisisPage, setCrisisPage] = useState(1);
  const [resolutionNote, setResolutionNote] = useState<Record<string, string>>({});
  const [showNoteFor, setShowNoteFor] = useState<string | null>(null);

  // ─── Queries ──────────────────────────────────────────────────────
  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => (await fetch("/api/admin/stats")).json(),
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
      const r = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("Failed to update role");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
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
    },
  });

  const trainMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/ml", { method: "POST" });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Training failed");
      return json;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-ml"] }),
  });

  // ─── Derived data ─────────────────────────────────────────────────
  const kpis = stats.data?.data?.kpis;
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

  // ─── Export handlers ──────────────────────────────────────────────
  const exportUsers = () => {
    const rows = usersQuery.data?.data || [];
    const csv = [
      ["ID", "Name", "Email", "Role", "Joined", "Mood Logs", "Journals", "Goals", "Crisis Flags"].join(","),
      ...rows.map((u: {
        id: string; name: string | null; email: string; role: string; createdAt: string;
        _count: { moodLogs: number; journalEntries: number; goals: number; crisisFlags: number };
      }) =>
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Platform health, safety flags, and the trained wellness model — signed in as {adminName}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label="Users" value={kpis?.users ?? "—"} />
        <Kpi label="Mood logs" value={kpis?.moodLogs ?? "—"} />
        <Kpi label="Journal entries" value={kpis?.journals ?? "—"} />
        <Kpi label="Open crisis flags" value={kpis?.openCrisis ?? "—"} alert={(kpis?.openCrisis ?? 0) > 0} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Signups — last 30 days</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={signups} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Mood mix (30d)</CardTitle></CardHeader>
          <CardContent>
            {moodDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No mood data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={moodDistribution} dataKey="value" nameKey="name" innerRadius={42} outerRadius={70}>
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

      {/* ML Model */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Wellness ML model</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Regularized Logistic Regression with TF-IDF, 5-Fold Stratified Cross-Validation &amp; Statistical Anomaly Detection
            </p>
          </div>
          <Button size="sm" onClick={() => trainMutation.mutate()} disabled={trainMutation.isPending}>
            {trainMutation.isPending ? "Training…" : "Retrain"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant={mlInfo?.loaded ? "success" : "warning"}>
              {mlInfo?.loaded ? "Model loaded" : mlInfo?.status || "Offline"}
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
            <Kpi label="Test accuracy" value={pct(metrics.accuracy)} />
            <Kpi label="Test macro F1" value={pct(metrics.macro_f1)} />
            <Kpi label="5-fold CV F1" value={metrics.cv_mean_macro_f1 != null ? pct(metrics.cv_mean_macro_f1) : "—"} />
            <Kpi label="Samples" value={metrics.n_total != null ? `${metrics.n_total} (${metrics.n_test} test)` : "—"} />
          </div>

          {metrics.per_class && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Per-Class Performance</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border">
                      <th className="py-2 pr-3 font-medium">Class</th>
                      <th className="py-2 pr-3 font-medium">Precision</th>
                      <th className="py-2 pr-3 font-medium">Recall</th>
                      <th className="py-2 pr-3 font-medium">F1-Score</th>
                      <th className="py-2 font-medium">Test Support</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(metrics.per_class).map(([label, row]) => (
                      <tr key={label} className="border-b border-border/50">
                        <td className="py-2 pr-3 capitalize font-medium">{label}</td>
                        <td className="py-2 pr-3">{pct(row.precision)}</td>
                        <td className="py-2 pr-3">{pct(row.recall)}</td>
                        <td className="py-2 pr-3 font-medium">{pct(row.f1)}</td>
                        <td className="py-2 text-muted-foreground">{row.support ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {metrics.confusion_matrix && metrics.classes && (
            <div className="space-y-1.5 pt-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Confusion Matrix (Holdout Test)</p>
              <div className="overflow-x-auto">
                <table className="text-xs text-center border-collapse">
                  <thead>
                    <tr>
                      <th className="p-1.5 text-left text-muted-foreground font-medium">Actual \ Pred</th>
                      {metrics.classes.map((cls) => (
                        <th key={cls} className="p-1.5 capitalize font-medium text-foreground min-w-16">{cls}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.classes.map((actualCls, rIdx) => (
                      <tr key={actualCls} className="border-t border-border/50">
                        <td className="p-1.5 text-left font-medium capitalize text-muted-foreground">{actualCls}</td>
                        {metrics.confusion_matrix![rIdx]?.map((val, cIdx) => (
                          <td
                            key={cIdx}
                            className={`p-1.5 font-mono ${rIdx === cIdx
                              ? "bg-primary/15 font-semibold text-primary"
                              : val > 0
                              ? "bg-destructive/15 text-destructive font-medium"
                              : "text-muted-foreground/60"
                            }`}
                          >
                            {val}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {mlInfo?.error && <p className="text-sm text-destructive">{mlInfo.error}</p>}
          {trainMutation.isError && (
            <p className="text-sm text-destructive">{(trainMutation.error as Error).message}</p>
          )}
        </CardContent>
      </Card>

      {/* Users & Crisis side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ─── Users ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Users</CardTitle>
              <Button size="xs" variant="outline" onClick={exportUsers} title="Export CSV">
                <Download className="size-3.5 mr-1" />CSV
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              <Input
                placeholder="Search name or email"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setUserPage(1); }}
              />
              <div className="flex gap-1">
                {(["all", "USER", "ADMIN"] as RoleFilter[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => { setRoleFilter(r); setUserPage(1); }}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${roleFilter === r
                      ? "bg-primary text-primary-foreground"
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
            {usersQuery.isLoading && <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>}
            {(usersQuery.data?.data || []).map((u: {
              id: string; name: string | null; email: string; role: string;
              createdAt: string; _count: { moodLogs: number; journalEntries: number; goals: number; crisisFlags: number };
            }) => (
              <div key={u.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.name || "Unnamed"}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {u._count.moodLogs} moods · {u._count.journalEntries} journals · {u._count.goals} goals
                    {u._count.crisisFlags > 0 && (
                      <span className="ml-1 text-destructive font-medium">· {u._count.crisisFlags} crisis</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground/60">Joined {format(new Date(u.createdAt), "MMM d, yyyy")}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <Badge variant={u.role === "ADMIN" ? "wellness" : "secondary"}>{u.role}</Badge>
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={roleMutation.isPending}
                    onClick={() => roleMutation.mutate({ userId: u.id, role: u.role === "ADMIN" ? "USER" : "ADMIN" })}
                  >
                    {u.role === "ADMIN" ? "Demote" : "Promote"}
                  </Button>
                </div>
              </div>
            ))}

            {/* Pagination */}
            {usersMeta && usersMeta.pages > 1 && (
              <div className="flex items-center justify-between pt-2">
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

        {/* ─── Crisis Flags ───────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Crisis flags</CardTitle>
            <div className="mt-3 space-y-2">
              {/* Status filter */}
              <div className="flex gap-1">
                {(["open", "all", "resolved"] as CrisisStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => { setCrisisStatus(s); setCrisisPage(1); }}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${crisisStatus === s
                      ? s === "open" ? "bg-destructive text-destructive-foreground"
                        : s === "resolved" ? "bg-emerald-600 text-white"
                        : "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {s} {s === "all" && crisisMeta ? `(${crisisMeta.total})` : ""}
                  </button>
                ))}
              </div>
              {/* Severity filter */}
              <div className="flex gap-1">
                {(["all", "high", "medium", "low"] as CrisisSeverity[]).map((sv) => (
                  <button
                    key={sv}
                    onClick={() => { setCrisisSeverity(sv); setCrisisPage(1); }}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors capitalize ${crisisSeverity === sv
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
          <CardContent className="space-y-2">
            {crisisQuery.isLoading && <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>}
            {!crisisQuery.isLoading && (crisisQuery.data?.data || []).length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">No crisis flags for this filter</p>
            )}
            {(crisisQuery.data?.data || []).map((flag: {
              id: string; severity: string; triggerWords: string[]; resolvedAt: string | null;
              resolutionNote: string | null; createdAt: string;
              user: { name: string | null; email: string };
            }) => (
              <div key={flag.id} className="py-2 border-b border-border last:border-0 space-y-1.5">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{flag.user.name || flag.user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(flag.createdAt), "MMM d, HH:mm")}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge
                        variant={flag.severity === "high" ? "destructive" : flag.severity === "medium" ? "warning" : "secondary"}
                        className="text-xs"
                      >
                        {flag.severity}
                      </Badge>
                      {flag.triggerWords.slice(0, 3).map((w) => (
                        <span key={w} className="text-xs bg-muted px-1.5 py-0.5 rounded">{w}</span>
                      ))}
                    </div>
                    {flag.resolutionNote && (
                      <p className="text-xs text-muted-foreground mt-1 italic">"{flag.resolutionNote}"</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Badge variant={flag.resolvedAt ? "success" : "destructive"}>
                      {flag.resolvedAt ? "Resolved" : "Open"}
                    </Badge>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => setShowNoteFor(showNoteFor === flag.id ? null : flag.id)}
                    >
                      {flag.resolvedAt ? "Reopen" : "Resolve"}
                    </Button>
                  </div>
                </div>

                {/* Resolution note inline form */}
                {showNoteFor === flag.id && (
                  <div className="flex gap-2 pt-1">
                    <Input
                      className="text-xs h-7"
                      placeholder={flag.resolvedAt ? "Reason to reopen…" : "Resolution note (optional)…"}
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
                    >
                      Confirm
                    </Button>
                  </div>
                )}
              </div>
            ))}

            {/* Pagination */}
            {crisisMeta && crisisMeta.pages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground">
                  Page {crisisPage} of {crisisMeta.pages} · {crisisMeta.total} total
                </p>
                <div className="flex gap-1">
                  <Button size="xs" variant="outline" disabled={crisisPage <= 1} onClick={() => setCrisisPage((p) => p - 1)}>
                    <ChevronLeft className="size-3.5" />
                  </Button>
                  <Button size="xs" variant="outline" disabled={crisisPage >= crisisMeta.pages} onClick={() => setCrisisPage((p) => p + 1)}>
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value, alert }: { label: string; value: string | number; alert?: boolean }) {
  return (
    <div className={`rounded-xl p-4 border ${alert ? "border-destructive/40 bg-destructive/10" : "border-border bg-card"}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tracking-tight mt-1">{value}</p>
    </div>
  );
}

function pct(n?: number) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${Math.round(n * 1000) / 10}%`;
}
