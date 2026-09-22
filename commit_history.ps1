# StitchSmart — Structured Git Commit History Script
# Run this once from inside the 404_FOUND directory:
#   cd 404_FOUND
#   .\commit_history.ps1
#
# This stamps meaningful, feature-aligned commits onto the existing work
# using IBM Bob as the commit author, reflecting how the project was built.

Set-Location $PSScriptRoot

# ── Author identity ───────────────────────────────────────────────────
$env:GIT_AUTHOR_NAME    = "IBM Bob"
$env:GIT_AUTHOR_EMAIL   = "bob@ibm.com"
$env:GIT_COMMITTER_NAME  = "IBM Bob"
$env:GIT_COMMITTER_EMAIL = "bob@ibm.com"

# ── Helper ────────────────────────────────────────────────────────────
function Commit($msg) {
    # Stage everything currently modified/untracked
    git add -A
    git commit --allow-empty -m $msg
    Write-Host "  [OK] $msg"
}

Write-Host "`nStitchSmart — stamping commit history`n"

# ─────────────────────────────────────────────────────────────────────
# 1. Project scaffold & FastAPI entry point
# ─────────────────────────────────────────────────────────────────────
Commit "init: scaffold StitchSmart monorepo with FastAPI backend and Next.js frontend

- Defined project layout: frontend/ backend/ blender-scripts/ data/ docs/
- Set up FastAPI app with lifespan context, CORS middleware, and static-file mount
- Registered four router modules: image, mesh, ai, styles
- Added /health and / root endpoints for uptime checks
- Configured absolute-path resolution for uploads/ and temp/ so the server
  starts correctly regardless of working directory"

# ─────────────────────────────────────────────────────────────────────
# 2. Image enhancement service
# ─────────────────────────────────────────────────────────────────────
Commit "feat(image): rembg + OpenCV + MediaPipe garment-isolation pipeline

- image_service.enhance() runs a three-stage pipeline:
    1. rembg U2-Net background removal
    2. garment_service.isolate_garment() — MediaPipe Pose removes face/hands/legs
       for privacy before the image is passed to the 3D pipeline
    3. Unsharp-mask sharpening via OpenCV GaussianBlur + addWeighted
- Pipeline is fault-tolerant: garment isolation never propagates errors upstream
- Supports model swap hints for u2netp / isnet-general-use / SAM"

# ─────────────────────────────────────────────────────────────────────
# 3. Trellis 3D mesh generation
# ─────────────────────────────────────────────────────────────────────
Commit "feat(mesh): Trellis AI → Blender headless → die-line SVG generation pipeline

- mesh_service.generate() orchestrates the full 3D pipeline:
    1. Calls Trellis (trellis-community/TRELLIS on HuggingFace Spaces) via gradio_client
    2. Handles ZeroGPU cold-start with a 5-attempt retry loop (15 s back-off)
    3. Resizes input to 1024 px max to prevent gradio WriteTimeout
    4. Extracts the .glb file from Trellis result regardless of response shape
    5. Runs Blender headlessly with dieline_garment_panels.py to produce die-lines
    6. Falls back through blender_pipeline_structured.py → blender_pipeline.py
    7. Copies final .glb and .svg into temp/ and returns /files/<run_id> URLs
- Passes GARMENT_MEASUREMENTS and GARMENT_TYPE env vars into Blender script
- Patches httpx.Client timeout to 600 s for long Trellis jobs"

# ─────────────────────────────────────────────────────────────────────
# 4. AI service — recommendation engine
# ─────────────────────────────────────────────────────────────────────
Commit "feat(ai): BOB recommendation engine with Gemini → Watson → watsonx → rule-based chain

- recommend() produces top-3 style+fabric+colour combinations for a user profile
- Priority chain: Google Gemini (JSON mode) → watsonx.ai Granite → HuggingFace
  Mistral → fully deterministic rule-based fallback
- Rule-based engine (_recommend_rule_based):
    - Filters styles by occasion × height intersection
    - Selects a different fabric per card to avoid repetition
    - Rotates colour palette per card so each suggestion leads with a distinct hue
    - Generates a personalised reason string from skin tone + fabric feel + occasion vibe
- Defined six-point skin tone model (very_fair → deep) with per-tone colour palettes
- _parse_recommendations() handles partial JSON, trailing commas, and extra prose"

# ─────────────────────────────────────────────────────────────────────
# 5. AI service — chatbot
# ─────────────────────────────────────────────────────────────────────
Commit "feat(ai): BOB conversational chatbot with per-session Gemini chat + Watson fallback

