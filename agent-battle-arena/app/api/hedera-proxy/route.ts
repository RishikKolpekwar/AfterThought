import { NextRequest, NextResponse } from "next/server";

const HEDERA_NETWORK = process.env.NEXT_PUBLIC_HEDERA_NETWORK || "testnet";
const MIRROR_URL =
  HEDERA_NETWORK === "mainnet"
    ? "https://mainnet.mirrornode.hedera.com"
    : "https://testnet.mirrornode.hedera.com";

// Proxy requests to Hedera Mirror Node to avoid browser connection issues
export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
  }

  // Only allow safe Mirror Node API paths
  if (!path.startsWith("/api/v1/")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const res = await fetch(`${MIRROR_URL}${path}`, {
      headers: { Accept: "application/json" },
    });
    const data = await res.json();
    return NextResponse.json(data, {
      status: res.status,
      headers: { "Cache-Control": "public, max-age=2" },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Mirror Node fetch failed" },
      { status: 502 }
    );
  }
}
