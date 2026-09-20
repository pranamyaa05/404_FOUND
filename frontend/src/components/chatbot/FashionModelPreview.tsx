"use client";

/**
 * FashionModelPreview
 * -------------------
 * A purely SVG-based, faceless fashion model that:
 *  - Renders the body in the person's skin tone
 *  - Changes body proportions based on BMI (slim / medium / full)
 *  - Draws a simplified garment shape for each supported style
 *  - Accepts a `dressColor` prop so the parent can swap colours
 *
 * No external images. No 3D. Just clean SVG paths that look nice.
 */

import React, { useMemo } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export type DressStyle =
  | "Kurta"
  | "Ghagra / Lehenga"
  | "Ghagra"
  | "Lehenga"
  | "Blouse (Saree)"
  | "Anarkali Suit"
  | "Salwar Kameez"
  | "Daily Wear Dress"
  | string; // fallback

interface Props {
  skinHex: string;       // e.g. "#C68642"
  dressColor: string;    // e.g. "#a94e38"
  style: DressStyle;
  /** height in cm — used together with measurements to derive body shape */
  heightCm?: number;
  /** waist in cm */
  waistCm?: number;
  /** hip in cm */
  hipCm?: number;
  /** chest in cm */
  chestCm?: number;
  /** weight in kg (optional – if provided with height, used for BMI) */
  weightKg?: number;
  isFestive?: boolean;
}

// ── Body shape ───────────────────────────────────────────────────────────────

export type BodyBuild = "small" | "medium" | "large" | "xl";

function deriveBuild(
  heightCm?: number | null,
  weightKg?: number | null,
  waistCm?: number | null,
  hipCm?: number | null,
): BodyBuild {
  if (waistCm) {
    if (waistCm < 70) return "small";
    if (waistCm < 82) return "medium";
    if (waistCm < 95) return "large";
    return "xl";
  }
  if (hipCm) {
    if (hipCm < 92) return "small";
    if (hipCm < 104) return "medium";
    if (hipCm < 118) return "large";
    return "xl";
  }
  // Default fallback if no measurements are provided
  return "small";
}

// ── Colour utilities ─────────────────────────────────────────────────────────

/** Darken a hex colour by `amount` (0–255 per channel) */
function darkenHex(hex: string, amount: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, n));
  const r = clamp(parseInt(hex.slice(1, 3), 16) - amount);
  const g = clamp(parseInt(hex.slice(3, 5), 16) - amount);
  const b = clamp(parseInt(hex.slice(5, 7), 16) - amount);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/** Lighten a hex colour */
function lightenHex(hex: string, amount: number): string {
  return darkenHex(hex, -amount);
}

// ── SVG constants ────────────────────────────────────────────────────────────

// Canvas: 200 × 400  (viewBox "0 0 200 400")
// All measurements are in this coordinate space.

interface BodyDimensions {
  // shoulder
  shoulderW: number;   // half-width of shoulders
  // torso
  waistW: number;      // half-width at waist
  hipW: number;        // half-width at hips
  bustW: number;       // half-width at bust
  // vertical positions (y)
  headR: number;       // head radius
  headCy: number;      // centre y of head
  neckY: number;       // bottom of neck
  shoulderY: number;   // top of shoulder
  bustY: number;       // bust line y
  waistY: number;      // waist y
  hipY: number;        // hip y
  kneeY: number;       // knee y
  floorY: number;      // floor y
  // arm
  armW: number;        // arm half-width
  elbowY: number;
  wristY: number;
  scale: number;       // overall body scaling factor for dynamic limb thickness
}

/**
 * Derives body dimensions natively. Everything is parametric.
 * The garments are drawn relative to these points.
 */
function getDimensions(build: BodyBuild): BodyDimensions {
  // The user noted the default body looked "small". So Small is scale 1.0.
  // We scale up continuously for Medium, Large, and XL.
  const scale = build === "small" ? 1.0 : build === "medium" ? 1.15 : build === "large" ? 1.3 : 1.45;
  // Head scales slightly less than the body for anatomical accuracy
  const headScale = 1.0 + (scale - 1.0) * 0.6;

  return {
    scale,
    headR: 20 * headScale,
    headCy: 28,
    neckY: 50,
    shoulderY: 62,       // moved back up slightly, neck was too long
    shoulderW: 36 * scale,
    bustY: 98,
    bustW: 30 * scale,   // slightly wider bust for visible cleavage area
    waistY: 132,
    waistW: 20 * scale,  // narrower waist → more hourglass
    hipY: 168,
    hipW: 33 * scale,    // slightly wider hips
    kneeY: 265,
    floorY: 380,
    armW: 7 * scale,
    elbowY: 132, // anatomically aligns with the waist
    wristY: 185, // anatomically aligns just below the hips (was 248, dangling to the knees!)
  };
}

// ── Garment path generators ──────────────────────────────────────────────────

/** Kurta: fitted top to knee, side slits hint */
/**
 * KURTA
 * Long kurta (mid-calf) with side slits + churidar leggings visible below.
 *  - Straight/slight A-flare body, side slits open at upper thigh
 *  - Round neck + centre placket + buttons
 *  - 3/4 sleeves with cuff crease
 *  - Slim churidar leggings in darker shade peeking below the slit
 */
function kurta(d: BodyDimensions, color: string, _skin: string, isFestive: boolean) {
  const shade  = darkenHex(color, 30);
  const mid    = darkenHex(color, 14);
  const dark   = "#2a2535";  // deep charcoal churidar — neutral contrast
  const cX     = 100;

  // Kurta hem at mid-calf (longer than knee)
  const hemY       = d.kneeY + 40;
  const slitStartY = d.hipY + 20;   // slits open here
  const hemW       = d.hipW + 6;    // modest flare

  // Churidar leggings — shaped by exactly tracing the NEW bare leg but expanded outward by 2px
  const legAnkOutL = cX - 16 * d.scale - 2;
  const legAnkOutR = cX + 16 * d.scale + 2;
  const legAnkInL  = cX - 5 * d.scale + 2;
  const legAnkInR  = cX + 5 * d.scale - 2;

  const churidarL = `
    M ${cX - d.hipW} ${slitStartY}
    Q ${cX - d.hipW} ${d.hipY + 35} ${cX - d.hipW * 0.65 - 2} ${d.kneeY}
    Q ${cX - d.hipW * 0.55 - 2} ${d.kneeY + 20} ${legAnkOutL} ${d.floorY}
    L ${legAnkInL} ${d.floorY}
    Q ${cX - 6 * d.scale + 2} ${d.kneeY} ${cX - 2 * d.scale + 2} ${slitStartY}
    Z
  `;
  const churidarR = `
    M ${cX + d.hipW} ${slitStartY}
    Q ${cX + d.hipW} ${d.hipY + 35} ${cX + d.hipW * 0.65 + 2} ${d.kneeY}
    Q ${cX + d.hipW * 0.55 + 2} ${d.kneeY + 20} ${legAnkOutR} ${d.floorY}
    L ${legAnkInR} ${d.floorY}
    Q ${cX + 6 * d.scale - 2} ${d.kneeY} ${cX + 2 * d.scale - 2} ${slitStartY}
    Z
  `;

  const churAnkle = (
    <g stroke={darkenHex(color, 60)} strokeWidth="1" opacity="0.6">
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const y = d.floorY - 2 - i * 4;
        return (
          <React.Fragment key={i}>
            <line x1={legAnkOutL + 1} y1={y} x2={legAnkInL - 1} y2={y} />
            <line x1={legAnkOutR - 1} y1={y} x2={legAnkInR + 1} y2={y} />
          </React.Fragment>
        );
      })}
    </g>
  );

  // Kurta body with side slits (no center slit)
  const neckOpenR = 13;
  const neckOpenY = d.shoulderY + 3;
  // Armpit coordinates for proper seam connection
  const armpitL = cX - d.shoulderW + 10 * d.scale;
  const armpitR = cX + d.shoulderW - 10 * d.scale;
  const armpitY = d.bustY - 6;

  const bodyPath = `
    M ${cX - d.shoulderW}  ${d.shoulderY + 2}
    L ${armpitL} ${armpitY}
    C ${cX - d.bustW}       ${d.bustY},
      ${cX - d.waistW - 1}  ${d.waistY},
      ${cX - d.hipW - 2}    ${d.hipY}
    L ${cX - d.hipW - 2}    ${slitStartY}
    L ${cX - hemW}           ${hemY}
    L ${cX + hemW}           ${hemY}
    L ${cX + d.hipW + 2}    ${slitStartY}
    L ${cX + d.hipW + 2}    ${d.hipY}
    C ${cX + d.waistW + 1}  ${d.waistY},
      ${cX + d.bustW}       ${d.bustY},
      ${armpitR}            ${armpitY}
    L ${cX + d.shoulderW}  ${d.shoulderY + 2}
    Q ${cX + d.shoulderW * 0.5} ${d.shoulderY + 2} ${cX + neckOpenR} ${neckOpenY}
    Q ${cX} ${neckOpenY + 18} ${cX - neckOpenR} ${neckOpenY}
    Q ${cX - d.shoulderW * 0.5} ${d.shoulderY + 2} ${cX - d.shoulderW} ${d.shoulderY + 2}
    Z
  `;

  // Deep round neck — shows neck and upper chest
  const collarPath = `
    M ${cX - neckOpenR} ${neckOpenY}
    Q ${cX} ${neckOpenY + 18} ${cX + neckOpenR} ${neckOpenY}
    Q ${cX} ${neckOpenY + 24} ${cX - neckOpenR} ${neckOpenY}
    Z
  `;

  const placketPath = `
    M ${cX - 2} ${neckOpenY + 18}
    L ${cX + 2} ${neckOpenY + 18}
    L ${cX + 2} ${neckOpenY + 70}
    L ${cX} ${neckOpenY + 73}
    L ${cX - 2} ${neckOpenY + 70}
    Z
  `;

  // 3/4 Sleeves with scaled thickness and proper armhole seams
  const elbowMid = d.elbowY + 15;
  const cuffY    = d.elbowY + 30;
  const sleeveOuterScale = 12 * d.scale;
  const sleeveInnerScale = 4 * d.scale;

  const sleeveL  = `
    M ${cX - d.shoulderW}  ${d.shoulderY + 2}
    C ${cX - d.shoulderW - sleeveOuterScale - 4} ${d.bustY},
      ${cX - d.shoulderW - sleeveOuterScale - 2} ${elbowMid},
      ${cX - d.shoulderW - sleeveOuterScale} ${cuffY}
    L ${cX - d.shoulderW + sleeveInnerScale}  ${cuffY}
    C ${cX - d.shoulderW + sleeveInnerScale}  ${elbowMid},
      ${armpitL}               ${armpitY + 10},
      ${armpitL}               ${armpitY}
    Z
  `;
  const sleeveR  = `
    M ${cX + d.shoulderW}  ${d.shoulderY + 2}
    C ${cX + d.shoulderW + sleeveOuterScale + 4} ${d.bustY},
      ${cX + d.shoulderW + sleeveOuterScale + 2} ${elbowMid},
      ${cX + d.shoulderW + sleeveOuterScale} ${cuffY}
    L ${cX + d.shoulderW - sleeveInnerScale}  ${cuffY}
    C ${cX + d.shoulderW - sleeveInnerScale}  ${elbowMid},
      ${armpitR}               ${armpitY + 10},
      ${armpitR}               ${armpitY}
    Z
  `;

  return (
    <g>
      {/* Churidar leggings drawn first (behind kurta) */}
      <path d={churidarL} fill={dark} stroke={darkenHex(color, 60)} strokeWidth="0.5" />
      <path d={churidarR} fill={dark} stroke={darkenHex(color, 60)} strokeWidth="0.5" />
      {churAnkle}
      {/* Kurta body */}
      <path d={bodyPath}   fill={color} stroke={shade} strokeWidth="0.9" />
      {isFestive && <path d={bodyPath} fill="url(#gold-dots)" />}
      <path d={sleeveL}    fill={color} stroke={shade} strokeWidth="0.9" />
      {isFestive && <path d={sleeveL} fill="url(#gold-dots)" />}
      <path d={sleeveR}    fill={color} stroke={shade} strokeWidth="0.9" />
      {isFestive && <path d={sleeveR} fill="url(#gold-dots)" />}
      {/* Cuff fold */}
      <line x1={cX - d.shoulderW - sleeveOuterScale} y1={cuffY - 5} x2={cX - d.shoulderW + sleeveInnerScale} y2={cuffY - 5} stroke={shade} strokeWidth="1" />
      <line x1={cX + d.shoulderW - sleeveInnerScale} y1={cuffY - 5} x2={cX + d.shoulderW + sleeveOuterScale} y2={cuffY - 5} stroke={shade} strokeWidth="1" />
      {/* Collar */}
      <path d={collarPath} fill={darkenHex(color, 10)} stroke={shade} strokeWidth="0.8" />
      <path d={placketPath} fill={mid} opacity="0.4" />
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} cx={cX} cy={neckOpenY + 18 + i * 16} r="1.8" fill={shade} />
      ))}
      {/* Hem */}
      <path d={`M ${cX - hemW} ${hemY} Q ${cX} ${hemY + 3} ${cX + hemW} ${hemY}`} fill="none" stroke={shade} strokeWidth="1" />
    </g>
  );
}

