import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database…");

  // Demo user (password: "demo1234" – hashed by Better Auth at runtime)
  // We insert raw rows here for development convenience.
  const user = await prisma.user.upsert({
    where: { email: "demo@mindspace.app" },
    update: {},
    create: {
      id: "demo-user-001",
      email: "demo@mindspace.app",
      name: "Alex Demo",
      emailVerified: true,
    },
  });

  // Profile
  await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      timezone: "America/New_York",
      wellnessGoal: "Build consistent healthy habits and manage stress better",
      notificationsEnabled: true,
      shareDataForInsights: true,
    },
  });

  // Mood logs – last 14 days
  const moodTypes = ["HAPPY","GOOD","NEUTRAL","SAD","ANXIOUS","GOOD","HAPPY","GOOD","NEUTRAL","GOOD","HAPPY","GOOD","ANXIOUS","GOOD"] as const;
  const intensities = [8,7,5,4,6,7,8,7,5,7,8,7,5,7];
  const tags = [["exercise","nature"],["work"],["family"],["work","stress"],["health"],["nature"],["social","family"],["exercise"],["work"],["sleep"],["nature","exercise"],["family"],["work","stress"],["exercise"]];

  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    d.setHours(9, 0, 0, 0);
    await prisma.moodLog.create({
      data: {
        userId: user.id,
        mood: moodTypes[i],
        intensity: intensities[i],
        tags: tags[i],
        notes: i % 3 === 0 ? "Feeling good after my morning routine." : undefined,
        loggedAt: d,
      },
    });
  }

  // Journal entries
  const entries = [
    {
      title: "Morning reflections",
      content: "Today started with a peaceful walk through the park. The morning light was soft and golden, and I noticed how much calmer I feel when I spend time in nature before the day's demands begin.\n\nI've been thinking about my reactions to stress lately — how I tend to hold tension in my shoulders and rush my breathing. I want to be more intentional about pausing.",
      tags: ["mindfulness","morning","nature"],
      moodSnapshot: "GOOD" as const,
      daysAgo: 0,
    },
    {
      title: "Sunday wind-down",
      content: "Spent the evening doing light stretching and reading. Felt grounded and ready for the week ahead. Finished a chapter of my book and made chamomile tea. Small rituals really do matter.",
      tags: ["relaxation","evening","gratitude"],
      moodSnapshot: "HAPPY" as const,
      daysAgo: 1,
    },
    {
      title: "Navigating a busy Friday",
      content: "Back-to-back meetings left me depleted. I noticed frustration rising in the afternoon and took a short walk around the block — that helped more than I expected. Breathing intentionally made a real difference.",
      tags: ["work","stress","coping"],
      moodSnapshot: "ANXIOUS" as const,
      aiReflection: "Your awareness of your own frustration signals real emotional intelligence. The fact that you chose a walk rather than pushing through is a healthy instinct worth trusting more often. What would it look like to build that pause into your Fridays proactively?",
      daysAgo: 2,
    },
    {
      title: "A day with family",
      content: "Had lunch with my parents and sister. Reminded of how important connection is for my wellbeing. We laughed a lot. It's easy to forget how much lighter I feel after genuine time with people I love.",
      tags: ["family","gratitude","social"],
      moodSnapshot: "HAPPY" as const,
      daysAgo: 3,
    },
  ];

  for (const entry of entries) {
    const d = new Date();
    d.setDate(d.getDate() - entry.daysAgo);
    await prisma.journalEntry.create({
      data: {
        userId: user.id,
        title: entry.title,
        content: entry.content,
        tags: entry.tags,
        moodSnapshot: entry.moodSnapshot,
        aiReflection: entry.aiReflection,
        wordCount: entry.content.trim().split(/\s+/).length,
        createdAt: d,
        updatedAt: d,
      },
    });
  }

  // Habits
  const habitsData = [
    { name: "Meditation", emoji: "🧘", color: "#6366f1", streakCount: 7, longestStreak: 12 },
    { name: "Exercise", emoji: "🏃", color: "#14b8a6", streakCount: 5, longestStreak: 14 },
    { name: "Reading", emoji: "📚", color: "#2563eb", streakCount: 14, longestStreak: 14 },
    { name: "Water intake", emoji: "💧", color: "#0ea5e9", streakCount: 3, longestStreak: 7 },
    { name: "Sleep by 10pm", emoji: "😴", color: "#7c3aed", streakCount: 2, longestStreak: 5 },
  ];

  for (const h of habitsData) {
    const habit = await prisma.habit.create({
      data: { userId: user.id, ...h },
    });
    // Log completions for last 7 days
    for (let i = 0; i < 7; i++) {
      if (Math.random() > 0.25) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(8, 0, 0, 0);
        try {
          await prisma.habitLog.create({
            data: { habitId: habit.id, userId: user.id, completedAt: d },
          });
        } catch {}
      }
    }
  }

  // Goals
  await prisma.goal.createMany({
    data: [
      { userId: user.id, title: "Sleep 8 hours", emoji: "😴", category: "SLEEP", targetValue: 8, currentValue: 7, unit: "hours/night", color: "#7c3aed" },
      { userId: user.id, title: "Drink 8 glasses of water", emoji: "💧", category: "HYDRATION", targetValue: 8, currentValue: 6, unit: "glasses/day", color: "#0ea5e9" },
      { userId: user.id, title: "Exercise 4× per week", emoji: "🏃", category: "EXERCISE", targetValue: 4, currentValue: 3, unit: "days/week", color: "#16a34a" },
      { userId: user.id, title: "Journal daily", emoji: "📔", category: "JOURNALING", targetValue: 30, currentValue: 14, unit: "day streak", color: "#db2777" },
      { userId: user.id, title: "Meditate 10 min", emoji: "🧘", category: "MINDFULNESS", targetValue: 10, currentValue: 8, unit: "min/day", color: "#6366f1" },
    ],
  });

  // AI Insights
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  await prisma.aiInsight.createMany({
    data: [
      { userId: user.id, content: "Your mood has improved by 12% compared to last week. Days with exercise consistently show higher mood scores.", category: "mood_trend", periodStart: weekAgo, periodEnd: now },
      { userId: user.id, content: "You experience higher stress on Mondays and Fridays. A Sunday evening wind-down routine may help buffer Monday anxiety.", category: "habit_pattern", periodStart: weekAgo, periodEnd: now },
      { userId: user.id, content: "Your journal entries show a pattern: writing before bed correlates with calmer mornings. You've noted this connection 5 times.", category: "journal_reflection", periodStart: weekAgo, periodEnd: now },
    ],
  });

  console.log("✅ Seed complete! Demo user: demo@mindspace.app");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
