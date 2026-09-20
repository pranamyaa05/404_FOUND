"use client";

/**
 * RecommendationCard — styled as torn-out pages from the Master Tailor's personal sketchbook.
 * Now includes an interactive FashionModelPreview that shows the suggested dress
 * in the person's skin tone, with colour swatches to compare options.
 */

import { useState } from "react";
import FashionModelPreview from "@/components/chatbot/FashionModelPreview";
import type { SkinToneValue } from "@/store/studioStore";
import type { MeasurementValues } from "@/components/studio/MeasurementForm";

export interface Recommendation {
  style: string;
  fabric: string;
  colors?: string[];   // optional colour suggestions
  reason: string;
  confidence?: "high" | "medium";
}

// Map style names to emoji for quick visual scanning
const STYLE_EMOJI: Record<string, string> = {
  Kurta: "",
  "Ghagra / Lehenga": "",
  Ghagra: "",
  Lehenga: "",
  "Blouse (Saree)": "",
  "Anarkali Suit": "",
  "Salwar Kameez": "",
  "Daily Wear Dress": "",
  default: "",
};

const FABRIC_COLOR: Record<string, string> = {
  Silk: "from-[#e0b57f]/30 to-[#e0b57f]/5 border-[#a9803f]/35",
  Cotton: "from-[#7a97ad]/25 to-[#7a97ad]/5 border-[#4e6c82]/30",
  Georgette: "from-[#c7777b]/25 to-[#c7777b]/5 border-[#a94e38]/30",
  Chiffon: "from-primary/15 to-primary/5 border-primary/25",
  Linen: "from-accent/25 to-accent/5 border-accent/35",
  Brocade: "from-[#a94e38]/25 to-[#a94e38]/5 border-[#833b2b]/30",
  Velvet: "from-[#754333]/25 to-[#754333]/5 border-[#754333]/35",
  Net: "from-[#69785d]/20 to-[#69785d]/5 border-[#506148]/30",
  default: "from-accent/10 to-accent/5 border-accent/20",
};

/**
 * Named colour → hex mapping for common Indian fashion colour names.
 * Used to convert API colour labels into actual hex values for the preview.
 */
const COLOR_HEX: Record<string, string> = {
  // Reds / Pinks
  "Deep Red": "#8B1A1A",
  "Maroon": "#6B1A1A",
  "Crimson": "#9B1B30",
  "Rose": "#C76B8A",
  "Blush Pink": "#F0A8B0",
  "Hot Pink": "#CC2266",
  "Magenta": "#AA0060",
  "Coral": "#E8715A",
  "Rust": "#9B4318",
  "Brick Red": "#8B3A2A",
  // Oranges / Yellows
  "Orange": "#D4621A",
  "Saffron": "#E8801A",
  "Mustard": "#C8921A",
  "Yellow": "#D4B020",
  "Golden": "#C8940C",
  "Ivory": "#F5EDD5",
  "Cream": "#F0E6CA",
  // Greens
  "Emerald Green": "#1A6B3C",
  "Bottle Green": "#1A4A2E",
  "Mint Green": "#7AC8A8",
  "Sage": "#8BA888",
  "Olive": "#6B7A2A",
  "Teal": "#1A7A7A",
  "Mehendi Green": "#4A6B2A",
  "Lime": "#8AB820",
  // Blues / Purples
  "Royal Blue": "#1A3A8B",
  "Navy Blue": "#0A1A4A",
  "Cobalt": "#1A4A9B",
  "Sky Blue": "#6AA8D4",
  "Powder Blue": "#A8C8E0",
  "Indigo": "#2A1A6B",
  "Violet": "#4A1A7A",
  "Lavender": "#9A80C4",
  "Purple": "#5A1A7A",
  "Plum": "#4A1A3A",
  "Mauve": "#8A5A7A",
  // Neutrals / Browns
  "Beige": "#C8A87A",
  "Camel": "#B88A4A",
  "Tan": "#B87A3A",
  "Chocolate": "#5A3018",
  "Coffee Brown": "#4A280E",
  "Champagne": "#E0C890",
  "Off White": "#F0EAD8",
  "White": "#F5F0E8",
  "Black": "#1A1410",
  "Charcoal": "#3A3530",
  "Grey": "#8A8480",
  "Silver": "#B8B4B0",
  // Misc Indian fashion
  "Peacock Blue": "#1A5A6B",
  "Turquoise": "#1A8A8A",
  "Fuchsia": "#B81A6B",
  "Wine": "#5A0A1A",
  "Burgundy": "#6B0A1A",
  "Peach": "#E0A888",
};

