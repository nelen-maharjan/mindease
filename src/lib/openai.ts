import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Crisis detection keywords (multi-tier)
const CRISIS_HIGH = [
  "kill myself",
  "kill my self",
  "end my life",
  "suicide",
  "suicidal",
  "suicidal thought",
  "suicidal thoughts",
  "suicidal ideation",
  "want to die",
  "self-harm",
  "hurt myself",
  "cut myself",
  "overdose",
  "no reason to live",
  "better off dead",
  "end it all",
  "want to end it",
  "take my life",
];
const CRISIS_MEDIUM = [
  "hopeless",
  "worthless",
  "can't go on",
  "give up on life",
  "don't want to be here",
  "disappear forever",
  "can't stay alive",
  "no point in living",
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

export function generateLocalChatResponse(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  userName?: string,
): string {
  const lastUserMsg =
    [...messages].reverse().find((m) => m.role === "user")?.content || "";
  const lower = lastUserMsg.toLowerCase().trim();
  const nameGreeting = userName ? `, ${userName}` : "";

  // 1. Crisis Check
  const crisis = detectCrisisSeverity(lastUserMsg);
  if (crisis !== "none") {
    return `I hear how much pain and heaviness you are carrying right now${nameGreeting}. Please know that your life matters and you do not have to carry this alone. If you are in distress or having thoughts of self-harm, please reach out to the 988 Suicide & Crisis Lifeline by calling or texting 988 (available 24/7, free, and confidential). Would you be open to reaching out to a trusted friend or professional right now?`;
  }

  // 2. Greetings
  if (
    /^(hi|hello|hey|greetings|good morning|good evening|good afternoon|sup)\b/.test(
      lower,
    )
  ) {
    return `Hello${nameGreeting}! I'm MindEase, your AI wellness companion. How are you feeling today, or is there something on your mind you'd like to share?`;
  }

  // 3. Who are you / help request
  if (
    lower.includes("who are you") ||
    lower.includes("what can you do") ||
    lower.includes("help me")
  ) {
    return `I'm MindEase${nameGreeting}, an empathetic AI wellness companion here to listen, support your emotional well-being, and share evidence-based coping strategies like breathing exercises, grounding techniques, and reflection prompts. What's on your mind today?`;
  }

  // 4. Anxiety, Stress, Overwhelm, Panic
  if (
    lower.includes("anxious") ||
    lower.includes("stress") ||
    lower.includes("panic") ||
    lower.includes("overwhelm") ||
    lower.includes("nervous") ||
    lower.includes("worry") ||
    lower.includes("racing") ||
    lower.includes("scared") ||
    lower.includes("pressure")
  ) {
    return `It sounds like you're carrying a heavy burden of stress or anxiety right now${nameGreeting}. It is completely natural to feel tense when facing pressure or uncertainty. Try taking a slow, deep breath in through your nose for 4 seconds, hold for 4 seconds, and exhale for 6 seconds. What feels like the biggest source of pressure for you right now?`;
  }

  // 5. Tiredness, Exhaustion, Sleep deprivation
  if (
    lower.includes("tired") ||
    lower.includes("exhausted") ||
    lower.includes("sleep") ||
    lower.includes("drained") ||
    lower.includes("burnout") ||
    lower.includes("no energy") ||
    lower.includes("don't feel like")
  ) {
    return `I hear how drained and exhausted you are feeling${nameGreeting}. Sleep deprivation and fatigue make even simple tasks feel heavy. Please give yourself permission to slow down today. Have you been able to take a moment to rest or drink a glass of water today?`;
  }

  // 6. Sadness, Loneliness, Low mood
  if (
    lower.includes("sad") ||
    lower.includes("lonely") ||
    lower.includes("alone") ||
    lower.includes("cry") ||
    lower.includes("depressed") ||
    lower.includes("miserable") ||
    lower.includes("down") ||
    lower.includes("hurt")
  ) {
    return `Thank you for sharing this with me${nameGreeting}. Feeling down or lonely can feel so heavy, but putting your feelings into words is a healthy step toward emotional clarity. Your feelings are valid, and you don't have to navigate them all alone. What is one small, gentle thing that usually brings you a bit of comfort?`;
  }

  // 7. Anger, Frustration
  if (
    lower.includes("angry") ||
    lower.includes("mad") ||
    lower.includes("frustrated") ||
    lower.includes("annoyed") ||
    lower.includes("hate") ||
    lower.includes("furious")
  ) {
    return `It sounds like you're dealing with a lot of frustration or anger right now${nameGreeting}. Anger is a natural response when boundaries feel crossed or things feel unfair. Taking a brief pause or writing down raw thoughts privately can help process the intensity. Would you like to share what triggered this feeling?`;
  }

  // 8. Happiness, Good mood, Relief, Success
  if (
    lower.includes("happy") ||
    lower.includes("good") ||
    lower.includes("great") ||
    lower.includes("excited") ||
    lower.includes("relieved") ||
    lower.includes("accomplished") ||
    lower.includes("passed") ||
    lower.includes("proud")
  ) {
    return `That is wonderful to hear${nameGreeting}! Taking a moment to savor these positive feelings and celebrate your progress helps build long-term emotional resilience. What contributed most to this great feeling today?`;
  }

  // 9. Advice / Coping strategy request
  if (
    lower.includes("breathing") ||
    lower.includes("meditation") ||
    lower.includes("tip") ||
    lower.includes("exercise") ||
    lower.includes("technique")
  ) {
    return `Here is an effective 5-4-3-2-1 sensory grounding technique you can try right now${nameGreeting}:\n• Look around for 5 things you can see.\n• Touch 4 physical textures near you.\n• Notice 3 sounds around you.\n• Identify 2 scents.\n• Take 1 slow, deep breath.\nHow does your body feel after trying this?`;
  }

  // 10. General reflective fallback
  return `Thank you for opening up and sharing that with me${nameGreeting}. Expressing your thoughts creates space for emotional clarity and self-reflection. When you think about what you just shared, what feels like the most important step for your well-being right now?`;
}

export async function generateChatResponse(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  userName?: string,
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    return generateLocalChatResponse(messages, userName);
  }

  try {
    const systemWithName = userName
      ? `${SYSTEM_PROMPT}\n\nUser's name: ${userName}`
      : SYSTEM_PROMPT;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemWithName }, ...messages],
      max_tokens: 500,
      temperature: 0.7,
    });

    return (
      response.choices[0]?.message?.content ||
      generateLocalChatResponse(messages, userName)
    );
  } catch (error) {
    console.warn(
      "[generateChatResponse] OpenAI API error (quota, network, or rate limit), seamlessly switching to MindEase Local Chat Assistant:",
      error instanceof Error ? error.message : error,
    );
    return generateLocalChatResponse(messages, userName);
  }
}

