"use client";

import { useState, useCallback } from "react";
import { useStudioStore } from "@/store/studioStore";
import { enhanceImage } from "@/lib/api";
import { fireBobMessage } from "@/hooks/useBobProactive";

interface Props {
  onNext: () => void;
  onBack: () => void;
}

/**
 * Step 1 — Upload dress reference image.
 * Calls /enhance-image on the backend to remove hair/distractions.
 *
 * Owner: Member 5 (image enhancement)
 * TODO: Wire up the actual preview once backend is ready.
 */
export default function ImageUpload({ onNext, onBack }: Props) {
  const { setOriginalImage, setEnhancedImage } = useStudioStore();
  const [preview, setPreview] = useState<string | null>(null);
  const [enhancedPreview, setEnhancedPreview] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!["image/png", "image/jpeg"].includes(file.type)) {
        setError("Please upload a PNG or JPG image.");
        return;
      }

      setError(null);
      setOriginalImage(file);
      setPreview(URL.createObjectURL(file));
      setEnhancedPreview(null);

      // Auto-enhance after upload
      setIsEnhancing(true);
      try {
        const enhanced = await enhanceImage(file);
        setEnhancedImage(enhanced.enhanced_image_url);
        setEnhancedPreview(enhanced.enhanced_image_url);
        // Tell BOB the image is clean — nudge toward measurements
        fireBobMessage({
          text: "Image cleaned up!  Now let's get your measurements so I can build a perfectly fitted 3D preview.",
          quickReplies: ["How to measure chest?", "How to measure waist?"],
        });
      } catch (err) {
        setError("Enhancement failed. You can still continue with the original.");
      } finally {
        setIsEnhancing(false);
      }
    },
    [setOriginalImage, setEnhancedImage]
  );

  return (
    <div className="card">
      <h2 className="font-serif italic text-3xl text-surface-dark mb-2">Upload Dress Reference Image</h2>
      <p className="text-surface-dark/60 mb-8">
        Upload a photo of the dress you want to stitch. We'll remove hair and
        background distractions automatically.
      </p>

      {/* Upload area, styled like a pinned scrap of pattern paper */}
      <label className="relative block border border-dashed border-surface-dark/30 rounded-xl p-10 text-center cursor-pointer hover:border-primary/60 transition-colors mb-6 bg-surface-paper/70">
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-gradient-to-b from-[#e0b57f] to-[#9a6840] shadow-[1px_2px_4px_rgba(24,15,8,.35)]" />
        <input
          type="file"
          accept="image/png, image/jpeg"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="text-4xl mb-3"></div>
        <p className="text-surface-dark/80 font-medium">Click to upload PNG or JPG</p>
        <p className="text-surface-dark/50 text-sm mt-1">Max 10MB</p>
      </label>

      {error && (
        <p className="text-red-500 text-sm mb-4">{error}</p>
      )}

      {/* Before / After preview */}
      {preview && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div>
            <p className="eyebrow-thread text-xs before:w-4 after:hidden mb-2">Original</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Original" className="rounded-xl w-full object-cover max-h-64 border border-surface-dark/10 shadow-[2px_6px_14px_rgba(38,27,16,.15)]" />
          </div>
          <div>
            <p className="eyebrow-thread text-xs before:w-4 after:hidden mb-2">
              Enhanced {isEnhancing && "— Processing..."}
            </p>
            {isEnhancing ? (
              <div className="rounded-xl w-full h-full min-h-[160px] bg-surface-paper border border-dashed border-surface-dark/20 flex items-center justify-center">
                <span className="text-surface-dark/60 text-sm animate-pulse">
                  Removing distractions...
                </span>
              </div>
            ) : enhancedPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={enhancedPreview} alt="Enhanced" className="rounded-xl w-full object-cover max-h-64 border border-surface-dark/10 shadow-[2px_6px_14px_rgba(38,27,16,.15)]" />
            ) : (
              <div className="rounded-xl w-full h-full min-h-[160px] bg-surface-paper border border-dashed border-surface-dark/20 flex items-center justify-center">
                <span className="text-surface-dark/50 text-sm">Awaiting enhancement</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <button onClick={onBack} className="btn-outline flex-1">
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={!preview || isEnhancing}
          className="btn-primary flex-1"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