/**
 * LEHENGA / GHAGRA
 * Silhouette:
 *  - Short fitted blouse (choli): square/sweetheart neckline, short cap sleeves,
 *    ends well above the navel leaving a midriff gap
 *  - High-waist skirt: wide circular gathered skirt (lots of volume radiating
 *    from the waistband, with visible gather folds)
 *  - Dupatta: broad scarf draped over one shoulder, flowing down the side
 */
function lehenga(d: BodyDimensions, color: string, _skin: string, isFestive: boolean) {
  const shade = darkenHex(color, 30);
  const light = lightenHex(color, 35);
  const cX    = 100;

  // Choli ends ~10px above waist (midriff gap)
  const choliHemY  = d.waistY - 10;
  const waistbandT = 8;                         // waistband height
  const waistbandY = d.waistY - waistbandT / 2;
  // Cap skirt flare so it never clips the viewBox (max usable half-width ≈ 88)
  const skirtFlare = Math.min(d.hipW * 3.0, 88);

  // ── Choli (blouse) ──
  // Deep sweetheart neckline: shows significant cleavage
  const neckL = cX - d.shoulderW * 0.7;
  const neckR = cX + d.shoulderW * 0.7;
  const neckTopY = d.shoulderY + 6;
  const neckDipY = d.bustY - 2;

  // Very tight, form-fitting choli with cutout for sweetheart neck
  const choliPath = `
    M ${cX - d.shoulderW}  ${d.shoulderY + 2}
    C ${cX - d.bustW}     ${d.bustY},
      ${cX - d.waistW - 1} ${d.waistY - 20},
      ${cX - d.waistW}    ${choliHemY}
    L ${cX + d.waistW}    ${choliHemY}
    C ${cX + d.waistW + 1} ${d.waistY - 20},
      ${cX + d.bustW}     ${d.bustY},
      ${cX + d.shoulderW}  ${d.shoulderY + 2}
    Q ${cX + d.shoulderW * 0.5} ${d.shoulderY + 2} ${neckR} ${neckTopY}
    Q ${cX}               ${neckDipY}
    ${neckL}               ${neckTopY}
    Q ${cX - d.shoulderW * 0.5} ${d.shoulderY + 2} ${cX - d.shoulderW} ${d.shoulderY + 2}
    Z
  `;

  // Cap sleeves — just a small puff on each shoulder
  const capL = `M ${cX - d.shoulderW}  ${d.shoulderY + 2} Q ${cX - d.shoulderW - 12} ${d.shoulderY + 12} ${cX - d.shoulderW - 4} ${d.shoulderY + 26} L ${cX - d.shoulderW + 6} ${d.shoulderY + 22} Z`;
  const capR = `M ${cX + d.shoulderW}  ${d.shoulderY + 2} Q ${cX + d.shoulderW + 12} ${d.shoulderY + 12} ${cX + d.shoulderW + 4} ${d.shoulderY + 26} L ${cX + d.shoulderW - 6} ${d.shoulderY + 22} Z`;

  // ── Skirt ──
  // Gathered circle skirt: use curves to suggest volume and gather
  const skirtPath = `
    M ${cX - d.waistW}    ${d.waistY}
    C ${cX - d.waistW - 6} ${d.hipY},
      ${cX - skirtFlare * 0.65} ${d.hipY + 30},
      ${cX - skirtFlare}  ${d.floorY}
    Q ${cX}               ${d.floorY + 8}
    ${cX + skirtFlare}    ${d.floorY}
    C ${cX + skirtFlare * 0.65} ${d.hipY + 30},
      ${cX + d.waistW + 6} ${d.hipY},
      ${cX + d.waistW}    ${d.waistY}
    Z
  `;

  // Gather fold lines — radiate from waistband down
  const folds = [-0.55, -0.28, 0, 0.28, 0.55].map((t, i) => {
    const topX = cX + t * d.waistW * 1.2;
    const botX = cX + t * skirtFlare * 0.82;
    return (
      <line key={i}
        x1={topX} y1={d.waistY + 4}
        x2={botX} y2={d.floorY - 10}
        stroke={shade} strokeWidth="0.8" opacity="0.35"
      />
    );
  });

  // Hem wave — curved hem suggests circle skirt volume
  const hemPath = `
    M ${cX - skirtFlare} ${d.floorY}
    Q ${cX - skirtFlare * 0.5} ${d.floorY - 8}
    ${cX}               ${d.floorY + 8}
    Q ${cX + skirtFlare * 0.5} ${d.floorY - 8}
    ${cX + skirtFlare}  ${d.floorY}
  `;

  // ── Dupatta (Lehenga) ──
  // Drapes diagonally across body from model's RIGHT shoulder (left screen) to LEFT waist (right screen)
  const dupW = 16; // thinner sash
  const outerX1 = cX - d.shoulderW - 6; // Moved further left onto the cap sleeve for a steeper slant
  const outerY1 = d.shoulderY - 4;
  const outerX2 = cX + d.waistW;        // Model's left waist (strictly inside right screen edge)
  const outerY2 = waistbandY + waistbandT; // bottom of the waistband
  
  const innerX1 = outerX1 + dupW;
  const innerY1 = outerY1;
  
  const dx = outerX2 - outerX1;
  const dy = outerY2 - outerY1;
  // mathematically parallel intersection at the waist
  const intersectY = outerY1 + dy * ((dx - dupW) / dx);

  const dupattaPath = `
    M ${innerX1} ${innerY1}
    L ${outerX2} ${intersectY}
    L ${outerX2} ${outerY2}
    L ${outerX1} ${outerY1}
    Z
  `;

  // Fold lines for dupatta
  const dupFolds = [0.33, 0.66].map((t, i) => {
    const foldW = (1 - t) * dupW;
    const startX = outerX1 + foldW;
    const startY = outerY1;
    const endX = outerX2;
    const endY = outerY1 + dy * ((dx - foldW) / dx);
    return <line key={i} x1={startX} y1={startY} x2={endX} y2={endY} stroke={shade} strokeWidth="0.6" opacity="0.2" />;
  });

  return (
    <g>
      {/* Skirt */}
      <path d={skirtPath} fill={color} stroke={shade} strokeWidth="0.9" />
      {isFestive && <path d={skirtPath} fill="url(#gold-buti)" opacity="0.7" />}
      {folds}
      <path d={hemPath} fill="none" stroke={isFestive ? "#d4af37" : shade} strokeWidth={isFestive ? "2.5" : "1"} opacity="0.9" />
      {/* Waistband */}
      <rect x={cX - d.waistW - 1} y={waistbandY} width={(d.waistW + 1) * 2} height={waistbandT} rx="2" fill={shade} opacity="0.75" />
      {/* Choli drawn BEFORE dupatta so dupatta sits on top of it */}
      <path d={choliPath} fill={light} stroke={shade} strokeWidth="0.9" />
      {isFestive && <path d={choliPath} fill="url(#gold-mesh)" />}
      <path d={capL} fill={light} stroke={shade} strokeWidth="0.9" />
      <path d={capR} fill={light} stroke={shade} strokeWidth="0.9" />
      {/* Neckline border */}
      <path d={`M ${neckL} ${neckTopY} Q ${cX} ${neckDipY} ${neckR} ${neckTopY}`} fill="none" stroke={shade} strokeWidth="1.2" />
      {/* Choli hem border */}
      <line x1={cX - d.waistW} y1={choliHemY} x2={cX + d.waistW} y2={choliHemY} stroke={shade} strokeWidth="1" />
      {/* Dupatta on top of choli */}
<path d={dupattaPath} fill={lightenHex(color, 45)} stroke={shade} strokeWidth="0.7" opacity="0.6" />
      {isFestive && <path d={dupattaPath} fill="url(#gold-chevron)" opacity="0.9" />}
      {/* Dupatta gold border */}
      {isFestive && <path d={`M ${innerX1} ${innerY1} L ${outerX2} ${intersectY}`} fill="none" stroke="#d4af37" strokeWidth="2" opacity="0.8" />}
      {isFestive && <path d={`M ${outerX1} ${outerY1} L ${outerX2} ${outerY2}`} fill="none" stroke="#d4af37" strokeWidth="2" opacity="0.8" />}
      {dupFolds}
    </g>
  );
}

