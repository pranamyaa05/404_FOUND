"use client";

import { useState, useCallback } from "react";
import { useStudioStore } from "@/store/studioStore";
import { enhanceImage } from "@/lib/api";

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
      } catch (err) {
        setError("Enhancement failed. You can still continue with the original.");
      } finally {
        setIsEnhancing(false);
      }
    },
    [setOriginalImage, setEnhancedImage]
  );

  return (
    <div className="card bg-gray-900 border border-gray-700">
      <h2 className="text-2xl font-bold mb-2">Upload Dress Reference Image</h2>
      <p className="text-gray-400 mb-8">
        Upload a photo of the dress you want to stitch. We'll remove hair and
        background distractions automatically.
      </p>

      {/* Upload area */}
      <label className="block border-2 border-dashed border-gray-600 rounded-xl p-10 text-center cursor-pointer hover:border-primary/60 transition-colors mb-6">
        <input
          type="file"
          accept="image/png, image/jpeg"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="text-4xl mb-3">📁</div>
        <p className="text-gray-300 font-medium">Click to upload PNG or JPG</p>
        <p className="text-gray-500 text-sm mt-1">Max 10MB</p>
      </label>

      {error && (
        <p className="text-red-400 text-sm mb-4">{error}</p>
      )}

      {/* Before / After preview */}
      {preview && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div>
            <p className="text-xs text-gray-400 mb-2 uppercase font-semibold">Original</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Original" className="rounded-xl w-full object-cover max-h-64" />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-2 uppercase font-semibold">
              Enhanced {isEnhancing && "— Processing..."}
            </p>
            {isEnhancing ? (
              <div className="rounded-xl w-full max-h-64 bg-gray-800 flex items-center justify-center">
                <span className="text-gray-400 text-sm animate-pulse">
                  Removing distractions...
                </span>
              </div>
            ) : enhancedPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={enhancedPreview} alt="Enhanced" className="rounded-xl w-full object-cover max-h-64" />
            ) : (
              <div className="rounded-xl w-full max-h-64 bg-gray-800 flex items-center justify-center">
                <span className="text-gray-500 text-sm">Awaiting enhancement</span>
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
