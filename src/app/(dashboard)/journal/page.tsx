"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MOOD_CONFIG, ACTIVE_MOODS, ACTIVE_MOOD_CONFIG } from "@/lib/utils";
import type { MoodType } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, Badge, Skeleton, Textarea } from "@/components/ui/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import type { JournalEntry } from "@/types";
import { Trash2, Sparkles, ArrowLeft, Save, CheckCircle2, Loader2, BookOpen } from "lucide-react";

const JOURNAL_TAGS = [
  "mindfulness", "gratitude", "anxiety", "work", "family",
  "growth", "reflection", "morning", "evening", "stress", "joy", "health"
];
const MOODS = ACTIVE_MOODS.map((k) => [k, ACTIVE_MOOD_CONFIG[k]] as const);

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

  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved" | "">("");

  // Refs to prevent race conditions during autosave
  const editingIdRef = useRef<string | null>(null);
  const isCreatingRef = useRef<boolean>(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latestDraftRef = useRef({ title, content, tags, moodSnapshot });

  // Keep refs up-to-date with current state
  useEffect(() => {
    editingIdRef.current = editingEntry ? editingEntry.id : null;
  }, [editingEntry]);

  useEffect(() => {
    latestDraftRef.current = { title, content, tags, moodSnapshot };
  }, [title, content, tags, moodSnapshot]);

  const { data, isLoading } = useQuery({
    queryKey: ["journal"],
    queryFn: async () => {
      const r = await fetch("/api/journal?limit=30");
      if (!r.ok) throw new Error("Failed to load journal entries");
      return r.json();
    },
  });

  const performSave = async () => {
    const { title: t, content: c, tags: tg, moodSnapshot: m } = latestDraftRef.current;
    if (!t.trim() && !c.trim()) return;

    setSaveStatus("saving");

    try {
      const currentId = editingIdRef.current;

      if (currentId) {
        // Update existing entry
        const r = await fetch(`/api/journal/${currentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: t.trim() || "Untitled",
            content: c,
            tags: tg,
            moodSnapshot: m || undefined,
          }),
        });
        if (!r.ok) throw new Error("Failed to update entry");
        const res = await r.json();
        setEditingEntry(res.data);
        if (res.data.aiReflection) setAiReflection(res.data.aiReflection);
        qc.invalidateQueries({ queryKey: ["journal"] });
        setSaveStatus("saved");
      } else if (!isCreatingRef.current) {
        // Create new entry safely (locking creation in-flight)
        isCreatingRef.current = true;
        const r = await fetch("/api/journal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: t.trim() || "Untitled",
            content: c,
            tags: tg,
            moodSnapshot: m || undefined,
          }),
        });
        if (!r.ok) {
          isCreatingRef.current = false;
          throw new Error("Failed to create entry");
        }
        const res = await r.json();
        editingIdRef.current = res.data.id;
        setEditingEntry(res.data);
        isCreatingRef.current = false;
        qc.invalidateQueries({ queryKey: ["journal"] });
        setSaveStatus("saved");
      }
    } catch {
      setSaveStatus("unsaved");
    }
  };

  const scheduleAutoSave = useCallback(() => {
    setSaveStatus("unsaved");
    clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      performSave();
    }, 2000); // 2-second debounce to prevent premature fragment creation
  }, []);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/journal/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to delete");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journal"] });
      toast({ title: "Journal entry deleted", type: "info" });
      setView("list");
    },
  });

  const handleNewEntry = () => {
    clearTimeout(autosaveTimerRef.current);
    editingIdRef.current = null;
    isCreatingRef.current = false;
    setEditingEntry(null);
    setTitle("");
    setContent("");
    setTags([]);
    setMoodSnapshot("");
    setAiReflection("");
    setSaveStatus("");
    setView("editor");
  };

  const openEntry = (entry: JournalEntry) => {
    clearTimeout(autosaveTimerRef.current);
    editingIdRef.current = entry.id;
    isCreatingRef.current = false;
    setEditingEntry(entry);
    setTitle(entry.title);
    setContent(entry.content);
    setTags(entry.tags);
    setMoodSnapshot((entry.moodSnapshot as MoodType) || "");
    setAiReflection(entry.aiReflection || "");
    setSaveStatus("saved");
    setView("editor");
  };

  const handleBackToList = () => {
    clearTimeout(autosaveTimerRef.current);
    if (saveStatus === "unsaved") {
      performSave();
    }
    setView("list");
  };

  const generateReflection = async () => {
    if (!content.trim()) {
      toast({ title: "Write a few sentences before generating AI reflection", type: "info" });
      return;
    }

    setGeneratingReflection(true);
    try {
      let currentId = editingIdRef.current;

      if (!currentId) {
        // Save first if not created yet
        const r = await fetch("/api/journal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim() || "Untitled",
            content,
            tags,
            moodSnapshot: moodSnapshot || undefined,
          }),
        });
        const res = await r.json();
        currentId = res.data.id;
        editingIdRef.current = currentId;
        setEditingEntry(res.data);
      }

      const r2 = await fetch(`/api/journal/${currentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generateReflection: true, content }),
      });
      const res2 = await r2.json();
      setAiReflection(res2.data?.aiReflection || "");
      qc.invalidateQueries({ queryKey: ["journal"] });
      setSaveStatus("saved");
      toast({ title: "AI reflection generated!", type: "success" });
    } catch {
      toast({ title: "Could not generate reflection", type: "error" });
    } finally {
      setGeneratingReflection(false);
    }
  };

  const toggleTag = (tag: string) => {
    const next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
    setTags(next);
    scheduleAutoSave();
  };

  const entries: JournalEntry[] = data?.data || [];

  // ─── EDITOR VIEW ───────────────────────────────────────────────────
  if (view === "editor") {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        {/* Top Header Controls */}
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={handleBackToList} className="rounded-xl">
            <ArrowLeft className="size-4 mr-1.5" /> Back to Journal
          </Button>

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              {saveStatus === "saving" && (
                <>
                  <Loader2 className="size-3 animate-spin text-emerald-600 dark:text-emerald-400" />
                  Saving…
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                  Saved
                </>
              )}
              {saveStatus === "unsaved" && <span className="text-amber-600 dark:text-amber-400">Unsaved changes</span>}
            </span>

            {editingEntry && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteMutation.mutate(editingEntry.id)}
                isLoading={deleteMutation.isPending}
                className="text-destructive hover:bg-destructive/10 rounded-xl"
                title="Delete journal entry"
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Editor Card */}
        <Card className="rounded-2xl border border-border/80 shadow-sm">
          <CardContent className="pt-5 p-6 space-y-4">
            <Input
              placeholder="Entry title…"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                scheduleAutoSave();
              }}
              className="text-lg font-bold border-0 border-b rounded-none px-0 focus-visible:ring-0 bg-transparent"
            />

            {/* Mood snapshot selector */}
            <div className="flex gap-2 flex-wrap items-center pt-1">
              <p className="text-xs text-muted-foreground font-medium mr-1">Mood:</p>
              {MOODS.map(([key, c]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setMoodSnapshot(key === moodSnapshot ? "" : key);
                    scheduleAutoSave();
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                    moodSnapshot === key
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shadow-xs scale-105 font-semibold"
                      : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted/70"
                  }`}
                  title={c.label}
                >
                  <span>{c.emoji}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>

            <Textarea
              placeholder="Write your thoughts, feelings, reflections…"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                scheduleAutoSave();
              }}
              rows={12}
              className="border-0 focus-visible:ring-0 bg-transparent text-sm leading-relaxed resize-none p-0"
            />

            {/* Tags */}
            <div className="pt-2">
              <p className="text-xs text-muted-foreground font-medium mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {JOURNAL_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all ${
                      tags.includes(tag)
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                        : "border-border/70 text-muted-foreground hover:border-emerald-500/30"
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={generateReflection}
                isLoading={generatingReflection}
                className="rounded-xl border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-xs"
              >
                <Sparkles className="size-3.5 mr-1.5 text-indigo-500" />
                AI Reflection
              </Button>

              <Button
                size="sm"
                onClick={performSave}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs"
              >
                <Save className="size-3.5 mr-1.5" /> Save Entry
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* AI Reflection Card */}
        {aiReflection && (
          <Card className="rounded-2xl border-indigo-200 bg-indigo-50/50 dark:border-indigo-900/50 dark:bg-indigo-950/20 shadow-xs">
            <CardContent className="pt-4 p-5">
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-1.5">
                <Sparkles className="size-4" /> AI Reflection
              </p>
              <p className="text-sm text-indigo-900 dark:text-indigo-200 leading-relaxed font-normal">{aiReflection}</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ─── LIST VIEW ─────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="size-6 text-emerald-600 dark:text-emerald-400" />
            Journal
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Write, reflect, and track your personal growth</p>
        </div>
        <Button onClick={handleNewEntry} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs">
          + New Entry
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <Card className="rounded-2xl border border-border/80">
          <CardContent className="text-center py-16">
            <p className="text-4xl mb-3">📔</p>
            <p className="text-sm font-semibold mb-1">Your journal is empty</p>
            <p className="text-xs text-muted-foreground mb-4">Write your first entry to start your wellness reflection journey</p>
            <Button onClick={handleNewEntry} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs">
              Start Writing
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const mood = entry.moodSnapshot ? MOOD_CONFIG[entry.moodSnapshot as MoodType] : null;
            return (
              <Card
                key={entry.id}
                className="rounded-2xl border border-border/80 cursor-pointer hover:shadow-md transition-all hover:border-emerald-500/30 bg-card"
                onClick={() => openEntry(entry)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        {mood && <span className="text-base">{mood.emoji}</span>}
                        <h3 className="text-sm font-bold truncate text-foreground">{entry.title || "Untitled"}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {entry.content}
                      </p>
                      <div className="flex gap-1.5 mt-2 flex-wrap items-center pt-1">
                        {entry.tags.slice(0, 4).map((t) => (
                          <Badge key={t} variant="secondary" className="text-[10px] rounded-lg">
                            #{t}
                          </Badge>
                        ))}
                        {entry.wordCount > 0 && (
                          <Badge variant="outline" className="text-[10px] rounded-lg">
                            {entry.wordCount} words
                          </Badge>
                        )}
                        {entry.sentimentScore !== null && entry.sentimentScore !== undefined && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] rounded-lg ${
                              entry.sentimentScore > 0.2
                                ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20"
                                : entry.sentimentScore < -0.2
                                ? "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20"
                                : "text-muted-foreground"
                            }`}
                          >
                            {entry.sentimentScore > 0.2
                              ? "Positive"
                              : entry.sentimentScore < -0.2
                              ? "Low"
                              : "Neutral"}
                          </Badge>
                        )}
                        {entry.emotionLabels?.slice(0, 2).map((emo) => (
                          <Badge key={emo} variant="secondary" className="text-[10px] capitalize rounded-lg">
                            {emo}
                          </Badge>
                        ))}
                        {entry.aiReflection && <Badge className="text-[10px] bg-indigo-600 text-white rounded-lg">✨ Reflected</Badge>}
                      </div>
                    </div>

                    <span className="text-xs text-muted-foreground shrink-0 font-medium">
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
