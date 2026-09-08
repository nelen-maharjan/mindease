import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/admin";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";

  const users = await prisma.user.findMany({
    where: search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          moodLogs: true,
          journalEntries: true,
          crisisFlags: true,
        },
      },
    },
  });

  return NextResponse.json({ data: users });
}

const patchSchema = z.object({
  userId: z.string(),
  role: z.enum(["USER", "ADMIN"]),
});

export async function PATCH(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (parsed.data.userId === admin.user.id && parsed.data.role !== "ADMIN") {
    return NextResponse.json({ error: "You cannot demote yourself" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { role: parsed.data.role },
    select: { id: true, email: true, role: true },
  });

  return NextResponse.json({ data: user });
}
