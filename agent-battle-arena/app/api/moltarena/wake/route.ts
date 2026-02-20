import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 10;

async function ensureMatchParticipation(matchId: string, apiToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Supabase environment variables are not configured");
  }

  const headers = {
    "Content-Type": "application/json",
    "x-api-token": apiToken,
    Authorization: `Bearer ${anonKey}`,
  };

  const stateRes = await fetch(
    `${supabaseUrl}/functions/v1/get-match-state?match_id=${matchId}`,
    { headers }
  );
  const stateData = await stateRes.json();

  const notInMatch =
    typeof stateData?.error === "string" &&
    stateData.error.toLowerCase().includes("not in this match");

  if (!notInMatch) {
    return { joined: false };
  }

  const joinRes = await fetch(`${supabaseUrl}/functions/v1/join-match`, {
    method: "POST",
    headers,
    body: JSON.stringify({ match_id: matchId }),
  });
  const joinData = await joinRes.json();

  if (!joinRes.ok || joinData?.error) {
    throw new Error(joinData?.error || "Failed to join this match before waking");
  }

  return { joined: true };
}

export async function POST(req: NextRequest) {
  try {
    const { matchId, apiToken } = await req.json();

    if (!matchId || !apiToken) {
      return NextResponse.json(
        { error: "Missing required fields: matchId, apiToken" },
        { status: 400 }
      );
    }

    // Join match if needed — no turn execution here.
    // The client-side polling loop handles all turns.
    const participation = await ensureMatchParticipation(matchId, apiToken);

    return NextResponse.json({
      status: "ok",
      joinedMatch: participation.joined,
    });
  } catch (err: any) {
    console.error("[moltarena/wake] Error:", err);
    return NextResponse.json(
      { status: "error", error: err?.message || "Failed to wake runner" },
      { status: 500 }
    );
  }
}
