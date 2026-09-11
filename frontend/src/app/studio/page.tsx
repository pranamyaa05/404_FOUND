"use client";

import { useState } from "react";
import StepIndicator from "@/components/studio/StepIndicator";
import StylePicker from "@/components/studio/StylePicker";
import ImageUpload from "@/components/studio/ImageUpload";
import MeasurementForm from "@/components/studio/MeasurementForm";
import MeshViewer from "@/components/studio/MeshViewer";
import DieLine from "@/components/studio/DieLine";

/**
 * /studio — Main multi-step workflow page
 *
 * Steps:
 *  0 → Style Picker
 *  1 → Image Upload + Enhancement
 *  2 → Measurement Input
 *  3 → 3D Mesh Viewer
 *  4 → Die-line / Pattern Download
 */
const STEPS = ["Style", "Image", "Measurements", "3D Preview", "Pattern"];

export default function StudioPage() {
  const [currentStep, setCurrentStep] = useState(0);

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
          {currentStep === 2 && (
            <MeasurementForm onNext={next} onBack={back} />
          )}
          {currentStep === 3 && <MeshViewer onNext={next} onBack={back} />}
          {currentStep === 4 && <DieLine onBack={back} />}
        </div>
      </div>
    </main>
  );
}
