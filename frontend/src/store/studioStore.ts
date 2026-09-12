import { create } from "zustand";
import type { MeasurementValues } from "@/components/studio/MeasurementForm";

/**
 * Global state store for the Studio multi-step workflow.
 * Uses Zustand — no Redux boilerplate needed.
 *
 * BOB reads from this store silently — users never get asked
 * for information they already provided in the UI.
 */

// Skin tone is a 0–100 slider value mapped to a named tone + hex colour
export interface SkinToneValue {
  slider: number;           // 0–100 raw slider position
  label: "very_fair" | "fair" | "wheatish" | "medium_brown" | "dark_brown" | "deep";
  hex: string;              // display colour for the UI swatch
  displayName: string;      // human-readable label e.g. "Wheatish"
}

export interface BobContext {
  skinTone: SkinToneValue | null;
  measurements: MeasurementValues | null;
  selectedStyle: string | null;
  currentStep: number;
  occasion: string | null;   // optionally set by the user anywhere in the app
}

interface StudioState {
  // ── Step 0 ───────────────────────────────────────────────────────
  selectedStyle: string | null;
  setSelectedStyle: (style: string) => void;

  // ── Step 1 ───────────────────────────────────────────────────────
  originalImage: File | null;
  enhancedImage: string | null;
  setOriginalImage: (file: File) => void;
  setEnhancedImage: (url: string) => void;

  // ── Step 2 — Measurements + Skin Tone ────────────────────────────
  measurements: MeasurementValues | null;
  setMeasurements: (m: MeasurementValues) => void;

  skinTone: SkinToneValue | null;
  setSkinTone: (tone: SkinToneValue) => void;

  // ── Step 3 ───────────────────────────────────────────────────────
  meshUrl: string | null;
  setMeshUrl: (url: string) => void;

  // ── Step 4 ───────────────────────────────────────────────────────
  dieLineUrl: string | null;
  setDieLineUrl: (url: string) => void;

  // ── Shared / BOB context ─────────────────────────────────────────
  currentStep: number;
  setCurrentStep: (step: number) => void;

  occasion: string | null;
  setOccasion: (occasion: string) => void;

  // Derived selector — BOB calls this to get everything in one shot.
  // Returns null for any field the user hasn't filled yet.
  getBobContext: () => BobContext;

  // ── Reset ─────────────────────────────────────────────────────────
  reset: () => void;
}

export const useStudioStore = create<StudioState>((set, get) => ({
  selectedStyle: null,
  setSelectedStyle: (style) => set({ selectedStyle: style }),

  originalImage: null,
  enhancedImage: null,
  setOriginalImage: (file) => set({ originalImage: file }),
  setEnhancedImage: (url) => set({ enhancedImage: url }),

  measurements: null,
  setMeasurements: (m) => set({ measurements: m }),

  skinTone: null,
  setSkinTone: (tone) => set({ skinTone: tone }),

  meshUrl: null,
  setMeshUrl: (url) => set({ meshUrl: url }),

  dieLineUrl: null,
  setDieLineUrl: (url) => set({ dieLineUrl: url }),

  currentStep: 0,
  setCurrentStep: (step) => set({ currentStep: step }),

  occasion: null,
  setOccasion: (occasion) => set({ occasion }),

  // BOB calls this — gets a clean snapshot of everything the user filled in
  getBobContext: () => {
    const s = get();
    return {
      skinTone: s.skinTone,
      measurements: s.measurements,
      selectedStyle: s.selectedStyle,
      currentStep: s.currentStep,
      occasion: s.occasion,
    };
  },

  reset: () =>
    set({
      selectedStyle: null,
      originalImage: null,
      enhancedImage: null,
      measurements: null,
      skinTone: null,
      meshUrl: null,
      dieLineUrl: null,
      currentStep: 0,
      occasion: null,
    }),
}));
