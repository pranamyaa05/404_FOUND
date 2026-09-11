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
    <div className="card bg-gray-900 border border-gray-700">
      <h2 className="text-2xl font-bold mb-2">Tailor Pattern / Die-lines</h2>
      <p className="text-gray-400 mb-8">
        These are the 2D cutout patterns your tailor needs. Download and print
        at 1:1 scale.
      </p>

      {dieLineUrl ? (
        <div className="mb-8">
          {/* SVG inline viewer */}
          <div className="w-full bg-white rounded-xl p-4 overflow-auto max-h-[500px]">
            <object
              data={dieLineUrl}
              type="image/svg+xml"
              className="w-full"
              aria-label="2D die-line pattern"
            >
              <p className="text-gray-500 text-sm text-center py-10">
                SVG preview not available. Use the download button below.
              </p>
            </object>
          </div>

          <a
            href={dieLineUrl}
            download="stitchsmart-pattern.svg"
            className="btn-primary w-full mt-4 text-center block"
          >
            ⬇ Download Pattern (SVG)
          </a>
        </div>
      ) : (
        /* Placeholder shown when backend isn't connected yet */
        <div className="w-full h-64 bg-gray-800 rounded-xl flex flex-col items-center justify-center mb-8 border-2 border-dashed border-gray-600">
          <div className="text-5xl mb-4">🧩</div>
          <p className="text-gray-400 font-medium">
            Pattern will appear here once mesh is generated
          </p>
          <p className="text-gray-500 text-sm mt-1">
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
