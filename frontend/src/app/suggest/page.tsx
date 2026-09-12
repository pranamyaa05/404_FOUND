"use client";

import { useState } from "react";
import { getRecommendations, RecommendInput, RecommendResult } from "@/lib/api";
import { useStudioStore } from "@/store/studioStore";
import RecommendationCard from "@/components/chatbot/RecommendationCard";
import BobAvatar from "@/components/chatbot/BobAvatar";
import SkinToneSelector from "@/components/studio/SkinToneSelector";
import Link from "next/link";
import clsx from "clsx";

/**
 * /suggest — Standalone "Suggest Me a Style" page.
 *
 * A 3-step visual form:
 *   Step A → Skin tone  (reads from studioStore if already set, else lets user pick)
 *   Step B → Occasion   (visual card picker)
 *   Step C → Results    (recommendation cards from BOB)
 *
 * If the user has already gone through the Studio flow, skin tone and
 * height are pre-filled — they skip straight to occasion.
 */

type Occasion = "casual" | "formal" | "wedding" | "festival";

const OCCASIONS: { id: Occasion; label: string; emoji: string; desc: string }[] = [
  { id: "casual",  label: "Casual / Daily",  emoji: "☕", desc: "Everyday comfort, relaxed settings" },
  { id: "formal",  label: "Office / Formal", emoji: "💼", desc: "Professional or semi-formal events" },
  { id: "wedding", label: "Wedding",          emoji: "💍", desc: "Bridal, reception, or wedding guest" },
  { id: "festival",label: "Festival",         emoji: "🪔", desc: "Diwali, Navratri, Eid, Pongal and more" },
];

type FormStep = "tone" | "occasion" | "results";

