"use client";

import { useState, useEffect } from "react";
import "./style-guide.css";

/* ---------- data ---------- */
const styles = [
  {name:"Kurta", region:"Pan-India", color:"#b97868", occasions:"Casual · Office · Festival · Wedding", type:"kurta", cat:"kurtas",
   desc:"A loose, straight-cut tunic worn over trousers or a churidar. The everyday staple of Indian menswear and womenswear alike.",
   fabrics:[["Cotton","sg-cotton"],["Linen","sg-linen"],["Khadi","sg-khadi"],["Silk","sg-silk"]]},
  {name:"Blouse (Saree)", region:"Pan-India", color:"#68705c", occasions:"Wedding · Festival · Formal", type:"blouse", cat:"sarees",
   desc:"The fitted upper garment worn with a saree. Highly customisable — back design, neckline, and sleeve style are all variable.",
   fabrics:[["Silk","sg-silk"],["Brocade","sg-brocade"],["Net","sg-net"],["Velvet","sg-velvet"]]},
  {name:"Lehenga", region:"Rajasthan / Gujarat", color:"#9b655a", occasions:"Wedding · Festival · Grand Events", type:"lehenga", cat:"lehengas",
   desc:"A flared, embroidered skirt paired with a fitted blouse and dupatta. The centrepiece of Indian bridal and festive wardrobes.",
   fabrics:[["Silk","sg-silk"],["Brocade","sg-brocade"],["Net","sg-net"],["Velvet","sg-velvet"]]},
  {name:"Anarkali", region:"Mughal Era", color:"#69745f", occasions:"Wedding · Festival · Grand Events", type:"anarkali", cat:"lehengas",
   desc:"A long, flowing frock-style suit that flares from the waist, named after the legendary Mughal-era courtesan.",
   fabrics:[["Georgette","sg-georgette"],["Chiffon","sg-chiffon"],["Net","sg-net"],["Silk","sg-silk"]]},
  {name:"Salwar Kameez", region:"Punjab / Pan-India", color:"#58728a", occasions:"Everyday · Office · Casual · Festive", type:"salwar", cat:"kurtas",
   desc:"A tunic paired with loose trousers and a dupatta — comfortable, versatile, and worn across generations and regions.",
   fabrics:[["Cotton","sg-cotton"],["Georgette","sg-georgette"],["Chiffon","sg-chiffon"],["Silk","sg-silk"]]},
  {name:"Daily Wear Dress", region:"Pan-India", color:"#c39b64", occasions:"Casual · Everyday · Comfort", type:"dress", cat:"fusion",
   desc:"A relaxed, contemporary silhouette blending Western cut with Indian textiles — easy to move in, easy to style.",
   fabrics:[["Cotton","sg-cotton"],["Linen","sg-linen"],["Rayon","sg-rayon"],["Jersey","sg-jersey"]]},
  {name:"T-Shirt", region:"Global / Casualwear", color:"#7d8b74", occasions:"Casual · Everyday · Weekend", type:"tshirt", cat:"fusion",
   desc:"A crew-neck knit staple with short sleeves. The easiest layer to dress up or down, in any wardrobe.",
   fabrics:[["Cotton","sg-cotton"],["Jersey","sg-jersey"],["Pique","sg-pique"],["Modal","sg-modal"]]},
  {name:"Pants", region:"Global / Casualwear", color:"#4d5b6b", occasions:"Casual · Office · Everyday", type:"pants", cat:"fusion",
   desc:"Straight-leg trousers with a fitted waistband — a wardrobe workhorse that pairs with almost any top.",
   fabrics:[["Cotton","sg-cotton"],["Denim","sg-denim"],["Twill","sg-twill"],["Linen","sg-linen"]]},
  {name:"Formal Shirt", region:"Global / Officewear", color:"#e4dcc8", occasions:"Office · Formal · Business", type:"formalshirt", cat:"fusion",
   desc:"A collared, button-front shirt with a breast pocket and structured cuffs — the backbone of formal dressing.",
   fabrics:[["Cotton","sg-cotton"],["Poplin","sg-poplin"],["Oxford","sg-oxford"],["Linen","sg-linen"]]},
  {name:"Denim Jacket", region:"Global / Casualwear", color:"#4c6178", occasions:"Casual · Layering · Weekend", type:"jacket", cat:"fusion",
   desc:"A cropped, button-front jacket with a lapel collar and chest pockets — the classic layer over any outfit.",
   fabrics:[["Denim","sg-denim"],["Cotton","sg-cotton"],["Corduroy","sg-corduroy"],["Twill","sg-twill"]]}
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
  return `<defs>
    <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${color}" stop-opacity=".18"/>
      <stop offset=".5" stop-color="${color}" stop-opacity="0"/>
      <stop offset="1" stop-color="#2c1c10" stop-opacity=".16"/>
    </linearGradient>
  </defs>`;
}

