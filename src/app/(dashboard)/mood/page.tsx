"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MOOD_CONFIG } from "@/lib/utils";
import type { MoodType } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, Badge, Skeleton } from "@/components/ui/index";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/index";
import { useToast } from "@/components/ui/toaster";

const MOODS = Object.entries(MOOD_CONFIG) as [MoodType, typeof MOOD_CONFIG[MoodType]][];
const ALL_TAGS = ["work", "family", "health", "social", "sleep", "exercise", "nature", "food", "travel", "creativity"];

export default function MoodPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedMood, setSelectedMood] = useState<MoodType>("GOOD");
  const [intensity, setIntensity] = useState(7);
  const [notes, setNotes] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { data: logsData, isLoading } = useQuery({
    queryKey: ["moodLogs"],
    queryFn: async () => {
      const r = await fetch("/api/mood?limit=20&days=30");
      return r.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async (payload: object) => {
      const r = await fetch("/api/mood", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error("Failed to log mood");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["moodLogs"] });
      toast({ title: "Mood logged!", type: "success" });
      setNotes("");
      setSelectedTags([]);
    },
    onError: () => toast({ title: "Failed to log mood", type: "error" }),
  });

  const logs = logsData?.data || [];
  const cfg = MOOD_CONFIG[selectedMood];

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mood tracker</h1>
        <p className="text-muted-foreground text-sm mt-1">How are you feeling right now?</p>
      </div>

      <Card>
        <CardContent className="pt-5 space-y-5">
          {/* Mood picker */}
          <div>
            <p className="text-sm font-medium mb-3">Select your mood</p>
            <div className="grid grid-cols-4 gap-2">
              {MOODS.map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setSelectedMood(key)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all hover:scale-105 ${
                    selectedMood === key
                      ? "border-primary bg-primary/5"
                      : "border-transparent bg-muted/40 hover:bg-muted/60"
                  }`}
                >
                  <span className="text-2xl">{cfg.emoji}</span>
                  <span className="text-xs font-medium">{cfg.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Intensity */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Intensity</p>
              <span className="text-sm font-bold text-primary">{intensity}/10</span>
            </div>
            <input
              type="range" min="1" max="10" value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              className="w-full accent-primary h-2 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Very mild</span><span>Moderate</span><span>Intense</span>
            </div>
          </div>

          {/* Tags */}
          <div>
            <p className="text-sm font-medium mb-2">What's this about?</p>
            <div className="flex flex-wrap gap-2">
              {ALL_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    selectedTags.includes(tag)
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "bg-muted/40 text-muted-foreground border-transparent hover:border-border"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-sm font-medium mb-2">Notes (optional)</p>
            <Textarea
              placeholder="What's on your mind? Any context for this mood..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <Button
            className="w-full"
            onClick={() => mutation.mutate({ mood: selectedMood, intensity, notes, tags: selectedTags })}
            isLoading={mutation.isPending}
          >
            <span className="mr-1">{cfg.emoji}</span> Log {cfg.label} mood
          </Button>
        </CardContent>
      </Card>

      {/* Recent logs */}
      <div>
        <h2 className="text-base font-semibold mb-3">Recent logs</h2>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : logs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-10 text-muted-foreground">
              <p className="text-3xl mb-2">😊</p>
              <p className="text-sm">No mood logs yet. Log your first mood above!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {logs.map((log: { id: string; mood: string; intensity: number; notes?: string; tags: string[]; loggedAt: string }) => {
              const c = MOOD_CONFIG[log.mood as MoodType];
              return (
                <div key={log.id} className="flex items-center gap-3 p-3.5 rounded-xl border bg-card hover:bg-muted/20 transition-colors">
                  <span className="text-2xl">{c?.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{c?.label}</span>
                      <Badge variant="outline" className="text-[10px]">{log.intensity}/10</Badge>
                      {log.tags.slice(0, 3).map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                      ))}
                    </div>
                    {log.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.notes}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(log.loggedAt), { addSuffix: true })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
