"use client";

import { useEffect, useRef } from "react";
import { useStudioStore, SkinToneValue } from "@/store/studioStore";

/**
 * SkinToneSelector — a smooth gradient dragger that lets the user
 * pick their skin tone visually. No dropdowns, no labels to memorise.
 *
 * The selected tone is written into studioStore.skinTone so BOB
 * can read it without ever asking the user.
 *
 * Tone map (0–100):
 *   0–15   → Very Fair    #FDDBB4
 *   16–30  → Fair         #F5C49A
 *   31–45  → Wheatish     #E8A87C
 *   46–60  → Medium Brown #C68642
 *   61–75  → Dark Brown   #8D5524
 *   76–100 → Deep         #4A2912
 */

const TONE_STOPS: SkinToneValue[] = [
  { slider: 0,   label: "very_fair",    hex: "#FDDBB4", displayName: "Very Fair" },
  { slider: 20,  label: "fair",         hex: "#F5C49A", displayName: "Fair" },
  { slider: 40,  label: "wheatish",     hex: "#E8A87C", displayName: "Wheatish" },
  { slider: 60,  label: "medium_brown", hex: "#C68642", displayName: "Medium Brown" },
  { slider: 80,  label: "dark_brown",   hex: "#8D5524", displayName: "Dark Brown" },
  { slider: 100, label: "deep",         hex: "#4A2912", displayName: "Deep" },
];

/** Map a 0–100 slider value to the nearest SkinToneValue */
function resolveSlider(value: number): SkinToneValue {
  // Interpolate hex between the two nearest stops
  const lower = [...TONE_STOPS].reverse().find((s) => s.slider <= value) ?? TONE_STOPS[0];
  const upper = TONE_STOPS.find((s) => s.slider >= value) ?? TONE_STOPS[TONE_STOPS.length - 1];

  if (lower.slider === upper.slider) {
    return { ...lower, slider: value };
  }

  const t = (value - lower.slider) / (upper.slider - lower.slider);
  const hex = lerpHex(lower.hex, upper.hex, t);

  // Use lower stop's label/displayName (closest named tone)
  const named = t < 0.5 ? lower : upper;
  return { slider: value, label: named.label, hex, displayName: named.displayName };
}

/** Linear interpolation between two hex colours */
function lerpHex(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t).toString(16).padStart(2, "0");
  const g = Math.round(ag + (bg - ag) * t).toString(16).padStart(2, "0");
  const bStr = Math.round(ab + (bb - ab) * t).toString(16).padStart(2, "0");
  return `#${r}${g}${bStr}`;
}

export default function SkinToneSelector() {
  const { skinTone, setSkinTone } = useStudioStore();
  const sliderValue = skinTone?.slider ?? 40; // default to wheatish

  // Initialise store on mount with default
  useEffect(() => {
    if (!skinTone) setSkinTone(resolveSlider(40));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSkinTone(resolveSlider(Number(e.target.value)));
  };

  const current = skinTone ?? resolveSlider(40);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium text-gray-300">
          Skin Tone
        </label>
        {/* Live swatch + label */}
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full border-2 border-white/30 shadow-md transition-all duration-150"
            style={{ backgroundColor: current.hex }}
            aria-label={`Selected skin tone: ${current.displayName}`}
          />
          <span className="text-sm text-gray-300 font-medium min-w-[90px]">
            {current.displayName}
          </span>
        </div>
      </div>

      {/* Gradient track + thumb */}
      <div className="relative">
        {/* The gradient bar behind the native range input */}
        <div
          className="absolute inset-y-0 left-0 right-0 rounded-full pointer-events-none"
          style={{
            background: `linear-gradient(to right, ${TONE_STOPS.map(
              (s) => `${s.hex} ${s.slider}%`
            ).join(", ")})`,
            height: "10px",
            top: "50%",
            transform: "translateY(-50%)",
          }}
        />

        {/* Native range input — transparent track, custom thumb via CSS */}
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={sliderValue}
          onChange={handleChange}
          className="skin-tone-slider relative w-full h-6 appearance-none bg-transparent cursor-pointer"
          aria-label="Skin tone selector"
        />
      </div>

      {/* Named stop labels below the track */}
      <div className="flex justify-between mt-1 px-1">
        {TONE_STOPS.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => setSkinTone(resolveSlider(s.slider))}
            className="flex flex-col items-center gap-1 group focus:outline-none"
            aria-label={s.displayName}
          >
            <div
              className="w-4 h-4 rounded-full border border-white/20 group-hover:scale-125 transition-transform"
              style={{ backgroundColor: s.hex }}
            />
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500 mt-2">
        BOB uses this to personalise fabric and colour suggestions for you.
      </p>
    </div>
  );
}
