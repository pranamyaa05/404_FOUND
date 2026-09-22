"use client";

import { useStudioStore } from "@/store/studioStore";

import { useState, useEffect } from "react";

interface Props {
  onBack: () => void;
}

export default function DieLine({ onBack }: Props) {
  const { wardrobe, activeWardrobeId, measurements } = useStudioStore();
  const activeItem = wardrobe.find(w => w.id === activeWardrobeId);
  const dieLineUrl = activeItem?.dieLineUrl;
  const activeStyle = activeItem?.style || "Garment";

  const [showWireframe, setShowWireframe] = useState(true);
  const [processedSvgUrl, setProcessedSvgUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!dieLineUrl) {
      setProcessedSvgUrl(null);
      return;
    }
    
    fetch(dieLineUrl)
      .then(res => res.text())
      .then(svgText => {
        // Hide outline and seam lines if wireframe is off
        const styleBlock = `<style>
          ${!showWireframe ? '.outline { display: none !important; } .seam { display: none !important; }' : ''}
        </style>`;
        
        // Insert the style block inside the SVG
        const modifiedSvg = svgText.replace(/(<svg[^>]*>)/i, `$1${styleBlock}`);
        
        const blob = new Blob([modifiedSvg], { type: 'image/svg+xml' });
        const objUrl = URL.createObjectURL(blob);
        setProcessedSvgUrl(objUrl);

        return () => URL.revokeObjectURL(objUrl);
      })
      .catch(err => {
        console.error("Error processing SVG:", err);
        setProcessedSvgUrl(dieLineUrl);
      });
  }, [dieLineUrl, showWireframe]);

  // Derive component metrics in cm from measurements or store defaults
  const m = measurements || { height: 165, chest: 90, waist: 75, hip: 95, shoulder: 40 };
  const collarCm = (m.chest * 0.42).toFixed(1);
  const bustWidthCm = (m.chest / 2 + 2).toFixed(1);
  const waistWidthCm = (m.waist / 2 + 2).toFixed(1);
  const garmentLengthCm = (m.height * 0.65).toFixed(1);

  return (
    <div className="card">
      <h2 className="font-serif italic text-3xl text-surface-dark mb-2">
        Tailor Pattern & Component Specs ({activeStyle})
      </h2>
      <p className="text-surface-dark/60 mb-6">
        2D cutout patterns for the currently selected layer. Scale 1:1.
      </p>

      {processedSvgUrl ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Main SVG Pattern Cutting Table */}
          <div className="lg:col-span-8 flex flex-col">
            <div className="flex justify-between items-end mb-2">
              <div className="text-xs font-serif italic text-surface-dark/70">
                ARAP 2D Panel Cutout Pattern (Scale 1:1)
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-surface-dark/80 bg-surface-dark/5 hover:bg-surface-dark/10 px-2 py-1 rounded transition-colors">
                <input 
                  type="checkbox" 
                  checked={showWireframe} 
                  onChange={(e) => setShowWireframe(e.target.checked)} 
                  className="accent-primary"
                />
                Show Triangle Mesh
              </label>
            </div>
            <div
              className="w-full flex-1 rounded-xl p-4 overflow-auto max-h-[520px] min-h-[400px] border border-surface-dark/10 shadow-inner"
              style={{
                backgroundColor: "#fbf8f0",
                backgroundImage:
                  "repeating-linear-gradient(0deg, rgba(50,42,33,.09) 0 1px, transparent 1px 24px), repeating-linear-gradient(90deg, rgba(50,42,33,.09) 0 1px, transparent 1px 24px)",
              }}
            >
              <object
                data={processedSvgUrl}
                type="image/svg+xml"
                className="w-full min-h-[380px]"
                aria-label="2D die-line pattern"
              >
                <p className="text-surface-dark/50 text-sm text-center py-10">
                  SVG preview loading...
                </p>
              </object>
            </div>

            <div className="mt-4">
              <a
                href={processedSvgUrl}
                download="garmentforge-pattern.svg"
                className="btn-primary text-center block text-sm py-2.5"
              >
                Download Pattern (SVG)
              </a>
            </div>
          </div>

          {/* Tailor Component Metrics Sidebar */}
          <div className="lg:col-span-4 flex flex-col">
            <div className="text-xs font-serif italic text-surface-dark/70 mb-2">
              Garment Component Metrics
            </div>

            <div className="bg-surface-light rounded-xl p-5 border border-surface-dark/10 shadow-sm flex-1 flex flex-col justify-between">
              <div>
                <h4 className="font-serif italic text-base text-surface-dark mb-4 border-b border-surface-dark/10 pb-2">
                  Labeled Component Breakdown
                </h4>

                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between items-center bg-white/60 p-2.5 rounded-lg border border-surface-dark/5">
                    <span className="font-medium text-surface-dark/80"> Collar / Neckline</span>
                    <span className="font-mono font-bold text-primary">{collarCm} cm</span>
                  </div>

                  <div className="flex justify-between items-center bg-white/60 p-2.5 rounded-lg border border-surface-dark/5">
                    <span className="font-medium text-surface-dark/80"> Front/Back Bust Panel</span>
                    <span className="font-mono font-bold text-primary">{bustWidthCm} cm</span>
                  </div>

                  <div className="flex justify-between items-center bg-white/60 p-2.5 rounded-lg border border-surface-dark/5">
                    <span className="font-medium text-surface-dark/80"> Waist Panel Width</span>
                    <span className="font-mono font-bold text-primary">{waistWidthCm} cm</span>
                  </div>


                  <div className="flex justify-between items-center bg-white/60 p-2.5 rounded-lg border border-surface-dark/5">
                    <span className="font-medium text-surface-dark/80"> Total Garment Length</span>
                    <span className="font-mono font-bold text-primary">{garmentLengthCm} cm</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-surface-dark/10 text-[11px] text-surface-dark/60 italic leading-relaxed">
                * All seam allowances (1.5 cm) and notch markers are calculated automatically from ARAP surface parameters.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="w-full h-64 rounded-xl flex flex-col items-center justify-center mb-8 border border-dashed border-surface-dark/25"
          style={{
            backgroundColor: "#fbf8f0",
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(50,42,33,.07) 0 1px, transparent 1px 24px), repeating-linear-gradient(90deg, rgba(50,42,33,.07) 0 1px, transparent 1px 24px)",
          }}
        >
          <div className="text-5xl mb-4">️</div>
          <p className="text-surface-dark/60 font-medium">
            Pattern and component specs will appear here once 3D mesh is generated
          </p>
        </div>
      )}

      <button onClick={onBack} className="btn-outline w-full">
        ← Back to 3D View
      </button>
    </div>
  );
}
