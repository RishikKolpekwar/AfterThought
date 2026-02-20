import { NextRequest, NextResponse } from "next/server";
import { stopRunner } from "@/lib/moltarena-runner";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { matchId } = await req.json();

    if (!matchId) {
      return NextResponse.json({ error: "Missing required field: matchId" }, { status: 400 });
    }

    const result = stopRunner(matchId);
    return NextResponse.json({ status: result.stopped ? "stopped" : "not_found", ...result });
  } catch (err: any) {
    console.error("[moltarena/stop] Error:", err);
    return NextResponse.json(
      { status: "error", error: err?.message || "Failed to stop runner" },
      { status: 500 }
    );
  }
}
