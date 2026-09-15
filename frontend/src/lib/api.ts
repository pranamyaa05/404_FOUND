/**
 * Central API client — all backend calls go through here.
 * Uses Next.js rewrites to proxy /api/* → FastAPI backend.
 *
 * Each function maps to one FastAPI endpoint.
 * Team members: implement your endpoint on the backend side,
 * then update or extend the matching function here.
 */

const BASE = "/api"; // proxied to BACKEND_URL via next.config.js

// 
// Image Enhancement  (Owner: Member 5)
// 
export async function enhanceImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/enhance-image", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error(`enhance-image failed: ${res.status}`);
  return res.json();
}

// 
// Mesh + Die-line Generation  (Owner: Member 1 & 2)
// 
export async function generateMesh(
  measurements: any,
  style: string,
  enhancedImageUrl: string
) {
  // Call FastAPI DIRECTLY — bypasses the Next.js proxy which has a ~30s timeout.
  // FastAPI has CORS enabled for localhost:3000 so this is safe.
  // Trellis generation takes 2-5 min, so we set a 10-minute client-side timeout.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000); // 10 min

  try {
    const res = await fetch("http://localhost:8000/generate-mesh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ measurements, style, enhanced_image_url: enhancedImageUrl }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let errorDetail = text;
      try {
        const parsed = JSON.parse(text);
        if (parsed.detail) errorDetail = parsed.detail;
      } catch (e) {
        // not JSON, keep raw text
      }
      throw new Error(errorDetail || `generate-mesh failed: ${res.status}`);
    }
    return res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

// 
// AI Style & Fabric Recommendation  (Owner: Member 3 & 4)
// 
export interface RecommendInput {
  skin_tone: "fair" | "wheatish" | "dark";
  height_cm: number;
  occasion: "casual" | "formal" | "wedding" | "festival";
}

export interface RecommendResult {
  recommendations: {
    style: string;
    fabric: string;
    colors?: string[];
    reason: string;
    confidence?: "high" | "medium";
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

// 
// Chatbot  (Owner: Member 3 & 4)
// 

export interface BobUserContext {
  skin_tone_label?: string;       // e.g. "wheatish"
  skin_tone_display?: string;     // e.g. "Wheatish"
  height_cm?: number;
  chest_cm?: number;
  waist_cm?: number;
  hip_cm?: number;
  selected_style?: string;        // e.g. "kurta"
  occasion?: string;              // e.g. "wedding"
  current_step?: number;          // 0–4, which studio step they're on
}

export async function chat(
  message: string,
  sessionId?: string,
  userContext?: BobUserContext
): Promise<{ reply: string; session_id: string; recommendations?: import("@/components/chatbot/RecommendationCard").Recommendation[] }> {
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      session_id: sessionId,
      user_context: userContext ?? {},
    }),
  });

  if (!res.ok) throw new Error(`chat failed: ${res.status}`);
  return res.json();
}

// 
// Proactive BOB message — called by the app, not the user
// 
export async function getBobProactiveMessage(
  trigger: string,
  userContext?: BobUserContext
): Promise<{ reply: string }> {
  const res = await fetch(`${BASE}/bob-proactive`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trigger, user_context: userContext ?? {} }),
  });

  if (!res.ok) throw new Error(`bob-proactive failed: ${res.status}`);
  return res.json();
}

// 
// Dress Styles Info  (shared data)
// 
export async function getStyles() {
  const res = await fetch(`${BASE}/styles`);
  if (!res.ok) throw new Error(`styles failed: ${res.status}`);
  return res.json();
}
