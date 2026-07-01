import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { subDays } from "date-fns";
import type { MoodType } from "@/lib/utils";

// Static recommendation templates mapped to moods
const RECOMMENDATIONS = {
  ANXIOUS: [
    { type: "BREATHING" as const, title: "4-7-8 breathing", description: "Inhale 4s, hold 7s, exhale 8s. Clinically proven to activate your parasympathetic nervous system and reduce anxiety within minutes." },
    { type: "MEDITATION" as const, title: "Body scan meditation", description: "Slowly scan from head to toe, noticing sensations without judgment. Helps break the anxiety-tension cycle." },
    { type: "WALKING" as const, title: "10-minute outdoor walk", description: "A brisk walk in fresh air lowers cortisol and increases serotonin. Even around the block counts." },
  ],
  SAD: [
    { type: "JOURNALING_PROMPT" as const, title: "Gratitude journaling", description: "Write 3 specific things you're grateful for today. Specificity matters — 'the warmth of my morning coffee' beats 'my family'." },
    { type: "SOCIAL" as const, title: "Reach out to someone", description: "Send a voice note to a friend. Social connection is one of the most powerful mood elevators." },
    { type: "WALKING" as const, title: "Sunlight walk", description: "15 minutes of morning sunlight regulates serotonin and melatonin, naturally lifting mood." },
  ],
  EXHAUSTED: [
    { type: "SLEEP_TIP" as const, title: "Sleep hygiene reset", description: "Keep your room cool (65–68°F), block light with an eye mask, and avoid screens for 1 hour before bed." },
    { type: "MEDITATION" as const, title: "Yoga nidra (sleep yoga)", description: "A 20-minute yoga nidra session provides rest equivalent to 2 hours of sleep. Search for guided sessions on YouTube." },
    { type: "HYDRATION" as const, title: "Hydrate first thing", description: "Drink 500ml of water immediately upon waking. Dehydration is a hidden cause of fatigue." },
  ],
  ANGRY: [
    { type: "BREATHING" as const, title: "Box breathing", description: "Inhale 4s, hold 4s, exhale 4s, hold 4s. Used by Navy SEALs to stay calm under pressure." },
    { type: "WALKING" as const, title: "Vigorous walk or run", description: "Physical exertion burns off adrenaline and cortisol — the physiological fuel of anger." },
    { type: "JOURNALING_PROMPT" as const, title: "Anger letter (unsent)", description: "Write everything you feel without filtering. Don't send it — just get it out. Then decide what (if anything) to communicate." },
  ],
  HAPPY: [
    { type: "JOURNALING_PROMPT" as const, title: "Savor the moment", description: "Journal about what's going well right now. Savoring positive experiences extends their emotional benefit." },
    { type: "MEDITATION" as const, title: "Loving-kindness meditation", description: "Extend your good mood outward. Send wishes of wellbeing to yourself, loved ones, and even difficult people." },
  ],
  NEUTRAL: [
    { type: "EXERCISE" as const, title: "Move your body", description: "Even 20 minutes of moderate exercise releases endorphins and shifts neutral mood upward." },
    { type: "JOURNALING_PROMPT" as const, title: "Values check-in", description: "Write about whether your daily actions align with your core values. Misalignment is a common cause of emotional flatness." },
    { type: "MUSIC" as const, title: "Uplifting playlist", description: "Music at 120-140 BPM naturally elevates energy and mood. Curate a 'momentum' playlist for neutral days." },
  ],
  GOOD: [
    { type: "MEDITATION" as const, title: "Mindful appreciation", description: "Spend 5 minutes noticing beauty around you — light, texture, sound. Reinforces positive emotional states." },
    { type: "EXERCISE" as const, title: "Strength training", description: "Good days are great days to push physical limits. Strength training on positive emotional days leads to better results." },
  ],
  DEPRESSED: [
    { type: "BREATHING" as const, title: "Diaphragmatic breathing", description: "Place one hand on your belly. Breathe so your belly rises, not your chest. 5 minutes activates the calming vagus nerve." },
    { type: "WALKING" as const, title: "Tiny step outside", description: "Even stepping outside for 2 minutes is meaningful. Don't aim for a walk — just open the door." },
    { type: "SOCIAL" as const, title: "Text one person", description: "A single text to someone you trust — even just 'thinking of you' — can shift the feeling of isolation." },
  ],
};

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get most recent mood
    const recentMood = await prisma.moodLog.findFirst({
      where: { userId: session.user.id },
      orderBy: { loggedAt: "desc" },
    });

    const mood = (recentMood?.mood as MoodType) || "NEUTRAL";
    const templates = RECOMMENDATIONS[mood] || RECOMMENDATIONS.NEUTRAL;

    // Also add general ones
    const general = [
      { type: "SLEEP_TIP" as const, title: "Consistent wake time", description: "Waking at the same time every day — even weekends — is the single most impactful sleep habit. It anchors your circadian rhythm." },
      { type: "HYDRATION" as const, title: "Water before coffee", description: "Drink a glass of water before your first coffee. Caffeine is a diuretic; starting hydrated prevents the afternoon energy crash." },
    ];

    const all = [...templates, ...general];

    // Return existing unseen recommendations or generate fresh ones
    const existing = await prisma.recommendation.findMany({
      where: { userId: session.user.id, isDismissed: false },
      orderBy: { createdAt: "desc" },
      take: 6,
    });

    if (existing.length >= 3) {
      return NextResponse.json({ data: existing });
    }

    // Upsert recommendations
    const created = await Promise.all(
      all.slice(0, 5).map((r) =>
        prisma.recommendation.create({
          data: {
            userId: session.user.id,
            ...r,
            reason: `Based on your recent ${mood.toLowerCase()} mood`,
          },
        })
      )
    );

    return NextResponse.json({ data: created });
  } catch (error) {
    console.error("GET /api/recommendations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
