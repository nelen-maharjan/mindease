import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import type { MoodType } from "@/lib/utils";
import { getMlRecommendations } from "@/lib/ml";

// Diverse recommendation pool per mood
const RECOMMENDATION_CATALOG: Record<
  string,
  Array<{
    type: "BREATHING" | "MEDITATION" | "JOURNALING_PROMPT" | "WALKING" | "MUSIC" | "SLEEP_TIP" | "HYDRATION" | "EXERCISE" | "SOCIAL" | "GRATITUDE";
    title: string;
    description: string;
    getReason: (notes?: string | null) => string;
  }>
> = {
  ANXIOUS: [
    {
      type: "BREATHING",
      title: "4-7-8 Deep Exhale Breathing",
      description: "Inhale through your nose for 4s, hold for 7s, exhale completely through your mouth for 8s. 4 rounds calms the nervous system.",
      getReason: (notes) => (notes ? `Tailored for your anxiety note: "${notes.slice(0, 40)}…"` : "Recommended because you logged feeling anxious"),
    },
    {
      type: "MEDITATION",
      title: "5-4-3-2-1 Sensory Grounding",
      description: "Acknowledge 5 things around you that you see, 4 you can touch, 3 you hear, 2 you smell, and 1 you taste.",
      getReason: () => "Helps anchor your mind away from racing anxious thoughts",
    },
    {
      type: "WALKING",
      title: "10-Minute Mindful Walk",
      description: "Step outside for a short, unhurried walk. Pay attention to the rhythm of your feet contacting the ground.",
      getReason: () => "Physical movement reduces cortisol and releases muscle tension caused by anxiety",
    },
    {
      type: "JOURNALING_PROMPT",
      title: "Worry Dump Reflection",
      description: "Write down everything worrying you right now without editing. Then ask: 'Which of these can I control right now?'",
      getReason: () => "Externalizing worries reduces cognitive load and anxiety",
    },
  ],
  SAD: [
    {
      type: "JOURNALING_PROMPT",
      title: "Gentle Self-Compassion Journaling",
      description: "Write 3 supportive sentences to yourself as if speaking to a dear friend going through a tough day.",
      getReason: (notes) => (notes ? `Reflecting on your recent sad note: "${notes.slice(0, 40)}…"` : "Recommended for sad mood relief"),
    },
    {
      type: "SOCIAL",
      title: "Reach Out to a Friend",
      description: "Send a quick voice note or text to someone you feel safe with. Even a small connection helps break isolation.",
      getReason: () => "Social connection is clinically proven to elevate low mood",
    },
    {
      type: "WALKING",
      title: "15-Minute Sunlight Walk",
      description: "Get outside in natural sunlight. Natural light exposure boosts serotonin production.",
      getReason: () => "Sunlight naturally stimulates serotonin and lifts emotional state",
    },
    {
      type: "MUSIC",
      title: "Comforting Instrumental Music",
      description: "Listen to gentle acoustic or piano melodies for 10 minutes to soothe your mind.",
      getReason: () => "Soothing audio helps process low emotions safely",
    },
  ],
  DEPRESSED: [
    {
      type: "BREATHING",
      title: "Gentle Belly Breathing",
      description: "Place your hand on your stomach and take 5 slow, deep breaths. Notice your hand gently rising and falling.",
      getReason: () => "Activates the vagus nerve to ease deep emotional heaviness",
    },
    {
      type: "WALKING",
      title: "Micro-Step Outside",
      description: "Just open your front door and step outside for 60 seconds. No pressure to walk far — simply feel the outside air.",
      getReason: () => "Low-barrier micro-actions overcome emotional paralysis",
    },
    {
      type: "HYDRATION",
      title: "Refreshing Glass of Water",
      description: "Drink a full glass of cold water right now. Dehydration secretly worsens low mood and sluggishness.",
      getReason: () => "Immediate physiological refresh for low energy",
    },
  ],
  EXHAUSTED: [
    {
      type: "SLEEP_TIP",
      title: "Evening Digital Sunset",
      description: "Turn off bright screens 45 minutes before sleep or enable night shift warm tones.",
      getReason: () => "Protects melatonin secretion so you get deeper restorative sleep",
    },
    {
      type: "MEDITATION",
      title: "20-Minute Yoga Nidra Rest",
      description: "Lie down comfortably and listen to a guided body scan for deep conscious rest.",
      getReason: () => "Restores nervous system energy without needing full sleep cycles",
    },
    {
      type: "HYDRATION",
      title: "Hydration & Electrolyte Reset",
      description: "Drink 500ml of water. Add a pinch of salt or lemon slice for better absorption.",
      getReason: () => "Combats physical exhaustion linked to mild dehydration",
    },
  ],
  ANGRY: [
    {
      type: "BREATHING",
      title: "Box Breathing Strategy",
      description: "Inhale for 4s, hold for 4s, exhale for 4s, hold for 4s. Repeat 5 times.",
      getReason: () => "Rapidly lowers adrenaline spikes caused by anger or frustration",
    },
    {
      type: "EXERCISE",
      title: "Vigorous Physical Release",
      description: "Do 20 jumping jacks, pushups, or a brisk sprint to release physical anger energy safely.",
      getReason: () => "Burns off excess adrenaline and cortisol",
    },
    {
      type: "JOURNALING_PROMPT",
      title: "Unsent Anger Expression",
      description: "Write down everything you're angry about without holding back. Keep it private to process raw feelings.",
      getReason: () => "Safely processes anger without escalating interpersonal conflicts",
    },
  ],
  HAPPY: [
    {
      type: "GRATITUDE",
      title: "Savor the Positive Moment",
      description: "Write down 3 specific details about what went well today and why it made you feel happy.",
      getReason: (notes) => (notes ? `Savoring your happy moment: "${notes.slice(0, 40)}…"` : "Extends and deepens your positive mood state"),
    },
    {
      type: "SOCIAL",
      title: "Share Good Energy",
      description: "Send a compliment or kind message to someone in your life to pass the happiness forward.",
      getReason: () => "Sharing positive emotions strengthens social bonds",
    },
    {
      type: "MEDITATION",
      title: "Loving-Kindness Meditation",
      description: "Spend 5 minutes sending peaceful, loving thoughts to friends, family, and yourself.",
      getReason: () => "Amplifies feelings of warmth and emotional fulfillment",
    },
  ],
  GOOD: [
    {
      type: "EXERCISE",
      title: "Mindful Workout or Stretch",
      description: "Capitalize on your good energy with a 20-minute movement session or invigorating yoga flow.",
      getReason: () => "Channels positive mood energy into physical health",
    },
    {
      type: "MEDITATION",
      title: "Mindful Appreciation Pause",
      description: "Pause for 3 minutes to appreciate where you are right now and what you've accomplished.",
      getReason: () => "Reinforces positive self-worth and calm confidence",
    },
  ],
  NEUTRAL: [
    {
      type: "EXERCISE",
      title: "20-Minute Energy Boost Walk",
      description: "Take a crisp 20-minute brisk walk. Physical movement shifts neutral or flat energy upwards.",
      getReason: () => "Releases endorphins to elevate a neutral baseline mood",
    },
    {
      type: "JOURNALING_PROMPT",
      title: "Values Alignment Check-in",
      description: "Reflect on how your activities today align with your personal goals and core values.",
      getReason: () => "Provides clarity when feeling indifferent or flat",
    },
    {
      type: "MUSIC",
      title: "120 BPM Uplifting Playlist",
      description: "Put on energetic 120-140 BPM music while doing your next task.",
      getReason: () => "Rhythmic music stimulates focus and positive mood",
    },
  ],
};

