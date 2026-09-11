import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { z } from "zod";

async function getUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return session.user;
}

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [dbUser, profile] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, email: true, createdAt: true },
    }),
    prisma.userProfile.findUnique({ where: { userId: user.id } }),
  ]);

  return NextResponse.json({
    data: {
      user: dbUser,
      profile: profile ?? {
        bio: null,
        timezone: "UTC",
        wellnessGoal: null,
        dailyReminderTime: null,
        journalingReminderTime: null,
        notificationsEnabled: true,
        shareDataForInsights: true,
        darkMode: false,
      },
    },
  });
}

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  bio: z.string().max(500).nullable().optional(),
  timezone: z.string().max(60).optional(),
  wellnessGoal: z.string().max(200).nullable().optional(),
  dailyReminderTime: z.string().max(8).nullable().optional(),
  journalingReminderTime: z.string().max(8).nullable().optional(),
  notificationsEnabled: z.boolean().optional(),
  shareDataForInsights: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const { name, ...profileFields } = parsed.data;

  const [updatedUser, updatedProfile] = await Promise.all([
    name !== undefined
      ? prisma.user.update({ where: { id: user.id }, data: { name }, select: { id: true, name: true, email: true } })
      : prisma.user.findUnique({ where: { id: user.id }, select: { id: true, name: true, email: true } }),
    Object.keys(profileFields).length > 0
      ? prisma.userProfile.upsert({
          where: { userId: user.id },
          update: profileFields,
          create: { userId: user.id, ...profileFields },
        })
      : prisma.userProfile.findUnique({ where: { userId: user.id } }),
  ]);

  return NextResponse.json({ data: { user: updatedUser, profile: updatedProfile } });
}
