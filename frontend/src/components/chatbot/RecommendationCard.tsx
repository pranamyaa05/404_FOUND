/**
 * RecommendationCard — styled as torn-out pages from the Master Tailor's personal sketchbook.
 */

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

interface Props {
  recommendations: Recommendation[];
}

export default function RecommendationCard({ recommendations }: Props) {
  return (
    <div className="w-full space-y-2 mt-1">
      {recommendations.map((rec, i) => {
        const emoji = STYLE_EMOJI[rec.style] ?? STYLE_EMOJI.default;
        const gradient =
          FABRIC_COLOR[rec.fabric] ?? FABRIC_COLOR.default;

        return (
          <div
            key={i}
            className={`relative bg-gradient-to-br ${gradient} border border-dashed rounded-xl p-4 w-full`}
          >
            {/* Sketchbook torn edge */}
            <div className="absolute top-0 left-0 w-1 h-full bg-[repeating-linear-gradient(180deg,transparent_0_4px,rgba(107,76,50,0.15)_4px_8px)]" />
            {/* Header row */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">{emoji}</span>
                <div>
                  <p className="text-surface-dark font-serif italic text-base leading-tight">
                    {rec.style}
                  </p>
                  <p className="text-surface-dark/80 text-xs">{rec.fabric}</p>
                </div>
              </div>
              {rec.confidence && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    rec.confidence === "high"
                      ? "bg-[#69785d]/25 text-[#3f4a38]"
                      : "bg-[#e0b57f]/35 text-[#6d4530]"
                  }`}
                >
                  {rec.confidence === "high" ? "Tailor's choice" : "Fine match"}
                </span>
              )}
            </div>

            {/* Colour suggestions */}
            {rec.colors && rec.colors.length > 0 && (
              <div className="flex gap-1 mb-2 flex-wrap">
                {rec.colors.map((c) => (
                  <span
                    key={c}
                    className="text-[10px] bg-surface-dark/10 text-surface-dark px-2 py-0.5 rounded-full"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}

            {/* Reason */}
            <p className="text-surface-dark/80 text-xs leading-relaxed">{rec.reason}</p>
          </div>
        );
      })}
    </div>
  );
}
