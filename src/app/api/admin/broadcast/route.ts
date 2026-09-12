import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/admin";
import { z } from "zod";

const broadcastSchema = z.object({
  title: z.string().min(1).max(120),
  message: z.string().min(1).max(1000),
  type: z.enum([
    "DAILY_REMINDER",
    "JOURNAL_REMINDER",
    "HABIT_REMINDER",
    "MOTIVATIONAL_QUOTE",
    "MILESTONE",
    "INSIGHT",
  ]).default("MOTIVATIONAL_QUOTE"),
  targetRole: z.enum(["ALL", "USER", "ADMIN"]).default("ALL"),
});

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const parsed = broadcastSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
    }

    const { title, message, type, targetRole } = parsed.data;

    // Get recipient user IDs
    const where: Record<string, unknown> = {};
    if (targetRole !== "ALL") {
      where.role = targetRole;
    }

    const recipientUsers = await prisma.user.findMany({
      where,
      select: { id: true },
    });

    if (recipientUsers.length === 0) {
      return NextResponse.json({ error: "No target users found" }, { status: 400 });
    }

    // Bulk create notifications
    const notifications = recipientUsers.map((u) => ({
      userId: u.id,
      title,
      message,
      type,
      isRead: false,
    }));

    await prisma.notification.createMany({
      data: notifications,
    });

    return NextResponse.json({
      data: {
        recipientsCount: recipientUsers.length,
        title,
        message,
        type,
        sentAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("POST /api/admin/broadcast error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