/**
 * ANARKALI SUIT
 * Mid-calf length (between knee and floor). Form-fitted bodice through hip,
 * then a graceful umbrella flare to mid-calf. Churidar clearly visible below.
 */
function anarkali(d: BodyDimensions, color: string, _skin: string, isFestive: boolean) {
  const shade     = darkenHex(color, 30);
  const churColor = "#2a2535";
  const cX        = 100;

  // Knee-to-mid-calf hem with DRAMATIC umbrella flare — the signature anarkali
  const hemY   = d.kneeY + 30;   // mid-calf, NOT floor-length
  const flareW = Math.min(d.hipW * 3.5, 92);  // extremely wide umbrella

  // Tight fitted bodice through bust/waist, then DRAMATIC flare from waist
  // Armpit coordinates for proper seam connection
  const armpitL = cX - d.shoulderW + 10 * d.scale;
  const armpitR = cX + d.shoulderW - 10 * d.scale;
  const armpitY = d.bustY - 6;

  const topPath = `
    M ${cX - d.shoulderW}  ${d.shoulderY + 2}
    L ${armpitL}             ${armpitY}
    C ${cX - d.bustW}        ${d.bustY},
      ${cX - d.waistW}       ${d.waistY - 4},
      ${cX - d.waistW}       ${d.waistY}
    C ${cX - d.waistW - 12}  ${d.waistY + 14},
      ${cX - flareW * 0.7}   ${d.hipY + 20},
      ${cX - flareW}          ${hemY}
    Q ${cX}                   ${hemY + 8}
    ${cX + flareW}            ${hemY}
    C ${cX + flareW * 0.7}   ${d.hipY + 20},
      ${cX + d.waistW + 12}  ${d.waistY + 14},
      ${cX + d.waistW}       ${d.waistY}
    C ${cX + d.waistW}       ${d.waistY - 4},
      ${cX + d.bustW}        ${d.bustY},
      ${armpitR}             ${armpitY}
    L ${cX + d.shoulderW}  ${d.shoulderY + 2}
    Q ${cX + d.shoulderW * 0.5} ${d.shoulderY + 2} ${cX + 14} ${d.shoulderY + 2}
    L ${cX} ${d.shoulderY + 34}
    L ${cX - 14} ${d.shoulderY + 2}
    Q ${cX - d.shoulderW * 0.5} ${d.shoulderY + 2} ${cX - d.shoulderW} ${d.shoulderY + 2}
    Z
  `;

  // Many dramatic flare fold lines from waist — creates umbrella volume
  const folds = [-0.8, -0.55, -0.3, -0.05, 0.2, 0.45, 0.7].map((t, i) => {
    const tx = cX + t * d.waistW * 1.1;
    const bx = cX + t * flareW * 0.92;
    return <line key={i} x1={tx} y1={d.waistY + 8} x2={bx} y2={hemY - 4} stroke={shade} strokeWidth="0.7" opacity="0.3" />;
  });

  // Deep V neck (sweetheart style)
  const neckPath = `M ${cX - 14} ${d.shoulderY + 2} L ${cX} ${d.shoulderY + 34} L ${cX + 14} ${d.shoulderY + 2}`;

  // 3/4 sleeves with scaled thickness
  const elbowMid = d.bustY + (d.elbowY - d.bustY) * 0.65;
  const cuffY    = elbowMid + 16;
  const sleeveOuterScale = 11 * d.scale;
  const sleeveInnerScale = 3 * d.scale;

  const sleeveL  = `
    M ${cX - d.shoulderW}  ${d.shoulderY + 2}
    C ${cX - d.shoulderW - sleeveOuterScale - 2} ${d.bustY},
      ${cX - d.shoulderW - sleeveOuterScale - 4} ${elbowMid},
      ${cX - d.shoulderW - sleeveOuterScale}  ${cuffY}
    L ${cX - d.shoulderW + sleeveInnerScale}  ${cuffY}
    C ${cX - d.shoulderW + sleeveInnerScale}  ${elbowMid},
      ${armpitL}               ${armpitY + 10},
      ${armpitL}               ${armpitY}
    Z
  `;
  const sleeveR  = `
    M ${cX + d.shoulderW}  ${d.shoulderY + 2}
    C ${cX + d.shoulderW + sleeveOuterScale + 2} ${d.bustY},
      ${cX + d.shoulderW + sleeveOuterScale + 4} ${elbowMid},
      ${cX + d.shoulderW + sleeveOuterScale}  ${cuffY}
    L ${cX + d.shoulderW - sleeveInnerScale}  ${cuffY}
    C ${cX + d.shoulderW - sleeveInnerScale}  ${elbowMid},
      ${armpitR}               ${armpitY + 10},
      ${armpitR}               ${armpitY}
    Z
  `;

  // Churidar leggings — shaped by exactly tracing the NEW bare leg but expanded outward by 2px
  const cAnkOL = cX - 16 * d.scale - 2;
  const cAnkOR = cX + 16 * d.scale + 2;
  const cAnkIL = cX - 5 * d.scale + 2;
  const cAnkIR = cX + 5 * d.scale - 2;

  const churL = `
    M ${cX - d.hipW} ${d.hipY + 10}
    Q ${cX - d.hipW} ${d.hipY + 35} ${cX - d.hipW * 0.65 - 2} ${d.kneeY}
    Q ${cX - d.hipW * 0.55 - 2} ${d.kneeY + 20} ${cAnkOL} ${d.floorY}
    L ${cAnkIL} ${d.floorY}
    Q ${cX - 6 * d.scale + 2} ${d.kneeY} ${cX - 2 * d.scale + 2} ${d.hipY + 10}
    Z
  `;
  const churR = `
    M ${cX + d.hipW} ${d.hipY + 10}
    Q ${cX + d.hipW} ${d.hipY + 35} ${cX + d.hipW * 0.65 + 2} ${d.kneeY}
    Q ${cX + d.hipW * 0.55 + 2} ${d.kneeY + 20} ${cAnkOR} ${d.floorY}
    L ${cAnkIR} ${d.floorY}
    Q ${cX + 6 * d.scale - 2} ${d.kneeY} ${cX + 2 * d.scale - 2} ${d.hipY + 10}
    Z
  `;

  const churAnkle = (
    <g stroke={darkenHex(churColor, 40)} strokeWidth="0.8" opacity="0.6">
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const y = d.floorY - 2 - i * 4;
        return (
          <React.Fragment key={i}>
            <line x1={cAnkOL + 1} y1={y} x2={cAnkIL - 1} y2={y} />
            <line x1={cAnkOR - 1} y1={y} x2={cAnkIR + 1} y2={y} />
          </React.Fragment>
        );
      })}
    </g>
  );

  return (
    <g>
      <path d={churL} fill={churColor} />
      <path d={churR} fill={churColor} />
      {churAnkle}
      <path d={topPath} fill={color} stroke={shade} strokeWidth="0.9" />
      {isFestive && <path d={topPath} fill="url(#gold-buti)" />}
      {folds}
      <path d={neckPath} fill={_skin} stroke={shade} strokeWidth="1.4" />
      <path d={sleeveL} fill={color} stroke={shade} strokeWidth="0.9" />
      <path d={sleeveR} fill={color} stroke={shade} strokeWidth="0.9" />
      <line x1={cX - d.shoulderW - sleeveOuterScale} y1={cuffY - 5} x2={cX - d.shoulderW + sleeveInnerScale} y2={cuffY - 5} stroke={shade} strokeWidth="0.9" />
      <line x1={cX + d.shoulderW - sleeveInnerScale} y1={cuffY - 5} x2={cX + d.shoulderW + sleeveOuterScale} y2={cuffY - 5} stroke={shade} strokeWidth="0.9" />
      <path d={`M ${cX - flareW} ${hemY} Q ${cX} ${hemY + 8} ${cX + flareW} ${hemY}`} fill="none" stroke={shade} strokeWidth="1" />
    </g>
  );
}

/**
 * SALWAR KAMEEZ
 *  - Kameez: mid-thigh tunic with side slits, round neck, 3/4 sleeves.
 *  - Salwar: balloon shape starts immediately below kameez hem (high),
 *    peaks at thigh level, then tapers to narrow ankle cuff.
 *    CONTRAST colour — deep charcoal/neutral — so it reads as a separate garment.
 *  - Dupatta across chest.
 */
