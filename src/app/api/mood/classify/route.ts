import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { z } from "zod";
import { classifyMood } from "@/lib/ml";

const classifySchema = z.object({
  text: z.string().min(1).max(5000),
});

const LABEL_TO_MOOD: Record<string, "HAPPY" | "GOOD" | "SAD" | "ANXIOUS"> = {
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

    const result = await classifyMood(parsed.data.text);
    if (!result) {
      return NextResponse.json(
        { error: "ML service is currently unavailable" },
        { status: 503 }
      );
    }

    const isUncertain = Boolean(result.isUncertain || result.label.toLowerCase() === "uncertain");
    const mappedMood = isUncertain ? null : (LABEL_TO_MOOD[result.label.toLowerCase()] || null);

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
