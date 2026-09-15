"use client";

import { useEffect, useRef } from "react";
import { useStudioStore } from "@/store/studioStore";

/**
 * useBobProactive
 * ================
 * Fires contextual BOB messages at two moments:
 *
 *   1. Step entry  — 1.5 s after the user arrives on a new studio step.
 *                    Personalised with skin tone, height, style from studioStore.
 *                    Never fires the same step twice in a session.
 *
 *   2. Idle nudge  — if the user has been on the same step for 30 s without
 *                    moving forward, BOB gently asks if they need help.
 *                    Only fires once per step per session.
 *
 * Dispatches a `bob:proactive` CustomEvent that ChatWidget listens to.
 * Zero prop drilling — works from any component tree depth.
 */

export type ProactivePayload = {
  text: string;
  quickReplies?: string[];
};

/** Fire a BOB proactive message via the global event bus. */
export function fireBobMessage(payload: ProactivePayload) {
  window.dispatchEvent(new CustomEvent("bob:proactive", { detail: payload }));
}

//  Step entry messages 

function getStepMessage(
  step: number,
  ctx: ReturnType<ReturnType<typeof useStudioStore.getState>["getBobContext"]>
): ProactivePayload | null {
  const style = ctx.selectedStyle
    ? ctx.selectedStyle.replace(/_/g, " ")
    : null;
  const tone  = ctx.skinTone?.displayName ?? null;
  const height = ctx.measurements?.height ?? null;

  switch (step) {
    case 0:
      return {
        text: "Welcome to the Studio! Let's start by picking a dress style.\nNot sure which one? I can help you decide.",
        quickReplies: ["What style suits me?", "Explain each style", "What's a Ghagra?"],
      };

    case 1:
      return {
        text: style
          ? `Nice choice -- **${style}**!\n\nNow upload a reference photo of the design you have in mind. Clear photos on plain backgrounds work best -- I'll clean it up either way.`
          : "Now upload a reference photo of your dress design. The clearer the better -- I'll handle the rest.",
        quickReplies: ["What makes a good photo?", "Can I use a sketch?"],
      };

    case 2: {
      const contextParts: string[] = [];
      if (tone)  contextParts.push(`I can see your skin tone is **${tone}**`);
      if (style) contextParts.push(`you're going for a **${style}**`);

      const intro = contextParts.length > 0
        ? `${contextParts.join(", ")} -- I'll keep all of that in mind for fabric and colour suggestions.`
        : "Time to enter your measurements -- all in centimetres.";

      return {
        text: `${intro}\n\nNeed help taking a measurement? Just ask.`,
        quickReplies: ["How to measure chest?", "How to measure hip?", "What is ease allowance?"],
      };
    }

    case 3: {
      let heightNote = "";
      if (height && height < 155) {
        heightNote = "\n\nSince you're on the petite side, I'd avoid very heavy fabrics -- they can overwhelm the silhouette. Ask me for alternatives!";
      } else if (height && height > 170) {
        heightNote = "\n\nYour height is perfect for dramatic floor-length styles -- Anarkali and full Ghagra will look stunning on you.";
      }
      return {
        text: `Here's your 3D preview! Rotate it, zoom in, check the fit from all angles.${heightNote}`,
        quickReplies: ["Suggest a fabric for this style", "How does this look for a wedding?", "Explain the silhouette"],
      };
    }

    case 4:
      return {
        text: "Your tailor-ready pattern is ready!\n\nEach panel includes a **1.5 cm seam allowance**. Print at **1:1 scale** and cut directly on the lines -- no extra margin needed.",
        quickReplies: ["Explain the panels", "What is seam allowance?", "How do I hand this to a tailor?"],
      };

    default:
      return null;
  }
}

//  Idle nudge messages 

const IDLE_MESSAGES: Record<number, ProactivePayload> = {
  0: {
    text: "Still deciding on a style? I can help! Tell me the occasion and I'll narrow it down for you.",
    quickReplies: ["Help me choose", "What's best for a wedding?", "What's most popular?"],
  },
  1: {
    text: "Having trouble with the photo? Even a photo of a dress on a hanger works well. I'll isolate the design.",
    quickReplies: ["What file formats work?", "Can I use a screenshot?"],
  },
  2: {
    text: "Measurements can be tricky -- want me to walk you through each one step by step?",
    quickReplies: ["Yes, walk me through it", "Which measurement matters most?"],
  },
  3: {
    text: "The 3D preview might take a moment if the backend is still processing. In the meantime -- want fabric suggestions for this style?",
    quickReplies: ["Suggest fabrics", "What colours suit me?"],
  },
  4: {
    text: "Ready to take the pattern to your tailor? I can explain what each panel means if that helps.",
    quickReplies: ["Explain the panels", "What should I tell my tailor?"],
  },
};

//  Hook 

const STEP_DELAY_MS  = 1500;  // wait before step entry message
const IDLE_DELAY_MS  = 30000; // 30 s idle before nudge

export function useBobProactive(currentStep: number) {
  const getBobContext     = useStudioStore((s) => s.getBobContext);
  const firedSteps        = useRef<Set<number>>(new Set());
  const firedIdleSteps    = useRef<Set<number>>(new Set());
  const stepTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    //  Clear previous timers on step change 
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    //  Step entry message 
    if (!firedSteps.current.has(currentStep)) {
      stepTimerRef.current = setTimeout(() => {
        const ctx     = getBobContext();
        const payload = getStepMessage(currentStep, ctx);
        if (payload) {
          fireBobMessage(payload);
          firedSteps.current.add(currentStep);
        }
      }, STEP_DELAY_MS);
    }

    //  Idle nudge 
    if (!firedIdleSteps.current.has(currentStep)) {
      idleTimerRef.current = setTimeout(() => {
        const idlePayload = IDLE_MESSAGES[currentStep];
        if (idlePayload) {
          fireBobMessage(idlePayload);
          firedIdleSteps.current.add(currentStep);
        }
      }, IDLE_DELAY_MS);
    }

    return () => {
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [currentStep, getBobContext]);
}
