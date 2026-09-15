"use client";

import { useState, useEffect } from "react";
import StylePicker from "@/components/studio/StylePicker";
import ImageUpload from "@/components/studio/ImageUpload";
import MeasurementForm from "@/components/studio/MeasurementForm";
import MeshViewer from "@/components/studio/MeshViewer";
import DieLine from "@/components/studio/DieLine";
import { useStudioStore } from "@/store/studioStore";
import { useBobProactive } from "@/hooks/useBobProactive";
import "./studio.css";

const stepsData = [
  { n: 1, label: "Style" },
  { n: 2, label: "Image" },
  { n: 3, label: "Measurements" },
  { n: 4, label: "3D Preview" },
  { n: 5, label: "Pattern" }
];

export default function StudioPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const setStoreStep = useStudioStore((s) => s.setCurrentStep);

  useEffect(() => {
    setStoreStep(currentStep);
  }, [currentStep, setStoreStep]);

  useBobProactive(currentStep);

  const next = () => setCurrentStep((s) => Math.min(s + 1, stepsData.length - 1));
  const back = () => setCurrentStep((s) => Math.max(s - 1, 0));

  return (
    <div className="stu-wrapper">
      <div className="stu-atelier">
        <svg className="stu-scissors" viewBox="0 0 100 100">
          <circle cx="22" cy="20" r="11" fill="none" stroke="#a77a43" strokeWidth="4"/>
          <circle cx="22" cy="80" r="11" fill="none" stroke="#a77a43" strokeWidth="4"/>
          <path d="M32 27L84 75M32 73L84 25" stroke="#6b4c32" strokeWidth="4" strokeLinecap="round"/>
          <circle cx="58" cy="50" r="3" fill="#6b4c32"/>
        </svg>

        <svg className="stu-scissors2" viewBox="0 0 100 100">
          <circle cx="22" cy="20" r="11" fill="none" stroke="#7d3f30" strokeWidth="4"/>
          <circle cx="22" cy="80" r="11" fill="none" stroke="#7d3f30" strokeWidth="4"/>
          <path d="M32 27L84 75M32 73L84 25" stroke="#6b4c32" strokeWidth="4" strokeLinecap="round"/>
          <circle cx="58" cy="50" r="3" fill="#6b4c32"/>
        </svg>

        <svg className="stu-scissors3" viewBox="0 0 100 100">
          <circle cx="22" cy="20" r="11" fill="none" stroke="#a77a43" strokeWidth="4"/>
          <circle cx="22" cy="80" r="11" fill="none" stroke="#a77a43" strokeWidth="4"/>
          <path d="M32 27L84 75M32 73L84 25" stroke="#6b4c32" strokeWidth="4" strokeLinecap="round"/>
          <circle cx="58" cy="50" r="3" fill="#6b4c32"/>
        </svg>

        <svg className="stu-button-deco" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="#e9dbc2" stroke="#6b4c32" strokeWidth="3"/>
          <circle cx="38" cy="38" r="4.5" fill="#6b4c32"/><circle cx="62" cy="38" r="4.5" fill="#6b4c32"/>
          <circle cx="38" cy="62" r="4.5" fill="#6b4c32"/><circle cx="62" cy="62" r="4.5" fill="#6b4c32"/>
          <path d="M38 38L62 62M62 38L38 62" stroke="#a8563e" strokeWidth="2.5"/>
        </svg>
        <svg className="stu-button-deco2" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="#f0dcb8" stroke="#6b4c32" strokeWidth="3"/>
          <circle cx="38" cy="38" r="4.5" fill="#6b4c32"/><circle cx="62" cy="38" r="4.5" fill="#6b4c32"/>
          <circle cx="38" cy="62" r="4.5" fill="#6b4c32"/><circle cx="62" cy="62" r="4.5" fill="#6b4c32"/>
          <path d="M50 34V66M34 50H66" stroke="#68705c" strokeWidth="2.5"/>
        </svg>
        <svg className="stu-button-deco3" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="#e9dbc2" stroke="#6b4c32" strokeWidth="3"/>
          <circle cx="38" cy="38" r="4.5" fill="#6b4c32"/><circle cx="62" cy="38" r="4.5" fill="#6b4c32"/>
          <circle cx="38" cy="62" r="4.5" fill="#6b4c32"/><circle cx="62" cy="62" r="4.5" fill="#6b4c32"/>
          <path d="M38 38L62 62M62 38L38 62" stroke="#58728a" strokeWidth="2.5"/>
        </svg>
        <svg className="stu-button-deco4" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="#f0dcb8" stroke="#6b4c32" strokeWidth="3"/>
          <circle cx="38" cy="38" r="4.5" fill="#6b4c32"/><circle cx="62" cy="38" r="4.5" fill="#6b4c32"/>
          <circle cx="38" cy="62" r="4.5" fill="#6b4c32"/><circle cx="62" cy="62" r="4.5" fill="#6b4c32"/>
          <path d="M50 34V66M34 50H66" stroke="#a8563e" strokeWidth="2.5"/>
        </svg>
        <svg className="stu-button-deco5" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="#e9dbc2" stroke="#6b4c32" strokeWidth="3"/>
          <circle cx="38" cy="38" r="4.5" fill="#6b4c32"/><circle cx="62" cy="38" r="4.5" fill="#6b4c32"/>
          <circle cx="38" cy="62" r="4.5" fill="#6b4c32"/><circle cx="62" cy="62" r="4.5" fill="#6b4c32"/>
          <path d="M38 38L62 62M62 38L38 62" stroke="#68705c" strokeWidth="2.5"/>
        </svg>
        <svg className="stu-button-deco6" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="#f0dcb8" stroke="#6b4c32" strokeWidth="3"/>
          <circle cx="38" cy="38" r="4.5" fill="#6b4c32"/><circle cx="62" cy="38" r="4.5" fill="#6b4c32"/>
          <circle cx="38" cy="62" r="4.5" fill="#6b4c32"/><circle cx="62" cy="62" r="4.5" fill="#6b4c32"/>
          <path d="M50 34V66M34 50H66" stroke="#a8563e" strokeWidth="2.5"/>
        </svg>

        <svg className="stu-note1" viewBox="0 0 80 80"><path d="M6 6H74V74H6Z" fill="#f0dcb8" stroke="#6b4c32" strokeWidth="2"/><path d="M74 74L58 74L74 58Z" fill="#d9c299" stroke="#6b4c32" strokeWidth="1.5"/><path d="M18 26H58M18 38H58M18 50H44" stroke="#6b4c32" strokeWidth="2" opacity=".4"/></svg>
        <svg className="stu-note2" viewBox="0 0 80 80"><path d="M6 6H74V74H6Z" fill="#cdd6c4" stroke="#3f4536" strokeWidth="2"/><path d="M74 74L58 74L74 58Z" fill="#b7c1ac" stroke="#3f4536" strokeWidth="1.5"/><path d="M18 26H58M18 38H58M18 50H44" stroke="#3f4536" strokeWidth="2" opacity=".4"/></svg>
        <svg className="stu-note3" viewBox="0 0 80 80"><path d="M6 6H74V74H6Z" fill="#e3c3ba" stroke="#6b3b30" strokeWidth="2"/><path d="M74 74L58 74L74 58Z" fill="#cfa89d" stroke="#6b3b30" strokeWidth="1.5"/><path d="M18 26H58M18 38H58M18 50H44" stroke="#6b3b30" strokeWidth="2" opacity=".4"/></svg>
        <svg className="stu-note4" viewBox="0 0 80 80"><path d="M6 6H74V74H6Z" fill="#cdd6c4" stroke="#3f4536" strokeWidth="2"/><path d="M74 74L58 74L74 58Z" fill="#b7c1ac" stroke="#3f4536" strokeWidth="1.5"/><path d="M18 26H58M18 38H58M18 50H44" stroke="#3f4536" strokeWidth="2" opacity=".4"/></svg>

        <svg className="stu-dress stu-d1" viewBox="0 0 100 120">
          <path d="M38 10Q50 2 62 10L69 21Q74 27 68 33L60 27V44Q76 58 78 84Q80 100 86 108Q88 112 80 112H20Q12 112 14 108Q20 100 22 84Q24 58 40 44V27L32 33Q26 27 31 21Z" fill="#a8563e" stroke="#5a2f24" strokeWidth="2.5" strokeLinejoin="round"/>
          <path d="M40 46Q50 51 60 46" fill="none" stroke="#5a2f24" strokeWidth="1.5"/>
          <circle cx="50" cy="11" r="4" fill="#f3e6cf"/>
        </svg>
        <svg className="stu-dress stu-d2" viewBox="0 0 100 120">
          <path d="M38 10Q50 2 62 10L69 21Q74 27 68 33L60 27V44Q76 58 78 84Q80 100 86 108Q88 112 80 112H20Q12 112 14 108Q20 100 22 84Q24 58 40 44V27L32 33Q26 27 31 21Z" fill="#68705c" stroke="#3c4232" strokeWidth="2.5" strokeLinejoin="round"/>
          <path d="M40 46Q50 51 60 46" fill="none" stroke="#3c4232" strokeWidth="1.5"/>
          <circle cx="50" cy="11" r="4" fill="#f3e6cf"/>
        </svg>
        <svg className="stu-dress stu-d3" viewBox="0 0 100 120">
          <path d="M38 10Q50 2 62 10L69 21Q74 27 68 33L60 27V44Q76 58 78 84Q80 100 86 108Q88 112 80 112H20Q12 112 14 108Q20 100 22 84Q24 58 40 44V27L32 33Q26 27 31 21Z" fill="#9b655a" stroke="#502e28" strokeWidth="2.5" strokeLinejoin="round"/>
          <path d="M40 46Q50 51 60 46" fill="none" stroke="#502e28" strokeWidth="1.5"/>
          <circle cx="50" cy="11" r="4" fill="#f3e6cf"/>
        </svg>
        <svg className="stu-dress stu-d4" viewBox="0 0 100 120">
          <path d="M38 10Q50 2 62 10L69 21Q74 27 68 33L60 27V44Q76 58 78 84Q80 100 86 108Q88 112 80 112H20Q12 112 14 108Q20 100 22 84Q24 58 40 44V27L32 33Q26 27 31 21Z" fill="#c39b64" stroke="#6b4e2a" strokeWidth="2.5" strokeLinejoin="round"/>
          <path d="M40 46Q50 51 60 46" fill="none" stroke="#6b4e2a" strokeWidth="1.5"/>
          <circle cx="50" cy="11" r="4" fill="#f3e6cf"/>
        </svg>
        <svg className="stu-dress stu-d5" viewBox="0 0 100 120">
          <path d="M38 10Q50 2 62 10L69 21Q74 27 68 33L60 27V44Q76 58 78 84Q80 100 86 108Q88 112 80 112H20Q12 112 14 108Q20 100 22 84Q24 58 40 44V27L32 33Q26 27 31 21Z" fill="#58728a" stroke="#2f3f4d" strokeWidth="2.5" strokeLinejoin="round"/>
          <path d="M40 46Q50 51 60 46" fill="none" stroke="#2f3f4d" strokeWidth="1.5"/>
          <circle cx="50" cy="11" r="4" fill="#f3e6cf"/>
        </svg>
        <svg className="stu-dress stu-d6" viewBox="0 0 100 120">
          <path d="M38 10Q50 2 62 10L69 21Q74 27 68 33L60 27V44Q76 58 78 84Q80 100 86 108Q88 112 80 112H20Q12 112 14 108Q20 100 22 84Q24 58 40 44V27L32 33Q26 27 31 21Z" fill="#69745f" stroke="#3a4234" strokeWidth="2.5" strokeLinejoin="round"/>
          <path d="M40 46Q50 51 60 46" fill="none" stroke="#3a4234" strokeWidth="1.5"/>
          <circle cx="50" cy="11" r="4" fill="#f3e6cf"/>
        </svg>
        <svg className="stu-dress stu-d7" viewBox="0 0 100 120">
          <path d="M38 10Q50 2 62 10L69 21Q74 27 68 33L60 27V44Q76 58 78 84Q80 100 86 108Q88 112 80 112H20Q12 112 14 108Q20 100 22 84Q24 58 40 44V27L32 33Q26 27 31 21Z" fill="#a8563e" stroke="#5a2f24" strokeWidth="2.5" strokeLinejoin="round"/>
          <path d="M40 46Q50 51 60 46" fill="none" stroke="#5a2f24" strokeWidth="1.5"/>
          <circle cx="50" cy="11" r="4" fill="#f3e6cf"/>
        </svg>
        <svg className="stu-dress stu-d8" viewBox="0 0 100 120">
          <path d="M38 10Q50 2 62 10L69 21Q74 27 68 33L60 27V44Q76 58 78 84Q80 100 86 108Q88 112 80 112H20Q12 112 14 108Q20 100 22 84Q24 58 40 44V27L32 33Q26 27 31 21Z" fill="#9b655a" stroke="#502e28" strokeWidth="2.5" strokeLinejoin="round"/>
          <path d="M40 46Q50 51 60 46" fill="none" stroke="#502e28" strokeWidth="1.5"/>
          <circle cx="50" cy="11" r="4" fill="#f3e6cf"/>
        </svg>
        <svg className="stu-dress stu-d9" viewBox="0 0 100 120">
          <path d="M38 10Q50 2 62 10L69 21Q74 27 68 33L60 27V44Q76 58 78 84Q80 100 86 108Q88 112 80 112H20Q12 112 14 108Q20 100 22 84Q24 58 40 44V27L32 33Q26 27 31 21Z" fill="#c39b64" stroke="#6b4e2a" strokeWidth="2.5" strokeLinejoin="round"/>
          <path d="M40 46Q50 51 60 46" fill="none" stroke="#6b4e2a" strokeWidth="1.5"/>
          <circle cx="50" cy="11" r="4" fill="#f3e6cf"/>
        </svg>
        <svg className="stu-dress stu-d10" viewBox="0 0 100 120">
          <path d="M38 10Q50 2 62 10L69 21Q74 27 68 33L60 27V44Q76 58 78 84Q80 100 86 108Q88 112 80 112H20Q12 112 14 108Q20 100 22 84Q24 58 40 44V27L32 33Q26 27 31 21Z" fill="#58728a" stroke="#2f3f4d" strokeWidth="2.5" strokeLinejoin="round"/>
          <path d="M40 46Q50 51 60 46" fill="none" stroke="#2f3f4d" strokeWidth="1.5"/>
          <circle cx="50" cy="11" r="4" fill="#f3e6cf"/>
        </svg>

        <svg className="stu-swatch-b" viewBox="0 0 120 92">
          <rect x="10" y="10" width="100" height="72" fill="#9b655a" stroke="#5a352d" strokeWidth="2"/>
          <path d="M10 25H110M10 45H110M10 65H110" stroke="#d9b79f" strokeWidth="2" opacity=".5"/>
          <rect x="70" y="-4" width="26" height="18" fill="#e9dbc2" opacity=".85" transform="rotate(9 83 5)"/>
        </svg>
        <svg className="stu-swatch-c" viewBox="0 0 120 92">
          <rect x="10" y="10" width="100" height="72" fill="#69745f" stroke="#3a4234" strokeWidth="2"/>
          <path d="M10 25H110M10 45H110M10 65H110" stroke="#b7c1ac" strokeWidth="2" opacity=".5"/>
          <rect x="70" y="-4" width="26" height="18" fill="#e9dbc2" opacity=".85" transform="rotate(9 83 5)"/>
        </svg>
      </div>

      <section className="stu-hero">
        <div className="stu-kicker"><span className="stu-rule"></span>The Studio<span className="stu-rule"></span></div>
        <h1>Stitch it your way</h1>
        <p className="stu-subtitle">Every great garment starts on the cutting table. Pick a silhouette to begin.</p>
      </section>

      <div className="stu-stepper">
        {stepsData.map((s, i) => (
          <div key={s.n} style={{ display: 'contents' }}>
            <div className={`stu-step ${currentStep === i ? "active" : ""}`}>
              <div className="stu-dot">{s.n}</div>
              <div className="stu-label">{s.label}</div>
            </div>
            {i < stepsData.length - 1 && (
              <div className={`stu-step-line ${currentStep >= i ? "filled" : ""}`}></div>
            )}
          </div>
        ))}
      </div>

      <div style={{ position: "relative", zIndex: 1, paddingBottom: "60px" }}>
        {currentStep === 0 && <StylePicker onNext={next} />}
        {currentStep === 1 && (
          <div className="mt-12 relative z-10 max-w-4xl mx-auto px-4"><ImageUpload onNext={next} onBack={back} onSkipToMesh={() => setCurrentStep(3)} /></div>
        )}
        {currentStep === 2 && (
          <div className="mt-12 relative z-10 max-w-4xl mx-auto px-4"><MeasurementForm onNext={next} onBack={back} /></div>
        )}
        {currentStep === 3 && (
          <div className="mt-12 relative z-10 max-w-4xl mx-auto px-4"><MeshViewer onNext={next} onBack={back} /></div>
        )}
        {currentStep === 4 && (
          <div className="mt-12 relative z-10 max-w-4xl mx-auto px-4"><DieLine onBack={back} /></div>
        )}
      </div>
    </div>
  );
}
