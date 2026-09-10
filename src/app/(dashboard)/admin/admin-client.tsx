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

const MOOD_COLORS: Record<string, string> = {
  HAPPY: "#1baf7a", GOOD: "#2a78d6", NEUTRAL: "#888780",
  SAD: "#eda100", DEPRESSED: "#e34948", ANGRY: "#d85a30",
  ANXIOUS: "#ba7517", EXHAUSTED: "#534ab7",
};

export function AdminDashboardClient({ adminName }: { adminName: string }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => (await fetch("/api/admin/stats")).json(),
  });
  const users = useQuery({
    queryKey: ["admin-users", search],
    queryFn: async () => {
      const q = search ? `?search=${encodeURIComponent(search)}` : "";
      return (await fetch(`/api/admin/users${q}`)).json();
    },
  });
  const crisis = useQuery({
    queryKey: ["admin-crisis"],
    queryFn: async () => (await fetch("/api/admin/crisis")).json(),
  });
  const ml = useQuery({
    queryKey: ["admin-ml"],
    queryFn: async () => (await fetch("/api/admin/ml")).json(),
  });

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
    mutationFn: async (payload: { id: string; resolved: boolean }) => {
      const r = await fetch("/api/admin/crisis", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("Failed to update flag");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-crisis"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
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
    accuracy?: number;
    macro_f1?: number;
    n_train?: number;
    n_test?: number;
    per_class?: Record<string, { precision?: number; recall?: number; f1?: number }>;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Platform health, safety flags, and the trained wellness model — signed in as {adminName}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label="Users" value={kpis?.users ?? "—"} />
        <Kpi label="Mood logs" value={kpis?.moodLogs ?? "—"} />
        <Kpi label="Journal entries" value={kpis?.journals ?? "—"} />
        <Kpi label="Open crisis flags" value={kpis?.openCrisis ?? "—"} alert={(kpis?.openCrisis ?? 0) > 0} />
      </div>

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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Wellness ML model</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Logistic Regression with TF-IDF & Isolation Forest Anomaly Detection
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => trainMutation.mutate()}
            disabled={trainMutation.isPending}
          >
            {trainMutation.isPending ? "Training…" : "Retrain"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant={mlInfo?.loaded ? "success" : "warning"}>
              {mlInfo?.loaded ? "Model loaded" : mlInfo?.status || "Offline"}
            </Badge>
            {mlInfo?.algorithm && <Badge variant="wellness">{mlInfo.algorithm}</Badge>}
            {mlInfo?.trainedAt && (
              <Badge variant="outline">Trained {format(new Date(mlInfo.trainedAt), "MMM d, yyyy HH:mm")}</Badge>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Kpi label="Accuracy" value={pct(metrics.accuracy)} />
            <Kpi label="Macro F1" value={pct(metrics.macro_f1)} />
            <Kpi label="Train samples" value={metrics.n_train ?? "—"} />
            <Kpi label="Test samples" value={metrics.n_test ?? "—"} />
          </div>
          {metrics.per_class && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Class</th>
                    <th className="py-2 pr-3 font-medium">Precision</th>
                    <th className="py-2 pr-3 font-medium">Recall</th>
                    <th className="py-2 font-medium">F1</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(metrics.per_class).map(([label, row]) => (
                    <tr key={label} className="border-t border-border">
                      <td className="py-2 pr-3 capitalize">{label}</td>
                      <td className="py-2 pr-3">{pct(row.precision)}</td>
                      <td className="py-2 pr-3">{pct(row.recall)}</td>
                      <td className="py-2">{pct(row.f1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {mlInfo?.error && <p className="text-sm text-destructive">{mlInfo.error}</p>}
          {trainMutation.isError && (
            <p className="text-sm text-destructive">{(trainMutation.error as Error).message}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <Input
              className="mt-3"
              placeholder="Search name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </CardHeader>
          <CardContent className="space-y-2">
            {(users.data?.data || []).map((u: {
              id: string; name: string | null; email: string; role: string;
              createdAt: string; _count: { moodLogs: number; journalEntries: number; crisisFlags: number };
            }) => (
              <div key={u.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.name || "Unnamed"}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {u.email} · {u._count.moodLogs} moods · {u._count.journalEntries} journals
                  </p>
                </div>
                <Badge variant={u.role === "ADMIN" ? "wellness" : "secondary"}>{u.role}</Badge>
                <Button
                  size="xs"
                  variant="outline"
                  disabled={roleMutation.isPending}
                  onClick={() =>
                    roleMutation.mutate({
                      userId: u.id,
                      role: u.role === "ADMIN" ? "USER" : "ADMIN",
                    })
                  }
                >
                  {u.role === "ADMIN" ? "Demote" : "Promote"}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Crisis flags</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(crisis.data?.data || []).length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">No crisis flags recorded</p>
            )}
            {(crisis.data?.data || []).map((flag: {
              id: string; severity: string; triggerWords: string[]; resolvedAt: string | null;
              createdAt: string; user: { name: string | null; email: string };
            }) => (
              <div key={flag.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{flag.user.name || flag.user.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {flag.severity} · {flag.triggerWords.join(", ") || "no triggers"} · {format(new Date(flag.createdAt), "MMM d")}
                  </p>
                </div>
                <Badge variant={flag.resolvedAt ? "success" : "destructive"}>
                  {flag.resolvedAt ? "Resolved" : "Open"}
                </Badge>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => resolveMutation.mutate({ id: flag.id, resolved: !flag.resolvedAt })}
                >
                  {flag.resolvedAt ? "Reopen" : "Resolve"}
                </Button>
              </div>
            ))}
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
