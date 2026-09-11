"""
AI & Chatbot Service
---------------------
Owner: Member 3 & 4

Handles:
    1. chat()       → IBM Watson Assistant conversation
    2. recommend()  → Fabric & style recommendations via watsonx.ai
                      Falls back to HuggingFace if Watson is not configured.
"""

import requests
from ibm_watson import AssistantV2
from ibm_cloud_sdk_core.authenticators import IAMAuthenticator
from config import settings


# ─── Watson Assistant client (lazy-initialized) ───────────────────────

_assistant_client: AssistantV2 | None = None


def _get_assistant() -> AssistantV2:
    """Initialize Watson Assistant client once and reuse."""
    global _assistant_client
    if _assistant_client is None:
        if not settings.WATSON_ASSISTANT_API_KEY:
            raise RuntimeError(
                "WATSON_ASSISTANT_API_KEY is not set. "
                "Add it to your .env file."
            )
        authenticator = IAMAuthenticator(settings.WATSON_ASSISTANT_API_KEY)
        _assistant_client = AssistantV2(
            version="2023-06-15",
            authenticator=authenticator,
        )
        _assistant_client.set_service_url(settings.WATSON_ASSISTANT_URL)
    return _assistant_client


# ─── Chatbot ──────────────────────────────────────────────────────────

def chat(message: str, session_id: str | None = None) -> dict:
    """
    Send a message to Watson Assistant and return the reply.

    Creates a new session if session_id is not provided.
    Always return the session_id so the frontend can persist it.
    """
    assistant = _get_assistant()

    # Create a new session if we don't have one
    if not session_id:
        session_response = assistant.create_session(
            assistant_id=settings.WATSON_ASSISTANT_ID
        ).get_result()
        session_id = session_response["session_id"]

    # Send the message
    response = assistant.message(
        assistant_id=settings.WATSON_ASSISTANT_ID,
        session_id=session_id,
        input={"message_type": "text", "text": message},
    ).get_result()

    # Extract the first text response from Watson
    output = response.get("output", {})
    generic = output.get("generic", [])
    reply_text = (
        generic[0].get("text", "I'm not sure how to answer that.")
        if generic
        else "I'm not sure how to answer that."
    )

    return {"reply": reply_text, "session_id": session_id}


# ─── Recommendations ──────────────────────────────────────────────────

# Prompt template for the recommendation engine
_RECOMMEND_PROMPT = """
You are a knowledgeable Indian fashion consultant.
A user has the following profile:
  - Skin tone: {skin_tone}
  - Height: {height_cm} cm
  - Occasion: {occasion}

Suggest exactly 3 Indian dress style and fabric combinations that would suit them best.
For each recommendation, provide:
  - style: (e.g. Kurta, Ghagra, Blouse-Saree, etc.)
  - fabric: (e.g. Cotton, Silk, Chiffon, etc.)
  - reason: A single sentence explaining why this suits their profile.

Respond ONLY as a JSON array in this exact format:
[
  {{"style": "...", "fabric": "...", "reason": "..."}},
  {{"style": "...", "fabric": "...", "reason": "..."}},
  {{"style": "...", "fabric": "...", "reason": "..."}}
]
"""


def recommend(skin_tone: str, height_cm: float, occasion: str) -> dict:
    """
    Generate top-3 style + fabric recommendations.
    Tries watsonx.ai first, falls back to HuggingFace.
    """
    prompt = _RECOMMEND_PROMPT.format(
        skin_tone=skin_tone,
        height_cm=height_cm,
        occasion=occasion,
    )

    # Try watsonx.ai first
    if settings.WATSONX_API_KEY and settings.WATSONX_PROJECT_ID:
        return _recommend_via_watsonx(prompt)

    # Fallback to HuggingFace
    if settings.HUGGINGFACE_API_KEY:
        return _recommend_via_huggingface(prompt)

    # Dev fallback — hardcoded response so frontend works without AI keys
    return _dev_fallback_recommendations(skin_tone, occasion)


def _recommend_via_watsonx(prompt: str) -> dict:
    """Call watsonx.ai text generation REST API."""
    import json

    url = f"{settings.WATSONX_URL}/ml/v1/text/generation?version=2023-05-29"
    headers = {
        "Authorization": f"Bearer {_get_iam_token(settings.WATSONX_API_KEY)}",
        "Content-Type": "application/json",
    }
    payload = {
        "model_id": "ibm/granite-13b-instruct-v2",
        "input": prompt,
        "parameters": {
            "decoding_method": "greedy",
            "max_new_tokens": 400,
            "stop_sequences": ["]"],
        },
        "project_id": settings.WATSONX_PROJECT_ID,
    }

    response = requests.post(url, headers=headers, json=payload, timeout=30)
    response.raise_for_status()

    raw_text = response.json()["results"][0]["generated_text"] + "]"
    recommendations = json.loads(raw_text)
    return {"recommendations": recommendations}


def _recommend_via_huggingface(prompt: str) -> dict:
    """Call HuggingFace Inference API as fallback."""
    import json

    api_url = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2"
    headers = {"Authorization": f"Bearer {settings.HUGGINGFACE_API_KEY}"}
    payload = {"inputs": prompt, "parameters": {"max_new_tokens": 400}}

    response = requests.post(api_url, headers=headers, json=payload, timeout=30)
    response.raise_for_status()

    generated = response.json()[0]["generated_text"]
    # Extract JSON array from the response
    start = generated.find("[")
    end = generated.rfind("]") + 1
    recommendations = json.loads(generated[start:end])
    return {"recommendations": recommendations}


def _dev_fallback_recommendations(skin_tone: str, occasion: str) -> dict:
    """
    Hardcoded fallback so the frontend renders something
    even when no AI API keys are configured during development.
    """
    return {
        "recommendations": [
            {
                "style": "Kurta",
                "fabric": "Cotton",
                "reason": "Lightweight and breathable — ideal for everyday wear.",
            },
            {
                "style": "Anarkali Suit",
                "fabric": "Georgette",
                "reason": "Flows beautifully and suits most body types.",
            },
            {
                "style": "Straight Kurta with Palazzo",
                "fabric": "Linen",
                "reason": "Contemporary silhouette that works for semi-formal occasions.",
            },
        ]
    }


def _get_iam_token(api_key: str) -> str:
    """Exchange an IBM API key for a short-lived IAM bearer token."""
    response = requests.post(
        "https://iam.cloud.ibm.com/identity/token",
        data={
            "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
            "apikey": api_key,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=15,
    )
    response.raise_for_status()
    return response.json()["access_token"]


# ──────────────────────────────────────────────────────────────────────
# TODO for Member 3 & 4:
#
# Watson Assistant:
#   1. Create a Watson Assistant instance on IBM Cloud (free lite tier).
#   2. Set WATSON_ASSISTANT_API_KEY, WATSON_ASSISTANT_URL,
#      and WATSON_ASSISTANT_ID in .env.
#   3. Train intents in Watson for:
#      - Style guidance (e.g. "what suits me?")
#      - Fabric recommendations
#      - Measurement help
#      - App navigation ("how do I upload an image?")
#
# watsonx.ai:
#   1. Create a watsonx.ai project on IBM Cloud.
#   2. Set WATSONX_API_KEY and WATSONX_PROJECT_ID in .env.
#   3. Test the /recommend endpoint via http://localhost:8000/docs
#
# If you want to use a different watsonx model, change model_id in
# _recommend_via_watsonx() — see IBM docs for available model IDs.
# ──────────────────────────────────────────────────────────────────────
