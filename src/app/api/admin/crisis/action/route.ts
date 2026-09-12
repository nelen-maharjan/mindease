import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/admin";
import { z } from "zod";

const actionSchema = z.object({
  flagId: z.string(),
  action: z.enum([
    "SEND_SAFETY_NOTIFICATION",
    "RESOLVE_WITH_OUTREACH",
    "LOG_DIRECT_OUTREACH",
  ]),
  customMessage: z.string().optional(),
  resolutionNote: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const parsed = actionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
    }

    const { flagId, action, customMessage, resolutionNote } = parsed.data;

    const flag = await prisma.crisisFlag.findUnique({
      where: { id: flagId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!flag) {
      return NextResponse.json({ error: "Crisis flag not found" }, { status: 404 });
    }

    const userId = flag.userId;
    const userName = flag.user.name || "there";

    let notificationCreated = false;

    // 1. Send Safety Support Notification to User
    if (action === "SEND_SAFETY_NOTIFICATION" || action === "RESOLVE_WITH_OUTREACH") {
      const defaultMsg = customMessage ||
        `Hi ${userName}, our MindEase support team noticed you've been going through a difficult time and wanted to check in. Your safety and well-being matter deeply to us. If you are experiencing intense distress or suicidal thoughts, please connect with the 988 Suicide & Crisis Lifeline by calling or texting 988 (free, 24/7, confidential). You don't have to carry this alone.`;

      await prisma.notification.create({
        data: {
          userId,
          title: "MindEase Support — Safety & Well-being Check 🌿",
          message: defaultMsg,
          type: "MOTIVATIONAL_QUOTE",
        },
      });
      notificationCreated = true;
    }

    // 2. Update Crisis Flag if resolving
    let updatedFlag = flag;
    if (action === "RESOLVE_WITH_OUTREACH" || action === "LOG_DIRECT_OUTREACH") {
      const note = resolutionNote ||
        (action === "RESOLVE_WITH_OUTREACH"
          ? "Resolved via automated safety check notification & 988 crisis helpline outreach."
          : "Logged direct admin outreach to user via email.");

      updatedFlag = await prisma.crisisFlag.update({
        where: { id: flagId },
        data: {
          resolvedAt: new Date(),
          resolutionNote: note,
        },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
    }

    return NextResponse.json({
      data: {
        flag: updatedFlag,
        notificationCreated,
        action,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("POST /api/admin/crisis/action error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
