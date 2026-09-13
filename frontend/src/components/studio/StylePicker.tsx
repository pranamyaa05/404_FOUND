"use client";

import { useState } from "react";
import { useStudioStore } from "@/store/studioStore";

const styles = [
  {name:"Kurta", region:"Pan-India", color:"#b97868", type:"kurta", cat:"kurtas"},
  {name:"Blouse (Saree)", region:"Pan-India", color:"#68705c", type:"blouse", cat:"sarees"},
  {name:"Lehenga", region:"Rajasthan / Gujarat", color:"#9b655a", type:"lehenga", cat:"lehengas"},
  {name:"Anarkali", region:"Mughal Era", color:"#69745f", type:"anarkali", cat:"lehengas"},
  {name:"Salwar Kameez", region:"Punjab / Pan-India", color:"#58728a", type:"salwar", cat:"kurtas"},
  {name:"Daily Wear Dress", region:"Pan-India", color:"#c39b64", type:"dress", cat:"fusion"},
  {name:"T-Shirt", region:"Global / Casualwear", color:"#7d8b74", type:"tshirt", cat:"fusion"},
  {name:"Pants", region:"Global / Casualwear", color:"#4d5b6b", type:"pants", cat:"fusion"},
  {name:"Formal Shirt", region:"Global / Officewear", color:"#e4dcc8", type:"formalshirt", cat:"fusion"},
  {name:"Denim Jacket", region:"Global / Casualwear", color:"#4c6178", type:"jacket", cat:"fusion"}
];

const categories = [
  {id:"all", label:"All Styles"},
  {id:"kurtas", label:"Kurtas & Suits"},
  {id:"sarees", label:"Sarees"},
  {id:"lehengas", label:"Lehengas"},
  {id:"fusion", label:"Western Fusion"}
];