function salwarKameez(d: BodyDimensions, color: string, _skin: string, isFestive: boolean) {
  const shade      = darkenHex(color, 30);
  // Salwar is always a deep neutral contrast so it doesn't look like one piece
  const salwarColor = "#2e2c3e";        // deep charcoal-plum
  const salwarShade = "#1a1828";
  const cX         = 100;

  // Kameez hem: traditional length (just above knee)
  const kamHemY    = d.kneeY - 15;
  const slitStartY = d.hipY + 15;
  const hemW       = d.hipW + 10;

  // ── Kameez ──
  const armpitL = cX - d.shoulderW + 10 * d.scale;
  const armpitR = cX + d.shoulderW - 10 * d.scale;
  const armpitY = d.bustY - 6;

  const kamPath = `
    M ${cX - d.shoulderW}  ${d.shoulderY + 2}
    L ${armpitL}           ${armpitY}
    C ${cX - d.bustW}      ${d.bustY},
      ${cX - d.waistW - 1} ${d.waistY},
      ${cX - d.hipW - 2}   ${d.hipY}
    L ${cX - d.hipW - 2}   ${slitStartY}
    L ${cX - hemW}          ${kamHemY}
    L ${cX + hemW}          ${kamHemY}
    L ${cX + d.hipW + 2}   ${slitStartY}
    L ${cX + d.hipW + 2}   ${d.hipY}
    C ${cX + d.waistW + 1} ${d.waistY},
      ${cX + d.bustW}      ${d.bustY},
      ${armpitR}           ${armpitY}
    L ${cX + d.shoulderW}  ${d.shoulderY + 2}
    Q ${cX + d.shoulderW * 0.5} ${d.shoulderY + 2} ${cX + 12} ${d.shoulderY + 3}
    Q ${cX}                ${d.shoulderY + 22}
      ${cX - 12}           ${d.shoulderY + 3}
    Q ${cX - d.shoulderW * 0.5} ${d.shoulderY + 2} ${cX - d.shoulderW} ${d.shoulderY + 2}
    Z
  `;

  // Deep round neck — shows neck and upper chest
  const neckPath = `
    M ${cX - 12} ${d.shoulderY + 3}
    Q ${cX}    ${d.shoulderY + 22}
    ${cX + 12}  ${d.shoulderY + 3}
  `;

  // 3/4 sleeves with scaled thickness
  const elbowMid = d.bustY + (d.elbowY - d.bustY) * 0.65;
  const cuffY    = elbowMid + 14;
  const sleeveOuterScale = 12 * d.scale;
  const sleeveInnerScale = 4 * d.scale;

  const sleeveL  = `
    M ${cX - d.shoulderW}  ${d.shoulderY + 2}
    C ${cX - d.shoulderW - sleeveOuterScale - 2} ${d.bustY},
      ${cX - d.shoulderW - sleeveOuterScale - 4} ${elbowMid},
      ${cX - d.shoulderW - sleeveOuterScale}  ${cuffY}
    L ${cX - d.shoulderW + sleeveInnerScale}  ${cuffY}
    C ${cX - d.shoulderW + sleeveInnerScale}  ${elbowMid},
      ${armpitL}               ${armpitY + 10},
      ${armpitL}               ${armpitY}
    Z
  `;
  const sleeveR  = `
    M ${cX + d.shoulderW}  ${d.shoulderY + 2}
    C ${cX + d.shoulderW + sleeveOuterScale + 2} ${d.bustY},
      ${cX + d.shoulderW + sleeveOuterScale + 4} ${elbowMid},
      ${cX + d.shoulderW + sleeveOuterScale}  ${cuffY}
    L ${cX + d.shoulderW - sleeveInnerScale}  ${cuffY}
    C ${cX + d.shoulderW - sleeveInnerScale}  ${elbowMid},
      ${armpitR}               ${armpitY + 10},
      ${armpitR}               ${armpitY}
    Z
  `;

  // ── Salwar ──
  // Balloon volume is reduced and perfectly tailored to start precisely at her pinched waist
  const ankleHalfW = 7;
  const ankleY     = d.floorY - 4;
  const peakY      = d.kneeY;                 // balloon peaks smoothly at the knee
  const peakX      = d.hipW * 1.15;           // much more modest, realistic balloon width

  // Each leg: tailored waist, gentle balloon shape, smooth taper to ankle.
  const leftLeg = `
    M ${cX - 2}              ${d.waistY}
    L ${cX - d.waistW - 1}   ${d.waistY}
    C ${cX - d.hipW - 2}     ${d.hipY + 20},
      ${cX - peakX}          ${peakY - 20},
      ${cX - peakX}          ${peakY}
    C ${cX - peakX * 0.85}   ${peakY + 40},
      ${cX - ankleHalfW - 5} ${ankleY - 20},
      ${cX - ankleHalfW - 3} ${ankleY}
    L ${cX - 3}              ${ankleY}
    L ${cX - 3}              ${d.waistY}
    Z
  `;
  const rightLeg = `
    M ${cX + 2}              ${d.waistY}
    L ${cX + d.waistW + 1}   ${d.waistY}
    C ${cX + d.hipW + 2}     ${d.hipY + 20},
      ${cX + peakX}          ${peakY - 20},
      ${cX + peakX}          ${peakY}
    C ${cX + peakX * 0.85}   ${peakY + 40},
      ${cX + ankleHalfW + 5} ${ankleY - 20},
      ${cX + ankleHalfW + 3} ${ankleY}
    L ${cX + 3}              ${ankleY}
    L ${cX + 3}              ${d.waistY}
    Z
  `;

  // Ankle cuffs
  const cuffLPath = `M ${cX - ankleHalfW - 4} ${ankleY - 8} L ${cX - ankleHalfW - 3} ${ankleY} L ${cX - 3} ${ankleY} L ${cX - 3} ${ankleY - 8} Z`;
  const cuffRPath = `M ${cX + 3} ${ankleY - 8} L ${cX + 3} ${ankleY} L ${cX + ankleHalfW + 3} ${ankleY} L ${cX + ankleHalfW + 4} ${ankleY - 8} Z`;

  // Crease lines on the balloon — subtle gather folds
  const balCreaseL = `M ${cX - peakX + 4} ${peakY} Q ${cX - peakX * 0.4} ${peakY + 10} ${cX - 4} ${peakY}`;
  const balCreaseR = `M ${cX + 4} ${peakY} Q ${cX + peakX * 0.4} ${peakY + 10} ${cX + peakX - 4} ${peakY}`;

  // Dupatta — prominent front V on chest (25px thick) + tails hanging strictly behind
  const dupEndY = d.kneeY + 20;

  // Front V — 25px thick even band, using straight lines, top edges flattened with a wide neck gap
  const dupFrontV = `
    M ${cX - d.shoulderW + 2}  ${d.shoulderY + 2}
    L ${cX}                     ${d.bustY + 35}
    L ${cX + d.shoulderW - 2}  ${d.shoulderY + 2}
    L ${cX + 14 * d.scale}     ${d.shoulderY + 2}
    L ${cX}                     ${d.bustY + 10}
    L ${cX - 14 * d.scale}     ${d.shoulderY + 2}
    Z
  `;

  // Left tail — hangs straight down behind the arm, completely outside the torso
  const dupTailL = `
    M ${cX - d.shoulderW + 4}   ${d.shoulderY + 2}
    Q ${cX - d.shoulderW - 25}  ${d.bustY + 30}
      ${cX - d.shoulderW - 28}  ${dupEndY}
    L ${cX - d.shoulderW - 3}   ${dupEndY}
    Q ${cX - d.shoulderW - 3}   ${d.bustY + 20}
      ${cX - d.shoulderW + 29}  ${d.shoulderY + 16}
    Z
  `;

  // Right tail — hangs straight down behind the arm, completely outside the torso
  const dupTailR = `
    M ${cX + d.shoulderW - 4}   ${d.shoulderY + 2}
    Q ${cX + d.shoulderW + 25}  ${d.bustY + 30}
      ${cX + d.shoulderW + 28}  ${dupEndY}
    L ${cX + d.shoulderW + 3}   ${dupEndY}
    Q ${cX + d.shoulderW + 3}   ${d.bustY + 20}
      ${cX + d.shoulderW - 29}  ${d.shoulderY + 16}
    Z
  `;

  // Re-draw bare arms and hands so the dupatta tails tuck behind them properly
  const skinShadow = darkenHex(_skin, 30);
  const bareArmL = `
    M ${cX - d.shoulderW}  ${d.shoulderY + 2}
    Q ${cX - d.shoulderW - 12 * d.scale} ${d.elbowY - 20} ${cX - d.shoulderW - 11 * d.scale} ${d.elbowY}
    Q ${cX - d.shoulderW - 10 * d.scale}  ${d.elbowY + 20} ${cX - d.shoulderW - 8 * d.scale} ${d.wristY}
    L ${cX - d.shoulderW + 3 * d.scale} ${d.wristY}
    Q ${cX - d.shoulderW + 2 * d.scale}  ${d.elbowY + 20} ${cX - d.shoulderW + 3 * d.scale} ${d.elbowY}
    Q ${cX - d.shoulderW + 4 * d.scale}  ${d.elbowY - 20} ${cX - d.shoulderW + 10 * d.scale} ${d.shoulderY + 12}
    Z
  `;
  const bareArmR = `
    M ${cX + d.shoulderW}  ${d.shoulderY + 2}
    Q ${cX + d.shoulderW + 12 * d.scale} ${d.elbowY - 20} ${cX + d.shoulderW + 11 * d.scale} ${d.elbowY}
    Q ${cX + d.shoulderW + 10 * d.scale}  ${d.elbowY + 20} ${cX + d.shoulderW + 8 * d.scale} ${d.wristY}
    L ${cX + d.shoulderW - 3 * d.scale} ${d.wristY}
    Q ${cX + d.shoulderW - 2 * d.scale}  ${d.elbowY + 20} ${cX + d.shoulderW - 3 * d.scale} ${d.elbowY}
    Q ${cX + d.shoulderW - 4 * d.scale}  ${d.elbowY - 20} ${cX + d.shoulderW - 10 * d.scale} ${d.shoulderY + 12}
    Z
  `;
  const bareHandL = `
    M ${cX - d.shoulderW - 8 * d.scale} ${d.wristY}
    C ${cX - d.shoulderW - 10 * d.scale} ${d.wristY + 10},
      ${cX - d.shoulderW - 8 * d.scale} ${d.wristY + 18},
      ${cX - d.shoulderW - 6 * d.scale} ${d.wristY + 20}
    Q ${cX - d.shoulderW - 5 * d.scale} ${d.wristY + 22} ${cX - d.shoulderW - 4 * d.scale} ${d.wristY + 20}
    C ${cX - d.shoulderW - 3 * d.scale} ${d.wristY + 18},
      ${cX - d.shoulderW - 2 * d.scale} ${d.wristY + 10},
      ${cX - d.shoulderW + 3 * d.scale} ${d.wristY}
    Z
  `;
  const bareHandR = `
    M ${cX + d.shoulderW + 8 * d.scale} ${d.wristY}
    C ${cX + d.shoulderW + 10 * d.scale} ${d.wristY + 10},
      ${cX + d.shoulderW + 8 * d.scale} ${d.wristY + 18},
      ${cX + d.shoulderW + 6 * d.scale} ${d.wristY + 20}
    Q ${cX + d.shoulderW + 5 * d.scale} ${d.wristY + 22} ${cX + d.shoulderW + 4 * d.scale} ${d.wristY + 20}
    C ${cX + d.shoulderW + 3 * d.scale} ${d.wristY + 18},
      ${cX + d.shoulderW + 2 * d.scale} ${d.wristY + 10},
      ${cX + d.shoulderW - 3 * d.scale} ${d.wristY}
    Z
  `;

  return (
    <g>
      {/* Salwar legs (contrast colour) */}
      <path d={leftLeg}  fill={salwarColor} stroke={salwarShade} strokeWidth="0.8" />
      <path d={rightLeg} fill={salwarColor} stroke={salwarShade} strokeWidth="0.8" />
      {/* Balloon crease hints */}
      <path d={balCreaseL} fill="none" stroke={salwarShade} strokeWidth="0.7" opacity="0.35" />
      <path d={balCreaseR} fill="none" stroke={salwarShade} strokeWidth="0.7" opacity="0.35" />
      {/* Ankle cuffs */}
      <path d={cuffLPath} fill={salwarShade} opacity="0.7" />
      <path d={cuffRPath} fill={salwarShade} opacity="0.7" />
      {/* Dupatta tails — behind the arms, drawn BEFORE kameez */}
      <path d={dupTailL} fill={lightenHex(color, 48)} stroke={shade} strokeWidth="0.5" opacity="0.5" />
      <path d={dupTailR} fill={lightenHex(color, 48)} stroke={shade} strokeWidth="0.5" opacity="0.5" />
      {/* Re-draw bare arms and hands so tails go behind them */}
      <path d={bareArmL} fill={_skin} stroke={skinShadow} strokeWidth="0.5" />
      <path d={bareArmR} fill={_skin} stroke={skinShadow} strokeWidth="0.5" />
      <path d={bareHandL} fill={_skin} stroke={skinShadow} strokeWidth="0.5" />
      <path d={bareHandR} fill={_skin} stroke={skinShadow} strokeWidth="0.5" />
      {/* Kameez on top */}
      <path d={kamPath}   fill={color} stroke={shade} strokeWidth="0.9" />
      <path d={sleeveL}   fill={color} stroke={shade} strokeWidth="0.9" />
      <path d={sleeveR}   fill={color} stroke={shade} strokeWidth="0.9" />
      {/* Neck */}
      <path d={neckPath}  fill="none" stroke={shade} strokeWidth="1.3" />
      {/* Hem */}
      <path d={`M ${cX - hemW} ${kamHemY} Q ${cX} ${kamHemY + 3} ${cX + hemW} ${kamHemY}`} fill="none" stroke={shade} strokeWidth="1" />
      {/* Dupatta front V — prominent, drawn on top of everything */}
      <path d={dupFrontV} fill={lightenHex(color, 48)} stroke={shade} strokeWidth="0.7" opacity="0.6" />
    </g>
  );
}