export async function generateLocalJournalReflection(
  entry: string,
): Promise<string> {
  const lower = entry.toLowerCase();

  // 0. Detect Crisis / Self-harm / Suicidal thoughts
  const crisis = detectCrisisSeverity(entry);
  if (crisis !== "none") {
    return "I can hear how much pain, exhaustion, and pressure you are carrying right now. Please know that your life and well-being matter deeply, and you do not have to carry this alone. If you are experiencing suicidal thoughts or severe distress, please reach out to the 988 Suicide & Crisis Lifeline by calling or texting 988 (free, confidential, 24/7). Would you be open to connecting with a trusted friend, family member, or professional today?";
  }
  if (
    lower.includes("relieved") ||
    lower.includes("relief") ||
    lower.includes("almost complete") ||
    lower.includes("finally finished") ||
    lower.includes("project is complete") ||
    lower.includes("weight off my") ||
    lower.includes("glad it's over")
  ) {
    return "It sounds like you are experiencing a welcome sense of relief and satisfaction as this milestone comes together. Reaching completion after sustained effort is a testament to your perseverance. How do you plan to give yourself space to rest and celebrate this progress?";
  }

  // 2. Detect calm and mindfulness
  if (
    lower.includes("peaceful") ||
    lower.includes("calm") ||
    lower.includes("relaxed") ||
    lower.includes("stillness") ||
    lower.includes("tea") ||
    lower.includes("meditat") ||
    lower.includes("grounded")
  ) {
    return "There is a restorative tranquility in your words today. Giving yourself permission to slow down and breathe creates a healthy buffer against daily noise. What is one small detail from this peaceful moment you want to carry forward?";
  }

  // 3. Detect happiness, joy, and gratitude
  if (
    lower.includes("happy") ||
    lower.includes("joy") ||
    lower.includes("grateful") ||
    lower.includes("thankful") ||
    lower.includes("celebrat") ||
    lower.includes("excited") ||
    lower.includes("smil") ||
    lower.includes("proud")
  ) {
    return "Your reflection radiates genuine warmth, joy, and gratitude. Taking time to notice and document these uplifting moments anchors positive energy in your memory. What made this particular experience feel so special?";
  }

  // 4. Detect sadness, loneliness, grief
  if (
    lower.includes("sad") ||
    lower.includes("gloom") ||
    lower.includes("cry") ||
    lower.includes("cried") ||
    lower.includes("lonely") ||
    lower.includes("alone") ||
    lower.includes("empty") ||
    lower.includes("hurt") ||
    lower.includes("heartbroken")
  ) {
    return "Thank you for holding space for yourself and putting these vulnerable feelings into words. Going through heavy, lonely moments takes emotional courage, and your feelings are completely valid. What is one kind, gentle thing you can do for yourself today?";
  }

  // 5. Detect anxiety, panic, overwhelm, stress
  if (
    lower.includes("anxious") ||
    lower.includes("panic") ||
    lower.includes("overwhelm") ||
    lower.includes("racing") ||
    lower.includes("dread") ||
    lower.includes("nervous") ||
    lower.includes("stress") ||
    lower.includes("pressure") ||
    lower.includes("knot in my stomach")
  ) {
    return "It feels like there has been a lot pressing on your mind, and it is completely natural to feel tense when facing uncertainty or high expectations. Remember that you don't have to resolve everything all at once. What is one small, grounding breath or step you can take right now?";
  }

  // 6. Balanced default reflection
  return "Writing your thoughts down is a meaningful step toward self-awareness and emotional clarity. Giving words to your experiences helps untangle feelings and create perspective. As you reflect on what you wrote, what feels most important to pay attention to next?";
}

