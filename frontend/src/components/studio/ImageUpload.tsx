"use client";

import { useState, useCallback } from "react";
import { useStudioStore, GarmentImage } from "@/store/studioStore";
import { enhanceImage } from "@/lib/api";
import { fireBobMessage } from "@/hooks/useBobProactive";

interface Props {
  onNext: () => void;
  onBack: () => void;
}

function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.92)" }}
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "92vw", maxHeight: "92vh", objectFit: "contain", borderRadius: 12 }}
      />
      <button onClick={onClose} className="absolute top-5 right-6 text-white text-3xl font-bold"></button>
    </div>
  );
}

function ImageWithFullscreen({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  return (
    <div className="relative group w-full h-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className={className} />
      <button
        onClick={() => setLightboxOpen(true)}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-black/60 text-white rounded px-2 py-1 text-xs"
      ></button>
      {lightboxOpen && <Lightbox src={src} alt={alt} onClose={() => setLightboxOpen(false)} />}
    </div>
  );
}

export default function ImageUpload({ onNext, onBack }: Props) {
  const { selectedStyles, garmentGallery, addGarmentImage, updateGarmentImage } = useStudioStore();
  const [enhancingMap, setEnhancingMap] = useState<Record<string, boolean>>({});
  const [errorMap, setErrorMap] = useState<Record<string, string | null>>({});

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, styleName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setErrorMap(prev => ({ ...prev, [styleName]: "Please upload a PNG or JPG image." }));
      return;
    }
    setErrorMap(prev => ({ ...prev, [styleName]: null }));

    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    
    // Check if replacing an existing style
    const existing = garmentGallery.find(g => g.style === styleName);
    if (existing) {
      updateGarmentImage(existing.id, { original: file, enhanced: null });
    } else {
      addGarmentImage({ id, style: styleName, original: file, enhanced: null });
    }
    const targetId = existing ? existing.id : id;

    setEnhancingMap(prev => ({ ...prev, [styleName]: true }));
    try {
      const enhanced = await enhanceImage(file);
      updateGarmentImage(targetId, { enhanced: enhanced.enhanced_image_url });
      fireBobMessage({
        text: `Cleaned up your ${styleName} image!`,
        quickReplies: [],
      });
    } catch (err: any) {
      setErrorMap(prev => ({ ...prev, [styleName]: `Enhancement failed: ${err.message || String(err)}` }));
    } finally {
      setEnhancingMap(prev => ({ ...prev, [styleName]: false }));
    }
  };

  const isAnyEnhancing = Object.values(enhancingMap).some(Boolean);
  const allStylesHaveUpload = selectedStyles.length > 0 && selectedStyles.every(s => garmentGallery.some(g => g.style === s));

  return (
    <div className="card">
      <h2 className="font-serif italic text-3xl text-surface-dark mb-2">Upload References</h2>
      <p className="text-surface-dark/60 mb-6">
        Upload a photo for each style you selected. We'll remove backgrounds automatically.
      </p>

      {selectedStyles.map((styleName, idx) => {
        const item = garmentGallery.find((g) => g.style === styleName);
        const isEnhancing = enhancingMap[styleName] || false;
        const error = errorMap[styleName];
        const isAccessory = styleName.startsWith("Accessory");

        return (
          <div key={idx} className="bg-surface-light border border-surface-dark/10 rounded-2xl p-6 mb-6 shadow-sm relative">
            {isAccessory && (
              <button 
                onClick={() => useStudioStore.getState().toggleSelectedStyle(styleName)}
                className="absolute top-4 right-4 w-6 h-6 flex items-center justify-center text-surface-dark/40 hover:text-red-500 bg-black/5 hover:bg-red-50 rounded-full transition-colors"
                title="Remove accessory"
              >
                ✕
              </button>
            )}
            <h3 className="font-serif italic text-xl text-surface-dark mb-4">{styleName}</h3>
            
            {!item ? (
              <label className="relative block border border-dashed border-surface-dark/30 rounded-xl p-8 text-center cursor-pointer hover:border-primary/60 bg-surface-paper/70">
                <input type="file" accept="image/png, image/jpeg" onChange={(e) => handleFileChange(e, styleName)} className="hidden" />
                <p className="text-surface-dark/80 font-medium">Click to upload reference for {styleName}</p>
              </label>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-surface-dark/60 mb-2">Original</p>
                  <div className="h-48">
                    <ImageWithFullscreen src={URL.createObjectURL(item.original)} alt="Original" className="rounded-xl w-full h-full object-cover border border-surface-dark/10" />
                  </div>
                  <label className="text-xs mt-2 text-primary cursor-pointer hover:underline block text-center">
                    <input type="file" accept="image/png, image/jpeg" onChange={(e) => handleFileChange(e, styleName)} className="hidden" />
                    Replace Image
                  </label>
                </div>
                <div>
                  <p className="text-xs text-surface-dark/60 mb-2">Enhanced {isEnhancing && "— Processing..."}</p>
                  {isEnhancing ? (
                    <div className="rounded-xl w-full h-48 bg-surface-paper border border-dashed border-surface-dark/20 flex items-center justify-center animate-pulse">
                      <span className="text-surface-dark/60 text-sm">Removing background...</span>
                    </div>
                  ) : item.enhanced ? (
                    <div className="h-48">
                      <ImageWithFullscreen src={item.enhanced} alt="Enhanced" className="rounded-xl w-full h-full object-cover border border-surface-dark/10" />
                    </div>
                  ) : null}
                </div>
              </div>
            )}
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>
        );
      })}

      <div className="flex justify-center mt-2 mb-8">
        <button 
          onClick={() => {
            const accCount = selectedStyles.filter(s => s.startsWith("Accessory")).length + 1;
            useStudioStore.getState().toggleSelectedStyle(`Accessory ${accCount}`);
          }}
          className="btn-outline flex items-center gap-2 border-dashed border-2 hover:bg-surface-dark hover:text-white"
        >
          <span className="text-xl leading-none">+</span> Add Accessory / Extra Item
        </button>
      </div>

      <div className="flex gap-4 mt-6">
        <button onClick={onBack} className="btn-outline flex-1">← Back</button>
        <button onClick={onNext} disabled={!allStylesHaveUpload || isAnyEnhancing} className="btn-primary flex-1">
          Add Measurements →
        </button>
      </div>
      
    </div>
  );
}
