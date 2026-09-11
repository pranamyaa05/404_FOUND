"""
StitchSmart — FastAPI Backend Entry Point
-----------------------------------------
Run with:
    uvicorn main:app --reload

API docs auto-generated at:
    http://localhost:8000/docs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from routers import image_router, mesh_router, ai_router, styles_router
from config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create upload/temp directories on startup."""
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("temp", exist_ok=True)
    yield
    # cleanup on shutdown (optional)


app = FastAPI(
    title="StitchSmart API",
    description="Backend for the StitchSmart AI tailoring assistant.",
    version="0.1.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────
# Allow the Next.js dev server to call the backend directly.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js dev
        settings.FRONTEND_URL,   # production URL (set in .env)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static file serving ──────────────────────────────────
# Serves generated GLTF and SVG files back to the frontend.
app.mount("/files", StaticFiles(directory="temp"), name="files")

# ── Routers ──────────────────────────────────────────────
app.include_router(image_router.router, tags=["Image Enhancement"])
app.include_router(mesh_router.router, tags=["3D Mesh & Die-lines"])
app.include_router(ai_router.router, tags=["AI & Chatbot"])
app.include_router(styles_router.router, tags=["Dress Styles"])


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "StitchSmart API is running."}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
