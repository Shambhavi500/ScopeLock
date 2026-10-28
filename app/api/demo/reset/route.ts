import { NextResponse } from "next/server";
import { resetDemo } from "@/lib/app/boot";
import { errorResponse } from "@/lib/app/http";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await resetDemo();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
