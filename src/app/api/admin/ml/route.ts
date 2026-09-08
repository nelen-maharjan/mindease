import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin";
import { getMlModelInfo, retrainMlModel } from "@/lib/ml";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const info = await getMlModelInfo();
  return NextResponse.json({ data: info });
}

export async function POST() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const result = await retrainMlModel();
    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Training failed" },
      { status: 502 }
    );
  }
}