function GarmentSVG({ type, color }: { type: string, color: string }) {
  gradSeq++;
  const gid = `sg${gradSeq}`;
  const c=`fill="${color}" stroke="#604b39" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"`;
  const shade=`fill="url(#${gid})" stroke="none"`;
  const neck=`fill="none" stroke="#604b39" stroke-width="1.6" stroke-linecap="round"`;
  const fine=`fill="none" stroke="#604b39" stroke-width="1" stroke-linecap="round"`;
  const stitch=`fill="none" stroke="#604b39" stroke-width="1" stroke-dasharray="1.5 3.5"`;
  const sheen=`fill="#fff" opacity=".16"`;
  const defs = shadeDefs(gid, color);
  const btn=(cx: number, cy: number)=>`<circle cx="${cx}" cy="${cy}" r="1.8" fill="#4a3826"/>`;

  let innerSvg = "";

  if(type==="kurta") innerSvg = `${defs}
    <path ${c} d="M66 30Q80 21 94 30L106 41Q118 49 112 61L100 51V148Q100 157 91 157H69Q60 157 60 148V51L48 61Q42 49 54 41Z"/>
    <path ${shade} d="M66 30Q80 21 94 30L106 41Q118 49 112 61L100 51V148Q100 157 91 157H69Q60 157 60 148V51L48 61Q42 49 54 41Z"/>
    <path ${sheen} d="M62 55Q64 100 63 145Q60 148 60 140V55Z"/>
    <path ${c} d="M72 30Q80 26 88 30L84 38H76Z"/>
    <path ${neck} d="M76 38Q80 42 84 38"/>
    ${[48,64,80,96,112,128,144].map(y=>btn(80,y)).join("")}
    <path ${fine} d="M60 90Q80 95 100 90M60 120Q80 125 100 120" opacity=".55"/>
    <path ${fine} d="M62 130V148M98 130V148" opacity=".6"/>
    <path ${fine} d="M52 58Q46 90 50 130M108 58Q114 90 110 130" opacity=".4"/>
    <path ${stitch} d="M60 148Q80 152 100 148"/>`;

  else if(type==="salwar") innerSvg = `${defs}
    <path ${c} d="M66 28Q80 19 94 28L106 39Q118 47 112 59L100 49V104H60V49L48 59Q42 47 54 39Z"/>
    <path ${shade} d="M66 28Q80 19 94 28L106 39Q118 47 112 59L100 49V104H60V49L48 59Q42 47 54 39Z"/>
    <path ${c} d="M72 28Q80 24 88 28L84 36H76Z"/>
    <path ${neck} d="M76 36Q80 40 84 36"/>
    ${[46,60,74,88].map(y=>btn(80,y)).join("")}
    <path ${fine} d="M60 70Q80 75 100 70" opacity=".5"/>
    <path ${sheen} d="M62 55Q64 78 62 100Q60 102 60 92V55Z"/>
    <path ${c} d="M60 104H78V118L64 156Q62 163 54 161Q47 159 49 152L60 120Z"/>
    <path ${c} d="M100 104H82V118L96 156Q98 163 106 161Q113 159 111 152L100 120Z"/>
    <path ${shade} d="M60 104H78V118L64 156Q62 163 54 161Q47 159 49 152L60 120Z"/>
    <path ${shade} d="M100 104H82V118L96 156Q98 163 106 161Q113 159 111 152L100 120Z"/>
    <path ${fine} d="M56 152H64M96 152H104"/>
    <path ${fine} d="M64 122Q69 135 66 150M96 122Q91 135 94 150" opacity=".5"/>
    <path ${fine} d="M62 128Q70 140 65 156M98 128Q90 140 95 156" opacity=".35"/>`;

  else if(type==="blouse") innerSvg = `${defs}
    <path ${c} d="M66 34Q80 25 94 34L106 45Q118 53 112 65L100 55V92Q100 100 92 100H68Q60 100 60 92V55L48 65Q42 53 54 45Z"/>
    <path ${shade} d="M66 34Q80 25 94 34L106 45Q118 53 112 65L100 55V92Q100 100 92 100H68Q60 100 60 92V55L48 65Q42 53 54 45Z"/>
    <path ${neck} d="M68 37Q80 52 92 37"/>
    <path ${fine} d="M70 55Q80 60 90 55" opacity=".5"/>
    <path ${sheen} d="M63 58Q65 75 64 90Q61 92 61 82V58Z"/>
    <path ${fine} d="M76 100L72 112M84 100L88 112" opacity=".6"/>
    <path ${fine} d="M56 60Q50 75 54 92M104 60Q110 75 106 92" opacity=".4"/>
    ${btn(80,63)}`;

  else if(type==="lehenga") innerSvg = `${defs}
    <path ${c} d="M66 30Q80 21 94 30L106 41Q118 49 112 61L100 51V86Q100 93 93 93H67Q60 93 60 86V51L48 61Q42 49 54 41Z"/>
    <path ${shade} d="M66 30Q80 21 94 30L106 41Q118 49 112 61L100 51V86Q100 93 93 93H67Q60 93 60 86V51L48 61Q42 49 54 41Z"/>
    <path ${neck} d="M70 33Q80 43 90 33"/>
    <path ${sheen} d="M63 55Q65 72 64 84Q61 86 61 76V55Z"/>
    <path ${c} d="M64 93H96L119 152Q123 165 108 165H52Q37 165 41 152Z"/>
    <path ${shade} d="M64 93H96L119 152Q123 165 108 165H52Q37 165 41 152Z"/>
    <path ${fine} d="M70 96L60 160M80 96L80 163M90 96L100 160" opacity=".55"/>
    <path ${fine} d="M75 96L67 160M85 96L93 160" opacity=".3"/>
    <path ${stitch} d="M46 148Q80 156 114 148"/>
    ${[52,66,80,94,108].map(x=>`<circle cx="${x}" cy="${150+(x===80?6:2)}" r="1.3" fill="#4a3826"/>`).join("")}`;

  else if(type==="anarkali") innerSvg = `${defs}
    <path ${c} d="M66 28Q80 19 94 28L104 40Q113 48 108 58L100 50V70Q124 88 128 128Q131 152 112 164H48Q29 152 32 128Q36 88 60 70V50L52 58Q47 48 56 40Z"/>
    <path ${shade} d="M66 28Q80 19 94 28L104 40Q113 48 108 58L100 50V70Q124 88 128 128Q131 152 112 164H48Q29 152 32 128Q36 88 60 70V50L52 58Q47 48 56 40Z"/>
    <path ${neck} d="M70 31Q80 41 90 31"/>
    <path ${sheen} d="M62 55Q60 75 44 100Q40 130 44 155Q38 130 42 100Q48 72 62 55Z"/>
    <path d="M60 72Q80 80 100 72" fill="none" stroke="#604b39" stroke-width="1.4"/>
    <path ${fine} d="M55 100Q80 108 105 100M46 130Q80 140 114 130" opacity=".45"/>
    <path ${fine} d="M42 95Q40 125 46 155M118 95Q120 125 114 155" opacity=".35"/>`;

  else if(type==="dress") innerSvg = `${defs}
    <path ${c} d="M64 32Q80 23 96 32L106 44Q116 53 109 64L100 55V70Q116 82 118 112Q120 138 128 150Q131 158 122 159H38Q29 158 32 150Q40 138 42 112Q44 82 60 70V55L51 64Q44 53 54 44Z"/>
    <path ${shade} d="M64 32Q80 23 96 32L106 44Q116 53 109 64L100 55V70Q116 82 118 112Q120 138 128 150Q131 158 122 159H38Q29 158 32 150Q40 138 42 112Q44 82 60 70V55L51 64Q44 53 54 44Z"/>
    <path ${neck} d="M67 35Q80 47 93 35"/>
    <path d="M60 72Q80 78 100 72" fill="none" stroke="#604b39" stroke-width="1.4"/>
    <path ${sheen} d="M58 74Q46 100 44 130Q42 145 46 156Q40 130 46 100Q50 82 58 74Z"/>
    <path ${fine} d="M55 100Q80 106 105 100M48 130Q80 138 112 130" opacity=".45"/>
    <path ${c} d="M58 96Q52 100 55 108Q58 112 63 108Z"/>`;

  else if(type==="tshirt") innerSvg = `${defs}
    <path ${c} d="M64 34Q80 26 96 34L108 46Q118 54 111 64L100 55V128Q100 136 92 136H68Q60 136 60 128V55L49 64Q42 54 52 46Z"/>
    <path ${shade} d="M64 34Q80 26 96 34L108 46Q118 54 111 64L100 55V128Q100 136 92 136H68Q60 136 60 128V55L49 64Q42 54 52 46Z"/>
    <path ${neck} d="M68 37Q80 46 92 37"/>
    <path ${fine} d="M70 40Q80 47 90 40"/>
    <path ${fine} d="M50 58H58M102 58H110"/>
    <path d="M70 60Q80 68 90 60" fill="none" stroke="#604b39" stroke-width="1" opacity=".5"/>
    <path ${sheen} d="M62 58Q64 90 63 125Q60 128 60 118V58Z"/>
    <path ${fine} d="M80 50V128" stroke-dasharray="1.5 5" opacity=".5"/>`;

  else if(type==="pants") innerSvg = `${defs}
    <rect x="58" y="26" width="44" height="12" rx="3" ${c}/>
    <rect x="58" y="26" width="44" height="12" rx="3" ${shade}/>
    <path ${c} d="M56 38H104L100 80H60Z"/>
    <path ${shade} d="M56 38H104L100 80H60Z"/>
    <path ${c} d="M61 80H79L76 160Q76 166 70 166H66Q60 166 61 160Z"/>
    <path ${c} d="M99 80H81L84 160Q84 166 90 166H94Q100 166 99 160Z"/>
    <path ${shade} d="M61 80H79L76 160Q76 166 70 166H66Q60 166 61 160Z"/>
    <path ${shade} d="M99 80H81L84 160Q84 166 90 166H94Q100 166 99 160Z"/>
    <path ${fine} d="M70 84V158M90 84V158" opacity=".55"/>
    <path ${fine} d="M64 88Q60 120 65 158M96 88Q100 120 95 158" opacity=".3"/>
    <path ${fine} d="M60 42Q64 46 60 50M100 42Q96 46 100 50" opacity=".5"/>
    <path d="M64 30V34M72 30V34M88 30V34M96 30V34" stroke="#604b39" stroke-width="1.3" opacity=".55" fill="none"/>`;

  else if(type==="formalshirt") innerSvg = `${defs}
    <path ${c} d="M66 32Q80 24 94 32L106 43Q118 51 111 63L100 53V150Q100 158 92 158H68Q60 158 60 150V53L49 63Q42 51 54 43Z"/>
    <path ${shade} d="M66 32Q80 24 94 32L106 43Q118 51 111 63L100 53V150Q100 158 92 158H68Q60 158 60 150V53L49 63Q42 51 54 43Z"/>
    <path ${c} d="M64 32L80 46L68 40Z"/>
    <path ${c} d="M96 32L80 46L92 40Z"/>
    ${[52,68,84,100,116,132,148].map(y=>btn(80,y)).join("")}
    <path ${c} d="M64 62Q60 60 60 66V78Q60 82 64 82H74Q78 82 78 78V66Q78 60 74 62Z"/>
    <path ${fine} d="M50 68H58M102 68H110"/>
    <path ${sheen} d="M62 60Q64 100 63 145Q60 148 60 135V60Z"/>
    <path ${fine} d="M60 90V150M100 90V150" opacity=".35"/>`;

  else if(type==="jacket") innerSvg = `${defs}
    <path ${c} d="M64 30Q80 21 96 30L108 42Q120 50 113 62L100 51V122Q100 130 92 130H68Q60 130 60 122V51L47 62Q40 50 52 42Z"/>
    <path ${shade} d="M64 30Q80 21 96 30L108 42Q120 50 113 62L100 51V122Q100 130 92 130H68Q60 130 60 122V51L47 62Q40 50 52 42Z"/>
    <path ${c} d="M62 30L80 50L66 44Z"/>
    <path ${c} d="M98 30L80 50L94 44Z"/>
    ${[58,74,90,106].map(y=>btn(80,y)).join("")}
    <path ${c} d="M64 78Q60 76 60 82V92Q60 96 64 96H74Q78 96 78 92V82Q78 76 74 78Z"/>
    <path ${c} d="M86 78Q82 76 82 82V92Q82 96 86 96H96Q100 96 100 92V82Q100 76 96 78Z"/>
    <path ${sheen} d="M62 55Q64 90 63 118Q60 121 60 108V55Z"/>
    <path ${stitch} d="M60 55H100M60 122H100"/>
    <path ${fine} d="M54 60Q48 90 52 118M106 60Q112 90 108 118" opacity=".35"/>`;

  else innerSvg = `<path ${c} d="M66 30Q80 21 94 30L106 41Q118 49 112 61L100 51V148Q100 157 91 157H69Q60 157 60 148V51L48 61Q42 49 54 41Z"/><path ${neck} d="M70 33Q80 44 90 33"/>`;

  return (
    <svg viewBox="0 0 160 180" dangerouslySetInnerHTML={{ __html: innerSvg }} />
  );
}

