/**
 * RecommendationCard — rendered inline inside BOB's message list.
 *
 * Shown when BOB calls /recommend and gets style+fabric combos back.
 * Each card shows style name, fabric, a colour suggestion, and the reason.
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
  Kurta: "👘",
  "Ghagra / Lehenga": "👗",
  Ghagra: "👗",
  Lehenga: "👗",
  "Blouse (Saree)": "🥻",
  "Anarkali Suit": "🌸",
  "Salwar Kameez": "🧥",
  "Daily Wear Dress": "👚",
  default: "✨",
};

const FABRIC_COLOR: Record<string, string> = {
  Silk: "from-amber-500/20 to-yellow-400/10 border-amber-500/30",
  Cotton: "from-sky-500/20 to-blue-400/10 border-sky-500/30",
  Georgette: "from-pink-500/20 to-rose-400/10 border-pink-500/30",
  Chiffon: "from-purple-500/20 to-violet-400/10 border-purple-500/30",
  Linen: "from-green-500/20 to-emerald-400/10 border-green-500/30",
  Brocade: "from-orange-500/20 to-amber-400/10 border-orange-500/30",
  Velvet: "from-red-500/20 to-rose-400/10 border-red-500/30",
  Net: "from-cyan-500/20 to-teal-400/10 border-cyan-500/30",
  default: "from-violet-500/20 to-purple-400/10 border-violet-500/30",
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
            className={`bg-gradient-to-br ${gradient} border rounded-xl p-3 w-full`}
          >
            {/* Header row */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">{emoji}</span>
                <div>
                  <p className="text-white font-semibold text-sm leading-tight">
                    {rec.style}
                  </p>
                  <p className="text-gray-300 text-xs">{rec.fabric}</p>
                </div>
              </div>
              {rec.confidence && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    rec.confidence === "high"
                      ? "bg-green-500/20 text-green-300"
                      : "bg-yellow-500/20 text-yellow-300"
                  }`}
                >
                  {rec.confidence === "high" ? "★ Top pick" : "Good match"}
                </span>
              )}
            </div>

            {/* Colour suggestions */}
            {rec.colors && rec.colors.length > 0 && (
              <div className="flex gap-1 mb-2 flex-wrap">
                {rec.colors.map((c) => (
                  <span
                    key={c}
                    className="text-[10px] bg-white/10 text-gray-200 px-2 py-0.5 rounded-full"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}

            {/* Reason */}
            <p className="text-gray-300 text-xs leading-relaxed">{rec.reason}</p>
          </div>
        );
      })}
    </div>
  );
}
