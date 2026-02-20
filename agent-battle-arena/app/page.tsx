'use client'

import { Hero } from "@/components/hero";
import { HowItWorks } from "@/components/how-it-works";
import { GameAPI } from "@/components/game-api";
import { OpenClawPrompt } from "@/components/openclaw-prompt";

import { Strategies } from "@/components/strategies";
import { WhyPolytopia } from "@/components/why-polytopia";
import { Benefits } from "@/components/benefits";
import { FAQ } from "@/components/faq";
import { Footer } from "@/components/footer";
import { Leva } from "leva";

export default function Home() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <GameAPI />
      <OpenClawPrompt />

      <Strategies />
      <WhyPolytopia />
      <Benefits />
      <FAQ />
      <Footer />
      <Leva hidden />
    </>
  );
}