const STARTER_RECOMMENDATIONS = [
  {
    id: "starter-1",
    type: "BREATHING",
    title: "Daily Mindful Breath Check-in",
    description: "Take 3 deep, intentional breaths right now. Inhale peace, exhale tension.",
    reason: "Starter wellness tip — log your mood to get personalized recommendations!",
    isStarter: true,
  },
  {
    id: "starter-2",
    type: "HYDRATION",
    title: "Hydration Focus",
    description: "Drink a glass of fresh water to keep your brain and body hydrated.",
    reason: "Starter wellness tip — log your mood to get personalized recommendations!",
    isStarter: true,
  },
  {
    id: "starter-3",
    type: "JOURNALING_PROMPT",
    title: "Write Your First Journal Entry",
    description: "Spend 3 minutes reflecting on how your week is going.",
    reason: "Unlocks personalized AI insights and targeted recommendations!",
    isStarter: true,
  },
];

async function generateRecommendationsForUser(userId: string) {
  // Get most recent mood log
  const recentMood = await prisma.moodLog.findFirst({
    where: { userId },
    orderBy: { loggedAt: "desc" },
  });

  // Get most recent journal entry
  const recentJournal = await prisma.journalEntry.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const moodKey = (recentMood?.mood as string) || "NEUTRAL";
  const notes = recentMood?.notes;

  // Try ML recommendations if context is available
  let mlRecs: Array<{ type: string; title: string; description: string }> | null = null;
  const contextText = notes?.trim() || recentJournal?.content?.trim() || `I am feeling ${moodKey.toLowerCase()} today.`;

  try {
    const rawMl = await getMlRecommendations(contextText);
    if (rawMl && rawMl.length > 0) {
      mlRecs = rawMl;
    }
  } catch {
    // Ignore ML fetch errors
  }

  const typeMapping: Record<string, "BREATHING" | "MEDITATION" | "JOURNALING_PROMPT" | "WALKING" | "MUSIC" | "SLEEP_TIP" | "HYDRATION" | "EXERCISE" | "SOCIAL" | "GRATITUDE"> = {
    BREATHING: "BREATHING",
    MEDITATION: "MEDITATION",
    MINDFULNESS: "MEDITATION",
    JOURNALING_PROMPT: "JOURNALING_PROMPT",
    WALKING: "WALKING",
    MUSIC: "MUSIC",
    SLEEP_TIP: "SLEEP_TIP",
    HYDRATION: "HYDRATION",
    EXERCISE: "EXERCISE",
    SOCIAL: "SOCIAL",
    GRATITUDE: "GRATITUDE",
  };

  let itemsToCreate;

  if (mlRecs && mlRecs.length > 0) {
    itemsToCreate = mlRecs.map((r) => ({
      type: typeMapping[r.type] || ("MEDITATION" as const),
      title: r.title,
      description: r.description,
      reason: `Generated by MindEase AI for your recent ${moodKey.toLowerCase()} state`,
    }));
  } else {
    const catalogItems = RECOMMENDATION_CATALOG[moodKey] || RECOMMENDATION_CATALOG.NEUTRAL;
    // Select up to 4 items
    itemsToCreate = catalogItems.slice(0, 4).map((item) => ({
      type: item.type,
      title: item.title,
      description: item.description,
      reason: item.getReason(notes),
    }));
  }

  // Delete old non-dismissed recommendations so user gets a clean fresh set
  await prisma.recommendation.deleteMany({
    where: { userId, isDismissed: false },
  });

  // Create new recommendation records
  const created = await Promise.all(
    itemsToCreate.map((r) =>
      prisma.recommendation.create({
        data: {
          userId,
          ...r,
        },
      })
    )
  );

  return created;
}

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;

    // Check if user has any mood logs or journal entries
    const [recentMood, recentJournal, existingRecs] = await Promise.all([
      prisma.moodLog.findFirst({ where: { userId }, orderBy: { loggedAt: "desc" } }),
      prisma.journalEntry.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
      prisma.recommendation.findMany({
        where: { userId, isDismissed: false },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const isNewUser = !recentMood && !recentJournal;

    // New user with no logs at all: return starter recommendations without persisting static data
    if (isNewUser) {
      return NextResponse.json({
        data: STARTER_RECOMMENDATIONS,
        isNewUser: true,
        lastMood: null,
      });
    }

    // Check if user has logged a new mood or journal entry AFTER the existing recommendations were created
    const latestActivityDate = [recentMood?.loggedAt, recentJournal?.createdAt]
      .filter((d): d is Date => Boolean(d))
      .sort((a, b) => b.getTime() - a.getTime())[0];

    const latestRecDate = existingRecs.length > 0 ? existingRecs[0].createdAt : null;

    const needsAutoRefresh =
      existingRecs.length === 0 ||
      (latestActivityDate && latestRecDate && latestActivityDate.getTime() > latestRecDate.getTime());

    if (needsAutoRefresh) {
      const freshRecs = await generateRecommendationsForUser(userId);
      return NextResponse.json({
        data: freshRecs,
        isNewUser: false,
        lastMood: recentMood ? { mood: recentMood.mood, loggedAt: recentMood.loggedAt, notes: recentMood.notes } : null,
      });
    }

    return NextResponse.json({
      data: existingRecs,
      isNewUser: false,
      lastMood: recentMood ? { mood: recentMood.mood, loggedAt: recentMood.loggedAt, notes: recentMood.notes } : null,
    });
  } catch (error) {
    console.error("GET /api/recommendations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST endpoint to manually trigger a fresh recommendation generation
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;
    const body = await request.json().catch(() => ({}));

    if (body.action === "refresh") {
      const freshRecs = await generateRecommendationsForUser(userId);
      return NextResponse.json({ data: freshRecs, message: "Recommendations refreshed" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/recommendations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
