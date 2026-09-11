"use client";

import { useState } from "react";
import clsx from "clsx";
import { useStudioStore } from "@/store/studioStore";
import stylesData from "../../../../data/styles.json";

interface Props {
  onNext: () => void;
}

/**
 * Step 0 — User picks a dress style category.
 * Selection is stored in the global studioStore.
 */
export default function StylePicker({ onNext }: Props) {
  const { selectedStyle, setSelectedStyle } = useStudioStore();

  const handleSelect = (styleId: string) => {
    setSelectedStyle(styleId);
  };

  return (
    <div className="card bg-gray-900 border border-gray-700">
      <h2 className="text-2xl font-bold mb-2">Choose a Dress Style</h2>
      <p className="text-gray-400 mb-8">
        Select the type of dress you want to create.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stylesData.map((style) => (
          <button
            key={style.id}
            onClick={() => handleSelect(style.id)}
            className={clsx(
              "rounded-xl p-4 border-2 text-left transition-all duration-200",
              selectedStyle === style.id
                ? "border-primary-light bg-primary/20 text-white"
                : "border-gray-600 bg-gray-800 text-gray-300 hover:border-primary/50"
            )}
          >
            <div className="text-3xl mb-2">{style.emoji}</div>
            <div className="font-semibold">{style.name}</div>
            <div className="text-xs text-gray-400 mt-1">{style.origin}</div>
          </button>
        ))}
      </div>

      <button
        onClick={onNext}
        disabled={!selectedStyle}
        className="btn-primary w-full"
      >
        Continue →
      </button>
    </div>
  );
}
