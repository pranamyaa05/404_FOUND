# StitchSmart — Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│                                                             │
│   Next.js Frontend (localhost:3000)                         │
│   ┌────────────┐  ┌─────────────┐  ┌──────────────────┐    │
│   │ /          │  │ /studio     │  │ /styles          │    │
│   │ Landing    │  │ 5-step flow │  │ Style guide      │    │
│   └────────────┘  └──────┬──────┘  └──────────────────┘    │
│                          │                                  │
│              ┌───────────▼──────────┐                       │
│              │  studioStore (Zustand)│                       │
│              └───────────┬──────────┘                       │
│                          │ lib/api.ts                        │
└──────────────────────────┼──────────────────────────────────┘
                           │ REST (proxied via Next.js rewrites)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│           FastAPI Backend (localhost:8000)                   │
│                                                             │
│  POST /enhance-image ──► image_service.py                   │
│         │                  rembg + OpenCV                   │
│         ▼                                                   │
│      temp/<uuid>_enhanced.png                               │
│                                                             │
│  POST /generate-mesh ──► mesh_service.py                    │
│         │                  subprocess → Blender             │
│         ▼                                                   │
│      temp/<uuid>.gltf + temp/<uuid>.svg                     │
│                                                             │
│  POST /chat ───────────► ai_service.chat()                  │
│         │                  IBM Watson Assistant             │
│                                                             │
│  POST /recommend ──────► ai_service.recommend()             │
│                           IBM watsonx.ai                    │
│                           HuggingFace (fallback)            │
│                                                             │
│  GET  /styles ─────────► styles_router.py → data/styles.json│
│                                                             │
│  GET  /files/* ────────► static files from temp/            │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ subprocess
                           ▼
┌─────────────────────────────────────────────────────────────┐
│        Blender (headless, localhost machine)                 │
│                                                             │
│  blender-scripts/generate_mesh.py                           │
│    1. Parse measurements + style from JSON args             │
│    2. Build body mesh (scaled to measurements)              │
│    3. Build dress mesh (style-specific geometry)            │
│    4. Apply texture from enhanced image                     │
│    5. UV-unwrap → export SVG die-lines                      │
│    6. Export GLTF scene                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow — Full User Journey

```
User uploads image
      │
      ▼
POST /enhance-image
      │ rembg removes background/hair
      ▼
enhanced_image_url stored in studioStore
      │
      ▼
User enters measurements + picks style
      │ stored in studioStore
      ▼
POST /generate-mesh  { measurements, style, enhanced_image_url }
      │ FastAPI calls Blender headlessly
      │ Blender writes .gltf + .svg to backend/temp/
      ▼
{ gltf_url, die_line_url } returned to frontend
      │
      ├──► MeshViewer.tsx loads GLTF via Three.js
      │    User rotates 3D model
      │
      └──► DieLine.tsx renders + downloads SVG pattern
```

---

## Key Design Decisions

| Decision | Reason |
|---|---|
| Next.js proxies `/api/*` to FastAPI | Avoids CORS config during dev, works seamlessly in prod |
| Zustand over Redux | Minimal boilerplate, easy to use across step components |
| Blender called as subprocess | Keeps 3D logic in Python/Blender where the team is comfortable |
| GLTF format | Best Three.js support, compact, supports textures and animations |
| SVG for die-lines | Scalable, printable, web-viewable without extra libraries |
| IBM Watson + watsonx.ai | Aligns with IBM SkillsBuild hackathon judging criteria |
| HuggingFace fallback | Allows development without IBM keys during early stages |

---

## Port Reference

| Service | Port | Command |
|---|---|---|
| Next.js frontend | 3000 | `npm run dev` (in `/frontend`) |
| FastAPI backend | 8000 | `uvicorn main:app --reload` (in `/backend`) |
| Blender | — | Called as subprocess, no persistent port |