export async function generateJournalReflection(
  entry: string,
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    return generateLocalJournalReflection(entry);
  }

  try {
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
    return (
      response.choices[0]?.message?.content ||
      (await generateLocalJournalReflection(entry))
    );
  } catch (error) {
    console.warn(
      "[generateJournalReflection] OpenAI API error (quota, network, or rate limit), falling back to local reflection:",
      error instanceof Error ? error.message : error,
    );
    return generateLocalJournalReflection(entry);
  }
}

export async function generateWeeklyInsights(data: {
  moodLogs: Array<{ mood: string; intensity: number; loggedAt: Date }>;
  journalCount: number;
  habitCompletionRate: number;
  userName?: string;
}): Promise<string[]> {
  if (!process.env.OPENAI_API_KEY) {
    return [
      "Consistent tracking creates emotional awareness. Keep up your daily wellness check-ins!",
      "Reflecting on your mood patterns helps build long-term resilience.",
      "Small daily habits contribute significantly to overall well-being.",
    ];
  }

  try {
    const moodSummary = data.moodLogs
      .map((l) => `${l.mood}(${l.intensity})`)
      .join(", ");

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

    const content = response.choices[0]?.message?.content || "[]";
    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return [
      "Consistent tracking creates emotional awareness. Keep up your daily wellness check-ins!",
      "Reflecting on your mood patterns helps build long-term resilience.",
      "Small daily habits contribute significantly to overall well-being.",
    ];
  }
}