/**
 * BLOUSE (SAREE)
 * Nivi drape.
 *  - Skirt fills the full body width (extends slightly behind on left = wrapped look)
 *  - Front pleats fan out from waistband all the way down, fading to floor
 *  - Pallu: wide (22px), fully opaque, crosses diagonally LEFT shoulder → RIGHT hip,
 *    THEN falls to floor along the right side — continuous, not floating.
 *    Drawn AFTER the blouse so it overlays the torso convincingly.
 *  - Blouse: fitted, short sleeves.
 */
function sareeBlouse(d: BodyDimensions, color: string, _skin: string, isFestive: boolean) {
  const shade     = darkenHex(color, 30);
  const light     = lightenHex(color, 28);
  const palluFill = lightenHex(color, 15);  // slightly lighter but still same hue
  const cX        = 100;

  const wbY = d.waistY;
  const wbH = 12; // increased height to cover the hip transition
  const wbW = d.waistW + 4; // widened to cover the flared hips


  // ── Front pleats — fan from waistband all the way to floor, fading ──
  // 7 pleats spread across centre-front. Each pleat fans slightly wider at floor.
  const pleatFolds = [-4, -2.5, -1, 0, 1, 2.5, 4].map((t, i) => {
    const x1 = cX + t * 3;           // tight at waist
    const x2 = cX + t * 6;           // spread at floor
    const op  = 0.55 - Math.abs(t) * 0.05;  // outer pleats slightly fainter
    return (
      <line key={i}
        x1={x1} y1={wbY + wbH + 2}
        x2={x2} y2={d.floorY - 4}
        stroke={shade} strokeWidth="1" opacity={op}
      />
    );
  });

  // ── Pallu — natural Nivi drape (over model's LEFT shoulder = right side of screen) ──
  const pW = 36; // very wide at the waist
  
  // Pallu visible front: perfectly contained within body silhouette to prevent floating in air or spilling on hands
  const outerX1 = cX + d.shoulderW - 2; // STRICTLY INSIDE Model's left shoulder (right screen)
  const outerY1 = d.shoulderY - 4;
  const outerX2 = cX - d.waistW;        // STRICTLY INSIDE Model's right waist (left screen)
  const outerY2 = d.waistY + 8;
  
  const w = 26; // horizontal width of the sash
  const innerX1 = outerX1 - w;
  const innerY1 = outerY1;
  
  const dx = outerX2 - outerX1;
  const dy = outerY2 - outerY1;
  // The inner line is perfectly parallel to the outer line. It hits the waist (X=outerX2) at intersectY.
  const intersectY = outerY1 + dy * ((dx + w) / dx);

  const palluFrontPath = `
    M ${innerX1} ${innerY1}
    L ${outerX2} ${intersectY}
    L ${outerX2} ${outerY2}
    L ${outerX1} ${outerY1}
    Z
  `;

  // Pallu fall: cascades from right side of screen down to floor
  const palluFallPath = `
    M ${cX + d.shoulderW + 12} ${d.shoulderY - 4}
    C ${cX + d.shoulderW + 18} ${d.shoulderY + 20},
      ${cX + d.shoulderW + 22} ${d.hipY},
      ${cX + d.shoulderW + 14} ${d.floorY}
    L ${cX + d.shoulderW + 14 - pW} ${d.floorY}
    C ${cX + d.shoulderW + 22 - pW} ${d.hipY},
      ${cX + d.shoulderW + 18 - pW} ${d.shoulderY + 20},
      ${cX + d.shoulderW - 8}      ${d.shoulderY - 4}
    Z
  `;

  // Pallu fold lines strictly parallel to the sash edges
  const palluFolds = [0.25, 0.5, 0.75].map((t, i) => {
    const foldW = (1 - t) * w;
    const startX = outerX1 - foldW;
    const startY = outerY1;
    const endX = outerX2;
    const endY = outerY1 + dy * ((dx + foldW) / dx);
    return <line key={i} x1={startX} y1={startY} x2={endX} y2={endY} stroke={shade} strokeWidth="0.6" opacity="0.3" />;
  });

  // Re-draw the right bare arm so it renders ON TOP of the pallu fall
  const skinShadow = darkenHex(_skin, 30);
  const bareArmR = `
    M ${cX + d.shoulderW}  ${d.shoulderY + 2}
    Q ${cX + d.shoulderW + 12 * d.scale} ${d.elbowY - 20} ${cX + d.shoulderW + 11 * d.scale} ${d.elbowY}
    Q ${cX + d.shoulderW + 10 * d.scale}  ${d.elbowY + 20} ${cX + d.shoulderW + 8 * d.scale} ${d.wristY}
    L ${cX + d.shoulderW - 3 * d.scale} ${d.wristY}
    Q ${cX + d.shoulderW - 2 * d.scale}  ${d.elbowY + 20} ${cX + d.shoulderW - 3 * d.scale} ${d.elbowY}
    Q ${cX + d.shoulderW - 4 * d.scale}  ${d.elbowY - 20} ${cX + d.shoulderW - 10 * d.scale} ${d.shoulderY + 12}
    Z
  `;
  const bareHandR = `
    M ${cX + d.shoulderW + 8 * d.scale} ${d.wristY}
    C ${cX + d.shoulderW + 10 * d.scale} ${d.wristY + 10},
      ${cX + d.shoulderW + 8 * d.scale} ${d.wristY + 18},
      ${cX + d.shoulderW + 6 * d.scale} ${d.wristY + 20}
    Q ${cX + d.shoulderW + 5 * d.scale} ${d.wristY + 22} ${cX + d.shoulderW + 4 * d.scale} ${d.wristY + 20}
    C ${cX + d.shoulderW + 3 * d.scale} ${d.wristY + 18},
      ${cX + d.shoulderW + 2 * d.scale} ${d.wristY + 10},
      ${cX + d.shoulderW - 3 * d.scale} ${d.wristY}
    Z
  `;

  // Shoulder pin where pallu is gathered/pinned
  const pinX = cX + d.shoulderW - 2;
  const pinY = d.shoulderY - 2;

  // ── Blouse (fitted, short elbow sleeves) ──  // Very tight fitting, ending just below bust
  const blousePath = `
    M ${cX - d.shoulderW}  ${d.shoulderY + 2}
    C ${cX - d.bustW}      ${d.bustY + 4},
      ${cX - d.waistW - 1} ${d.waistY - 10},
      ${cX - d.waistW}     ${d.waistY - 2}
    L ${cX + d.waistW}     ${d.waistY - 2}
    C ${cX + d.waistW + 1} ${d.waistY - 10},
      ${cX + d.bustW}      ${d.bustY + 4},
      ${cX + d.shoulderW}  ${d.shoulderY + 2}
    Q ${cX + d.shoulderW * 0.5} ${d.shoulderY + 2} ${cX + d.shoulderW * 0.52} ${d.shoulderY + 2}
    Q ${cX} ${d.bustY - 2} ${cX - d.shoulderW * 0.52} ${d.shoulderY + 2}
    Q ${cX - d.shoulderW * 0.5} ${d.shoulderY + 2} ${cX - d.shoulderW}  ${d.shoulderY + 2}
    Z
  `;

  const slvY    = d.bustY + 28;
  const sleeveL = `
    M ${cX - d.shoulderW}  ${d.shoulderY + 2}
    C ${cX - d.shoulderW - 12} ${d.bustY},
      ${cX - d.shoulderW - 12} ${slvY - 10},
      ${cX - d.shoulderW - 8}  ${slvY}
    L ${cX - d.shoulderW + 4}  ${slvY}
    C ${cX - d.shoulderW + 2}  ${slvY - 10},
      ${cX - d.bustW + 4}      ${d.bustY},
      ${cX - d.shoulderW + 8}  ${d.shoulderY}
    Z
  `;
  const sleeveR = `
    M ${cX + d.shoulderW}  ${d.shoulderY + 2}
    C ${cX + d.shoulderW + 12} ${d.bustY},
      ${cX + d.shoulderW + 12} ${slvY - 10},
      ${cX + d.shoulderW + 8}  ${slvY}
    L ${cX + d.shoulderW - 4}  ${slvY}
    C ${cX + d.shoulderW - 2}  ${slvY - 10},
      ${cX + d.bustW - 4}      ${d.bustY},
      ${cX + d.shoulderW - 8}  ${d.shoulderY}
    Z
  `;

  // Deep scoop neck for saree blouse
  const neckPath = `
    M ${cX - d.shoulderW * 0.52} ${d.shoulderY + 2}
    Q ${cX}                      ${d.bustY - 2}
    ${cX + d.shoulderW * 0.52}   ${d.shoulderY + 2}
  `;

  // ── Skirt — starts wider to cover hips, suggests fabric wrapping behind ──
  const skirtPath = `
    M ${cX - wbW}  ${wbY + wbH}
    C ${cX - d.hipW + 4}  ${d.hipY},
      ${cX - d.hipW - 10}   ${d.hipY + 22},
      ${cX - d.hipW - 14}   ${d.floorY}
    Q ${cX}                 ${d.floorY + 5}
    ${cX + d.hipW + 18}     ${d.floorY}
    C ${cX + d.hipW + 16}   ${d.hipY + 20},
      ${cX + d.hipW - 4}    ${d.hipY},
      ${cX + wbW}           ${wbY + wbH}
    Z
  `;

  return (
    <g>
      {/* Pallu fall — hangs from right shoulder to floor (drawn FIRST so it falls behind skirt and body) */}
      <path d={palluFallPath} fill={palluFill} stroke={shade} strokeWidth="0.7" opacity="0.7" />
      {isFestive && <path d={palluFallPath} fill="url(#gold-stripes)" opacity="0.8" />}
      {/* Skirt body (drawn behind blouse, but OVER pallu fall) */}
<path d={skirtPath} fill={color} stroke={shade} strokeWidth="0.8" />
      {isFestive && <path d={skirtPath} fill="url(#gold-dots)" />}
      {isFestive && <path d={`M ${cX - d.hipW - 14} ${d.floorY} Q ${cX} ${d.floorY + 5} ${cX + d.hipW + 18} ${d.floorY}`} fill="none" stroke="#d4af37" strokeWidth="3" opacity="0.8" />}
      {pleatFolds}
      {/* Bare right arm drawn on TOP of pallu fall so pallu goes behind hand */}
      <path d={bareArmR} fill={_skin} stroke={skinShadow} strokeWidth="0.5" />
      <path d={bareHandR} fill={_skin} stroke={skinShadow} strokeWidth="0.5" />
      {/* Blouse on top of skirt */}
      <path d={blousePath} fill={light} stroke={shade} strokeWidth="1" />
      {isFestive && <path d={blousePath} fill="url(#gold-mesh)" />}
      <path d={sleeveL}    fill={light} stroke={shade} strokeWidth="1" />
      <path d={sleeveR}    fill={light} stroke={shade} strokeWidth="1" />
      <path d={neckPath}   fill="none" stroke={shade} strokeWidth="1.3" />
      <line x1={cX - d.waistW} y1={d.waistY} x2={cX + d.waistW} y2={d.waistY} stroke={shade} strokeWidth="1.4" />
      {/* Pallu front — on top of blouse, crosses over chest */}
<path d={palluFrontPath} fill={palluFill} stroke={shade} strokeWidth="0.7" opacity="0.85" />
      {isFestive && <path d={palluFrontPath} fill="url(#gold-stripes)" opacity="0.9" />}
      {/* Pallu gold borders */}
      {isFestive && <path d={`M ${innerX1} ${innerY1} L ${outerX2} ${intersectY}`} fill="none" stroke="#d4af37" strokeWidth="2" opacity="0.8" />}
      {isFestive && <path d={`M ${outerX1} ${outerY1} L ${outerX2} ${outerY2}`} fill="none" stroke="#d4af37" strokeWidth="2" opacity="0.8" />}
      {palluFolds}
      {/* Waistband drawn LAST so it covers the skirt, blouse hem, and cleanly overlaps the tucked pallu */}
      <rect x={cX - wbW} y={wbY} width={wbW * 2} height={wbH} rx="2" fill={darkenHex(color, 22)} opacity="0.7" />
      {/* Shoulder pin */}
      <circle cx={pinX} cy={pinY} r="2.8" fill={shade} opacity="0.9" />
    </g>
  );
}

