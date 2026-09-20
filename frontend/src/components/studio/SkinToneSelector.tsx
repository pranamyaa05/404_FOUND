"use client";

import { useEffect, useRef, useState } from "react";
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

  const [showCam, setShowCam] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialise store on mount with default
  useEffect(() => {
    if (!skinTone) setSkinTone(resolveSlider(40));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle webcam stream start/stop
  useEffect(() => {
    if (!showCam) {
      stopTracks();
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Camera access is only available on HTTPS or localhost. Please select skin tone manually.");
      setShowCam(false);
      return;
    }

    let mounted = true;  // guard against StrictMode double-invoke cleanup race
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } })
      .then((stream) => {
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.error("Video play error:", e));
        }
      })
      .catch((err) => {
        if (!mounted) return;
        console.error("Camera access denied or failed:", err);
        const msg = err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access in your browser settings."
          : "Could not access camera. Please check permissions or select skin tone manually.";
        alert(msg);
        setShowCam(false);
      });

    return () => { mounted = false; stopTracks(); };
  }, [showCam]);

  const stopTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const closeCam = () => {
    stopTracks();
    setShowCam(false);
  };

  const sampleCameraColor = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    // Sample a 10x10 block at center
    const cx = Math.floor(canvas.width / 2);
    const cy = Math.floor(canvas.height / 2);
    const imgData = ctx.getImageData(cx - 5, cy - 5, 10, 10);
    const data = imgData.data;

    let r = 0, g = 0, b = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    const count = data.length / 4;
    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);

    // Estimate skin tone slider 0–100 based on perceived brightness/warmth
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    const estimatedSlider = Math.max(0, Math.min(100, Math.round(100 - (brightness / 255) * 100)));

    setSkinTone(resolveSlider(estimatedSlider));
    closeCam();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSkinTone(resolveSlider(Number(e.target.value)));
  };

  const current = skinTone ?? resolveSlider(40);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <label className="font-serif italic text-lg text-surface-dark/90">
          Skin Tone
        </label>
        {/* Live swatch + label */}
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full border-2 border-white/30 shadow-md transition-all duration-150"
            style={{ backgroundColor: current.hex }}
            aria-label={`Selected skin tone: ${current.displayName}`}
          />
          <span className="text-sm text-surface-dark/80 font-medium min-w-[90px]">
            {current.displayName}
          </span>
        </div>
      </div>

      {/* Gradient track + thumb */}
      <div className="relative">
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

      <div className="flex items-center justify-between mt-2 mb-3">
        <p className="text-xs text-surface-dark/50">
          BOB uses this to personalise fabric and colour suggestions for you.
        </p>
        {!showCam ? (
          <button
            type="button"
            onClick={() => setShowCam(true)}
            className="text-xs text-primary font-medium hover:underline flex items-center gap-1 ml-2 whitespace-nowrap"
          >
             Auto-detect from Camera
          </button>
        ) : (
          <button
            type="button"
            onClick={closeCam}
            className="text-xs text-red-500 font-medium hover:underline flex items-center gap-1 ml-2 whitespace-nowrap"
          >
             Close Camera
          </button>
        )}
      </div>

      {/* Inline Camera Panel */}
      {showCam && (
        <div className="rounded-xl overflow-hidden border border-surface-dark/15 shadow-md mb-3">
          <div className="bg-surface-dark/5 px-3 py-2 text-xs text-surface-dark/60 font-medium">
             Position your face or bare arm so the circle aligns with your skin, then click <strong>Capture</strong>.
          </div>

          {/* Live video feed */}
          <div className="relative bg-black" style={{ aspectRatio: "4/3" }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" /* mirror for selfie */ }}
            />
            {/* Crosshair guide */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative">
                <div
                  className="w-20 h-20 rounded-full border-2 border-white border-dashed animate-pulse"
                  style={{ boxShadow: "0 0 0 2000px rgba(0,0,0,0.35)" }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-xs font-medium opacity-80">Skin here</span>
                </div>
              </div>
            </div>
          </div>

          {/* Hidden canvas for pixel sampling */}
          <canvas ref={canvasRef} className="hidden" width={320} height={240} />

          {/* Capture button */}
          <div className="p-3 bg-surface-light flex gap-2">
            <button
              type="button"
              onClick={closeCam}
              className="btn-outline flex-1 text-sm py-2"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={sampleCameraColor}
              className="btn-primary flex-1 text-sm py-2"
            >
               Capture Skin Tone
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
