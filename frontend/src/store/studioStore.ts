import { create } from "zustand";
import type { MeasurementValues } from "@/components/studio/MeasurementForm";

/**
 * Global state store for the Studio multi-step workflow.
 * Uses Zustand — no Redux boilerplate needed.
 *
 * All studio step components read/write through this store,
 * so data flows cleanly from step to step.
 */
interface StudioState {
  // Step 0
  selectedStyle: string | null;
  setSelectedStyle: (style: string) => void;

  // Step 1
  originalImage: File | null;
  enhancedImage: string | null; // URL returned by backend
  setOriginalImage: (file: File) => void;
  setEnhancedImage: (url: string) => void;

  // Step 2
  measurements: MeasurementValues | null;
  setMeasurements: (m: MeasurementValues) => void;

  // Step 3
  meshUrl: string | null;
  setMeshUrl: (url: string) => void;

  // Step 4
  dieLineUrl: string | null;
  setDieLineUrl: (url: string) => void;

  // Reset everything
  reset: () => void;
}

export const useStudioStore = create<StudioState>((set) => ({
  selectedStyle: null,
  setSelectedStyle: (style) => set({ selectedStyle: style }),

  originalImage: null,
  enhancedImage: null,
  setOriginalImage: (file) => set({ originalImage: file }),
  setEnhancedImage: (url) => set({ enhancedImage: url }),

  measurements: null,
  setMeasurements: (m) => set({ measurements: m }),

  meshUrl: null,
  setMeshUrl: (url) => set({ meshUrl: url }),

  dieLineUrl: null,
  setDieLineUrl: (url) => set({ dieLineUrl: url }),

  reset: () =>
    set({
      selectedStyle: null,
      originalImage: null,
      enhancedImage: null,
      measurements: null,
      meshUrl: null,
      dieLineUrl: null,
    }),
}));