/**
 * DAILY WEAR DRESS
 * Form-fitted A-line ethnic midi dress — fitted through bust and waist,
 * only flares gently from hip down. NOT boxy or square.
 *  - Tight through shoulders, nips in at waist, modest flare below hip
 *  - Round neck, small cap sleeves
 *  - Hem at mid-calf, fitted feel throughout
 */
function dailyDress(d: BodyDimensions, color: string, _skin: string) {
  const shade = darkenHex(color, 28);
  const cX    = 100;

  // Hem at mid-calf
  const hemY  = d.kneeY + 24;
  const hemW  = d.hipW + 12;    // wider than hips so body doesn't overflow

  // Form-fitted: follows bust curve, nips tightly at waist, flows over hips with room  // Form-fitted sheath dress — extremely tight
  const bodyPath = `
    M ${cX - d.shoulderW - 2}  ${d.shoulderY + 2}
    C ${cX - d.bustW - 1}      ${d.bustY - 4},
      ${cX - d.waistW + 1}     ${d.waistY - 4},
      ${cX - d.hipW + 1}       ${d.hipY}
    C ${cX - d.hipW + 2}       ${d.hipY + 30},
      ${cX - hemW}             ${hemY - 40},
      ${cX - hemW}             ${hemY}
    Q ${cX}                    ${hemY + 6}
      ${cX + hemW}             ${hemY}
    C ${cX + hemW}             ${hemY - 40},
      ${cX + d.hipW - 2}       ${d.hipY + 30},
      ${cX + d.hipW - 1}       ${d.hipY}
    C ${cX + d.waistW - 1}     ${d.waistY - 4},
      ${cX + d.bustW + 1}      ${d.bustY - 4},
      ${cX + d.shoulderW - 2}  ${d.shoulderY + 2}
    Q ${cX + d.shoulderW * 0.5} ${d.shoulderY + 2} ${cX + 12} ${d.shoulderY + 3}
    Q ${cX}                    ${d.shoulderY + 22}
      ${cX - 12}               ${d.shoulderY + 3}
    Q ${cX - d.shoulderW * 0.5} ${d.shoulderY + 2} ${cX - d.shoulderW - 2} ${d.shoulderY + 2}
    Z
  `;

  // Deep round neck — shows neck and upper chest
  const neckPath = `
    M ${cX - 12} ${d.shoulderY + 3}
    Q ${cX}      ${d.shoulderY + 22}
    ${cX + 12}   ${d.shoulderY + 3}
  `;

  // Fitted cap sleeves (small, not dramatic)
  const capL = `M ${cX - d.shoulderW + 2} ${d.shoulderY} Q ${cX - d.shoulderW - 6} ${d.shoulderY + 14} ${cX - d.shoulderW} ${d.shoulderY + 24} L ${cX - d.shoulderW + 8} ${d.shoulderY + 20} Z`;
  const capR = `M ${cX + d.shoulderW - 2} ${d.shoulderY} Q ${cX + d.shoulderW + 6} ${d.shoulderY + 14} ${cX + d.shoulderW} ${d.shoulderY + 24} L ${cX + d.shoulderW - 8} ${d.shoulderY + 20} Z`;

  // Waist seam and gentle flare crease lines (only below hip)
  const yokeY  = d.bustY - 6;
  const yokeW  = d.shoulderW - 6;
  const foldLines = [-0.5, 0, 0.5].map((t, i) => {
    const topX = cX + t * d.hipW * 0.6;
    const botX = cX + t * hemW * 0.8;
    return <line key={i} x1={topX} y1={d.hipY + 6} x2={botX} y2={hemY - 6} stroke={shade} strokeWidth="0.7" opacity="0.25" />;
  });

  return (
    <g>
      <path d={bodyPath} fill={color} stroke={shade} strokeWidth="0.9" />
      <path d={capL} fill={color} stroke={shade} strokeWidth="0.9" />
      <path d={capR} fill={color} stroke={shade} strokeWidth="0.9" />
      <line x1={cX - yokeW} y1={yokeY} x2={cX + yokeW} y2={yokeY} stroke={shade} strokeWidth="0.8" opacity="0.5" />
      <path d={neckPath} fill="none" stroke={shade} strokeWidth="1.3" />
      {foldLines}
      <path d={`M ${cX - hemW} ${hemY} Q ${cX} ${hemY + 4} ${cX + hemW} ${hemY}`} fill="none" stroke={shade} strokeWidth="1" />
    </g>
  );
}