let gradSeq = 0;
function shadeDefs(id: string, color: string){
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${color}" stop-opacity=".18"/>
    <stop offset=".5" stop-color="${color}" stop-opacity="0"/>
    <stop offset="1" stop-color="#2c1c10" stop-opacity=".16"/>
  </linearGradient></defs>`;
}

function GarmentSVG({ type, color }: { type: string, color: string }) {
  gradSeq++;
  const gid = `og${gradSeq}`;
  const c=`fill="${color}" stroke="#604b39" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"`;
  const shade=`fill="url(#${gid})" stroke="none"`;
  const neck=`fill="none" stroke="#604b39" stroke-width="1.6" stroke-linecap="round"`;
  const fine=`fill="none" stroke="#604b39" stroke-width="1" stroke-linecap="round"`;
  const sheen=`fill="#fff" opacity=".16"`;
  const defs = shadeDefs(gid, color);
  const btn=(cx: number, cy: number)=>`<circle cx="${cx}" cy="${cy}" r="1.8" fill="#4a3826"/>`;

  let innerSvg = "";

  if(type==="kurta") innerSvg = `${defs}
    <path ${c} d="M66 30Q80 21 94 30L106 41Q118 49 112 61L100 51V148Q100 157 91 157H69Q60 157 60 148V51L48 61Q42 49 54 41Z"/>
    <path ${shade} d="M66 30Q80 21 94 30L106 41Q118 49 112 61L100 51V148Q100 157 91 157H69Q60 157 60 148V51L48 61Q42 49 54 41Z"/>
    <path ${sheen} d="M62 55Q64 100 63 145Q60 148 60 140V55Z"/>
    <path ${neck} d="M76 38Q80 42 84 38"/>${[48,64,80,96,112,128,144].map(y=>btn(80,y)).join("")}
    <path ${fine} d="M60 90Q80 95 100 90M60 120Q80 125 100 120" opacity=".55"/>`;

  else if(type==="salwar") innerSvg = `${defs}
    <path ${c} d="M66 28Q80 19 94 28L106 39Q118 47 112 59L100 49V104H60V49L48 59Q42 47 54 39Z"/>
    <path ${shade} d="M66 28Q80 19 94 28L106 39Q118 47 112 59L100 49V104H60V49L48 59Q42 47 54 39Z"/>
    <path ${neck} d="M76 36Q80 40 84 36"/>${[46,60,74,88].map(y=>btn(80,y)).join("")}
    <path ${c} d="M60 104H78V118L64 156Q62 163 54 161Q47 159 49 152L60 120Z"/>
    <path ${c} d="M100 104H82V118L96 156Q98 163 106 161Q113 159 111 152L100 120Z"/>
    <path ${shade} d="M60 104H78V118L64 156Q62 163 54 161Q47 159 49 152L60 120Z"/>
    <path ${shade} d="M100 104H82V118L96 156Q98 163 106 161Q113 159 111 152L100 120Z"/>`;

  else if(type==="blouse") innerSvg = `${defs}
    <path ${c} d="M66 34Q80 25 94 34L106 45Q118 53 112 65L100 55V92Q100 100 92 100H68Q60 100 60 92V55L48 65Q42 53 54 45Z"/>
    <path ${shade} d="M66 34Q80 25 94 34L106 45Q118 53 112 65L100 55V92Q100 100 92 100H68Q60 100 60 92V55L48 65Q42 53 54 45Z"/>
    <path ${neck} d="M68 37Q80 52 92 37"/>${btn(80,63)}`;

  else if(type==="lehenga") innerSvg = `${defs}
    <path ${c} d="M66 30Q80 21 94 30L106 41Q118 49 112 61L100 51V86Q100 93 93 93H67Q60 93 60 86V51L48 61Q42 49 54 41Z"/>
    <path ${shade} d="M66 30Q80 21 94 30L106 41Q118 49 112 61L100 51V86Q100 93 93 93H67Q60 93 60 86V51L48 61Q42 49 54 41Z"/>
    <path ${neck} d="M70 33Q80 43 90 33"/>
    <path ${c} d="M64 93H96L119 152Q123 165 108 165H52Q37 165 41 152Z"/>
    <path ${shade} d="M64 93H96L119 152Q123 165 108 165H52Q37 165 41 152Z"/>
    <path ${fine} d="M70 96L60 160M80 96L80 163M90 96L100 160" opacity=".55"/>`;

  else if(type==="anarkali") innerSvg = `${defs}
    <path ${c} d="M66 28Q80 19 94 28L104 40Q113 48 108 58L100 50V70Q124 88 128 128Q131 152 112 164H48Q29 152 32 128Q36 88 60 70V50L52 58Q47 48 56 40Z"/>
    <path ${shade} d="M66 28Q80 19 94 28L104 40Q113 48 108 58L100 50V70Q124 88 128 128Q131 152 112 164H48Q29 152 32 128Q36 88 60 70V50L52 58Q47 48 56 40Z"/>
    <path ${neck} d="M70 31Q80 41 90 31"/>`;

  else if(type==="dress") innerSvg = `${defs}
    <path ${c} d="M64 32Q80 23 96 32L106 44Q116 53 109 64L100 55V70Q116 82 118 112Q120 138 128 150Q131 158 122 159H38Q29 158 32 150Q40 138 42 112Q44 82 60 70V55L51 64Q44 53 54 44Z"/>
    <path ${shade} d="M64 32Q80 23 96 32L106 44Q116 53 109 64L100 55V70Q116 82 118 112Q120 138 128 150Q131 158 122 159H38Q29 158 32 150Q40 138 42 112Q44 82 60 70V55L51 64Q44 53 54 44Z"/>
    <path ${neck} d="M67 35Q80 47 93 35"/>`;

  else if(type==="tshirt") innerSvg = `${defs}
    <path ${c} d="M64 34Q80 26 96 34L108 46Q118 54 111 64L100 55V128Q100 136 92 136H68Q60 136 60 128V55L49 64Q42 54 52 46Z"/>
    <path ${shade} d="M64 34Q80 26 96 34L108 46Q118 54 111 64L100 55V128Q100 136 92 136H68Q60 136 60 128V55L49 64Q42 54 52 46Z"/>
    <path ${neck} d="M68 37Q80 46 92 37"/>`;

  else if(type==="pants") innerSvg = `${defs}
    <rect x="58" y="26" width="44" height="12" rx="3" ${c}/><rect x="58" y="26" width="44" height="12" rx="3" ${shade}/>
    <path ${c} d="M56 38H104L100 80H60Z"/><path ${shade} d="M56 38H104L100 80H60Z"/>
    <path ${c} d="M61 80H79L76 160Q76 166 70 166H66Q60 166 61 160Z"/>
    <path ${c} d="M99 80H81L84 160Q84 166 90 166H94Q100 166 99 160Z"/>
    <path ${shade} d="M61 80H79L76 160Q76 166 70 166H66Q60 166 61 160Z"/>
    <path ${shade} d="M99 80H81L84 160Q84 166 90 166H94Q100 166 99 160Z"/>`;

  else if(type==="formalshirt") innerSvg = `${defs}
    <path ${c} d="M66 32Q80 24 94 32L106 43Q118 51 111 63L100 53V150Q100 158 92 158H68Q60 158 60 150V53L49 63Q42 51 54 43Z"/>
    <path ${shade} d="M66 32Q80 24 94 32L106 43Q118 51 111 63L100 53V150Q100 158 92 158H68Q60 158 60 150V53L49 63Q42 51 54 43Z"/>
    <path ${c} d="M64 32L80 46L68 40Z"/><path ${c} d="M96 32L80 46L92 40Z"/>
    ${[52,68,84,100,116,132,148].map(y=>btn(80,y)).join("")}`;

  else if(type==="jacket") innerSvg = `${defs}
    <path ${c} d="M64 30Q80 21 96 30L108 42Q120 50 113 62L100 51V122Q100 130 92 130H68Q60 130 60 122V51L47 62Q40 50 52 42Z"/>
    <path ${shade} d="M64 30Q80 21 96 30L108 42Q120 50 113 62L100 51V122Q100 130 92 130H68Q60 130 60 122V51L47 62Q40 50 52 42Z"/>
    <path ${c} d="M62 30L80 50L66 44Z"/><path ${c} d="M98 30L80 50L94 44Z"/>
    ${[58,74,90,106].map(y=>btn(80,y)).join("")}`;

  else innerSvg = `<path ${c} d="M66 30Q80 21 94 30L106 41Q118 49 112 61L100 51V148Q100 157 91 157H69Q60 157 60 148V51L48 61Q42 49 54 41Z"/>`;

  return (
    <svg viewBox="0 0 160 180" dangerouslySetInnerHTML={{ __html: innerSvg }} />
  );
}

