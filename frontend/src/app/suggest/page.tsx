"use client";

import { useState } from "react";
import { getRecommendations, RecommendInput, RecommendResult } from "@/lib/api";
import { useStudioStore } from "@/store/studioStore";
import RecommendationCard from "@/components/chatbot/RecommendationCard";
import BobAvatar from "@/components/chatbot/BobAvatar";
import SkinToneSelector from "@/components/studio/SkinToneSelector";
import Link from "next/link";
import clsx from "clsx";
import "./suggest.css";

type Occasion = "casual" | "formal" | "wedding" | "festival";

const OCCASIONS: { id: Occasion; label: string; desc: string }[] = [
  { id: "casual",  label: "Casual / Daily",  desc: "Everyday comfort, relaxed settings" },
  { id: "formal",  label: "Office / Formal", desc: "Professional or semi-formal events" },
  { id: "wedding", label: "Wedding",         desc: "Bridal, reception, or wedding guest" },
  { id: "festival",label: "Festival",        desc: "Diwali, Navratri, Eid, Pongal and more" },
];

type FormStep = "tone" | "occasion" | "results";

export default function SuggestPage() {
  const { skinTone, measurements, setMeasurements } = useStudioStore();
  const initialStep: FormStep = skinTone ? "occasion" : "tone";

  const [isBookOpen, setIsBookOpen] = useState(false);
  const [formStep, setFormStep] = useState<FormStep>(initialStep);
  const [selectedOccasion, setSelectedOccasion] = useState<Occasion | null>(null);
  const [results, setResults] = useState<RecommendResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError("The ink ran dry for a moment. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const pageNumber = formStep === "tone" ? "i" : formStep === "occasion" ? "ii" : "iii";

  /* ═══════════════════════════════════════════════════════ */
  /*  CLOSED BOOK                                          */
  /* ═══════════════════════════════════════════════════════ */
  if (!isBookOpen) {
    return (
      <div className="diary-desk">
        <button className="diary-closed" onClick={() => setIsBookOpen(true)} aria-label="Open the diary">
          {/* Stacked pages beneath */}
          <div className="diary-closed-stack" />

          {/* Leather front cover */}
          <div className="diary-closed-cover">
            <div className="diary-spine" />
            <div className="diary-clasp" />

            {/* Cover embossing */}
            <div className="diary-cover-rule" />
            <div className="diary-cover-title">
              The Master Tailor&apos;s<br/>Personal Diary
            </div>
            <div className="diary-cover-rule" />
            <div className="diary-cover-subtitle">
              BOB &middot; Est. GarmentForge
            </div>

            {/* Avatar as a "portrait" on the cover */}
            <div style={{ marginTop: 12 }}>
              <BobAvatar size={56} />
            </div>

            <div className="diary-open-prompt">tap to open</div>
          </div>
        </button>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════ */
  /*  OPEN DIARY                                           */
  /* ═══════════════════════════════════════════════════════ */
  return (
    <div className="diary-desk">
      <div className="diary-open">
        <div className="diary-page-edges" />

        <div className="diary-pages">
          {/* Structural details */}
          <div className="diary-spine-shadow" />
          <div className="diary-page-curl" />
          <div className="diary-ribbon" />
          <span className="diary-page-num">- {pageNumber} -</span>

          {/* ── Page content ── */}
          <div className="diary-content">

            {/* Close book button */}
            <button
              onClick={() => setIsBookOpen(false)}
              className="absolute top-3 right-4 z-10 text-xs text-[#7c6f5c]/50 hover:text-[#7c6f5c] transition-colors font-serif italic"
            >
              close diary
            </button>

            {/* Header — diary style */}
            <div className="flex items-center gap-3 mb-2">
              <BobAvatar size={40} />
              <div>
                <div className="diary-date">
                  {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </div>
                <div className="diary-entry-title">Dear Diary,</div>
              </div>
            </div>

            <p className="diary-body">
              A new visitor has arrived at the atelier today. Let me consult my archives and
              find the perfect style and fabric for them &mdash; a truly bespoke recommendation.
            </p>

            <div className="diary-divider" />

            {/* ── Step A: Skin Tone & Measurements ── */}
            {formStep === "tone" && (
              <>
                <p className="diary-entry-title" style={{ fontSize: 20, marginBottom: 4 }}>
                  First, their complexion &amp; build...
                </p>
                <p className="diary-body" style={{ marginBottom: 12 }}>
                  I must note their natural tone and measurements so I can tailor the silhouette perfectly.
                </p>

                <div className="card p-5 mb-4">
                  <SkinToneSelector />
                </div>

                <div className="card p-5 mb-6">
                  <p className="text-xs text-surface-dark/60 font-serif italic mb-3">Measurements (cm)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-surface-dark/70 mb-1">Height</label>
                      <input 
                        type="number" 
                        className="input-field text-sm p-2 h-9" 
                        value={measurements?.height || ""} 
                        onChange={(e) => setMeasurements({ ...measurements, height: Number(e.target.value) } as any)} 
                        placeholder="165" 
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-surface-dark/70 mb-1">Waist</label>
                      <input 
                        type="number" 
                        className="input-field text-sm p-2 h-9" 
                        value={measurements?.waist || ""} 
                        onChange={(e) => setMeasurements({ ...measurements, waist: Number(e.target.value) } as any)} 
                        placeholder="75" 
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-surface-dark/70 mb-1">Chest/Bust</label>
                      <input 
                        type="number" 
                        className="input-field text-sm p-2 h-9" 
                        value={measurements?.chest || ""} 
                        onChange={(e) => setMeasurements({ ...measurements, chest: Number(e.target.value) } as any)} 
                        placeholder="90" 
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-surface-dark/70 mb-1">Hips</label>
                      <input 
                        type="number" 
                        className="input-field text-sm p-2 h-9" 
                        value={measurements?.hip || ""} 
                        onChange={(e) => setMeasurements({ ...measurements, hip: Number(e.target.value) } as any)} 
                        placeholder="95" 
                      />
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setFormStep("occasion")}
                    disabled={!currentTone || !measurements?.height}
                    className="btn-primary w-full mt-5 h-10"
                  >
                    Turn the page
                  </button>
                </div>
              </>
            )}

            {/* ── Step B: Occasion ── */}
            {formStep === "occasion" && (
              <>
                <p className="diary-entry-title" style={{ fontSize: 20, marginBottom: 4 }}>
                  Now, the occasion...
                </p>
                <p className="diary-body" style={{ marginBottom: 16 }}>
                  Every setting calls for a different silhouette. Let me note the occasion
                  so I can match the perfect cut from my collection.
                </p>

                {/* Show what BOB already knows */}
                {currentTone && (
                  <div className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-primary/10 border border-dashed border-primary/30">
                    <div
                      className="w-8 h-8 rounded-full border-2 border-white/40 shrink-0"
                      style={{ backgroundColor: currentTone.hex }}
                    />
                    <div>
                      <p className="text-xs text-surface-dark/60">Complexion</p>
                      <p className="text-sm text-surface-dark font-medium">{currentTone.displayName}</p>
                    </div>
                    {measurements?.height && (
                      <>
                        <div className="w-px h-8 bg-primary/20 mx-1" />
                        <div>
                          <p className="text-xs text-surface-dark/60">Height</p>
                          <p className="text-sm text-surface-dark font-medium">{measurements.height} cm</p>
                        </div>
                      </>
                    )}
                    <span className="ml-auto text-xs text-primary-dark font-serif italic">noted</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 mb-6">
                  {OCCASIONS.map((occ) => (
                    <button
                      key={occ.id}
                      onClick={() => setSelectedOccasion(occ.id)}
                      className={clsx(
                        "rounded-xl p-4 text-left border transition-all duration-200",
                        selectedOccasion === occ.id
                          ? "border-primary bg-primary/15 shadow-[2px_6px_14px_rgba(169,78,56,.16)]"
                          : "border-dashed border-surface-dark/20 bg-surface-paper hover:border-primary/40"
                      )}
                    >
                      <div className="font-serif italic text-base">{occ.label}</div>
                      <div className="text-xs text-surface-dark/60 mt-0.5">{occ.desc}</div>
                    </button>
                  ))}
                </div>

                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

                <div className="flex gap-3">
                  {!skinTone && (
                    <button
                      onClick={() => setFormStep("tone")}
                      className="btn-outline flex-1"
                    >
                      Turn back
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
                        Flipping through the archives...
                      </span>
                    ) : (
                      "Consult the Archives"
                    )}
                  </button>
                </div>
              </>
            )}

            {/* ── Step C: Results ── */}
            {formStep === "results" && results && (
              <>
                <p className="diary-entry-title" style={{ fontSize: 20, marginBottom: 4 }}>
                  My recommendation...
                </p>
                <p className="diary-body">
                  After careful consideration of their{" "}
                  <strong>{currentTone?.displayName ?? "complexion"}</strong>
                  {measurements?.height && <>, <strong>{measurements.height} cm stature</strong></>}
                  {" "}and the{" "}
                  <strong>{OCCASIONS.find((o) => o.id === selectedOccasion)?.label ?? selectedOccasion}</strong>
                  {" "}occasion, I prescribe the following from my personal collection:
                </p>

                <RecommendationCard
                  recommendations={results.recommendations}
                  skinTone={currentTone}
                  measurements={measurements}
                />

                <div className="flex flex-col sm:flex-row gap-3 mt-8">
                  <button
                    onClick={() => {
                      setFormStep("occasion");
                      setResults(null);
                      setSelectedOccasion(null);
                    }}
                    className="btn-outline flex-1"
                  >
                    Turn back a page
                  </button>
                  <Link href="/studio" className="btn-primary flex-1 text-center">
                    Begin Your Fitting in Studio
                  </Link>
                </div>
              </>
            )}

            {/* Footer */}
            {formStep !== "results" && (
              <p className="text-center text-[#7c6f5c]/40 text-xs mt-8 font-serif italic">
                You may also consult the Master Tailor directly via the thread-spool in the corner.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
