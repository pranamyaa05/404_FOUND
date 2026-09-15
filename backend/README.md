# StitchSmart — Backend

**Tech:** Python 3.10+ · FastAPI · Uvicorn · Pydantic

---

## Who Works Here

| File | Owner |
|---|---|
| `services/image_service.py` | Member 5 |
| `services/mesh_service.py` | Member 1 & 2 |
| `services/ai_service.py` | Member 3 & 4 |
| `routers/` | All (thin layer — don't put logic here) |

---

## Getting Started

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows:
venv\Scripts\activate
# Mac / Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload
# → http://localhost:8000
# → API docs: http://localhost:8000/docs
```

---

## Folder Structure

```
backend/
├── main.py               # App entry point — registers routers, CORS, static files
├── config.py             # Reads .env — import `settings` to access any env var
├── requirements.txt      # All Python dependencies (pinned versions)
│
├── routers/              # Route definitions only — no business logic
│   ├── image_router.py   # POST /enhance-image
│   ├── mesh_router.py    # POST /generate-mesh
│   ├── ai_router.py      # POST /chat, POST /recommend
│   └── styles_router.py  # GET /styles
│
├── services/             # Business logic — implement your feature here
│   ├── image_service.py  # rembg + OpenCV pipeline    (Member 5)
│   ├── mesh_service.py   # Blender subprocess call    (Member 1 & 2)
│   └── ai_service.py     # Gemini AI & BOB chatbot    (Member 3 & 4)
│
├── uploads/              # Incoming uploaded images (auto-created, git-ignored)
└── temp/                 # Generated GLTF, SVG, enhanced PNGs (git-ignored)
```

---

## API Endpoints

All endpoints are documented interactively at `http://localhost:8000/docs`.

| Method | Endpoint | Owner | Input | Output |
|---|---|---|---|---|
| `POST` | `/enhance-image` | Member 5 | `multipart/form-data` (PNG/JPG) | `{ enhanced_image_url }` |
| `POST` | `/generate-mesh` | Member 1 & 2 | `{ measurements, style, enhanced_image_url }` | `{ gltf_url, die_line_url }` |
| `POST` | `/chat` | Member 3 & 4 | `{ message, session_id? }` | `{ reply, session_id }` |
| `POST` | `/recommend` | Member 3 & 4 | `{ skin_tone, height_cm, occasion }` | `{ recommendations[] }` |
| `GET` | `/styles` | shared | — | Array of dress style objects |

Generated files are served statically at `/files/<filename>`.

---

## How to Implement Your Service

Each service file has a single function you need to fill in:

**Member 5 — `services/image_service.py`**
```python
def enhance(image_bytes: bytes, output_path: str) -> None:
    # Your rembg / OpenCV pipeline here
```

**Member 1 & 2 — `services/mesh_service.py`**
```python
def generate(measurements: dict, style: str, image_url: str | None) -> dict:
    # Calls Blender headlessly, returns { gltf_url, die_line_url }
```

**Member 3 & 4 — `services/ai_service.py`**
```python
def chat(message: str, session_id: str | None, user_context: dict | None) -> dict:
    # Google Gemini AI call (with fallback), returns { reply, session_id, recommendations }

def recommend(skin_tone: str, height_cm: float, occasion: str, user_context: dict | None) -> dict:
    # Google Gemini structured recommendation call (JSON mode), returns { recommendations[] }
```

---

## Testing an Endpoint Manually

With the server running, use the Swagger UI at `http://localhost:8000/docs`
or curl:

```bash
# Test image enhancement
curl -X POST http://localhost:8000/enhance-image \
  -F "file=@/path/to/dress.jpg"

# Test chatbot
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What fabric suits a kurta for summer?"}'

# Test recommendation
curl -X POST http://localhost:8000/recommend \
  -H "Content-Type: application/json" \
  -d '{"skin_tone": "wheatish", "height_cm": 163, "occasion": "wedding"}'
```

---

## Environment Variables

Copy `../.env.example` to `.env` in the root.  
`config.py` loads it automatically.

| Variable | Required By | Description |
|---|---|---|
| `GEMINI_API_KEY` | Member 3 & 4 | Google Gemini API Key (Free tier from Google AI Studio) |
| `GEMINI_MODEL` | Member 3 & 4 | Optional: Default `gemini-1.5-flash` |
| `BLENDER_PATH` | Member 1 & 2 | Path to Blender executable |
| `WATSON_ASSISTANT_API_KEY` | Member 3 & 4 | (Optional legacy fallback) |
| `WATSON_ASSISTANT_ID` | Member 3 & 4 | (Optional legacy fallback) |
| `WATSONX_API_KEY` | Member 3 & 4 | (Optional legacy fallback) |
| `WATSONX_PROJECT_ID` | Member 3 & 4 | (Optional legacy fallback) |
| `HUGGINGFACE_API_KEY` | Member 3 & 4 | (Optional fallback) |

---

## Branch & PR Flow

```
feature/backend-<your-feature>  →  dev  →  main
```
