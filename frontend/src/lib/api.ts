/**
 * Central API client — all backend calls go through here.
 * Uses Next.js rewrites to proxy /api/* → FastAPI backend.
 *
 * Each function maps to one FastAPI endpoint.
 * Team members: implement your endpoint on the backend side,
 * then update or extend the matching function here.
 */

const BASE = "/api"; // proxied to BACKEND_URL via next.config.js

// ─────────────────────────────────────────────────────────
// Image Enhancement  (Owner: Member 5)
// ─────────────────────────────────────────────────────────
export async function enhanceImage(
  file: File
): Promise<{ enhanced_image_url: string }> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${BASE}/enhance-image`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) throw new Error(`enhance-image failed: ${res.status}`);
  return res.json();
}

// ─────────────────────────────────────────────────────────
// Mesh + Die-line Generation  (Owner: Member 1 & 2)
// ─────────────────────────────────────────────────────────
export async function generateMesh(
  measurements: Record<string, number>,
  style: string,
  enhancedImageUrl: string | null
): Promise<{ gltf_url: string; die_line_url: string }> {
  const res = await fetch(`${BASE}/generate-mesh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ measurements, style, enhanced_image_url: enhancedImageUrl }),
  });

  if (!res.ok) throw new Error(`generate-mesh failed: ${res.status}`);
  return res.json();
}

// ─────────────────────────────────────────────────────────
// AI Style & Fabric Recommendation  (Owner: Member 3 & 4)
// ─────────────────────────────────────────────────────────
export interface RecommendInput {
  skin_tone: "fair" | "wheatish" | "dark";
  height_cm: number;
  occasion: "casual" | "formal" | "wedding" | "festival";
}

export interface RecommendResult {
  recommendations: {
    style: string;
    fabric: string;
    reason: string;
  }[];
}

export async function getRecommendations(
  input: RecommendInput
): Promise<RecommendResult> {
  const res = await fetch(`${BASE}/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) throw new Error(`recommend failed: ${res.status}`);
  return res.json();
}

// ─────────────────────────────────────────────────────────
// Chatbot  (Owner: Member 3 & 4)
// ─────────────────────────────────────────────────────────
export async function chat(
  message: string,
  sessionId?: string
): Promise<{ reply: string; session_id: string }> {
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId }),
  });

  if (!res.ok) throw new Error(`chat failed: ${res.status}`);
  return res.json();
}

// ─────────────────────────────────────────────────────────
// Dress Styles Info  (shared data)
// ─────────────────────────────────────────────────────────
export async function getStyles() {
  const res = await fetch(`${BASE}/styles`);
  if (!res.ok) throw new Error(`styles failed: ${res.status}`);
  return res.json();
}
