"""
StitchSmart — FastAPI Backend Entry Point
-----------------------------------------
Run with:
    uvicorn main:app --reload

API docs auto-generated at:
    http://localhost:8000/docs
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routers import image_router, mesh_router, ai_router, styles_router
from config import settings

# ── Logging setup ─────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)

# Absolute paths — never depend on the process's CWD
_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
_UPLOADS_DIR = os.path.join(_BACKEND_DIR, "uploads")
_TEMP_DIR    = os.path.join(_BACKEND_DIR, "temp")

# Create them immediately so StaticFiles mount doesn't fail
os.makedirs(_UPLOADS_DIR, exist_ok=True)
os.makedirs(_TEMP_DIR, exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events on startup/shutdown."""
    logger.info("StitchSmart backend starting up.")
    logger.info("uploads dir : %s", _UPLOADS_DIR)
    logger.info("temp dir    : %s", _TEMP_DIR)
    yield
    logger.info("StitchSmart backend shut down.")
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
# Use absolute path so this works regardless of uvicorn launch directory.
app.mount("/files", StaticFiles(directory=_TEMP_DIR), name="files")

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
