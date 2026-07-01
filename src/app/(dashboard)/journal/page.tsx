"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MOOD_CONFIG } from "@/lib/utils";
import type { MoodType } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, Badge, Skeleton, Textarea, Label } from "@/components/ui/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import type { JournalEntry } from "@/types";

const JOURNAL_TAGS = ["mindfulness", "gratitude", "anxiety", "work", "family", "growth", "reflection", "morning", "evening", "stress", "joy", "health"];
const MOODS = Object.entries(MOOD_CONFIG) as [MoodType, typeof MOOD_CONFIG[MoodType]][];

export default function JournalPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [view, setView] = useState<"list" | "editor">("list");
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [moodSnapshot, setMoodSnapshot] = useState<MoodType | "">("");
  const [aiReflection, setAiReflection] = useState("");
  const [generatingReflection, setGeneratingReflection] = useState(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "">("");

  const { data, isLoading } = useQuery({
    queryKey: ["journal"],
    queryFn: async () => {
      const r = await fetch("/api/journal?limit=20");
      return r.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: object) => {
      const r = await fetch("/api/journal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: (res) => {
      setEditingEntry(res.data);
      qc.invalidateQueries({ queryKey: ["journal"] });
      setSaveStatus("saved");
    },
    onError: () => toast({ title: "Failed to save", type: "error" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: object }) => {
      const r = await fetch(`/api/journal/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: (res) => {
      setEditingEntry(res.data);
      if (res.data.aiReflection) setAiReflection(res.data.aiReflection);
      qc.invalidateQueries({ queryKey: ["journal"] });
      setSaveStatus("saved");
    },
  });

  const handleAutoSave = useCallback(() => {
    if (!title.trim() || !content.trim()) return;
    setSaveStatus("saving");
    clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      if (editingEntry) {
        updateMutation.mutate({ id: editingEntry.id, payload: { title, content, tags, moodSnapshot: moodSnapshot || undefined } });
      } else {
        createMutation.mutate({ title, content, tags, moodSnapshot: moodSnapshot || undefined });
      }
    }, 1500);
  }, [title, content, tags, moodSnapshot, editingEntry]);

  const handleNewEntry = () => {
    setEditingEntry(null);
    setTitle("");
    setContent("");
    setTags([]);
    setMoodSnapshot("");
    setAiReflection("");
    setView("editor");
  };

  const openEntry = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setTitle(entry.title);
    setContent(entry.content);
    setTags(entry.tags);
    setMoodSnapshot((entry.moodSnapshot as MoodType) || "");
    setAiReflection(entry.aiReflection || "");
    setView("editor");
  };

  const generateReflection = async () => {
    if (!content.trim()) return;
    setGeneratingReflection(true);
    try {
      const id = editingEntry?.id;
      if (!id) {
        // Save first
        const r = await fetch("/api/journal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: title || "Untitled", content, tags }) });
        const res = await r.json();
        setEditingEntry(res.data);
        const r2 = await fetch(`/api/journal/${res.data.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ generateReflection: true }) });
        const res2 = await r2.json();
        setAiReflection(res2.data?.aiReflection || "");
      } else {
        const r = await fetch(`/api/journal/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ generateReflection: true, content }) });
        const res = await r.json();
        setAiReflection(res.data?.aiReflection || "");
      }
      qc.invalidateQueries({ queryKey: ["journal"] });
    } catch {
      toast({ title: "Could not generate reflection", type: "error" });
    }
    setGeneratingReflection(false);
  };

  const toggleTag = (tag: string) => {
    const next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
    setTags(next);
  };

  const entries: JournalEntry[] = data?.data || [];

  if (view === "editor") {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setView("list")}>← Back</Button>
          <span className="text-xs text-muted-foreground ml-auto">{saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved ✓" : ""}</span>
        </div>

        <Card>
          <CardContent className="pt-5 space-y-4">
            <Input
              placeholder="Entry title…"
              value={title}
              onChange={(e) => { setTitle(e.target.value); handleAutoSave(); }}
              className="text-base font-medium border-0 border-b rounded-none px-0 focus-visible:ring-0 bg-transparent"
            />

            {/* Mood snapshot */}
            <div className="flex gap-2 flex-wrap">
              <p className="text-xs text-muted-foreground self-center mr-1">Mood:</p>
              {MOODS.map(([key, c]) => (
                <button key={key} onClick={() => setMoodSnapshot(key === moodSnapshot ? "" : key)}
                  className={`text-lg transition-all hover:scale-110 ${moodSnapshot === key ? "scale-110 opacity-100" : "opacity-50"}`}
                  title={c.label}>{c.emoji}</button>
              ))}
            </div>

            <Textarea
              placeholder="Write your thoughts, feelings, reflections…"
              value={content}
              onChange={(e) => { setContent(e.target.value); handleAutoSave(); }}
              rows={12}
              className="border-0 focus-visible:ring-0 bg-transparent text-sm leading-relaxed resize-none"
            />

            {/* Tags */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {JOURNAL_TAGS.map((tag) => (
                  <button key={tag} onClick={() => { toggleTag(tag); handleAutoSave(); }}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all ${
                      tags.includes(tag) ? "bg-primary/10 text-primary border-primary/30" : "border-border text-muted-foreground hover:border-primary/30"
                    }`}>{tag}</button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={generateReflection} isLoading={generatingReflection}>
                ✨ AI reflection
              </Button>
              <Button size="sm" onClick={() => {
                if (editingEntry) {
                  updateMutation.mutate({ id: editingEntry.id, payload: { title, content, tags, moodSnapshot: moodSnapshot || undefined } });
                } else {
                  createMutation.mutate({ title: title || "Untitled", content, tags, moodSnapshot: moodSnapshot || undefined });
                }
              }} isLoading={createMutation.isPending || updateMutation.isPending}>
                Save
              </Button>
            </div>
          </CardContent>
        </Card>

        {aiReflection && (
          <Card className="border-indigo-200 bg-indigo-50/50 dark:border-indigo-800 dark:bg-indigo-950/20">
            <CardContent className="pt-4">
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-1.5">
                <span>✨</span> AI reflection
              </p>
              <p className="text-sm text-indigo-900 dark:text-indigo-200 leading-relaxed">{aiReflection}</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Journal</h1>
          <p className="text-muted-foreground text-sm mt-1">Write, reflect, and grow</p>
        </div>
        <Button onClick={handleNewEntry}>+ New entry</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <p className="text-4xl mb-3">📔</p>
            <p className="text-sm font-medium mb-1">Your journal is empty</p>
            <p className="text-xs text-muted-foreground mb-4">Write your first entry to start your wellness journey</p>
            <Button onClick={handleNewEntry}>Start writing</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const mood = entry.moodSnapshot ? MOOD_CONFIG[entry.moodSnapshot as MoodType] : null;
            return (
              <Card key={entry.id}
                className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30"
                onClick={() => openEntry(entry)}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {mood && <span className="text-base">{mood.emoji}</span>}
                        <h3 className="text-sm font-semibold truncate">{entry.title}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {entry.content.slice(0, 150)}…
                      </p>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {entry.tags.slice(0, 4).map((t) => (
                          <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                        ))}
                        {entry.wordCount > 0 && (
                          <Badge variant="outline" className="text-[10px]">{entry.wordCount} words</Badge>
                        )}
                        {entry.aiReflection && <Badge className="text-[10px]">✨ Reflected</Badge>}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                    </span>
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
