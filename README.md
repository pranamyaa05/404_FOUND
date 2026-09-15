# StitchSmart — 404 Found 🧵

> IBM SkillsBuild Hackathon Project  
> A smart tailoring assistant that combines 3D visualization, AI guidance, and automatic pattern generation.

---

## What It Does

1. **Upload** a reference image of a dress design
2. **Enhance** the image automatically (removes hair, background distractions)
3. **Input** body measurements (height, chest, waist, hip, etc.)
4. **Select** a dress style (Kurta, Blouse-Saree, Ghagra, Daily Wear)
5. **Visualize** a 3D body mesh wearing the dress, adjusted to your proportions
6. **Download** 2D die-line / cutout patterns ready for a tailor
7. **Chat** with an AI assistant for fabric & style recommendations

---

## Project Structure

```
404_FOUND/
├── frontend/          → Next.js web app (UI, 3D viewer, chatbot widget)
├── backend/           → FastAPI Python server (image processing, AI, Blender pipeline)
├── blender-scripts/   → Blender Python scripts (3D mesh + die-line generation)
├── data/              → Shared JSON data (dress styles, fabric info)
└── docs/              → Architecture diagrams, API contracts
```

---

## Team & Module Ownership

| Module | Owner(s) | Folder |
|---|---|---|
| 3D Mesh + Die-line Generation | Member 1 & 2 | `blender-scripts/` + `backend/services/mesh_service.py` |
| AI Chatbot + Recommendations | Member 3 & 4 | `backend/services/ai_service.py` + `frontend/components/chatbot/` |
| Image Enhancement | Member 5 | `backend/services/image_service.py` |
| Frontend / Integration | All | `frontend/` |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- Blender 3.6+ (installed and path set in `.env`)

### 1. Clone the repo
```bash
git clone https://github.com/your-org/404_FOUND.git
cd 404_FOUND
```

### 2. Set up environment variables
```bash
cp .env.example .env
# Fill in your actual values in .env
```

### 3. Start the Frontend
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

### 4. Start the Backend
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload
# Runs on http://localhost:8000
```

### 5. API Docs
Once backend is running, visit: `http://localhost:8000/docs` for auto-generated Swagger UI.

---

## API Endpoints (Quick Reference)

| Method | Endpoint | Owner | Description |
|---|---|---|---|
| POST | `/enhance-image` | Member 5 | Remove distractions from dress image |
| POST | `/generate-mesh` | Member 1 & 2 | Generate 3D GLTF mesh + SVG die-lines |
| POST | `/recommend` | Member 3 & 4 | AI fabric & style recommendations |
| POST | `/chat` | Member 3 & 4 | AI chatbot conversation (Gemini + fallbacks) |
| GET | `/styles` | — | List all dress styles from data/ |

---

## Branch Strategy

```
main          → stable, demo-ready code only
dev           → integration branch, merge your features here first
feature/xxx   → your individual feature branches
```

**Never push directly to `main`.** Always open a PR into `dev` first.

---

## AI & Cloud Technologies

- **Google Gemini** — Primary conversational assistant (BOB) & structured style/fabric recommendation engine (Google AI Studio free tier)
- **IBM Watson / watsonx.ai** — Supported as optional legacy fallbacks

