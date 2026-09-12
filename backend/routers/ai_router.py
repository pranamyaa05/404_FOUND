"""
AI & Chatbot Router — BOB
--------------------------
Owner: Member 3 & 4

Endpoints:
    POST /chat           → Watson Assistant + watsonx.ai + rule-based fallback
    POST /recommend      → Style/fabric recommendations with colours
    POST /bob-proactive  → Server-side contextual nudge generation
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from services import ai_service
from typing import Optional, Literal

router = APIRouter()


# ─── Shared user context model ────────────────────────────────────────

class UserContext(BaseModel):
    """
    Full user profile passed from the frontend on every request.
    BOB uses whatever fields are populated — all are optional.
    """
    skin_tone_label: Optional[str] = None     # e.g. "wheatish"
    skin_tone_display: Optional[str] = None   # e.g. "Wheatish"
    height_cm: Optional[float] = None
    chest_cm: Optional[float] = None
    waist_cm: Optional[float] = None
    hip_cm: Optional[float] = None
    selected_style: Optional[str] = None      # e.g. "kurta"
    occasion: Optional[str] = None
    current_step: int = 0


# ─── Chat ─────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    user_context: UserContext = UserContext()


@router.post("/chat")
async def chat(body: ChatRequest):
    """
    Main BOB chat endpoint.

    BOB reads user_context and NEVER asks the user for info already in it.
    Returns plain text reply, or inline recommendation cards if relevant.

    Response:
        {
            "reply": str,
            "session_id": str,
            "recommendations": [...] | null
        }
    """
    try:
        response = ai_service.chat(
            message=body.message,
            session_id=body.session_id,
            user_context=body.user_context.model_dump(),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"BOB error: {str(e)}")

    return JSONResponse(content=response)


# ─── Recommendations ──────────────────────────────────────────────────

class RecommendRequest(BaseModel):
    skin_tone: Literal["very_fair", "fair", "wheatish", "medium_brown", "dark_brown", "deep"]
    height_cm: float
    occasion: Literal["casual", "formal", "wedding", "festival"]
    # Optional extra context
    user_context: UserContext = UserContext()


@router.post("/recommend")
async def recommend(body: RecommendRequest):
    """
    Generate top-3 dress style + fabric + colour recommendations.

    Personalised using skin tone, height, and occasion.
    Uses watsonx.ai → HuggingFace → rule-based fallback.

    Response:
        {
            "recommendations": [
                {
                    "style": "...",
                    "fabric": "...",
                    "colors": ["...", "...", "..."],
                    "reason": "...",
                    "confidence": "high" | "medium"
                },
                ...
            ]
        }
    """
    try:
        ctx = body.user_context.model_dump()
        ctx["skin_tone_label"] = body.skin_tone
        ctx["height_cm"] = body.height_cm
        ctx["occasion"] = body.occasion

        result = ai_service.recommend(
            skin_tone=body.skin_tone,
            height_cm=body.height_cm,
            occasion=body.occasion,
            user_context=ctx,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation error: {str(e)}")

    return JSONResponse(content=result)


# ─── Proactive nudge ──────────────────────────────────────────────────

class ProactiveRequest(BaseModel):
    trigger: str
    """
    One of:
        "landing" | "style_picked" | "image_enhanced" |
        "measurements_done" | "mesh_ready" | "idle_30s"
    """
    user_context: UserContext = UserContext()


@router.post("/bob-proactive")
async def bob_proactive(body: ProactiveRequest):
    """
    Returns a contextual proactive message from BOB.
    Called by the frontend when specific events occur.

    Response:
        { "reply": str }
    """
    try:
        result = ai_service.bob_proactive(
            trigger=body.trigger,
            user_context=body.user_context.model_dump(),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Proactive error: {str(e)}")

    return JSONResponse(content=result)
