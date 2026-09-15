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

// ─── Step entry messages ─────────────────────────────────────────────────────

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
        text: "okay so first things first — pick a style 👀\nif you're not sure which one, just tell me the occasion and I'll narrow it down.",
        quickReplies: ["what suits me?", "explain each style", "what's a Ghagra?"],
      };

    case 1:
      return {
        text: style
          ? `${style} — good pick 👌 now upload a reference photo of what you have in mind. plain background helps but honestly I'll work with whatever you've got.`
          : "upload a reference photo of the design you want. a photo on a hanger, a screenshot, anything works.",
        quickReplies: ["what makes a good photo?", "can I use a sketch?"],
      };

    case 2: {
      const contextParts: string[] = [];
      if (tone)  contextParts.push(`${tone} skin tone`);
      if (style) contextParts.push(`${style}`);

      const intro = contextParts.length > 0
        ? `got it — ${contextParts.join(", ")}. I'll use that when I suggest fabrics and colours 🧵`
        : "fill in your measurements in cm — take your time, accuracy matters here.";

      return {
        text: `${intro}\n\nneed help measuring anything? just ask.`,
        quickReplies: ["how to measure chest?", "how to measure hip?", "what's ease allowance?"],
      };
    }

    case 3: {
      let heightNote = "";
      if (height && height < 155) {
        heightNote = "\n\nalso — since you're on the shorter side, I'd skip heavy fabrics like velvet or brocade for this one. ask me for lighter options.";
      } else if (height && height > 170) {
        heightNote = "\n\nyour height is great for dramatic floor-length cuts. Anarkali or a full Ghagra would look really good.";
      }
      return {
        text: `there's your 3D preview 🎉 rotate it, zoom in, see how the proportions sit.${heightNote}`,
        quickReplies: ["suggest a fabric for this", "how does this look for a wedding?", "explain the silhouette"],
      };
    }

    case 4:
      return {
        text: "pattern's ready 📐 each panel has a 1.5 cm seam allowance built in. print at 1:1 scale and cut on the lines — no extra margin needed.\n\nwant me to explain what each panel is?",
        quickReplies: ["explain the panels", "what is seam allowance?", "how do I give this to a tailor?"],
      };

    default:
      return null;
  }
}

// ─── Idle nudge messages ─────────────────────────────────────────────────────

const IDLE_MESSAGES: Record<number, ProactivePayload> = {
  0: {
    text: "still deciding? tell me the occasion — wedding, daily wear, festival — and I'll point you in the right direction 😄",
    quickReplies: ["help me choose", "what's best for a wedding?", "what's most popular?"],
  },
  1: {
    text: "stuck on the photo? even a dress on a hanger or a screenshot from Pinterest works. I'll isolate what matters 📸",
    quickReplies: ["what file formats work?", "can I use a screenshot?"],
  },
  2: {
    text: "measurements tricky? I can walk you through each one — chest, waist, hip, all of it 📏",
    quickReplies: ["yes, walk me through it", "which one matters most?"],
  },
  3: {
    text: "3D model still loading? backend might be processing — shouldn't be long. want fabric suggestions while you wait? 🧵",
    quickReplies: ["suggest fabrics", "what colours suit me?"],
  },
  4: {
    text: "ready to take this to a tailor? I can break down what each panel means if that helps 📐",
    quickReplies: ["explain the panels", "what should I tell my tailor?"],
  },
};

// ─── Hook ────────────────────────────────────────────────────────────────────

const STEP_DELAY_MS  = 1500;  // wait before step entry message
const IDLE_DELAY_MS  = 30000; // 30 s idle before nudge

export function useBobProactive(currentStep: number) {
  const getBobContext     = useStudioStore((s) => s.getBobContext);
  const firedSteps        = useRef<Set<number>>(new Set());
  const firedIdleSteps    = useRef<Set<number>>(new Set());
  const stepTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // ── Clear previous timers on step change ─────────────────────────
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    // ── Step entry message ────────────────────────────────────────────
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

    // ── Idle nudge ────────────────────────────────────────────────────
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
