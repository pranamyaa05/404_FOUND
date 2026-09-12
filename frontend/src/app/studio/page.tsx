"use client";

import { useState, useEffect } from "react";
import StepIndicator from "@/components/studio/StepIndicator";
import StylePicker from "@/components/studio/StylePicker";
import ImageUpload from "@/components/studio/ImageUpload";
import MeasurementForm from "@/components/studio/MeasurementForm";
import MeshViewer from "@/components/studio/MeshViewer";
import DieLine from "@/components/studio/DieLine";
import { useStudioStore } from "@/store/studioStore";
import { useBobProactive } from "@/hooks/useBobProactive";

/**
 * /studio — Main multi-step workflow page
 *
 * Steps:
 *  0 → Style Picker
 *  1 → Image Upload + Enhancement
 *  2 → Measurement Input  (skin tone dragger lives here)
 *  3 → 3D Mesh Viewer
 *  4 → Die-line / Pattern Download
 *
 * BOB context bridge:
 *  - currentStep is synced into studioStore on every step change.
 *  - useBobProactive fires step + idle nudges automatically.
 *  - Action triggers (style_picked, image_enhanced, etc.) fired from each component.
 *  - ChatWidget is mounted globally in layout.tsx — no duplicate here.
 */
const STEPS = ["Style", "Image", "Measurements", "3D Preview", "Pattern"];

export default function StudioPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const setStoreStep = useStudioStore((s) => s.setCurrentStep);

  // Keep studioStore in sync so BOB always knows which step the user is on
  useEffect(() => {
    setStoreStep(currentStep);
  }, [currentStep, setStoreStep]);

  // Fire contextual proactive BOB messages per step (entry + 30s idle)
  useBobProactive(currentStep);

  const next = () => setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setCurrentStep((s) => Math.max(s - 1, 0));

  return (
    <main className="min-h-screen bg-surface-dark text-white">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-center mb-8">
          StitchSmart Studio
        </h1>

        <StepIndicator steps={STEPS} currentStep={currentStep} />

        <div className="mt-10">
          {currentStep === 0 && <StylePicker onNext={next} />}
          {currentStep === 1 && <ImageUpload onNext={next} onBack={back} />}
          {currentStep === 2 && <MeasurementForm onNext={next} onBack={back} />}
          {currentStep === 3 && <MeshViewer onNext={next} onBack={back} />}
          {currentStep === 4 && <DieLine onBack={back} />}
        </div>
      </div>
    </main>
  );
}