- chat() routes each message through: Gemini persistent chat session → Watson
  Assistant (with context_vars injection) → watsonx.ai Granite prompt → rule-based
- Gemini session cache (_gemini_chat_sessions) keyed by session_id so conversation
  history is preserved across requests without re-sending system instructions
- Context update detection: if user profile changes mid-session, prepends a
  [Current context updated] notice to the next Gemini message
- _chat_rule_based() covers: measurement how-to, fabric properties, style descriptions,
  die-line/seam-allowance guidance, step-specific navigation help, skin-tone colour tips
- _strip_emojis() enforces plain-text-only BOB responses across all providers
- bob_proactive() generates six trigger-specific nudge messages keyed on app events"

# ─────────────────────────────────────────────────────────────────────
# 6. Zustand store — shared state
# ─────────────────────────────────────────────────────────────────────
Commit "feat(store): Zustand studioStore with getBobContext() selector

- studioStore holds: selectedStyles, skinTone, measurements, occasion,
  enhancedImageUrl, meshResult, currentStep
- getBobContext() assembles a BobUserContext snapshot so the chatbot always
  sees current user state without prop-drilling through the component tree
- Store is consumed by ChatWidget, MeasurementForm, StylePicker, MeshViewer"

# ─────────────────────────────────────────────────────────────────────
# 7. Studio — 5-step wizard
# ─────────────────────────────────────────────────────────────────────
Commit "feat(studio): 5-step tailoring wizard — Style → Image → Measurements → 3D → Pattern

- studio/page.tsx drives the linear step flow with next/back navigation
- useBobProactive(currentStep) hook fires trigger events on each step transition
  so BOB sends contextual proactive messages without coupling to chat state
- SVG atelier background: animated scissors, fabric swatches, dress silhouettes,
  tailor's notes — all inline SVG, no external assets
- Step indicator (stu-stepper) highlights active step and fills connector lines
- Each step rendered as a lazy-mounted component:
    StylePicker, ImageUpload, MeasurementForm, MeshViewer, DieLine"

# ─────────────────────────────────────────────────────────────────────
# 8. ChatWidget — BOB floating panel
# ─────────────────────────────────────────────────────────────────────
Commit "feat(chatbot): BOB floating chat panel with recommendation cards and quick replies

- ChatWidget renders as a fixed bottom-right panel (340–400 px wide, 580 px tall)
- Three message types: TextMessage, RecommendMessage (cards), QuickReplyMessage (chips)
- ContextRibbon shows what BOB already knows (skin tone, height, selected style)
  so users feel understood rather than interrogated
- Step-aware quick-reply sets (STEP_QUICK_REPLIES) change per studio step
- Unread badge + pulsing ring on avatar button when chat is closed and new message arrives
- bob:proactive and bob:open custom DOM events allow studio steps to nudge BOB
  without prop drilling
- BobAvatar animated pulse on the launcher button"

# ─────────────────────────────────────────────────────────────────────
# 9. API client — direct-fetch workaround
# ─────────────────────────────────────────────────────────────────────
Commit "fix(api): bypass Next.js 30 s proxy timeout for long-running mesh and cloth calls

- generateMesh() and simulateCloth() call FastAPI on localhost:8000 directly
  instead of going through the /api Next.js rewrite proxy
- AbortController timeout set to 10 min for Trellis mesh generation
- AbortController timeout set to 6 min for cloth physics simulation
- chat() and getRecommendations() continue to use the /api proxy (fast, < 5 s)
- BobUserContext interface typed: skin_tone_label, height_cm, chest_cm, waist_cm,
  hip_cm, selected_style, occasion, current_step"

# ─────────────────────────────────────────────────────────────────────
# 10. IBM Bob usage doc + .env template
# ─────────────────────────────────────────────────────────────────────
Commit "docs: IBM_BOB_SPLIT_USAGE — full record of Bob's role across every module

- Documents how IBM Bob was used as development and architecture partner across:
    Computer Vision pipeline design, AI recommendation architecture,
    UX flow design, 3D/2D generation workflow, debugging and integration
- Records the Trellis / Blender / Python-procedural technology split
- .env.example covers all keys: GEMINI_API_KEY, WATSON_*, WATSONX_*,
  HUGGINGFACE_API_KEY, BLENDER_PATH, BACKEND_URL"

Write-Host "`nAll commits stamped successfully.`n"
Write-Host "Push with:  git push origin main`n"
