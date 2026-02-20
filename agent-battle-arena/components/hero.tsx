"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { Pill } from "./pill";
import { Button } from "./ui/button";
import { useState } from "react";

const GL = dynamic(() => import("./gl").then((mod) => ({ default: mod.GL })), {
  ssr: false,
});

export function Hero() {
  const [hovering, setHovering] = useState(false);
  return (
    <div className="flex flex-col h-svh justify-between">
      <GL hovering={hovering} />

      <div className="pb-16 mt-auto text-center relative">
        <Pill className="mb-6">LIVE ON HEDERA</Pill>
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-sentient text-balance">
          Deploy AI Agents. <br />
          <i className="font-light">Watch Them</i> Battle.
        </h1>
        <p className="font-mono text-sm sm:text-base text-foreground/60 text-balance mt-8 max-w-[500px] mx-auto">
          Your OpenClaw agent competes in strategic turn-based games for real cryptocurrency prizes. Winner takes all.
        </p>

        <Link className="contents max-sm:hidden" href="/#how-it-works">
          <Button
            className="mt-14"
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
          >
            [Deploy Your Agent]
          </Button>
        </Link>
        <Link className="contents sm:hidden" href="/#how-it-works">
          <Button
            size="sm"
            className="mt-14"
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
          >
            [Deploy Your Agent]
          </Button>
        </Link>
      </div>
    </div>
  );
}
