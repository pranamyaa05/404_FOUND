"use client";

import { useForm } from "react-hook-form";
import { useStudioStore } from "@/store/studioStore";
import SkinToneSelector from "@/components/studio/SkinToneSelector";
import { fireBobMessage } from "@/hooks/useBobProactive";

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export interface MeasurementValues {
  height: number;
  chest: number;
  waist: number;
  hip: number;
  shoulder: number;
  sleeveLength: number;
  // Add more fields as needed by 3D mesh team
}

/**
 * Step 2 — User inputs body measurements.
 * All values in centimetres.
 * Stored in studioStore for use by 3D mesh generation.
 *
 * NOTE to 3D mesh team (Member 1 & 2):
 * If you need additional measurement fields, add them to MeasurementValues above
 * and add the corresponding input below.
 */
export default function MeasurementForm({ onNext, onBack }: Props) {
  const { measurements, setMeasurements } = useStudioStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MeasurementValues>({
    defaultValues: measurements || undefined,
  });

  const onSubmit = (data: MeasurementValues) => {
    setMeasurements(data);
    // Tell BOB measurements are locked in — he'll use them from the store
    const { skinTone, selectedStyle } = useStudioStore.getState();
    const styleLabel = selectedStyle?.replace(/_/g, " ") ?? "your chosen style";
    const heightNote =
      data.height < 155
        ? "Since you're petite, I'll make sure to flag any fabric that might overwhelm your silhouette."
        : data.height > 170
        ? "Your height is great for floor-length styles — I'll keep that in mind!"
        : "";
    fireBobMessage({
      text: `Got it! ${skinTone ? `${skinTone.displayName} skin tone` : ""} + **${data.height} cm** + **${styleLabel}** — generating your 3D model now. ${heightNote}`.trim(),
      quickReplies: [],
    });
    onNext();
  };

  const fields: { name: keyof MeasurementValues; label: string; min: number; max: number }[] = [
    { name: "height", label: "Height (cm)", min: 100, max: 250 },
    { name: "chest", label: "Chest / Bust (cm)", min: 50, max: 150 },
    { name: "waist", label: "Waist (cm)", min: 40, max: 150 },
    { name: "hip", label: "Hip (cm)", min: 50, max: 170 },
    { name: "shoulder", label: "Shoulder Width (cm)", min: 25, max: 70 },
    { name: "sleeveLength", label: "Sleeve Length (cm)", min: 10, max: 80 },
  ];

  return (
    <div className="card">
      <h2 className="font-serif italic text-3xl text-surface-dark mb-2">Enter Your Measurements</h2>
      <p className="text-surface-dark/60 mb-8">All measurements are in centimetres (cm).</p>

      {/* Skin tone dragger — BOB reads this, no need to ask */}
      <SkinToneSelector />

      <div className="stitch-divider mb-6" />

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
          {fields.map((f) => (
            <div key={f.name}>
              <label className="block text-sm font-medium text-surface-dark/80 mb-1">
                {f.label}
              </label>
              <input
                type="number"
                step="0.1"
                className="input-field"
                {...register(f.name, {
                  required: "Required",
                  min: { value: f.min, message: `Min ${f.min} cm` },
                  max: { value: f.max, message: `Max ${f.max} cm` },
                  valueAsNumber: true,
                })}
              />
              {errors[f.name] && (
                <p className="text-red-500 text-xs mt-1">
                  {errors[f.name]?.message}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <button type="button" onClick={onBack} className="btn-outline flex-1">
            ← Back
          </button>
          <button type="submit" className="btn-primary flex-1">
            Generate 3D Preview →
          </button>
        </div>

        {/* Skip option — lets users jump straight to 3D without measurements */}
        <div className="text-center mt-3">
          <button
            type="button"
            onClick={onNext}
            className="text-sm text-surface-dark/50 hover:text-surface-dark/80 underline underline-offset-2 transition-colors"
          >
            Skip measurements → go straight to 3D Preview
          </button>
        </div>
      </form>
    </div>
  );
}
