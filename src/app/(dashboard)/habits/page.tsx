"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, Badge, Skeleton } from "@/components/ui/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import type { Habit } from "@/types";

const PRESET_HABITS = [
  { name: "Meditation", emoji: "🧘", color: "#6366f1" },
  { name: "Exercise", emoji: "🏃", color: "#14b8a6" },
  { name: "Reading", emoji: "📚", color: "#2563eb" },
  { name: "Water intake", emoji: "💧", color: "#0ea5e9" },
  { name: "Sleep by 10pm", emoji: "😴", color: "#7c3aed" },
  { name: "Gratitude", emoji: "🙏", color: "#d97706" },
  { name: "Walking", emoji: "🚶", color: "#16a34a" },
  { name: "Journaling", emoji: "✍️", color: "#db2777" },
];

export default function HabitsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("⭐");

  const { data, isLoading } = useQuery({
    queryKey: ["habits"],
    queryFn: async () => {
      const r = await fetch("/api/habits");
      return r.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async (payload: object) => {
      const r = await fetch("/api/habits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits"] });
      toast({ title: "Habit added!", type: "success" });
      setNewName(""); setNewEmoji("⭐"); setShowAdd(false);
    },
    onError: () => toast({ title: "Failed to add habit", type: "error" }),
  });

  const logMutation = useMutation({
    mutationFn: async (habitId: string) => {
      const r = await fetch(`/api/habits/${habitId}/log`, { method: "POST" });
      return r.json();
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["habits"] });
      if (res.data?.completed) toast({ title: "Habit completed! 🎉", type: "success" });
    },
  });

  const habits: Habit[] = data?.data || [];
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    return { key: format(d, "yyyy-MM-dd"), label: format(d, "EEE") };
  });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Habit tracker</h1>
          <p className="text-muted-foreground text-sm mt-1">Build consistency, one day at a time</p>
        </div>
        <Button onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? "Cancel" : "+ Add habit"}
        </Button>
      </div>

      {/* Add habit form */}
      {showAdd && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-5 space-y-4">
            <p className="text-sm font-semibold">Add a habit</p>
            <div className="flex gap-2">
              <Input placeholder="Emoji" value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} className="w-16 text-center text-lg" maxLength={2} />
              <Input placeholder="Habit name (e.g. Meditate 10 min)" value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Or pick a preset:</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_HABITS.map((p) => (
                  <button key={p.name} onClick={() => { setNewName(p.name); setNewEmoji(p.emoji); }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs hover:bg-muted/50 transition-colors">
                    {p.emoji} {p.name}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={() => addMutation.mutate({ name: newName, emoji: newEmoji })}
              disabled={!newName.trim()} isLoading={addMutation.isPending}>
              Add habit
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Habit list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : habits.length === 0 ? (
        <Card>
          <CardContent className="text-center py-14">
            <p className="text-4xl mb-3">🌱</p>
            <p className="text-sm font-medium mb-1">No habits yet</p>
            <p className="text-xs text-muted-foreground mb-4">Add your first habit to start building healthy routines</p>
            <Button onClick={() => setShowAdd(true)}>Add your first habit</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {habits.map((habit) => {
            const doneToday = habit.logs?.some((l) => format(new Date(l.completedAt), "yyyy-MM-dd") === todayStr);
            return (
              <Card key={habit.id} className="overflow-hidden">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                      style={{ background: `${habit.color}22` || "#6366f122" }}>
                      {habit.emoji || "⭐"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{habit.name}</p>
                        {habit.streakCount > 0 && (
                          <Badge variant="warning" className="text-[10px]">🔥 {habit.streakCount} day streak</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">Best: {habit.longestStreak} days</p>
                    </div>
                    <button
                      onClick={() => logMutation.mutate(habit.id)}
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm transition-all
                        ${doneToday
                          ? "bg-green-100 border-green-400 text-green-700 dark:bg-green-900/40 dark:border-green-600"
                          : "border-border hover:border-primary/50"
                        }`}
                    >
                      {doneToday && "✓"}
                    </button>
                  </div>

                  {/* 7-day mini heatmap */}
                  <div className="flex gap-1.5 items-center">
                    {last7Days.map(({ key, label }) => {
                      const done = habit.logs?.some((l) => format(new Date(l.completedAt), "yyyy-MM-dd") === key);
                      return (
                        <div key={key} className="flex flex-col items-center gap-1">
                          <div className={`w-6 h-6 rounded-md transition-colors ${done ? "bg-green-400 dark:bg-green-600" : "bg-muted"}`} title={key} />
                          <span className="text-[9px] text-muted-foreground">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