/** Fallback generic dress */
function genericDress(d: BodyDimensions, color: string) {
  const shade = darkenHex(color, 28);
  const cX    = 100;
  const flare = d.hipW * 1.8;
  const hemY  = d.floorY - 20;
  
  const armpitL = cX - d.shoulderW + 10 * d.scale;
  const armpitR = cX + d.shoulderW - 10 * d.scale;
  const armpitY = d.bustY - 6;

  const path  = `
    M ${cX - d.shoulderW}  ${d.shoulderY + 2}
    L ${armpitL}          ${armpitY}
    C ${cX - d.bustW}     ${d.bustY},
      ${cX - d.waistW - 3} ${d.waistY},
      ${cX - flare}        ${hemY}
    Q ${cX}               ${hemY + 5}
    ${cX + flare}         ${hemY}
    C ${cX + d.waistW + 3} ${d.waistY},
      ${cX + d.bustW}     ${d.bustY},
      ${armpitR}          ${armpitY}
    L ${cX + d.shoulderW}  ${d.shoulderY + 2}
    Q ${cX + d.shoulderW * 0.5} ${d.shoulderY + 2} ${cX + 12} ${d.shoulderY + 3}
    Q ${cX} ${d.shoulderY + 22} ${cX - 12} ${d.shoulderY + 3}
    Q ${cX - d.shoulderW * 0.5} ${d.shoulderY + 2} ${cX - d.shoulderW} ${d.shoulderY + 2}
    Z
  `;
  return (
    <g>
      <path d={path} fill={color} stroke={shade} strokeWidth="0.9" />
      <line x1={cX - 9} y1={d.shoulderY + 4} x2={cX + 9} y2={d.shoulderY + 4} stroke={shade} strokeWidth="1.2" />
    </g>
  );
}

// ── Naked body SVG ───────────────────────────────────────────────────────────

