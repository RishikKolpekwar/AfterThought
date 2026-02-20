import { NextRequest, NextResponse } from "next/server";
import { executeAgentTurn } from "@/lib/agent-turn";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { matchId, apiToken, model, apiKey, skillsMd } = await req.json();

    if (!matchId || !apiToken || !model || !apiKey) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await executeAgentTurn({
      matchId,
      apiToken,
      model,
      apiKey,
      skillsMd,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[agent-turn] Error:", err);
    return NextResponse.json(
      { status: "error", error: err.message },
      { status: 500 }
    );
  }
}
