import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string, fmt = "MMM d, yyyy") {
  return format(new Date(date), fmt);
}

export function formatRelative(date: Date | string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function getWeekDays(date = new Date()) {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

export const MOOD_CONFIG = {
  HAPPY:     { emoji: "😀", label: "Happy",     color: "#1baf7a", bg: "#e8f7f0", intensity: 9 },
  GOOD:      { emoji: "🙂", label: "Good",      color: "#2a78d6", bg: "#e6f1fb", intensity: 7 },
  NEUTRAL:   { emoji: "😐", label: "Neutral",   color: "#888780", bg: "#f1efe8", intensity: 5 },
  SAD:       { emoji: "😞", label: "Sad",       color: "#eda100", bg: "#faeeda", intensity: 3 },
  DEPRESSED: { emoji: "😭", label: "Depressed", color: "#e34948", bg: "#fcebeb", intensity: 1 },
  ANGRY:     { emoji: "😡", label: "Angry",     color: "#d85a30", bg: "#faece7", intensity: 2 },
  ANXIOUS:   { emoji: "😨", label: "Anxious",   color: "#ba7517", bg: "#faeeda", intensity: 3 },
  EXHAUSTED: { emoji: "😴", label: "Exhausted", color: "#534ab7", bg: "#eeedfe", intensity: 4 },
} as const;

export type MoodType = keyof typeof MOOD_CONFIG;

export function getMoodScore(mood: MoodType): number {
  return MOOD_CONFIG[mood]?.intensity ?? 5;
}

export function calculateWellnessScore(data: {
  avgMoodScore: number;      // 1-10
  journalStreak: number;     // days
  habitCompletionRate: number; // 0-1
  moodVariability: number;   // lower is better, 0-10
}): number {
  const moodComponent = (data.avgMoodScore / 10) * 40;
  const journalComponent = Math.min(data.journalStreak / 30, 1) * 20;
  const habitComponent = data.habitCompletionRate * 30;
  const stabilityComponent = (1 - data.moodVariability / 10) * 10;
  return Math.round(moodComponent + journalComponent + habitComponent + stabilityComponent);
}

export function truncate(str: string, n: number) {
  return str.length > n ? str.slice(0, n - 1) + "…" : str;
}

export function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}