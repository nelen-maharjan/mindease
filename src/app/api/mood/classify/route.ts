import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { z } from "zod";
import { classifyMood } from "@/lib/ml";

const classifySchema = z.object({
  text: z.string().min(1).max(5000),
});

type MappedMood = "HAPPY" | "GOOD" | "NEUTRAL" | "SAD" | "DEPRESSED" | "ANGRY" | "ANXIOUS" | "EXHAUSTED";

const BASE_LABEL_TO_MOOD: Record<string, MappedMood> = {
  happy: "HAPPY",
  calm: "GOOD",
  sad: "SAD",
  anxious: "ANXIOUS",
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = classifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const text = parsed.data.text.toLowerCase();
    const result = await classifyMood(parsed.data.text);
    if (!result) {
      return NextResponse.json(
        { error: "ML service is currently unavailable" },
        { status: 503 }
      );
    }

    const isUncertain = Boolean(result.isUncertain || result.label.toLowerCase() === "uncertain");
    let mappedMood: MappedMood | null = isUncertain ? null : (BASE_LABEL_TO_MOOD[result.label.toLowerCase()] || null);

    // Refine mapped mood based on specific tiredness / anger / depression signals in text
    if (mappedMood) {
      const containsExhaustion = /(sleep|sleeping|tired|exhausted|drained|fatigued|no energy|burnout|burnt out)/.test(text);
      const containsAnger = /(angry|furious|mad|annoyed|frustrated|rage)/.test(text);
      const containsDepression = /(depressed|hopeless|miserable|empty|worthless)/.test(text);

      if (containsExhaustion && (mappedMood === "ANXIOUS" || mappedMood === "SAD")) {
        mappedMood = "EXHAUSTED";
      } else if (containsAnger) {
        mappedMood = "ANGRY";
      } else if (containsDepression && mappedMood === "SAD") {
        mappedMood = "DEPRESSED";
      }
    }

    return NextResponse.json({
      data: {
        label: result.label,
        confidence: result.confidence,
        probabilities: result.probabilities || {},
        isUncertain,
        mappedMood,
      },
    });
  } catch (error) {
    console.error("POST /api/mood/classify error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