export default function SuggestPage() {
  const { skinTone, measurements } = useStudioStore();

  // If skin tone already set in studio, skip straight to occasion
  const initialStep: FormStep = skinTone ? "occasion" : "tone";

  const [formStep, setFormStep] = useState<FormStep>(initialStep);
  const [selectedOccasion, setSelectedOccasion] = useState<Occasion | null>(null);
  const [results, setResults] = useState<RecommendResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read live skin tone from store (SkinToneSelector writes into it)
  const currentTone = useStudioStore((s) => s.skinTone);

  const handleGetSuggestions = async () => {
    if (!selectedOccasion || !currentTone) return;
    setIsLoading(true);
    setError(null);

    try {
      const input: RecommendInput = {
        skin_tone: currentTone.label as RecommendInput["skin_tone"],
        height_cm: measurements?.height ?? 162,
        occasion: selectedOccasion,
      };
      const data = await getRecommendations(input);
      setResults(data);
      setFormStep("results");
    } catch {
      setError("BOB couldn't connect right now. Try again in a moment!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0D0A1A] text-white px-4 py-12">
      <div className="max-w-2xl mx-auto">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="mb-4">
            <BobAvatar size={72} animated />
          </div>
          <h1 className="text-4xl font-extrabold mb-2">
            Ask <span className="text-primary-light">BOB</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-md">
            Tell BOB a bit about yourself and he'll suggest the perfect Indian dress
            style and fabric — personalised just for you.
          </p>
        </div>

        {/* ── Progress dots ──────────────────────────────────── */}
        <div className="flex justify-center gap-3 mb-10">
          {(["tone", "occasion", "results"] as FormStep[]).map((s) => (
            <div
              key={s}
              className={clsx(
                "h-2 rounded-full transition-all duration-300",
                formStep === s
                  ? "w-8 bg-primary-light"
                  : formStep === "results" || (s === "tone" && formStep !== "tone")
                  ? "w-2 bg-primary/50"
                  : "w-2 bg-gray-700"
              )}
            />
          ))}
        </div>

        {/* ── Step A: Skin Tone ──────────────────────────────── */}
        {formStep === "tone" && (
          <div className="card bg-[#1A1025] border border-purple-900/40 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-1">What's your skin tone?</h2>
            <p className="text-gray-400 text-sm mb-8">
              BOB uses this to suggest colours and fabrics that complement you best.
            </p>

            <SkinToneSelector />

            <button
              onClick={() => setFormStep("occasion")}
              disabled={!currentTone}
              className="btn-primary w-full mt-6"
            >
              Continue →
            </button>
          </div>
        )}

        {/* ── Step B: Occasion ───────────────────────────────── */}
        {formStep === "occasion" && (
          <div className="card bg-[#1A1025] border border-purple-900/40 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-1">What's the occasion?</h2>
            <p className="text-gray-400 text-sm mb-8">
              BOB will tailor the suggestion to fit the setting perfectly.
            </p>

            {/* Show what BOB already knows */}
            {currentTone && (
              <div className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-primary/10 border border-primary/20">
                <div
                  className="w-8 h-8 rounded-full border-2 border-white/20 shrink-0"
                  style={{ backgroundColor: currentTone.hex }}
                />
                <div>
                  <p className="text-xs text-gray-400">Skin tone</p>
                  <p className="text-sm text-white font-medium">{currentTone.displayName}</p>
                </div>
                {measurements?.height && (
                  <>
                    <div className="w-px h-8 bg-purple-900/40 mx-1" />
                    <div>
                      <p className="text-xs text-gray-400">Height</p>
                      <p className="text-sm text-white font-medium">{measurements.height} cm</p>
                    </div>
                  </>
                )}
                <span className="ml-auto text-xs text-primary-light">BOB knows this ✓</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-8">
              {OCCASIONS.map((occ) => (
                <button
                  key={occ.id}
                  onClick={() => setSelectedOccasion(occ.id)}
                  className={clsx(
                    "rounded-xl p-4 text-left border-2 transition-all duration-200",
                    selectedOccasion === occ.id
                      ? "border-primary-light bg-primary/20"
                      : "border-gray-700 bg-[#120D22] hover:border-primary/40"
                  )}
                >
                  <div className="text-3xl mb-2">{occ.emoji}</div>
                  <div className="font-semibold text-sm">{occ.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{occ.desc}</div>
                </button>
              ))}
            </div>

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

            <div className="flex gap-3">
              {!skinTone && (
                <button
                  onClick={() => setFormStep("tone")}
                  className="btn-outline flex-1"
                >
                  ← Back
                </button>
              )}
              <button
                onClick={handleGetSuggestions}
                disabled={!selectedOccasion || isLoading}
                className="btn-primary flex-1"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    BOB is thinking...
                  </span>
                ) : (
                  "Get BOB's Suggestions ✨"
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── Step C: Results ────────────────────────────────── */}
        {formStep === "results" && results && (
          <div>
            {/* BOB's intro card */}
            <div className="flex items-start gap-3 mb-6 p-4 rounded-2xl bg-[#1A1025] border border-purple-900/40">
              <BobAvatar size={40} />
              <div>
                <p className="text-white text-sm leading-relaxed">
                  Based on your{" "}
                  <span className="text-primary-light font-semibold">
                    {currentTone?.displayName ?? "skin tone"}
                  </span>
                  {measurements?.height && (
                    <>
                      {", "}
                      <span className="text-primary-light font-semibold">
                        {measurements.height} cm height
                      </span>
                    </>
                  )}
                  {" and "}
                  <span className="text-primary-light font-semibold">
                    {OCCASIONS.find((o) => o.id === selectedOccasion)?.label ?? selectedOccasion}
                  </span>{" "}
                  occasion — here are my top picks for you! 🎨
                </p>
              </div>
            </div>

            {/* Recommendation cards */}
            <RecommendationCard recommendations={results.recommendations} />

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <button
                onClick={() => {
                  setFormStep("occasion");
                  setResults(null);
                  setSelectedOccasion(null);
                }}
                className="btn-outline flex-1"
              >
                ← Try a different occasion
              </button>
              <Link href="/studio" className="btn-primary flex-1 text-center">
                Start Designing in Studio →
              </Link>
            </div>
          </div>
        )}

        {/* ── Footer nudge ───────────────────────────────────── */}
        {formStep !== "results" && (
          <p className="text-center text-gray-600 text-xs mt-8">
            You can also chat with BOB directly using the button at the bottom-right corner.
          </p>
        )}
      </div>
    </main>
  );
}
