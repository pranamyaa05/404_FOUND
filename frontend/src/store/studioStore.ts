import { create } from "zustand";
import type { MeasurementValues } from "@/components/studio/MeasurementForm";

export interface SkinToneValue {
  slider: number;
  label: "very_fair" | "fair" | "wheatish" | "medium_brown" | "dark_brown" | "deep";
  hex: string;
  displayName: string;
}

export interface GarmentFit {
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
}

export interface GarmentImage {
  id: string;
  style: string;
  original: File;
  enhanced: string | null;
}

export interface WardrobeItem {
  id: string;
  style: string;
  meshUrl: string;
  drapedUrl: string | null;
  dieLineUrl: string | null;
  fit: GarmentFit;
  sourceImageId: string;
}

export interface BobContext {
  skinTone: SkinToneValue | null;
  measurements: MeasurementValues | null;
  selectedStyles: string[];
  currentStep: number;
  occasion: string | null;
  wardrobe: WardrobeItem[];
  activeWardrobeId: string | null;
}

interface StudioState {
  // Step 0
  selectedStyles: string[];
  toggleSelectedStyle: (style: string) => void;
  clearSelectedStyles: () => void;

  // Step 1
  garmentGallery: GarmentImage[];
  addGarmentImage: (img: GarmentImage) => void;
  updateGarmentImage: (id: string, updates: Partial<GarmentImage>) => void;
  removeGarmentImage: (id: string) => void;

  // Step 2
  measurements: MeasurementValues | null;
  setMeasurements: (m: MeasurementValues) => void;

  skinTone: SkinToneValue | null;
  setSkinTone: (tone: SkinToneValue) => void;

  avatarUrl: string | null;
  setAvatarUrl: (url: string | null) => void;

  // Step 4 (Wardrobe Layering)
  wardrobe: WardrobeItem[];
  activeWardrobeId: string | null;
  setActiveWardrobeId: (id: string | null) => void;
  addWardrobeItem: (item: WardrobeItem) => void;
  updateWardrobeItem: (id: string, updates: Partial<WardrobeItem>) => void;
  removeWardrobeItem: (id: string) => void;
  updateActiveGarmentFit: (fit: Partial<GarmentFit>) => void;

  // Shared / BOB context
  currentStep: number;
  setCurrentStep: (step: number) => void;

  occasion: string | null;
  setOccasion: (occasion: string) => void;

  getBobContext: () => BobContext;

  reset: () => void;
}

const DEFAULT_FIT: GarmentFit = { scaleX: 0.45, scaleY: 0.45, scaleZ: 0.45, offsetX: 0, offsetY: 0, offsetZ: 0, rotateX: 0, rotateY: 0, rotateZ: 0 };

export const useStudioStore = create<StudioState>((set, get) => ({
  selectedStyles: [],
  toggleSelectedStyle: (style) => set((state) => {
    const exists = state.selectedStyles.includes(style);
    if (exists) return { selectedStyles: state.selectedStyles.filter(s => s !== style) };
    return { selectedStyles: [...state.selectedStyles, style] };
  }),
  clearSelectedStyles: () => set({ selectedStyles: [] }),

  garmentGallery: [],
  addGarmentImage: (img) => set((s) => ({ garmentGallery: [...s.garmentGallery, img] })),
  updateGarmentImage: (id, updates) => set((s) => ({
    garmentGallery: s.garmentGallery.map((img) => img.id === id ? { ...img, ...updates } : img)
  })),
  removeGarmentImage: (id) => set((s) => ({
    garmentGallery: s.garmentGallery.filter((img) => img.id !== id)
  })),

  measurements: null,
  setMeasurements: (m) => set({ measurements: m }),

  skinTone: null,
  setSkinTone: (tone) => set({ skinTone: tone }),

  avatarUrl: null,
  setAvatarUrl: (url) => set({ avatarUrl: url }),

  wardrobe: [],
  activeWardrobeId: null,
  setActiveWardrobeId: (id) => set({ activeWardrobeId: id }),
  addWardrobeItem: (item) => set((s) => ({ wardrobe: [...s.wardrobe, item], activeWardrobeId: item.id })),
  updateWardrobeItem: (id, updates) => set((s) => ({
    wardrobe: s.wardrobe.map((item) => item.id === id ? { ...item, ...updates } : item)
  })),
  removeWardrobeItem: (id) => set((s) => {
    const newWardrobe = s.wardrobe.filter(item => item.id !== id);
    return { 
      wardrobe: newWardrobe,
      activeWardrobeId: s.activeWardrobeId === id ? (newWardrobe.length > 0 ? newWardrobe[newWardrobe.length - 1].id : null) : s.activeWardrobeId
    };
  }),
  updateActiveGarmentFit: (fit) => set((s) => {
    if (!s.activeWardrobeId) return s;
    return {
      wardrobe: s.wardrobe.map(item => 
        item.id === s.activeWardrobeId ? { ...item, fit: { ...item.fit, ...fit } } : item
      )
    };
  }),

  currentStep: 0,
  setCurrentStep: (step) => set({ currentStep: step }),

  occasion: null,
  setOccasion: (occasion) => set({ occasion }),

  getBobContext: () => {
    const s = get();
    return {
      skinTone: s.skinTone,
      measurements: s.measurements,
      selectedStyles: s.selectedStyles,
      currentStep: s.currentStep,
      occasion: s.occasion,
      wardrobe: s.wardrobe,
      activeWardrobeId: s.activeWardrobeId,
    };
  },

  reset: () =>
    set({
      selectedStyles: [],
      garmentGallery: [],
      measurements: null,
      skinTone: null,
      avatarUrl: null,
      wardrobe: [],
      activeWardrobeId: null,
      currentStep: 0,
      occasion: null,
    }),
}));
