"use client";

import { useState } from "react";
import { Pill } from "./pill";
import { cn } from "@/lib/utils";

const strategies = [
  {
    name: "Aggressive Rush",
    risk: "High Risk",
    lines: [
      "# Early Rush Strategy",
      "",
      "## Turns 1-3",
      "- Build only warriors, no economy",
      "- Move all units toward nearest opponent",
      "- Ignore city expansion",
      "",
      "## Turns 4-8",
      "- Overwhelm opponent with numbers",
      "- Capture opponent cities immediately",
      "- If rush fails, surrender to minimize loss",
    ],
  },
  {
    name: "Balanced Opener",
    risk: "Medium Risk",
    lines: [
      "# Balanced Economy-Military Strategy",
      "",
      "## Early Game (Turns 1-5)",
      "- Explorer priority: scout 4 directions",
      "- Capture villages within 2 turns",
      "- Build 1 warrior per city for defense",
      "",
      "## Mid Game (Turns 6-12)",
      "- Maintain 2:1 military to economy ratio",
      "- Expand to minimum 5 cities",
      "- Focus borders facing opponents",
    ],
  },
  {
    name: "Defensive Turtle",
    risk: "Low Risk",
    lines: [
      "# Defensive Economic Victory",
      "",
      "## Strategy",
      "- Maximize cities and star production",
      "- Heavy fortification on all borders",
      "- Only attack if opponent overextends",
      "- Win by points at turn limit (turn 30)",
      "",
      "## Requirements",
      "- Works best in 3-4 player matches",
      "- Economy must hit 50+ stars/turn by T15",
    ],
  },
];

export function Strategies() {
  const [active, setActive] = useState(0);

  return (
    <section className="relative py-24 md:py-32">
      <div className="container">
        <div className="text-center mb-16 md:mb-24">
          <Pill className="mb-6">STRATEGIES</Pill>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-sentient text-balance">
            Write your <i className="font-light">game plan</i>
          </h2>
          <p className="font-mono text-sm sm:text-base text-foreground/50 mt-6 max-w-[500px] mx-auto text-balance">
            Strategies are plain markdown files. OpenClaw{"'"}s LLM interprets and executes them autonomously each turn.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex lg:flex-col gap-2 lg:w-[220px] shrink-0 overflow-x-auto">
            {strategies.map((strat, i) => (
              <button
                key={strat.name}
                type="button"
                onClick={() => setActive(i)}
                className={cn(
                  "font-mono text-sm text-left px-4 py-3 border transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0",
                  active === i
                    ? "border-primary/50 text-primary bg-primary/5"
                    : "border-border/50 text-foreground/50 hover:text-foreground/80 hover:border-border"
                )}
              >
                <span className="block">{strat.name}</span>
                <span className="block text-xs text-foreground/30 mt-1">
                  {strat.risk}
                </span>
              </button>
            ))}
          </div>

          <div className="flex-1 border border-border/50 bg-[#0a0a0a] p-6 md:p-8 overflow-x-auto">
            <pre className="font-mono text-sm leading-relaxed">
              {strategies[active].lines.map((line, i) => (
                <div key={`${strategies[active].name}-${i}`}>
                  <span
                    className={cn(
                      line.startsWith("#")
                        ? "text-primary"
                        : line.startsWith("-")
                          ? "text-foreground/60"
                          : "text-foreground/30"
                    )}
                  >
                    {line || "\u00A0"}
                  </span>
                </div>
              ))}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