export default function StylePicker({ onNext }: { onNext: () => void }) {
  const [activeCat, setActiveCat] = useState("all");
  const { selectedStyle, setSelectedStyle } = useStudioStore();
  
  const filteredStyles = styles.filter(s => activeCat === "all" || s.cat === activeCat);

  const handleContinue = () => {
    if (selectedStyle) onNext();
  };

  return (
    <>
      <nav className="stu-cat-tabs">
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`stu-cat-tab ${cat.id === activeCat ? "active" : ""}`}
            onClick={() => setActiveCat(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </nav>

      <div className="stu-panel">
        <div className="stu-panel-inner">
          <h2>Choose a Dress Style</h2>
          <p className="stu-lead">Browse the full style guide below, or filter by category. Tap a silhouette to select it.</p>
          
          <div className="stu-style-grid">
            {filteredStyles.map(s => {
              const isSelected = selectedStyle === s.name;
              return (
                <button
                  key={s.name}
                  className={`stu-opt ${isSelected ? "selected" : ""}`}
                  onClick={() => setSelectedStyle(s.name)}
                >
                  <span className="stu-check">✓</span>
                  <div className="stu-chip">
                    <GarmentSVG type={s.type} color={s.color} />
                  </div>
                  <h3>{s.name}</h3>
                  <div className="stu-region">{s.region}</div>
                </button>
              );
            })}
          </div>

          <div className="stu-footer-row">
            <div className="stu-footer-hint">
              {selectedStyle ? `${selectedStyle} selected — ready for the next step` : "Select a style to continue"}
            </div>
            <button
              className={`stu-continue-btn ${selectedStyle ? "ready" : ""}`}
              onClick={handleContinue}
              disabled={!selectedStyle}
            >
              Continue →
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
