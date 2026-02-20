import { NextRequest, NextResponse } from "next/server";
import { getAllRunnerStatuses, getRunnerStatus } from "@/lib/moltarena-runner";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const matchId = req.nextUrl.searchParams.get("matchId");

    if (matchId) {
      const status = getRunnerStatus(matchId);
      return NextResponse.json({ status: status ? "ok" : "not_found", runner: status });
    }

    return NextResponse.json({ status: "ok", runners: getAllRunnerStatuses() });
  } catch (err: any) {
    console.error("[moltarena/status] Error:", err);
    return NextResponse.json(
      { status: "error", error: err?.message || "Failed to fetch status" },
      { status: 500 }
    );
  }
}
