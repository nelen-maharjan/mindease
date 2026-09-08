import { PrismaClient, MoodType, MessageRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database…");

  // ────────────────────────────────────────────────────────────────
  // Demo User
  // ────────────────────────────────────────────────────────────────

  const user = await prisma.user.upsert({
    where: {
      email: "demo@mindspace.app",
    },
    update: {
      name: "Alex Demo",
      emailVerified: true,
      role: "ADMIN",
    },
    create: {
      id: "demo-user-001",
      email: "demo@mindspace.app",
      name: "Alex Demo",
      emailVerified: true,
      role: "ADMIN",
    },
  });

  console.log(`👤 Demo user: ${user.email}`);

  // ────────────────────────────────────────────────────────────────
  // Profile
  // ────────────────────────────────────────────────────────────────

  await prisma.userProfile.upsert({
    where: {
      userId: user.id,
    },
    update: {
      timezone: "America/New_York",
      wellnessGoal:
        "Build consistent healthy habits and manage stress better",
      dailyReminderTime: "08:00",
      journalingReminderTime: "21:00",
      notificationsEnabled: true,
      shareDataForInsights: true,
      darkMode: false,
    },
    create: {
      userId: user.id,
      timezone: "America/New_York",
      wellnessGoal:
        "Build consistent healthy habits and manage stress better",
      dailyReminderTime: "08:00",
      journalingReminderTime: "21:00",
      notificationsEnabled: true,
      shareDataForInsights: true,
      darkMode: false,
    },
  });

  // ────────────────────────────────────────────────────────────────
  // Clean existing demo data
  //
  // This makes the seed safe to run multiple times.
  // ────────────────────────────────────────────────────────────────

  await prisma.crisisFlag.deleteMany({
    where: { userId: user.id },
  });

  await prisma.chatMessage.deleteMany({
    where: {
      session: {
        userId: user.id,
      },
    },
  });

  await prisma.chatSession.deleteMany({
    where: { userId: user.id },
  });

  await prisma.notification.deleteMany({
    where: { userId: user.id },
  });

  await prisma.recommendation.deleteMany({
    where: { userId: user.id },
  });

  await prisma.aiInsight.deleteMany({
    where: { userId: user.id },
  });

  await prisma.habitLog.deleteMany({
    where: { userId: user.id },
  });

  await prisma.habit.deleteMany({
    where: { userId: user.id },
  });

  await prisma.goal.deleteMany({
    where: { userId: user.id },
  });

  await prisma.journalEntry.deleteMany({
    where: { userId: user.id },
  });

  await prisma.moodLog.deleteMany({
    where: { userId: user.id },
  });

  // ────────────────────────────────────────────────────────────────
  // Mood Logs
  // ────────────────────────────────────────────────────────────────

  const moodData: {
    mood: MoodType;
    intensity: number;
    tags: string[];
    notes?: string;
  }[] = [
    {
      mood: "HAPPY",
      intensity: 8,
      tags: ["exercise", "nature"],
      notes: "Feeling energized after my morning walk.",
    },
    {
      mood: "GOOD",
      intensity: 7,
      tags: ["work"],
      notes: "Productive day at work.",
    },
    {
      mood: "NEUTRAL",
      intensity: 5,
      tags: ["family"],
    },
    {
      mood: "SAD",
      intensity: 4,
      tags: ["work", "stress"],
      notes: "A difficult afternoon, but I managed to take a break.",
    },
    {
      mood: "ANXIOUS",
      intensity: 6,
      tags: ["health"],
    },
    {
      mood: "GOOD",
      intensity: 7,
      tags: ["nature"],
      notes: "Fresh air helped clear my head.",
    },
    {
      mood: "HAPPY",
      intensity: 8,
      tags: ["social", "family"],
    },
    {
      mood: "GOOD",
      intensity: 7,
      tags: ["exercise"],
    },
    {
      mood: "NEUTRAL",
      intensity: 5,
      tags: ["work"],
    },
    {
      mood: "GOOD",
      intensity: 7,
      tags: ["sleep"],
      notes: "Got better sleep last night.",
    },
    {
      mood: "HAPPY",
      intensity: 8,
      tags: ["nature", "exercise"],
    },
    {
      mood: "GOOD",
      intensity: 7,
      tags: ["family"],
    },
    {
      mood: "ANXIOUS",
      intensity: 5,
      tags: ["work", "stress"],
      notes: "Friday workload felt heavier than usual.",
    },
    {
      mood: "GOOD",
      intensity: 7,
      tags: ["exercise"],
      notes: "Feeling good after my morning routine.",
    },
  ];

  for (let i = 0; i < moodData.length; i++) {
    const date = new Date();

    date.setDate(date.getDate() - (moodData.length - 1 - i));
    date.setHours(9, 0, 0, 0);

    await prisma.moodLog.create({
      data: {
        userId: user.id,
        mood: moodData[i].mood,
        intensity: moodData[i].intensity,
        tags: moodData[i].tags,
        notes: moodData[i].notes,
        loggedAt: date,
      },
    });
  }

  // ────────────────────────────────────────────────────────────────
  // Journal Entries
  // ────────────────────────────────────────────────────────────────

  const journalEntries = [
    {
      title: "Morning reflections",
      content:
        "Today started with a peaceful walk through the park. The morning light was soft and golden, and I noticed how much calmer I feel when I spend time in nature before the day's demands begin.\n\nI've been thinking about my reactions to stress lately — how I tend to hold tension in my shoulders and rush my breathing. I want to be more intentional about pausing.",
      tags: ["mindfulness", "morning", "nature"],
      moodSnapshot: "GOOD" as MoodType,
      sentimentScore: 0.72,
      emotionLabels: ["calm", "hopeful", "reflective"],
      daysAgo: 0,
    },
    {
      title: "Sunday wind-down",
      content:
        "Spent the evening doing light stretching and reading. Felt grounded and ready for the week ahead. Finished a chapter of my book and made chamomile tea. Small rituals really do matter.",
      tags: ["relaxation", "evening", "gratitude"],
      moodSnapshot: "HAPPY" as MoodType,
      sentimentScore: 0.84,
      emotionLabels: ["peaceful", "grateful", "content"],
      daysAgo: 1,
    },
    {
      title: "Navigating a busy Friday",
      content:
        "Back-to-back meetings left me depleted. I noticed frustration rising in the afternoon and took a short walk around the block — that helped more than I expected. Breathing intentionally made a real difference.",
      tags: ["work", "stress", "coping"],
      moodSnapshot: "ANXIOUS" as MoodType,
      sentimentScore: -0.18,
      emotionLabels: ["anxious", "frustrated", "relieved"],
      aiReflection:
        "Your awareness of your own frustration signals real emotional intelligence. The fact that you chose a walk rather than pushing through is a healthy instinct worth trusting more often. What would it look like to build that pause into your Fridays proactively?",
      daysAgo: 2,
    },
    {
      title: "A day with family",
      content:
        "Had lunch with my parents and sister. Reminded of how important connection is for my wellbeing. We laughed a lot. It's easy to forget how much lighter I feel after genuine time with people I love.",
      tags: ["family", "gratitude", "social"],
      moodSnapshot: "HAPPY" as MoodType,
      sentimentScore: 0.9,
      emotionLabels: ["happy", "grateful", "connected"],
      daysAgo: 3,
    },
    {
      title: "Making space to breathe",
      content:
        "Today I tried something different. Instead of immediately responding to every notification, I put my phone away for thirty minutes and focused on one thing at a time. I felt noticeably less scattered afterward.",
      tags: ["mindfulness", "focus", "digital-wellness"],
      moodSnapshot: "GOOD" as MoodType,
      sentimentScore: 0.68,
      emotionLabels: ["focused", "calm", "motivated"],
      daysAgo: 5,
    },
  ];

  for (const entry of journalEntries) {
    const date = new Date();

    date.setDate(date.getDate() - entry.daysAgo);
    date.setHours(20, 0, 0, 0);

    await prisma.journalEntry.create({
      data: {
        userId: user.id,
        title: entry.title,
        content: entry.content,
        tags: entry.tags,
        moodSnapshot: entry.moodSnapshot,
        aiReflection: entry.aiReflection,
        sentimentScore: entry.sentimentScore,
        emotionLabels: entry.emotionLabels,
        wordCount: entry.content.trim().split(/\s+/).length,
        createdAt: date,
        updatedAt: date,
      },
    });
  }

  // ────────────────────────────────────────────────────────────────
  // Habits
  // ────────────────────────────────────────────────────────────────

  const habitsData = [
    {
      name: "Meditation",
      emoji: "🧘",
      color: "#6366f1",
      description: "Spend at least 10 minutes practicing mindfulness.",
      frequency: "daily",
      targetDays: 7,
      streakCount: 7,
      longestStreak: 12,
    },
    {
      name: "Exercise",
      emoji: "🏃",
      color: "#14b8a6",
      description: "Move your body through walking, running, or another workout.",
      frequency: "daily",
      targetDays: 5,
      streakCount: 5,
      longestStreak: 14,
    },
    {
      name: "Reading",
      emoji: "📚",
      color: "#2563eb",
      description: "Read for at least 20 minutes.",
      frequency: "daily",
      targetDays: 7,
      streakCount: 14,
      longestStreak: 14,
    },
    {
      name: "Water intake",
      emoji: "💧",
      color: "#0ea5e9",
      description: "Drink enough water throughout the day.",
      frequency: "daily",
      targetDays: 7,
      streakCount: 3,
      longestStreak: 7,
    },
    {
      name: "Sleep by 10pm",
      emoji: "😴",
      color: "#7c3aed",
      description: "Start winding down early enough to get quality sleep.",
      frequency: "daily",
      targetDays: 7,
      streakCount: 2,
      longestStreak: 5,
    },
  ];

  for (const habitData of habitsData) {
    const habit = await prisma.habit.create({
      data: {
        userId: user.id,
        ...habitData,
      },
    });

    // Deterministic completion pattern for the last 7 days.
    // This avoids Math.random() making the seed inconsistent.
    const completionPattern = [
      true,
      true,
      false,
      true,
      true,
      false,
      true,
    ];

    for (let i = 0; i < 7; i++) {
      if (!completionPattern[i]) continue;

      const completedAt = new Date();

      completedAt.setDate(completedAt.getDate() - i);
      completedAt.setHours(8, 0, 0, 0);

      await prisma.habitLog.create({
        data: {
          habitId: habit.id,
          userId: user.id,
          completedAt,
          notes:
            i === 0
              ? "Completed during my morning routine."
              : undefined,
        },
      });
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Goals
  // ────────────────────────────────────────────────────────────────

  await prisma.goal.createMany({
    data: [
      {
        userId: user.id,
        title: "Sleep 8 hours",
        description: "Maintain a consistent 8-hour sleep routine.",
        emoji: "😴",
        category: "SLEEP",
        targetValue: 8,
        currentValue: 7,
        unit: "hours/night",
        color: "#7c3aed",
        isCompleted: false,
      },
      {
        userId: user.id,
        title: "Drink 8 glasses of water",
        description: "Stay hydrated throughout the day.",
        emoji: "💧",
        category: "HYDRATION",
        targetValue: 8,
        currentValue: 6,
        unit: "glasses/day",
        color: "#0ea5e9",
        isCompleted: false,
      },
      {
        userId: user.id,
        title: "Exercise 4× per week",
        description: "Exercise at least four days every week.",
        emoji: "🏃",
        category: "EXERCISE",
        targetValue: 4,
        currentValue: 3,
        unit: "days/week",
        color: "#16a34a",
        isCompleted: false,
      },
      {
        userId: user.id,
        title: "Journal daily",
        description: "Keep a consistent journaling practice.",
        emoji: "📔",
        category: "JOURNALING",
        targetValue: 30,
        currentValue: 14,
        unit: "day streak",
        color: "#db2777",
        isCompleted: false,
      },
      {
        userId: user.id,
        title: "Meditate 10 min",
        description: "Practice mindfulness for at least 10 minutes each day.",
        emoji: "🧘",
        category: "MINDFULNESS",
        targetValue: 10,
        currentValue: 8,
        unit: "min/day",
        color: "#6366f1",
        isCompleted: false,
      },
    ],
  });

  // ────────────────────────────────────────────────────────────────
  // Chat Session + Messages
  // ────────────────────────────────────────────────────────────────

  const chatSession = await prisma.chatSession.create({
    data: {
      userId: user.id,
      title: "Managing work stress",
    },
  });

  await prisma.chatMessage.createMany({
    data: [
      {
        sessionId: chatSession.id,
        role: MessageRole.USER,
        content:
          "I've been feeling stressed because I have several deadlines coming up.",
        crisisDetected: false,
      },
      {
        sessionId: chatSession.id,
        role: MessageRole.ASSISTANT,
        content:
          "That sounds like a lot to carry at once. Let's break it down into smaller pieces. Which deadline feels most urgent right now?",
        crisisDetected: false,
      },
      {
        sessionId: chatSession.id,
        role: MessageRole.USER,
        content:
          "The project due Friday. I think I need to stop trying to do everything at once.",
        crisisDetected: false,
      },
      {
        sessionId: chatSession.id,
        role: MessageRole.ASSISTANT,
        content:
          "That sounds like a helpful realization. Try choosing one concrete task for the next 25 minutes, then take a short break. You don't have to solve the entire project in one sitting.",
        crisisDetected: false,
      },
    ],
  });

  // ────────────────────────────────────────────────────────────────
  // Recommendations
  // ────────────────────────────────────────────────────────────────

  await prisma.recommendation.createMany({
    data: [
      {
        userId: user.id,
        type: "BREATHING",
        title: "Try a 2-minute breathing reset",
        description:
          "Slow your breathing for two minutes to create a small pause during stressful moments.",
        reason:
          "You've recently mentioned work-related stress and intentional breathing has helped before.",
        isRead: false,
        isDismissed: false,
      },
      {
        userId: user.id,
        type: "WALKING",
        title: "Take a short walk",
        description:
          "Step outside for 10–15 minutes and give yourself some distance from your current task.",
        reason:
          "Your journal entries suggest walks consistently help you recover from stressful moments.",
        isRead: false,
        isDismissed: false,
      },
      {
        userId: user.id,
        type: "JOURNALING_PROMPT",
        title: "What can wait until tomorrow?",
        description:
          "Write down everything on your mind, then identify one thing that does not need your attention tonight.",
        reason:
          "Creating boundaries around work may help reduce evening stress.",
        isRead: true,
        isDismissed: false,
      },
      {
        userId: user.id,
        type: "SLEEP_TIP",
        title: "Protect your wind-down routine",
        description:
          "Try putting screens away 30 minutes before bed and keeping your evening routine predictable.",
        reason:
          "Your journal entries suggest that evening rituals help you feel more grounded.",
        isRead: false,
        isDismissed: false,
      },
      {
        userId: user.id,
        type: "GRATITUDE",
        title: "Name three good things",
        description:
          "Before bed, write down three things that went well today, however small.",
        reason:
          "Your recent entries show that gratitude and connection are associated with better moods.",
        isRead: false,
        isDismissed: false,
      },
    ],
  });

  // ────────────────────────────────────────────────────────────────
  // Notifications
  // ────────────────────────────────────────────────────────────────

  await prisma.notification.createMany({
    data: [
      {
        userId: user.id,
        type: "DAILY_REMINDER",
        title: "Good morning, Alex ☀️",
        message:
          "Take a moment to check in with yourself and log how you're feeling today.",
        isRead: true,
      },
      {
        userId: user.id,
        type: "HABIT_REMINDER",
        title: "Keep your streak going 🔥",
        message:
          "Your meditation streak is at 7 days. A few mindful minutes today can keep it going.",
        isRead: false,
      },
      {
        userId: user.id,
        type: "JOURNAL_REMINDER",
        title: "Time to reflect ✍️",
        message:
          "How did today feel? A few sentences are enough.",
        isRead: false,
      },
      {
        userId: user.id,
        type: "MILESTONE",
        title: "You're building momentum 🎉",
        message:
          "You've logged your mood for 14 consecutive days.",
        isRead: false,
      },
      {
        userId: user.id,
        type: "INSIGHT",
        title: "A new insight is available",
        message:
          "Your recent journal entries reveal an interesting connection between movement and stress.",
        isRead: false,
      },
    ],
  });

  // ────────────────────────────────────────────────────────────────
  // AI Insights
  // ────────────────────────────────────────────────────────────────

  const now = new Date();

  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  await prisma.aiInsight.createMany({
    data: [
      {
        userId: user.id,
        content:
          "Your mood has improved by 12% compared with the previous week. Days with exercise consistently show higher mood scores.",
        category: "mood_trend",
        periodStart: weekAgo,
        periodEnd: now,
      },
      {
        userId: user.id,
        content:
          "You appear to experience higher stress around Mondays and Fridays. A Sunday evening wind-down routine may help create a smoother transition into the week.",
        category: "habit_pattern",
        periodStart: twoWeeksAgo,
        periodEnd: now,
      },
      {
        userId: user.id,
        content:
          "Your journal entries show a recurring pattern: writing before bed appears to be associated with calmer mornings. You've noted this connection several times.",
        category: "journal_reflection",
        periodStart: twoWeeksAgo,
        periodEnd: now,
      },
      {
        userId: user.id,
        content:
          "Social connection appears to have a positive relationship with your mood. Your happiest recent entries frequently mention family or meaningful time with others.",
        category: "mood_correlation",
        periodStart: twoWeeksAgo,
        periodEnd: now,
      },
    ],
  });

  // ────────────────────────────────────────────────────────────────
  // Crisis Flags
  //
  // Keep this empty in the demo seed unless you specifically need
  // to test the crisis-management UI.
  // ────────────────────────────────────────────────────────────────

  console.log("🧠 AI insights seeded");
  console.log("💬 Chat session seeded");
  console.log("🎯 Goals seeded");
  console.log("🔁 Habits and habit logs seeded");
  console.log("📓 Journal entries seeded");
  console.log("😊 Mood logs seeded");
  console.log("🔔 Notifications seeded");
  console.log("💡 Recommendations seeded");
  console.log("🚨 No active crisis flags seeded");

  console.log("\n✅ Seed complete!");
  console.log("📧 Demo user: demo@mindspace.app");
  console.log("🔑 Password: demo1234");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