function BodySvg({ d, skin }: { d: BodyDimensions; skin: string }) {
  const cX = 100;
  const shadow = darkenHex(skin, 30);
  const light = lightenHex(skin, 18);
  const neckHalfW = 5 * d.scale + 2; // dynamically scales neck width

  // BodySvg setup

  // Torso — form-fitting with sloped shoulders, defined bust, pinched waist, and flared hips
  // The skin is drawn slightly narrower (+2 on left, -2 on right) than the dresses so it never spills out
  const torsoPath = `
    M ${cX - neckHalfW} ${d.shoulderY - 5}
    Q ${cX - d.shoulderW * 0.5} ${d.shoulderY + 2} ${cX - d.shoulderW} ${d.shoulderY + 2}
    C ${cX - d.shoulderW + 2} ${d.shoulderY + 10},
      ${cX - d.bustW + 2}     ${d.bustY - 10},
      ${cX - d.bustW + 2}     ${d.bustY}
    C ${cX - d.bustW + 2}     ${d.bustY + 10},
      ${cX - d.waistW + 2}    ${d.waistY - 5},
      ${cX - d.waistW + 1}    ${d.waistY}
    C ${cX - d.waistW + 1}    ${d.waistY + 10},
      ${cX - d.hipW + 3}      ${d.hipY - 10},
      ${cX - d.hipW + 1}      ${d.hipY}
    L ${cX - d.hipW + 1}      ${d.hipY + 10}
    L ${cX + d.hipW - 1}      ${d.hipY + 10}
    L ${cX + d.hipW - 1}      ${d.hipY}
    C ${cX + d.hipW - 3}      ${d.hipY - 10},
      ${cX + d.waistW - 1}    ${d.waistY + 10},
      ${cX + d.waistW - 1}    ${d.waistY}
    C ${cX + d.waistW - 2}    ${d.waistY - 5},
      ${cX + d.bustW - 2}     ${d.bustY + 10},
      ${cX + d.bustW - 2}     ${d.bustY}
    C ${cX + d.bustW - 2}     ${d.bustY - 10},
      ${cX + d.shoulderW - 2} ${d.shoulderY + 10},
      ${cX + d.shoulderW}  ${d.shoulderY + 2}
    Q ${cX + d.shoulderW * 0.5} ${d.shoulderY + 2} ${cX + neckHalfW} ${d.shoulderY - 5}
    Z
  `;

  // Subtle collarbone hint
  const collarboneL = `M ${cX - 4 * d.scale} ${d.shoulderY + 2} Q ${cX - d.shoulderW * 0.5} ${d.shoulderY + 5} ${cX - d.shoulderW + 4 * d.scale} ${d.shoulderY + 3}`;
  const collarboneR = `M ${cX + 4 * d.scale} ${d.shoulderY + 2} Q ${cX + d.shoulderW * 0.5} ${d.shoulderY + 5} ${cX + d.shoulderW - 4 * d.scale} ${d.shoulderY + 3}`;

  // Arms — scaled to be naturally thicker to match the body mass on larger builds
  const armLPath = `
    M ${cX - d.shoulderW}  ${d.shoulderY + 2}
    Q ${cX - d.shoulderW - 12 * d.scale} ${d.elbowY - 20} ${cX - d.shoulderW - 11 * d.scale} ${d.elbowY}
    Q ${cX - d.shoulderW - 10 * d.scale}  ${d.elbowY + 20} ${cX - d.shoulderW - 8 * d.scale} ${d.wristY}
    L ${cX - d.shoulderW + 3 * d.scale} ${d.wristY}
    Q ${cX - d.shoulderW + 2 * d.scale}  ${d.elbowY + 20} ${cX - d.shoulderW + 3 * d.scale} ${d.elbowY}
    Q ${cX - d.shoulderW + 4 * d.scale}  ${d.elbowY - 20} ${cX - d.shoulderW + 10 * d.scale} ${d.shoulderY + 12}
    Z
  `;
  const armRPath = `
    M ${cX + d.shoulderW}  ${d.shoulderY + 2}
    Q ${cX + d.shoulderW + 12 * d.scale} ${d.elbowY - 20} ${cX + d.shoulderW + 11 * d.scale} ${d.elbowY}
    Q ${cX + d.shoulderW + 10 * d.scale}  ${d.elbowY + 20} ${cX + d.shoulderW + 8 * d.scale} ${d.wristY}
    L ${cX + d.shoulderW - 3 * d.scale} ${d.wristY}
    Q ${cX + d.shoulderW - 2 * d.scale}  ${d.elbowY + 20} ${cX + d.shoulderW - 3 * d.scale} ${d.elbowY}
    Q ${cX + d.shoulderW - 4 * d.scale}  ${d.elbowY - 20} ${cX + d.shoulderW - 10 * d.scale} ${d.shoulderY + 12}
    Z
  `;

  // Hands — tapered gracefully from the newly widened wrists
  const forearmLPath = `
    M ${cX - d.shoulderW - 8 * d.scale} ${d.wristY}
    C ${cX - d.shoulderW - 10 * d.scale} ${d.wristY + 10},
      ${cX - d.shoulderW - 8 * d.scale} ${d.wristY + 18},
      ${cX - d.shoulderW - 6 * d.scale} ${d.wristY + 20}
    Q ${cX - d.shoulderW - 5 * d.scale} ${d.wristY + 22} ${cX - d.shoulderW - 4 * d.scale} ${d.wristY + 20}
    C ${cX - d.shoulderW - 3 * d.scale} ${d.wristY + 18},
      ${cX - d.shoulderW - 2 * d.scale} ${d.wristY + 10},
      ${cX - d.shoulderW + 3 * d.scale} ${d.wristY}
    Z
  `;
  const forearmRPath = `
    M ${cX + d.shoulderW + 8 * d.scale} ${d.wristY}
    C ${cX + d.shoulderW + 10 * d.scale} ${d.wristY + 10},
      ${cX + d.shoulderW + 8 * d.scale} ${d.wristY + 18},
      ${cX + d.shoulderW + 6 * d.scale} ${d.wristY + 20}
    Q ${cX + d.shoulderW + 5 * d.scale} ${d.wristY + 22} ${cX + d.shoulderW + 4 * d.scale} ${d.wristY + 20}
    C ${cX + d.shoulderW + 3 * d.scale} ${d.wristY + 18},
      ${cX + d.shoulderW + 2 * d.scale} ${d.wristY + 10},
      ${cX + d.shoulderW - 3 * d.scale} ${d.wristY}
    Z
  `;

  // Legs — rewritten to properly attach to the full width of the hips and taper naturally
  const legLPath = `
    M ${cX - d.hipW + 2} ${d.hipY + 10}
    Q ${cX - d.hipW + 2} ${d.hipY + 35} ${cX - d.hipW * 0.65} ${d.kneeY}
    Q ${cX - d.hipW * 0.55} ${d.kneeY + 20} ${cX - 16 * d.scale} ${d.floorY}
    L ${cX - 5 * d.scale} ${d.floorY}
    Q ${cX - 6 * d.scale} ${d.kneeY} ${cX - 2 * d.scale} ${d.hipY + 10}
    Z
  `;
  const legRPath = `
    M ${cX + d.hipW - 2} ${d.hipY + 10}
    Q ${cX + d.hipW - 2} ${d.hipY + 35} ${cX + d.hipW * 0.65} ${d.kneeY}
    Q ${cX + d.hipW * 0.55} ${d.kneeY + 20} ${cX + 16 * d.scale} ${d.floorY}
    L ${cX + 5 * d.scale} ${d.floorY}
    Q ${cX + 6 * d.scale} ${d.kneeY} ${cX + 2 * d.scale} ${d.hipY + 10}
    Z
  `;

  // Hair constants
  const hairColor = "#2e1a0e";
  const hairHighlight = "#452e18";
  // Hair falls to mid-upper-arm level (between shoulder and elbow)
  const hairEndY = d.shoulderY + (d.elbowY - d.shoulderY) * 0.4;

  return (
    <g>
      {/* Soft drop shadow */}
      <ellipse cx={cX} cy={d.floorY + 6} rx={28} ry={5} fill="rgba(0,0,0,0.08)" />

      {/* Back hair — gentle wavy mane falling strictly behind everything */}
      <path
        d={`
          M ${cX - d.headR + 4}  ${d.headCy}
          C ${cX - d.shoulderW - 2}  ${d.shoulderY - 10},
            ${cX - d.shoulderW - 4}  ${d.shoulderY + 20},
            ${cX - d.shoulderW}      ${hairEndY}
          Q ${cX - d.shoulderW + 10} ${hairEndY + 10}
            ${cX}                    ${hairEndY + 5}
          Q ${cX + d.shoulderW - 10} ${hairEndY + 10}
            ${cX + d.shoulderW}      ${hairEndY}
          C ${cX + d.shoulderW + 4}  ${d.shoulderY + 20},
            ${cX + d.shoulderW + 2}  ${d.shoulderY - 10},
            ${cX + d.headR - 4}      ${d.headCy}
          Z
        `}
        fill={hairColor}
        stroke="none"
        opacity="0.95"
      />

      {/* Hair texture strands (behind shoulders) */}
      <path
        d={`M ${cX + d.headR - 3} ${d.headCy + 10} Q ${cX + d.headR + 3} ${d.shoulderY} ${cX + d.headR} ${hairEndY - 4}`}
        fill="none" stroke={hairHighlight} strokeWidth="0.6" opacity="0.3"
      />
      <path
        d={`M ${cX - d.headR + 3} ${d.headCy + 10} Q ${cX - d.headR - 3} ${d.shoulderY} ${cX - d.headR} ${hairEndY - 4}`}
        fill="none" stroke={hairHighlight} strokeWidth="0.6" opacity="0.3"
      />

      {/* Legs */}
      <path d={legLPath} fill={skin} stroke={shadow} strokeWidth="0.5" />
      <path d={legRPath} fill={skin} stroke={shadow} strokeWidth="0.5" />

      {/* Torso */}
      <path d={torsoPath} fill={skin} stroke={shadow} strokeWidth="0.5" />
      {/* Subtle body definition lines */}
      <path d={collarboneL} fill="none" stroke={shadow} strokeWidth="0.4" opacity="0.3" />
      <path d={collarboneR} fill="none" stroke={shadow} strokeWidth="0.4" opacity="0.3" />

      {/* Arms */}
      <path d={armLPath} fill={skin} stroke={shadow} strokeWidth="0.5" />
      <path d={armRPath} fill={skin} stroke={shadow} strokeWidth="0.5" />
      <path d={forearmLPath} fill={skin} stroke={shadow} strokeWidth="0.5" />
      <path d={forearmRPath} fill={skin} stroke={shadow} strokeWidth="0.5" />
      


      {/* Neck — thicker and extends deep into torso, dynamically scaling width */}
      <path d={`
        M ${cX - neckHalfW} ${d.headCy + d.headR - 4}
        Q ${cX - neckHalfW} ${d.headCy + d.headR + 6}  ${cX - neckHalfW - 1} ${d.shoulderY + 10}
        L ${cX + neckHalfW + 1} ${d.shoulderY + 10}
        Q ${cX + neckHalfW} ${d.headCy + d.headR + 6}  ${cX + neckHalfW} ${d.headCy + d.headR - 4}
        Z
      `} fill={skin} stroke={shadow} strokeWidth="0.5" />

      {/* Head — Oval Face */}
      <ellipse cx={cX} cy={d.headCy} rx={d.headR * 0.85} ry={d.headR * 1.15} fill={skin} stroke={shadow} strokeWidth="0.5" />
      

      {/* Hair cap — top of head, with a curved natural hairline exposing forehead */}
      <path
        d={`
          M ${cX - d.headR + 1}  ${d.headCy + 4}
          C ${cX - d.headR - 5}  ${d.headCy - 2},
            ${cX - d.headR - 3}  ${d.headCy - d.headR + 2},
            ${cX - 4}            ${d.headCy - d.headR - 10}
          Q ${cX}                ${d.headCy - d.headR - 12}
            ${cX + 4}            ${d.headCy - d.headR - 10}
          C ${cX + d.headR + 3}  ${d.headCy - d.headR + 2},
            ${cX + d.headR + 5}  ${d.headCy - 2},
            ${cX + d.headR - 1}  ${d.headCy + 4}
          Q ${cX + d.headR - 6}  ${d.headCy - 12}
            ${cX}                ${d.headCy - 18}
          Q ${cX - d.headR + 6}  ${d.headCy - 12}
            ${cX - d.headR + 1}  ${d.headCy + 4}
          Z
        `}
        fill={hairColor}
        stroke="none"
        opacity="0.94"
      />
      
      <path
        d={`M ${cX - 3} ${d.headCy - d.headR - 9} Q ${cX} ${d.headCy - d.headR + 14} ${cX + d.headR - 2} ${d.headCy + 8}`}
        fill="none" stroke={hairHighlight} strokeWidth="0.7" opacity="0.25"
      />
    </g>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function FashionModelPreview({
  skinHex,
  dressColor,
  style,
  heightCm,
  waistCm,
  hipCm,
  chestCm,
  weightKg,
  isFestive = false,
}: Props) {
  const build = useMemo(
    () => deriveBuild(heightCm, weightKg, waistCm, hipCm),
    [heightCm, weightKg, waistCm, hipCm]
  );
  const d = useMemo(() => getDimensions(build), [build]);

  const normalizedStyle = style?.toLowerCase().replace(/\s+/g, " ").trim();

  const garment = useMemo(() => {
    if (normalizedStyle.includes("lehenga") || normalizedStyle.includes("ghagra")) {
      return lehenga(d, dressColor, skinHex, isFestive);
    }
    if (normalizedStyle.includes("anarkali")) {
      return anarkali(d, dressColor, skinHex, isFestive);
    }
    if (normalizedStyle.includes("salwar")) {
      return salwarKameez(d, dressColor, skinHex, isFestive);
    }
    if (normalizedStyle.includes("saree") || normalizedStyle.includes("blouse")) {
      return sareeBlouse(d, dressColor, skinHex, isFestive);
    }
    if (normalizedStyle.includes("kurta")) {
      return kurta(d, dressColor, skinHex, isFestive);
    }
    if (normalizedStyle.includes("daily") || normalizedStyle.includes("dress")) {
      return dailyDress(d, dressColor, skinHex);
    }
    return genericDress(d, dressColor);
  }, [normalizedStyle, d, dressColor, skinHex]);

  const buildLabel =
    build === "small" ? "Slim" : build === "xl" || build === "large" ? "Full" : "Medium";

  return (
    <div className="w-full h-full flex items-center justify-center relative">
      <svg
        viewBox="0 0 200 410"
        className="w-full h-full drop-shadow-xl"
        preserveAspectRatio="xMidYMid meet"
        aria-label={`Fashion model wearing a ${style} in ${dressColor}`}
      >
        <defs>
          {/* Ornate Gold Buti (floral dots) */}
          <pattern id="gold-buti" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(15)">
            <circle cx="9" cy="9" r="1.5" fill="#d4af37" opacity="0.85" />
            <circle cx="9" cy="5.5" r="0.8" fill="#d4af37" opacity="0.6" />
            <circle cx="9" cy="12.5" r="0.8" fill="#d4af37" opacity="0.6" />
            <circle cx="5.5" cy="9" r="0.8" fill="#d4af37" opacity="0.6" />
            <circle cx="12.5" cy="9" r="0.8" fill="#d4af37" opacity="0.6" />
          </pattern>
          {/* Scattered Gold Dots */}
          <pattern id="gold-dots" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <circle cx="4" cy="4" r="1.2" fill="#d4af37" opacity="0.5" />
          </pattern>
          {/* Gold Stripes */}
          <pattern id="gold-stripes" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
            <line x1="0" y1="0" x2="0" y2="12" stroke="#d4af37" strokeWidth="1.5" opacity="0.7" />
          </pattern>
          {/* Gold Chevron */}
          <pattern id="gold-chevron" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
            <polyline points="0,8 8,0 16,8" fill="none" stroke="#d4af37" strokeWidth="1" opacity="0.6" />
            <polyline points="0,16 8,8 16,16" fill="none" stroke="#d4af37" strokeWidth="1" opacity="0.6" />
          </pattern>
          {/* Gold Mesh / Netting (for dupattas or gowns) */}
          <pattern id="gold-mesh" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 0 0 L 10 10 M 10 0 L 0 10" stroke="#d4af37" strokeWidth="0.5" opacity="0.3" />
          </pattern>
        </defs>

        {/* Floor line */}
        <line x1="60" y1="388" x2="140" y2="388" stroke="rgba(0,0,0,0.1)" strokeWidth="1" />

        {/* Body (underneath, drawn first) */}
        <BodySvg d={d} skin={skinHex} />

        {/* Garment (drawn on top of body) */}
        {garment}
      </svg>
    </div>
  );
}
