import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Crisis detection keywords (multi-tier)
const CRISIS_HIGH = [
  "kill myself", "end my life", "suicide", "want to die",
  "self-harm", "hurt myself", "cut myself", "overdose",
  "no reason to live", "better off dead",
];
const CRISIS_MEDIUM = [
  "hopeless", "worthless", "can't go on", "give up on life",
  "don't want to be here", "disappear forever",
];

export function detectCrisisSeverity(text: string): "none" | "medium" | "high" {
  const lower = text.toLowerCase();
  if (CRISIS_HIGH.some((w) => lower.includes(w))) return "high";
  if (CRISIS_MEDIUM.some((w) => lower.includes(w))) return "medium";
  return "none";
}

export function getCrisisWords(text: string): string[] {
  const lower = text.toLowerCase();
  return [...CRISIS_HIGH, ...CRISIS_MEDIUM].filter((w) => lower.includes(w));
}

const SYSTEM_PROMPT = `You are MindEase, a compassionate AI wellness companion designed to support emotional well-being.

CORE IDENTITY:
- You are warm, empathetic, non-judgmental, and supportive
- You remember context from the current conversation
- You encourage healthy habits and self-reflection
- You use the user's name when available

STRICT RULES — NEVER VIOLATE:
1. NEVER diagnose any medical or psychiatric condition
2. NEVER claim to provide therapy or replace professional mental health care
3. NEVER give dosage advice or recommend stopping medication
4. ALWAYS respond with validation before advice
5. If ANY crisis language is detected, ALWAYS include the 988 Suicide & Crisis Lifeline (call/text 988) and encourage reaching out to a trusted person
6. Keep responses warm but concise (3-6 sentences unless the user needs more)
7. End with one thoughtful reflective question to encourage self-exploration

CAPABILITIES:
- Active listening and emotional validation
- Psychoeducation about emotions and coping
- Suggesting evidence-based strategies: breathing exercises, grounding techniques, journaling prompts
- Celebrating progress and milestones
- Connecting patterns (e.g., "You've mentioned sleep affecting your mood a few times")

TONE: Like a wise, caring friend who happens to know about wellness — never clinical, never preachy.

DISCLAIMER TO INCLUDE WHEN RELEVANT: "I'm a wellness companion, not a therapist. For serious concerns, please speak with a mental health professional."`;

export async function generateChatResponse(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  userName?: string
): Promise<string> {
  const systemWithName = userName
    ? `${SYSTEM_PROMPT}\n\nUser's name: ${userName}`
    : SYSTEM_PROMPT;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemWithName },
      ...messages,
    ],
    max_tokens: 500,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || "I'm here with you. Could you tell me more?";
}

export async function generateJournalReflection(entry: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a compassionate journaling companion. Given a journal entry, provide a warm, insightful reflection in 2-3 sentences. Acknowledge the emotions present, offer a gentle observation about themes or patterns, and ask one thoughtful question. Never diagnose. Never give medical advice. Be genuinely caring and specific to what the person wrote.`,
      },
      {
        role: "user",
        content: `Journal entry:\n\n${entry}\n\nPlease reflect on this entry.`,
      },
    ],
    max_tokens: 200,
    temperature: 0.8,
  });
  return response.choices[0]?.message?.content || "";
}

export async function generateWeeklyInsights(data: {
  moodLogs: Array<{ mood: string; intensity: number; loggedAt: Date }>;
  journalCount: number;
  habitCompletionRate: number;
  userName?: string;
}): Promise<string[]> {
  const moodSummary = data.moodLogs.map((l) => `${l.mood}(${l.intensity})`).join(", ");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You generate short, personalized wellness insights from data. Return a JSON array of 3 insight strings. Each insight is 1-2 sentences, specific, warm, and actionable. No diagnoses. Format: ["insight1", "insight2", "insight3"]`,
      },
      {
        role: "user",
        content: `User data for the past week:
- Mood logs: ${moodSummary || "none"}
- Journal entries: ${data.journalCount}
- Habit completion rate: ${Math.round(data.habitCompletionRate * 100)}%

Generate 3 personalized wellness insights.`,
      },
    ],
    max_tokens: 300,
    temperature: 0.7,
  });

  try {
    const content = response.choices[0]?.message?.content || "[]";
    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return ["Your wellness journey is making steady progress this week."];
  }
}
