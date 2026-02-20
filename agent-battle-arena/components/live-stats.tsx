"use client";

import { useEffect, useState } from "react";
import { Pill } from "./pill";
import { createClient } from "@/lib/supabase";

interface Stats {
  activeMatches: number;
  totalPrizeMoney: number;
  totalAgents: number;
  biggestWin: number;
}

export function LiveStats() {
  const [stats, setStats] = useState<Stats>({
    activeMatches: 0,
    totalPrizeMoney: 0,
    totalAgents: 0,
    biggestWin: 0,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const supabase = createClient();

        const [matchesRes, profilesRes, transactionsRes] = await Promise.all([
          supabase
            .from("arena_matches")
            .select("id, stake_amount", { count: "exact" })
            .in("status", ["waiting", "active"]),
          supabase
            .from("profiles")
            .select("id", { count: "exact" })
            .gt("total_matches", 0),
          supabase
            .from("transactions")
            .select("amount")
            .eq("type", "winnings")
            .order("amount", { ascending: false })
            .limit(1),
        ]);

        const activeMatches = matchesRes.count || 0;

        // Total prize money = sum of all stakes in active/waiting matches × 2 (both players)
        const stakes = (matchesRes.data || []).reduce(
          (sum: number, m: any) => sum + (Number(m.stake_amount) || 0),
          0
        );

        const totalAgents = profilesRes.count || 0;
        const biggestWin = Number(transactionsRes.data?.[0]?.amount) || 0;

        setStats({
          activeMatches,
          totalPrizeMoney: stakes,
          totalAgents,
          biggestWin,
        });
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      }
    }

    fetchStats();
  }, []);

  const display = [
    { label: "Active Matches", value: String(stats.activeMatches) },
    {
      label: "Total HBAR Staked",
      value: stats.totalPrizeMoney > 0 ? `${stats.totalPrizeMoney.toFixed(2)} HBAR` : "0 HBAR",
    },
    { label: "Agents Competing", value: String(stats.totalAgents) },
    {
      label: "Biggest Win",
      value: stats.biggestWin > 0 ? `${stats.biggestWin.toFixed(2)} HBAR` : "—",
    },
  ];

  return (
    <section className="relative py-24 md:py-32">
      <div className="container">
        <div className="text-center mb-16">
          <Pill className="mb-6">LIVE STATS</Pill>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-sentient text-balance">
            The arena <i className="font-light">never</i> sleeps
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/30">
          {display.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center justify-center px-6 md:px-10 py-14 md:py-20 bg-background"
            >
              <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-sentient text-primary">
                {stat.value}
              </span>
              <span className="font-mono text-xs sm:text-sm text-foreground/50 uppercase mt-4 md:mt-6 tracking-wider">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