/** Best-effort: look up exact name, then try contains match, else a tasteful fallback */
function resolveColorHex(colorName: string): string {
  if (!colorName) return "#a94e38";
  // Exact match
  if (COLOR_HEX[colorName]) return COLOR_HEX[colorName];
  // Case-insensitive search
  const lower = colorName.toLowerCase();
  for (const [key, val] of Object.entries(COLOR_HEX)) {
    if (key.toLowerCase() === lower) return val;
    if (key.toLowerCase().includes(lower) || lower.includes(key.toLowerCase())) return val;
  }
  // Hash the string to a consistent hue for unknown colours
  let hash = 0;
  for (let i = 0; i < colorName.length; i++) hash = colorName.charCodeAt(i) + ((hash << 5) - hash);
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 55%, 42%)`;
}

// ── Per-card interactive state ────────────────────────────────────────────────

interface SingleCardProps {
  rec: Recommendation;
  skinTone: SkinToneValue | null;
  measurements: MeasurementValues | null;
  index: number;
}

function RecommendationCardItem({ rec, skinTone, measurements, index }: SingleCardProps) {
  const emoji = STYLE_EMOJI[rec.style] ?? STYLE_EMOJI.default;
  const gradient = FABRIC_COLOR[rec.fabric] ?? FABRIC_COLOR.default;

  // Build colour options — recommended + a few extras for comparison
  const recommendedHexes = (rec.colors ?? []).map((c) => ({ name: c, hex: resolveColorHex(c) }));

  // If the API gave no colours, offer a few tasteful defaults
  const defaultPalette = [
    { name: "Deep Red", hex: resolveColorHex("Deep Red") },
    { name: "Royal Blue", hex: resolveColorHex("Royal Blue") },
    { name: "Emerald Green", hex: resolveColorHex("Emerald Green") },
    { name: "Mustard", hex: resolveColorHex("Mustard") },
  ];
  const colorOptions = recommendedHexes.length > 0 ? recommendedHexes : defaultPalette;

  const [selectedColor, setSelectedColor] = useState(colorOptions[0]);
  const [customHex, setCustomHex] = useState<string | null>(null);
  const [showModel, setShowModel] = useState(false);

  const activeColor = customHex ?? selectedColor.hex;
  const activeName = customHex ? "Custom" : selectedColor.name;
  const skinHex = skinTone?.hex ?? "#C68642";

  return (
    <>
      <div
        className={`relative bg-gradient-to-br ${gradient} border border-dashed rounded-xl p-4 pr-16 w-full h-[145px] flex flex-col justify-between`}
      >
        {/* Sketchbook torn edge */}
        <div className="absolute top-0 left-0 w-1 h-full bg-[repeating-linear-gradient(180deg,transparent_0_4px,rgba(107,76,50,0.15)_4px_8px)]" />

        <div>
          <div className="flex items-start justify-between gap-1 mb-1">
            <div>
              <p className="text-surface-dark font-serif italic text-base leading-tight">
                {emoji} {rec.style}
              </p>
              <p className="text-surface-dark/80 text-[11px] uppercase tracking-wider mt-0.5">{rec.fabric}</p>
            </div>
            {rec.confidence && (
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm shrink-0 ${
                  rec.confidence === "high"
                    ? "bg-[#69785d]/20 text-[#3f4a38]"
                    : "bg-[#e0b57f]/30 text-[#6d4530]"
                }`}
              >
                {rec.confidence === "high" ? " Top Choice" : "Match"}
              </span>
            )}
          </div>
          <p className="text-surface-dark/80 text-xs leading-snug mt-2 h-[52px] overflow-hidden line-clamp-3">
            {rec.reason}
          </p>
        </div>

        {/* Colors */}
        <div className="flex items-center gap-1 mt-4">
          <span className="text-[10px] text-surface-dark/50 font-serif italic mr-1">Palette:</span>
          {colorOptions.slice(0, 5).map(c => (
            <div 
              key={c.name} 
              className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-sm" 
              style={{ backgroundColor: c.hex }} 
              title={c.name} 
            />
          ))}
          {colorOptions.length > 5 && (
            <span className="text-[9px] text-surface-dark/50 ml-0.5">+{colorOptions.length - 5}</span>
          )}
        </div>

        {/* Very small Polaroid floating at the bottom right */}
        <div className="absolute bottom-3 right-3 z-10">
          <button
            onClick={() => setShowModel(true)}
            className="w-[55px] h-[95px] bg-[#f4ebd8] p-1.5 pb-4 shadow-[2px_3px_8px_rgba(0,0,0,0.15)] border border-[#e5d5c0] rotate-[5deg] hover:rotate-0 transition-all duration-300 hover:scale-110 hover:shadow-[4px_6px_12px_rgba(0,0,0,0.2)] cursor-pointer group origin-bottom-right"
            title="Tap to try on model"
          >
            <div className="w-full h-full bg-[#faf5eb] border border-[#d5c5b0]/30 overflow-hidden flex items-center justify-center pointer-events-none relative rounded-[1px]">
              <FashionModelPreview
                skinHex={skinHex}
                dressColor={activeColor}
                style={rec.style}
                heightCm={measurements?.height}
                waistCm={measurements?.waist}
                hipCm={measurements?.hip}
                chestCm={measurements?.chest}
                isFestive={!/office|work|casual|daily|formal|corporate|cotton|linen/i.test((rec.reason || "") + " " + (rec.fabric || ""))}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            </div>
          </button>
        </div>
      </div>

      {/* ── Popup Modal for Model Try-On ── */}
      {showModel && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setShowModel(false)}
        >
          <div 
            className="bg-surface-paper rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-surface-dark/10 flex justify-between items-center bg-primary/5">
              <div className="flex items-center gap-2">
                <span className="text-xl">{emoji}</span>
                <div>
                  <h3 className="font-serif italic text-lg leading-tight text-surface-dark">{rec.style}</h3>
                  <p className="text-xs text-surface-dark/60">{rec.fabric}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModel(false)} 
                className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-dark/5 hover:bg-surface-dark/10 text-surface-dark/60 transition-colors"
              >
                
              </button>
            </div>

            {/* Modal Body: Model Preview */}
            <div className="p-6 flex flex-col items-center bg-surface-paper/50">
              <div className="w-[180px] h-[320px]">
                <FashionModelPreview
                  skinHex={skinHex}
                  dressColor={activeColor}
                  style={rec.style}
                  heightCm={measurements?.height}
                  waistCm={measurements?.waist}
                  hipCm={measurements?.hip}
                  chestCm={measurements?.chest}
                isFestive={!/office|work|casual|daily|formal|corporate|cotton|linen/i.test((rec.reason || "") + " " + (rec.fabric || ""))}
                />
              </div>
            </div>

            {/* Modal Footer: Color Swatches */}
            <div className="p-4 bg-surface-dark/5 border-t border-surface-dark/10">
              <p className="text-[10px] text-surface-dark/50 font-serif italic mb-2 text-center">
                Tap a colour to preview:
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {colorOptions.map((c) => (
                  <button
                    key={c.name}
                    title={c.name}
                    onClick={() => { setSelectedColor(c); setCustomHex(null); }}
                    className={`w-8 h-8 rounded-full border-2 transition-all shadow-sm flex items-center justify-center ${
                      !customHex && selectedColor.name === c.name 
                        ? "border-primary scale-110" 
                        : "border-white/50 hover:scale-105"
                    }`}
                    style={{ backgroundColor: c.hex }}
                    aria-label={`Try ${c.name}`}
                  >
                    {!customHex && selectedColor.name === c.name && (
                      <span className="text-white drop-shadow-md text-xs font-bold"></span>
                    )}
                  </button>
                ))}

                {/* Custom colour picker */}
                <label 
                  className={`w-8 h-8 rounded-full border-2 transition-all shadow-sm flex items-center justify-center cursor-pointer ${
                    customHex ? "border-primary scale-110" : "border-white/50 hover:scale-105 bg-surface-dark/10"
                  }`}
                  title="Pick any colour"
                >
                  <input
                    type="color"
                    className="sr-only"
                    value={customHex ?? activeColor}
                    onChange={(e) => setCustomHex(e.target.value)}
                  />
                  {customHex ? (
                     <span className="text-white drop-shadow-md text-xs font-bold"></span>
                  ) : (
                     <span className="text-surface-dark/50 text-lg leading-none mb-0.5">+</span>
                  )}
                </label>
              </div>
              
              <p className="text-center text-[11px] text-surface-dark/70 mt-3 font-medium">
                Wearing: <span className="font-serif italic">{activeName}</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

interface Props {
  recommendations: Recommendation[];
  skinTone?: SkinToneValue | null;
  measurements?: MeasurementValues | null;
}

export default function RecommendationCard({ recommendations, skinTone = null, measurements = null }: Props) {
  return (
    <div className="w-full space-y-4 mt-1">
      {recommendations.map((rec, i) => (
        <RecommendationCardItem
          key={i}
          rec={rec}
          skinTone={skinTone}
          measurements={measurements}
          index={i}
        />
      ))}
    </div>
  );
}
