"use client";

import { useStudioStore } from "@/store/studioStore";

interface Props {
  onBack: () => void;
}

/**
 * Step 4 — Display and download the 2D die-line SVG pattern.
 *
 * Owner: Member 1 & 2 (die-line generation)
 * The SVG URL comes from the same /generate-mesh endpoint response.
 * TODO: Replace placeholder with actual SVG viewer once backend is ready.
 */
export default function DieLine({ onBack }: Props) {
  const { dieLineUrl } = useStudioStore();

  return (
    <div className="card">
      <h2 className="font-serif italic text-3xl text-surface-dark mb-2">Tailor Pattern / Die-lines</h2>
      <p className="text-surface-dark/60 mb-8">
        These are the 2D cutout patterns your tailor needs. Download and print
        at 1:1 scale.
      </p>

      {dieLineUrl ? (
        <div className="mb-8">
          {/* SVG inline viewer, on a graph-paper backdrop like a cutting table */}
          <div
            className="w-full rounded-xl p-4 overflow-auto max-h-[500px] border border-surface-dark/10"
            style={{
              backgroundColor: "#fbf8f0",
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(50,42,33,.09) 0 1px, transparent 1px 24px), repeating-linear-gradient(90deg, rgba(50,42,33,.09) 0 1px, transparent 1px 24px)",
            }}
          >
            <object
              data={dieLineUrl}
              type="image/svg+xml"
              className="w-full"
              aria-label="2D die-line pattern"
            >
              <p className="text-surface-dark/50 text-sm text-center py-10">
                SVG preview not available. Use the download button below.
              </p>
            </object>
          </div>

          <a
            href={dieLineUrl}
            download="stitchsmart-pattern.svg"
            className="btn-primary w-full mt-4 text-center block"
          >
             Download Pattern (SVG)
          </a>
        </div>
      ) : (
        /* Placeholder shown when backend isn't connected yet, on the same cutting-table texture */
        <div
          className="w-full h-64 rounded-xl flex flex-col items-center justify-center mb-8 border border-dashed border-surface-dark/25"
          style={{
            backgroundColor: "#fbf8f0",
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(50,42,33,.07) 0 1px, transparent 1px 24px), repeating-linear-gradient(90deg, rgba(50,42,33,.07) 0 1px, transparent 1px 24px)",
          }}
        >
          <div className="text-5xl mb-4"></div>
          <p className="text-surface-dark/60 font-medium">
            Pattern will appear here once mesh is generated
          </p>
          <p className="text-surface-dark/50 text-sm mt-1">
            Connect the Blender backend to see die-lines
          </p>
        </div>
      )}

      <button onClick={onBack} className="btn-outline w-full">
        ← Back to 3D View
      </button>
    </div>
  );
}
