# StitchSmart — Frontend

**Tech:** Next.js 14 · TypeScript · Tailwind CSS · React Three Fiber · Zustand

---

## Who Works Here

All team members contribute to the frontend for integration.  
Chatbot UI is primarily owned by **Member 3 & 4**.

---

## Getting Started

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

Make sure the backend is also running at `http://localhost:8000`  
(see `../backend/README.md`).

---

## Folder Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx            # Landing page (/)
│   │   ├── studio/page.tsx     # Main workflow (/studio) — 5-step flow
│   │   └── styles/page.tsx     # Dress styles info (/styles)
│   │
│   ├── components/
│   │   ├── landing/            # Hero, HowItWorks, StylesSection
│   │   ├── studio/             # Step components (StylePicker → DieLine)
│   │   │   ├── StepIndicator.tsx
│   │   │   ├── StylePicker.tsx      ← Step 0: pick dress type
│   │   │   ├── ImageUpload.tsx      ← Step 1: upload + enhance image
│   │   │   ├── MeasurementForm.tsx  ← Step 2: body measurements
│   │   │   ├── MeshViewer.tsx       ← Step 3: 3D model in browser
│   │   │   └── DieLine.tsx          ← Step 4: download 2D pattern
│   │   └── chatbot/
│   │       └── ChatWidget.tsx       ← Floating AI chatbot (Member 3 & 4)
│   │
│   ├── store/
│   │   └── studioStore.ts      # Global Zustand state (shared across all steps)
│   │
│   └── lib/
│       └── api.ts              # All backend API calls in one place
│
├── tailwind.config.ts          # Brand colors — update here if needed
└── next.config.js              # Proxies /api/* → FastAPI backend
```

---

## How Data Flows Through the App

```
StylePicker → studioStore.selectedStyle
ImageUpload → studioStore.originalImage + enhancedImage
MeasurementForm → studioStore.measurements
MeshViewer → calls /api/generate-mesh → studioStore.meshUrl + dieLineUrl
DieLine → reads studioStore.dieLineUrl → renders SVG
ChatWidget → calls /api/chat → renders messages
```

All state lives in `src/store/studioStore.ts`.  
All API calls live in `src/lib/api.ts` — **do not call fetch() directly in components.**

---

## Adding the Chatbot Widget to a Page

The `ChatWidget` is a floating button — add it to any page layout:

```tsx
import ChatWidget from "@/components/chatbot/ChatWidget";

export default function SomePage() {
  return (
    <>
      {/* page content */}
      <ChatWidget />
    </>
  );
}
```

---

## Environment Variables

Copy `../.env.example` to `.env` in the root.  
Next.js reads variables prefixed with `NEXT_PUBLIC_` automatically.

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | FastAPI base URL (default: `http://localhost:8000`) |
| `NEXT_PUBLIC_WATSON_INTEGRATION_ID` | Watson web chat integration ID (optional) |

---

## Branch & PR Flow

```
feature/frontend-<your-feature>  →  dev  →  main
```

Never push directly to `main`.