export default function StyleGuidePage() {
  const [activeCat, setActiveCat] = useState("all");
  const [selectedStyle, setSelectedStyle] = useState(styles[1]);
  const [animating, setAnimating] = useState(false);

  const filteredStyles = styles.filter(s => activeCat === "all" || s.cat === activeCat);

  useEffect(() => {
    // If current selected is not in filtered, pick first
    if (!filteredStyles.find(s => s.name === selectedStyle.name) && filteredStyles.length > 0) {
      handleSelect(filteredStyles[0]);
    }
  }, [activeCat]);

  const handleSelect = (s: any) => {
    setAnimating(true);
    setTimeout(() => {
      setSelectedStyle(s);
      setAnimating(false);
    }, 220); // transition duration
  };

  return (
    <div className="style-guide-wrapper">
      <section className="sg-hero">
        <div className="sg-kicker">Explore. Get Inspired. Dress Your Story.</div>
        <h1>Dress Styles Guide</h1>
        <p className="sg-subtitle">Spin the rack to browse traditional and contemporary Indian dress styles, their fabrics, and the occasions they suit.</p>
      </section>

      <nav className="sg-cat-tabs">
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`sg-cat-tab ${cat.id === activeCat ? "active" : ""}`}
            onClick={() => setActiveCat(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </nav>

      <main className="sg-section">
        <div className="sg-grid-wrap">
          <div className="sg-rack-scroll">
            <div className="sg-rack-inner">
              <div className="sg-rack-rod"></div>
              
              {filteredStyles.length === 0 ? (
                <div className="sg-empty">No styles in this category yet.</div>
              ) : (
                filteredStyles.map(s => (
                  <article
                    key={s.name}
                    className={`sg-card ${s.name === selectedStyle.name ? "selected" : ""}`}
                    tabIndex={0}
                    onClick={() => handleSelect(s)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSelect(s); }}
                  >
                    <svg className="sg-hanger-svg" viewBox="0 0 172 38" preserveAspectRatio="none">
                      <path d="M86 3a6 6 0 1 0 .01 0" fill="none" stroke="#6b4c32" strokeWidth="3"/>
                      <path d="M86 9L22 34M86 9L150 34" fill="none" stroke="#6b4c32" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                    <h2>{s.name}</h2>
                    <div className="sg-region">{s.region}</div>
                    <div className="sg-garment">
                      <GarmentSVG type={s.type} color={s.color} />
                    </div>
                    <div className="sg-swatches">
                      <span className="sg-swatch" style={{ background: s.color }}></span>
                      <span className="sg-swatch" style={{ background: "#b98a74" }}></span>
                      <span className="sg-swatch" style={{ background: "#6a705e" }}></span>
                    </div>
                    <div className="sg-occasions">{s.occasions}</div>
                  </article>
                ))
              )}
            </div>
          </div>

          <aside className="sg-detail">
            <div className={`sg-detail-inner ${animating ? "enter" : ""}`}>
              <div className="sg-detail-col-a">
                <h2>{selectedStyle.name}</h2>
                <div className="sg-region">{selectedStyle.region}</div>
                <p>{selectedStyle.desc}</p>
              </div>
              <div className="sg-detail-col-b">
                <h3>Popular Fabrics</h3>
                <div className="sg-fabric-list">
                  {selectedStyle.fabrics.map(([name, cls]) => (
                    <div key={name} className="sg-fabric">
                      <div className={`sg-sample ${cls}`}></div>
                      {name}
                    </div>
                  ))}
                </div>
                <div className="sg-divider"></div>
                <h3>Best For</h3>
                <div className="sg-best">{selectedStyle.occasions}</div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
