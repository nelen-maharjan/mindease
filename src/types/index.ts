export type { MoodType } from "@/lib/utils";

export interface MoodLog {
  id: string;
  userId: string;
  mood: string;
  intensity: number;
  notes?: string | null;
  tags: string[];
  loggedAt: string;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  moodSnapshot?: string | null;
  aiReflection?: string | null;
  sentimentScore?: number | null;
  emotionLabels: string[];
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: "USER" | "ASSISTANT";
  content: string;
  crisisDetected: boolean;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  title?: string | null;
  createdAt: string;
  messages?: ChatMessage[];
}

export interface Habit {
  id: string;
  userId: string;
  name: string;
  emoji?: string | null;
  color?: string | null;
  description?: string | null;
  frequency: string;
  streakCount: number;
  longestStreak: number;
  isActive: boolean;
  createdAt: string;
  logs?: HabitLog[];
}

export interface HabitLog {
  id: string;
  habitId: string;
  userId: string;
  completedAt: string;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  category: string;
  targetValue: number;
  currentValue: number;
  unit?: string | null;
  emoji?: string | null;
  color?: string | null;
  isCompleted: boolean;
  dueDate?: string | null;
  createdAt: string;
}

export interface Recommendation {
  id: string;
  userId: string;
  type: string;
  title: string;
  description: string;
  reason?: string | null;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface AiInsight {
  id: string;
  content: string;
  category: string;
  createdAt: string;
}

export interface AnalyticsData {
  moodTrend: Array<{ date: string; score: number; mood: string }>;
  moodDistribution: Record<string, number>;
  weeklyAverage: number;
  journalFrequency: Array<{ week: string; count: number }>;
  habitCompletion: number;
  wellnessScore: number;
  currentStreak: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
