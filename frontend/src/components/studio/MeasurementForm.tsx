"use client";

import { useForm } from "react-hook-form";
import { useStudioStore } from "@/store/studioStore";

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
  const { setMeasurements } = useStudioStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MeasurementValues>();

  const onSubmit = (data: MeasurementValues) => {
    setMeasurements(data);
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
    <div className="card bg-gray-900 border border-gray-700">
      <h2 className="text-2xl font-bold mb-2">Enter Your Measurements</h2>
      <p className="text-gray-400 mb-8">All measurements are in centimetres (cm).</p>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
          {fields.map((f) => (
            <div key={f.name}>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {f.label}
              </label>
              <input
                type="number"
                step="0.1"
                className="input-field bg-gray-800 border-gray-600 text-white"
                {...register(f.name, {
                  required: "Required",
                  min: { value: f.min, message: `Min ${f.min} cm` },
                  max: { value: f.max, message: `Max ${f.max} cm` },
                  valueAsNumber: true,
                })}
              />
              {errors[f.name] && (
                <p className="text-red-400 text-xs mt-1">
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
      </form>
    </div>
  );
}
