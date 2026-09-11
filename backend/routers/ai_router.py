"""
AI & Chatbot Router
--------------------
Owner: Member 3 & 4

Endpoints:
    POST /chat       → Watson Assistant chatbot proxy
    POST /recommend  → Fabric & style recommendation engine (watsonx.ai)
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from services import ai_service
from typing import Optional, Literal

router = APIRouter()


# ─── Chatbot ─────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    """
    Pass the session_id from the previous response to maintain
    conversation context with Watson Assistant.
    """


@router.post("/chat")
async def chat(body: ChatRequest):
    """
    Proxy to IBM Watson Assistant.
    Maintains conversation sessions per user.
    """
    try:
        response = ai_service.chat(
            message=body.message,
            session_id=body.session_id,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chatbot error: {str(e)}")

    return JSONResponse(content=response)
    # Expected response shape:
    # {
    #   "reply": "string",
    #   "session_id": "string"
    # }


# ─── Recommendations ─────────────────────────────────────

class RecommendRequest(BaseModel):
    skin_tone: Literal["fair", "wheatish", "dark"]
    height_cm: float
    occasion: Literal["casual", "formal", "wedding", "festival"]


@router.post("/recommend")
async def recommend(body: RecommendRequest):
    """
    Given skin tone, height, and occasion — return top 3
    dress style + fabric combinations with reasoning.
    Uses watsonx.ai or HuggingFace as fallback.
    """
    try:
        result = ai_service.recommend(
            skin_tone=body.skin_tone,
            height_cm=body.height_cm,
            occasion=body.occasion,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation error: {str(e)}")

    return JSONResponse(content=result)
    # Expected response shape:
    # {
    #   "recommendations": [
    #     { "style": "Kurta", "fabric": "Cotton", "reason": "..." },
    #     ...
    #   ]
    # }
