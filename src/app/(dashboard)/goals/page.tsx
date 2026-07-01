"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, Badge, Skeleton, Progress } from "@/components/ui/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import type { Goal } from "@/types";

const PRESET_GOALS = [
  { title: "Sleep 8 hours", emoji: "😴", category: "SLEEP", targetValue: 8, unit: "hours/night", color: "#7c3aed" },
  { title: "Drink 8 glasses of water", emoji: "💧", category: "HYDRATION", targetValue: 8, unit: "glasses/day", color: "#0ea5e9" },
  { title: "Exercise 4× per week", emoji: "🏃", category: "EXERCISE", targetValue: 4, unit: "days/week", color: "#16a34a" },
  { title: "Journal daily", emoji: "📔", category: "JOURNALING", targetValue: 30, unit: "days streak", color: "#db2777" },
  { title: "Meditate 10 minutes", emoji: "🧘", category: "MINDFULNESS", targetValue: 10, unit: "min/day", color: "#6366f1" },
  { title: "Walk 10,000 steps", emoji: "🚶", category: "EXERCISE", targetValue: 10000, unit: "steps/day", color: "#14b8a6" },
];

const CATEGORY_COLORS: Record<string, string> = {
  SLEEP: "#7c3aed", HYDRATION: "#0ea5e9", EXERCISE: "#16a34a",
  JOURNALING: "#db2777", MINDFULNESS: "#6366f1", SOCIAL: "#d97706",
  NUTRITION: "#ea580c", CUSTOM: "#6b7280",
};

export default function GoalsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", emoji: "🎯", targetValue: 1, unit: "", category: "CUSTOM" as const });

  const { data, isLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: async () => {
      const r = await fetch("/api/goals");
      return r.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async (payload: object) => {
      const r = await fetch("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      toast({ title: "Goal created!", type: "success" });
      setShowAdd(false);
      setForm({ title: "", emoji: "🎯", targetValue: 1, unit: "", category: "CUSTOM" });
    },
    onError: () => toast({ title: "Failed to create goal", type: "error" }),
  });

  const goals: Goal[] = data?.data || [];
  const activeGoals = goals.filter((g) => !g.isCompleted);
  const completedGoals = goals.filter((g) => g.isCompleted);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Wellness goals</h1>
          <p className="text-muted-foreground text-sm mt-1">Define and track what matters to you</p>
        </div>
        <Button onClick={() => setShowAdd((v) => !v)}>{showAdd ? "Cancel" : "+ New goal"}</Button>
      </div>

      {showAdd && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-5 space-y-4">
            <p className="text-sm font-semibold">Create a goal</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Presets</p>
                <div className="space-y-1">
                  {PRESET_GOALS.map((p) => (
                    <button key={p.title} onClick={() => setForm({ title: p.title, emoji: p.emoji, targetValue: p.targetValue, unit: p.unit, category: p.category as "CUSTOM" })}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg border text-xs hover:bg-muted/50 flex items-center gap-2 transition-colors">
                      {p.emoji} {p.title}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Goal title</p>
                  <div className="flex gap-2">
                    <Input placeholder="😊" value={form.emoji} onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))} className="w-14 text-center" maxLength={2} />
                    <Input placeholder="Goal title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="flex-1" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">Target</p>
                    <Input type="number" min="1" value={form.targetValue} onChange={(e) => setForm((f) => ({ ...f, targetValue: Number(e.target.value) }))} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">Unit</p>
                    <Input placeholder="hours, days…" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
                  </div>
                </div>
                <Button onClick={() => addMutation.mutate(form)} disabled={!form.title.trim()} isLoading={addMutation.isPending} className="w-full">
                  Create goal
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : goals.length === 0 ? (
        <Card>
          <CardContent className="text-center py-14">
            <p className="text-4xl mb-3">🎯</p>
            <p className="text-sm font-medium mb-1">No goals yet</p>
            <p className="text-xs text-muted-foreground mb-4">Set your first wellness goal to start making progress</p>
            <Button onClick={() => setShowAdd(true)}>Set a goal</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {activeGoals.length > 0 && (
            <div className="space-y-3">
              {activeGoals.map((goal) => {
                const pct = Math.round(Math.min((goal.currentValue / goal.targetValue) * 100, 100));
                const color = CATEGORY_COLORS[goal.category] || "#6366f1";
                return (
                  <Card key={goal.id}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start gap-3 mb-3">
                        <span className="text-2xl mt-0.5">{goal.emoji || "🎯"}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold">{goal.title}</p>
                            <span className="text-sm font-bold" style={{ color }}>{pct}%</span>
                          </div>
                          {goal.description && <p className="text-xs text-muted-foreground mt-0.5">{goal.description}</p>}
                        </div>
                      </div>
                      <Progress value={pct} indicatorClassName={pct === 100 ? "bg-green-500" : ""} className="h-2" style={{ "--indicator-color": color } as React.CSSProperties} />
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs text-muted-foreground">{goal.currentValue} / {goal.targetValue} {goal.unit}</span>
                        <Badge variant="outline" className="text-[10px]">{goal.category.toLowerCase()}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          {completedGoals.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-2">Completed 🎉</p>
              <div className="space-y-2">
                {completedGoals.map((goal) => (
                  <div key={goal.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/40 opacity-70">
                    <span>{goal.emoji || "🎯"}</span>
                    <p className="text-sm line-through text-muted-foreground">{goal.title}</p>
                    <Badge variant="success" className="ml-auto text-[10px]">Done</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
