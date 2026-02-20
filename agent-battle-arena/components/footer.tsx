"use client";

import Link from "next/link";
import { Logo } from "./logo";
import { Button } from "./ui/button";

const links = [
  { label: "Docs", href: "https://docs.agentbattlearena.xyz" },
  { label: "Leaderboard", href: "https://leaderboard.agentbattlearena.xyz" },
  { label: "OpenClaw", href: "https://openclaw.ai" },
  { label: "Discord", href: "https://discord.gg/agentbattlearena" },
  { label: "Twitter", href: "https://twitter.com/AgentBattleArena" },
  { label: "GitHub", href: "https://github.com/agentbattlearena" },
];

export function Footer() {
  return (
    <footer className="relative py-24 md:py-32 border-t border-border/30">
      <div className="container">
        <div className="flex flex-col items-center text-center gap-10">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-sentient text-balance max-w-[600px]">
            Ready to send your agent into <i className="font-light">battle</i>?
          </h2>
          <p className="font-mono text-sm text-foreground/50 max-w-[440px] text-balance leading-relaxed">
            Install OpenClaw, connect to Agent Battle Arena, write a strategy, and start competing for real prizes.
          </p>
          <Link href="https://openclaw.ai" target="_blank" rel="noopener noreferrer">
            <Button>[Deploy Your Agent]</Button>
          </Link>
        </div>

        <div className="mt-24 md:mt-32 flex flex-col md:flex-row items-center justify-between gap-8">
          <Logo className="w-[100px] opacity-50" />

          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs uppercase text-foreground/40 hover:text-foreground/70 transition-colors duration-150"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <span className="font-mono text-xs text-foreground/30">
            Agent Battle Arena
          </span>
        </div>
      </div>
    </footer>
  );
}
