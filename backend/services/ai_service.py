"""
AI & Chatbot Service — BOB
===========================
Owner: Member 3 & 4

Handles:
    chat()           → Google Gemini (primary) + Watson / watsonx + rule-based fallback
    recommend()      → Google Gemini style/fabric recommendations with fallback chain
    bob_proactive()  → server-side generation of contextual nudge messages

Architecture:
    Every call first builds a knowledge context string from fashion_knowledge.py
    and injects it into the prompt. This ensures BOB answers from facts.

    Priority chain for chat:
        1. Google Gemini (primary, fast, free tier via Google AI Studio)
        2. Watson Assistant (if configured)
        3. watsonx.ai direct LLM call (if configured)
        4. Rule-based knowledge lookup (always works, zero API keys needed)

    Priority chain for recommend:
        1. Google Gemini (JSON mode structured output)
        2. watsonx.ai
        3. HuggingFace Mistral
        4. Rule-based recommendations from knowledge base
"""

import json
import os
import re
import uuid
import requests

try:
    import google.generativeai as genai
    HAS_GEMINI = True
except ImportError:
    genai = None
    HAS_GEMINI = False

try:
    from ibm_watson import AssistantV2
    from ibm_cloud_sdk_core.authenticators import IAMAuthenticator
    HAS_WATSON = True
except ImportError:
    AssistantV2 = None
    IAMAuthenticator = None
    HAS_WATSON = False

from config import settings
from knowledge.fashion_knowledge import (
    BOB_PERSONA,
    STYLES,
    FABRICS,
    SKIN_TONE_GUIDE,
    HEIGHT_GUIDE,
    OCCASION_GUIDE,
    MEASUREMENT_GUIDE,
    TAILOR_GUIDE,
    build_knowledge_context,
    get_height_category,
)


# ─────────────────────────────────────────────────────────────────────
# Emoji stripper — enforces plain-text-only responses
# ─────────────────────────────────────────────────────────────────────

_EMOJI_PATTERN = re.compile(
    "["
    "\U0001F600-\U0001F64F"  # emoticons
    "\U0001F300-\U0001F5FF"  # symbols & pictographs
    "\U0001F680-\U0001F6FF"  # transport & map symbols
    "\U0001F1E0-\U0001F1FF"  # flags
    "\U00002702-\U000027B0"  # dingbats
    "\U000024C2-\U0001F251"  # enclosed characters
    "\U0001F900-\U0001F9FF"  # supplemental symbols
    "\U0001FA00-\U0001FA6F"  # chess symbols
    "\U0001FA70-\U0001FAFF"  # symbols extended-A
    "\U00002600-\U000026FF"  # misc symbols
    "\U0000FE00-\U0000FE0F"  # variation selectors
    "\U0000200D"             # zero width joiner
    "\U00002B50-\U00002B55"  # stars
    "\U000023E9-\U000023F3"  # misc
    "\U0000203C-\U00003299"  # misc symbols
    "]+",
    flags=re.UNICODE,
)


def _strip_emojis(text: str) -> str:
    """Remove all emoji characters from text, clean up leftover whitespace."""
    cleaned = _EMOJI_PATTERN.sub("", text)
    # Clean up double spaces left behind by removed emojis
    cleaned = re.sub(r"  +", " ", cleaned)
    return cleaned.strip()


# ─────────────────────────────────────────────────────────────────────
# User context dataclass (mirrors frontend BobUserContext)
# ─────────────────────────────────────────────────────────────────────

class UserContext:
    """
    Typed wrapper around the dict sent from the frontend.
    All fields are optional — BOB uses whatever is available.
    """
    def __init__(self, data: dict):
        self.skin_tone_label: str | None  = data.get("skin_tone_label")
        self.skin_tone_display: str | None = data.get("skin_tone_display")
        self.height_cm: float | None      = data.get("height_cm")
        self.chest_cm: float | None       = data.get("chest_cm")
        self.waist_cm: float | None       = data.get("waist_cm")
        self.hip_cm: float | None         = data.get("hip_cm")
        self.selected_style: str | None   = data.get("selected_style")
        self.occasion: str | None         = data.get("occasion")
        self.current_step: int            = data.get("current_step", 0)

    def summary(self) -> str:
        """Human-readable summary injected into every prompt."""
        parts = []
        if self.skin_tone_display:
            parts.append(f"Skin tone: {self.skin_tone_display}")
        if self.height_cm:
            parts.append(f"Height: {self.height_cm} cm")
        if self.chest_cm:
            parts.append(f"Chest: {self.chest_cm} cm")
        if self.waist_cm:
            parts.append(f"Waist: {self.waist_cm} cm")
        if self.hip_cm:
            parts.append(f"Hip: {self.hip_cm} cm")
        if self.selected_style:
            parts.append(f"Selected style: {self.selected_style.replace('_', ' ').title()}")
        if self.occasion:
            parts.append(f"Occasion: {self.occasion}")
        step_names = ["Style selection", "Image upload", "Measurements", "3D preview", "Pattern download"]
        step_label = step_names[self.current_step] if self.current_step < len(step_names) else "Unknown"
        parts.append(f"Current app step: {step_label}")
        return "\n".join(f"  - {p}" for p in parts) if parts else "  - No profile data yet"


# ─────────────────────────────────────────────────────────────────────
# Google Gemini client & session cache
# ─────────────────────────────────────────────────────────────────────

_gemini_configured: bool = False
_gemini_chat_sessions: dict[str, dict] = {}


def _configure_gemini() -> None:
    global _gemini_configured
    api_key = settings.effective_gemini_api_key or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY (or GOOGLE_API_KEY) not set.")
    genai.configure(api_key=api_key)
    _gemini_configured = True


GEMINI_CANDIDATE_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",
    "gemini-3.6-flash",
    "gemini-3.8-flash",
]


def _chat_via_gemini(
    message: str,
    ctx: UserContext,
    session_id: str | None,
) -> dict:
    _configure_gemini()

    actual_session_id = session_id or str(uuid.uuid4())[:8]
    session_data = _gemini_chat_sessions.get(actual_session_id)

    if session_data is None:
        knowledge_ctx = build_knowledge_context(
            skin_tone_label=ctx.skin_tone_label,
            height_cm=ctx.height_cm,
            style=ctx.selected_style,
            occasion=ctx.occasion,
        )

        system_instruction = f"""{BOB_PERSONA}

--- USER PROFILE ---
{ctx.summary()}

--- FASHION KNOWLEDGE ---
{knowledge_ctx}"""

        models_to_try = [settings.GEMINI_MODEL] if settings.GEMINI_MODEL else []
        for m in GEMINI_CANDIDATE_MODELS:
            if m not in models_to_try:
                models_to_try.append(m)

        chat_session = None
        chosen_model = None
        for m_name in models_to_try:
            try:
                candidate = genai.GenerativeModel(
                    model_name=m_name,
                    system_instruction=system_instruction,
                    generation_config=genai.GenerationConfig(
                        temperature=0.7,
                        max_output_tokens=800,
                    ),
                )
                chat_session = candidate.start_chat(history=[])
                chosen_model = candidate
                break
            except Exception as e:
                err_str = str(e).lower()
                if "404" in err_str or "not found" in err_str or "no longer available" in err_str:
                    continue
                raise e

        if chat_session is None:
            raise RuntimeError("Could not initialize any Gemini model.")

        session_data = {
            "session": chat_session,
            "last_summary": ctx.summary(),
            "model": chosen_model,
            "system_instruction": system_instruction,
        }
        _gemini_chat_sessions[actual_session_id] = session_data

    chat_session = session_data["session"]

    # If user context updated noticeably, inform the assistant
    current_summary = ctx.summary()
    if current_summary != session_data.get("last_summary") and current_summary != "  - No profile data yet":
        send_text = f"[Current context updated:\n{current_summary}]\n\n{message}"
        session_data["last_summary"] = current_summary
    else:
        send_text = message

    try:
        resp = chat_session.send_message(send_text)
        reply = resp.text.strip()
    except Exception:
        # If active session encountered an issue, retry once with a fresh chat
        model = session_data["model"]
        chat_session = model.start_chat(history=[])
        session_data["session"] = chat_session
        resp = chat_session.send_message(send_text)
        reply = resp.text.strip()

    # Clean up any prompt artifacts
    reply = re.sub(r"^BOB:\s*", "", reply).strip()
    # Strip any emoji characters — BOB should respond in plain text only
    reply = _strip_emojis(reply)
    if not reply:
        reply = "I'm thinking... give me a sec! Try rephrasing your question."

    return {"reply": reply, "session_id": actual_session_id, "recommendations": None}


# ─────────────────────────────────────────────────────────────────────
# Watson Assistant client (lazy-initialised, reused across requests)
# ─────────────────────────────────────────────────────────────────────

_assistant_client: AssistantV2 | None = None


def _get_assistant() -> AssistantV2:
    global _assistant_client
    if not HAS_WATSON:
        raise RuntimeError("ibm_watson is not installed.")
    if _assistant_client is None:
        if not settings.WATSON_ASSISTANT_API_KEY:
            raise RuntimeError("WATSON_ASSISTANT_API_KEY not set.")
        auth = IAMAuthenticator(settings.WATSON_ASSISTANT_API_KEY)
        _assistant_client = AssistantV2(version="2023-06-15", authenticator=auth)
        _assistant_client.set_service_url(settings.WATSON_ASSISTANT_URL)
    return _assistant_client


# ─────────────────────────────────────────────────────────────────────
# IAM token cache (watsonx.ai reuses tokens until near expiry)
# ─────────────────────────────────────────────────────────────────────

_iam_token_cache: dict = {"token": None, "expires_at": 0}


def _get_iam_token(api_key: str) -> str:
    import time
    now = time.time()
    if _iam_token_cache["token"] and now < _iam_token_cache["expires_at"] - 60:
        return _iam_token_cache["token"]

    resp = requests.post(
        "https://iam.cloud.ibm.com/identity/token",
        data={
            "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
            "apikey": api_key,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    _iam_token_cache["token"] = data["access_token"]
    _iam_token_cache["expires_at"] = now + data.get("expires_in", 3600)
    return _iam_token_cache["token"]


# ─────────────────────────────────────────────────────────────────────
# Chat — main entry point
# ─────────────────────────────────────────────────────────────────────

def chat(
    message: str,
    session_id: str | None = None,
    user_context: dict | None = None,
) -> dict:
    """
    Process a user message and return BOB's reply.

    Returns:
        {
            "reply": str,
            "session_id": str,
            "recommendations": list | None   ← populated if BOB decides to recommend
        }
    """
    ctx = UserContext(user_context or {})

    # Detect if user is asking for a recommendation — trigger the engine
    if _is_recommendation_request(message) and (ctx.skin_tone_label or ctx.height_cm):
        occasion = ctx.occasion or _infer_occasion(message)
        rec_result = recommend(
            skin_tone=ctx.skin_tone_label or "wheatish",
            height_cm=ctx.height_cm or 162.0,
            occasion=occasion or "casual",
            user_context=user_context,
        )
        intro = _build_recommendation_intro(ctx, occasion or "casual")
        return {
            "reply": intro,
            "session_id": session_id or "local",
            "recommendations": rec_result["recommendations"],
        }

    # 1. Try Google Gemini first (free, fast, intelligent)
    if HAS_GEMINI and settings.effective_gemini_api_key:
        try:
            return _chat_via_gemini(message, ctx, session_id)
        except Exception as e:
            print(f"[BOB] Gemini error: {e}. Falling back to Watson/watsonx.")

    # 2. Try Watson Assistant second (if configured)
    if HAS_WATSON and settings.WATSON_ASSISTANT_API_KEY and settings.WATSON_ASSISTANT_ID:
        try:
            return _chat_via_watson(message, session_id, ctx)
        except Exception as e:
            print(f"[BOB] Watson error: {e}. Falling back to watsonx.ai.")

    # 3. Try watsonx.ai as conversational LLM (if configured)
    if settings.WATSONX_API_KEY and settings.WATSONX_PROJECT_ID:
        try:
            return _chat_via_watsonx(message, ctx, session_id)
        except Exception as e:
            print(f"[BOB] watsonx.ai error: {e}. Falling back to rule-based.")

    # 4. Rule-based fallback — always works
    return _chat_rule_based(message, ctx, session_id)


# ─────────────────────────────────────────────────────────────────────
# Chat via Watson Assistant
# ─────────────────────────────────────────────────────────────────────

def _chat_via_watson(
    message: str,
    session_id: str | None,
    ctx: UserContext,
) -> dict:
    assistant = _get_assistant()

    if not session_id:
        sess = assistant.create_session(
            assistant_id=settings.WATSON_ASSISTANT_ID
        ).get_result()
        session_id = sess["session_id"]

    # Inject context variables into Watson so dialog nodes can use them
    context_vars = {}
    if ctx.skin_tone_label:
        context_vars["skin_tone"] = ctx.skin_tone_label
    if ctx.height_cm:
        context_vars["height_cm"] = ctx.height_cm
    if ctx.selected_style:
        context_vars["selected_style"] = ctx.selected_style
    if ctx.occasion:
        context_vars["occasion"] = ctx.occasion
    context_vars["current_step"] = ctx.current_step

    payload = {
        "message_type": "text",
        "text": message,
    }
    if context_vars:
        payload["options"] = {"return_context": True}  # type: ignore

    response = assistant.message(
        assistant_id=settings.WATSON_ASSISTANT_ID,
        session_id=session_id,
        input=payload,
        context={"skills": {"main skill": {"user_defined": context_vars}}} if context_vars else None,
    ).get_result()

    output = response.get("output", {})
    generic = output.get("generic", [])
    reply_text = (
        generic[0].get("text", "Hmm, I didn't catch that. Could you rephrase?")
        if generic else "Hmm, I didn't catch that. Could you rephrase?"
    )

    return {"reply": reply_text, "session_id": session_id, "recommendations": None}


# ─────────────────────────────────────────────────────────────────────
# Chat via watsonx.ai (IBM Granite)
# ─────────────────────────────────────────────────────────────────────

def _chat_via_watsonx(
    message: str,
    ctx: UserContext,
    session_id: str | None,
) -> dict:
    knowledge_ctx = build_knowledge_context(
        skin_tone_label=ctx.skin_tone_label,
        height_cm=ctx.height_cm,
        style=ctx.selected_style,
        occasion=ctx.occasion,
    )

    prompt = f"""{BOB_PERSONA}

--- USER PROFILE ---
{ctx.summary()}

--- KNOWLEDGE CONTEXT ---
{knowledge_ctx}

--- CONVERSATION ---
User: {message}
BOB:"""

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
            "max_new_tokens": 250,
            "stop_sequences": ["User:", "\n\n"],
            "repetition_penalty": 1.1,
        },
        "project_id": settings.WATSONX_PROJECT_ID,
    }

    resp = requests.post(url, headers=headers, json=payload, timeout=30)
    resp.raise_for_status()

    reply = resp.json()["results"][0]["generated_text"].strip()

    # Clean up any leaked prompt artifacts
    reply = re.sub(r"^BOB:\s*", "", reply).strip()
    if not reply:
        reply = "I'm thinking... give me a sec! Try rephrasing your question."

    return {"reply": reply, "session_id": session_id or "watsonx", "recommendations": None}


# ─────────────────────────────────────────────────────────────────────
# Rule-based chat fallback — no API keys needed
# ─────────────────────────────────────────────────────────────────────

# Maps keyword groups to knowledge responses
_RULE_MAP: list[tuple[list[str], callable]] = []  # populated below

def _chat_rule_based(message: str, ctx: UserContext, session_id: str | None) -> dict:
    msg = message.lower().strip()

    # Measurement questions
    for key, data in MEASUREMENT_GUIDE.items():
        if key in msg or key.replace("_", " ") in msg:
            reply = (
                f"**How to measure {key.replace('_', ' ')}:**\n"
                f"{data['how_to']}\n\n"
                f"Tip: {data['tip']}"
            )
            return {"reply": reply, "session_id": session_id or "rule", "recommendations": None}

    # Fabric questions
    for fabric, data in FABRICS.items():
        if fabric.lower() in msg:
            reply = (
                f"**{fabric}** -- {data['properties']}\n\n"
                f"Best for: {', '.join(data['best_for'][:3])}\n"
                f"Avoid for: {', '.join(data['avoid_for'][:2])}\n"
                f"Care: {data['care']}"
            )
            return {"reply": reply, "session_id": session_id or "rule", "recommendations": None}

    # Style questions
    for style_id, data in STYLES.items():
        if style_id in msg or data["full_name"].lower() in msg:
            reply = (
                f"**{data['full_name']}** — from {data['origin']}\n\n"
                f"{data['description']}\n\n"
                f"Best fabrics: {', '.join(data['best_fabrics'][:4])}\n"
                f"Occasions: {', '.join(data['occasions'])}\n"
                f"Complexity: {data['stitching_complexity']}"
            )
            return {"reply": reply, "session_id": session_id or "rule", "recommendations": None}

    # Tailor / die-line questions
    if any(w in msg for w in ["die line", "die-line", "pattern", "seam", "panel", "tailor", "print"]):
        sa = TAILOR_GUIDE["seam_allowance"]
        reply = (
            f"The die-line patterns include a **{sa['standard']} seam allowance** on all edges.\n\n"
            f"{sa['explanation']}\n\n"
            f"**Print instructions:** {TAILOR_GUIDE['print_instructions']}\n\n"
            f"**Grainline:** {TAILOR_GUIDE['grainline']}"
        )
        return {"reply": reply, "session_id": session_id or "rule", "recommendations": None}

    # Navigation / app help
    step_help = {
        0: "You're on **Style Selection** — pick the type of dress you want to stitch.",
        1: "You're on **Image Upload** — upload a reference photo of your dress design. Clear photos on plain backgrounds work best.",
        2: "You're on **Measurements** — enter your body measurements in cm. Set your skin tone on the slider above — I use it to personalise suggestions!",
        3: "You're on **3D Preview** — rotate the model to inspect the fit from all angles.",
        4: "You're on **Pattern Download** — your tailor-ready die-lines are ready. Print at 1:1 scale.",
    }
    if any(w in msg for w in ["how", "what", "step", "where", "help", "guide", "navigate", "work"]):
        step_reply = step_help.get(ctx.current_step, "I'm here to help! Ask me about styles, fabrics, measurements, or anything about this app.")
        return {"reply": step_reply, "session_id": session_id or "rule", "recommendations": None}

    # Skin tone colour suggestions
    if any(w in msg for w in ["colour", "color", "shade", "wear", "palette"]) and ctx.skin_tone_label:
        tone = SKIN_TONE_GUIDE.get(ctx.skin_tone_label)
        if tone:
            reply = (
                f"For your **{tone['display']}** skin tone, I'd go with:\n\n"
                f"**Best colours:** {', '.join(tone['best_colors'][:3])}\n"
                f"**Avoid:** {', '.join(tone['avoid_colors'][:2])}\n"
                f"**Fabric tip:** {tone['fabric_notes']}"
            )
            return {"reply": reply, "session_id": session_id or "rule", "recommendations": None}

    # Generic fallback
    fallback_replies = [
        "That's a great question! I specialise in Indian fashion -- styles, fabrics, measurements, and tailoring. Ask me anything in those areas.",
        "I'm BOB, your fashion consultant. I know Indian ethnic wear inside out. Try asking me about a specific style like Ghagra, a fabric like Silk, or how to take measurements.",
        "I didn't quite get that. Try asking something like 'What fabric suits a kurta?' or 'How do I measure my chest?' or 'Explain Anarkali'.",
    ]
    import hashlib
    idx = int(hashlib.md5(message.encode()).hexdigest(), 16) % len(fallback_replies)
    return {"reply": fallback_replies[idx], "session_id": session_id or "rule", "recommendations": None}


# ─────────────────────────────────────────────────────────────────────
# Recommendations
# ─────────────────────────────────────────────────────────────────────

_RECOMMEND_PROMPT_TEMPLATE = """{persona}

--- USER PROFILE ---
{user_summary}

--- FASHION KNOWLEDGE ---
{knowledge_context}

--- TASK ---
Based strictly on the knowledge above and the user profile, suggest exactly 3 Indian dress
style and fabric combinations. Each recommendation must include:
  - style: exact style name (e.g. "Kurta", "Ghagra / Lehenga")
  - fabric: exact fabric name from the knowledge base
  - colors: array of 3 specific colour suggestions that suit this skin tone and occasion
  - reason: one personalised sentence explaining why this suits THIS specific user
  - confidence: "high" for the best match, "medium" for the other two

Respond ONLY with a valid JSON array. No explanation, no markdown, just the array:
[
  {{"style": "...", "fabric": "...", "colors": ["...", "...", "..."], "reason": "...", "confidence": "high"}},
  {{"style": "...", "fabric": "...", "colors": ["...", "...", "..."], "reason": "...", "confidence": "medium"}},
  {{"style": "...", "fabric": "...", "colors": ["...", "...", "..."], "reason": "...", "confidence": "medium"}}
]"""


def recommend(
    skin_tone: str,
    height_cm: float,
    occasion: str,
    user_context: dict | None = None,
) -> dict:
    """
    Generate top-3 style + fabric + colour recommendations.
    Priority: Google Gemini → watsonx.ai → HuggingFace → rule-based.
    """
    ctx = UserContext(user_context or {
        "skin_tone_label": skin_tone,
        "height_cm": height_cm,
        "occasion": occasion,
    })

    knowledge_ctx = build_knowledge_context(
        skin_tone_label=skin_tone,
        height_cm=height_cm,
        occasion=occasion,
        style=ctx.selected_style,
    )

    prompt = _RECOMMEND_PROMPT_TEMPLATE.format(
        persona=BOB_PERSONA,
        user_summary=ctx.summary(),
        knowledge_context=knowledge_ctx,
    )

    # 1. Try Google Gemini first (supports native JSON mode)
    if HAS_GEMINI and settings.effective_gemini_api_key:
        try:
            return _recommend_via_gemini(prompt)
        except Exception as e:
            print(f"[BOB] Gemini recommend error: {e}. Trying watsonx.ai.")

    # 2. Try watsonx.ai (legacy)
    if settings.WATSONX_API_KEY and settings.WATSONX_PROJECT_ID:
        try:
            return _recommend_via_watsonx(prompt)
        except Exception as e:
            print(f"[BOB] watsonx recommend error: {e}. Trying HuggingFace.")

    # 3. Try HuggingFace
    if settings.HUGGINGFACE_API_KEY:
        try:
            return _recommend_via_huggingface(prompt)
        except Exception as e:
            print(f"[BOB] HuggingFace recommend error: {e}. Using rule-based.")

    # 4. Rule-based fallback
    return _recommend_rule_based(skin_tone, height_cm, occasion)


def _recommend_via_gemini(prompt: str) -> dict:
    _configure_gemini()

    models_to_try = [settings.GEMINI_MODEL] if settings.GEMINI_MODEL else []
    for m in GEMINI_CANDIDATE_MODELS:
        if m not in models_to_try:
            models_to_try.append(m)

    last_exc = None
    for m_name in models_to_try:
        try:
            model = genai.GenerativeModel(
                model_name=m_name,
                generation_config=genai.GenerationConfig(
                    temperature=0.3,
                    max_output_tokens=700,
                    response_mime_type="application/json",
                ),
            )
            resp = model.generate_content(prompt)
            raw = resp.text.strip()
            return {"recommendations": _parse_recommendations(raw)}
        except Exception as e:
            last_exc = e
            err_str = str(e).lower()
            if "404" in err_str or "not found" in err_str or "no longer available" in err_str or "not supported" in err_str:
                print(f"[BOB] Model '{m_name}' not available. Trying fallback...")
                continue
            raise e

    if last_exc:
        raise last_exc
    raise RuntimeError("No candidate Gemini model succeeded.")




def _recommend_via_watsonx(prompt: str) -> dict:
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
            "max_new_tokens": 600,
            "stop_sequences": ["\n\n\n"],
            "repetition_penalty": 1.05,
        },
        "project_id": settings.WATSONX_PROJECT_ID,
    }
    resp = requests.post(url, headers=headers, json=payload, timeout=45)
    resp.raise_for_status()

    raw = resp.json()["results"][0]["generated_text"]
    return {"recommendations": _parse_recommendations(raw)}


def _recommend_via_huggingface(prompt: str) -> dict:
    api_url = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2"
    headers = {"Authorization": f"Bearer {settings.HUGGINGFACE_API_KEY}"}
    payload = {
        "inputs": prompt,
        "parameters": {"max_new_tokens": 600, "return_full_text": False},
    }
    resp = requests.post(api_url, headers=headers, json=payload, timeout=45)
    resp.raise_for_status()

    raw = resp.json()[0]["generated_text"]
    return {"recommendations": _parse_recommendations(raw)}


def _parse_recommendations(raw: str) -> list:
    """
    Robustly extract a JSON array from raw LLM output.
    Handles partial outputs, extra text before/after the array.
    """
    # Find the JSON array boundaries
    start = raw.find("[")
    end = raw.rfind("]")
    if start == -1 or end == -1 or end <= start:
        raise ValueError(f"No JSON array found in LLM output: {raw[:300]}")

    json_str = raw[start : end + 1]

    try:
        data = json.loads(json_str)
    except json.JSONDecodeError:
        # Try to clean up common LLM artifacts
        json_str = re.sub(r",\s*}", "}", json_str)   # trailing comma in object
        json_str = re.sub(r",\s*]", "]", json_str)   # trailing comma in array
        data = json.loads(json_str)

    # Validate and normalise each recommendation
    cleaned = []
    for item in data[:3]:
        cleaned.append({
            "style":      str(item.get("style", "Kurta")),
            "fabric":     str(item.get("fabric", "Cotton")),
            "colors":     item.get("colors", []) if isinstance(item.get("colors"), list) else [],
            "reason":     str(item.get("reason", "")),
            "confidence": item.get("confidence", "medium") if item.get("confidence") in ("high", "medium") else "medium",
        })

    return cleaned


def _recommend_rule_based(skin_tone: str, height_cm: float, occasion: str) -> dict:
    """
    Deterministic recommendations built directly from the knowledge base.
    Each recommendation has a different style, a different fabric, and a
    personalised reason. Works with zero API keys.
    """
    tone_data   = SKIN_TONE_GUIDE.get(skin_tone, SKIN_TONE_GUIDE["wheatish"])
    height_cat  = get_height_category(height_cm)
    height_data = HEIGHT_GUIDE[height_cat]
    occ_data    = OCCASION_GUIDE.get(occasion, OCCASION_GUIDE["casual"])

    # ── Step 1: build ordered candidate list from OCCASION first ─────
    # Occasion is the primary filter — you don't wear a casual kurta to a wedding.
    occ_styles    = occ_data.get("best_styles", [])          # e.g. ["Ghagra / Lehenga", "Anarkali", ...]
    height_styles = height_data.get("best_styles", [])       # e.g. ["All styles"] or specific ones

    # Expand "All styles" shorthand
    all_style_names = [v["full_name"] for v in STYLES.values()]
    if "All styles" in height_styles:
        height_styles = all_style_names

    # Intersection: must suit the occasion AND the height
    occasion_set = set(occ_styles)
    height_set   = set(height_styles)
    candidates   = [s for s in occ_styles if s in height_set]

    # If intersection is empty, fall back to occasion-only list
    if not candidates:
        candidates = occ_styles[:]

    # ── Step 2: avoid duplicates — pick up to 3 distinct styles ──────
    style_name_to_id = {v["full_name"]: k for k, v in STYLES.items()}
    picked: list[tuple[str, str]] = []  # (style_full_name, style_id)
    seen = set()
    for s in candidates:
        sid = style_name_to_id.get(s)
        if sid and sid not in seen and len(picked) < 3:
            picked.append((s, sid))
            seen.add(sid)

    # Pad to 3 with occasion-appropriate fallbacks (no repeats)
    fallbacks_by_occasion = {
        "wedding":  ["ghagra", "anarkali", "blouse_saree"],
        "festival": ["anarkali", "ghagra", "salwar_kameez"],
        "formal":   ["salwar_kameez", "anarkali", "kurta"],
        "casual":   ["daily_wear", "kurta", "salwar_kameez"],
    }
    for fid in fallbacks_by_occasion.get(occasion, ["kurta", "salwar_kameez", "anarkali"]):
        if len(picked) >= 3:
            break
        if fid not in seen:
            picked.append((STYLES[fid]["full_name"], fid))
            seen.add(fid)

    # ── Step 3: for each style pick a DIFFERENT fabric ────────────────
    occ_fabrics   = occ_data["best_fabrics"]          # ordered by preference
    avoid_fabrics = set(occ_data.get("avoid_fabrics", []))
    used_fabrics: set[str] = set()

    recs = []
    for i, (style_name, style_id) in enumerate(picked[:3]):
        style_data = STYLES[style_id]

        # Best fabric = first one that is in BOTH occasion list AND style list,
        # not in avoid list, and not already used in this recommendation set.
        style_fabric_set = set(style_data["best_fabrics"])
        fabric = None
        for f in occ_fabrics:
            if f in style_fabric_set and f not in avoid_fabrics and f not in used_fabrics:
                fabric = f
                break
        # Fallback: first style fabric not yet used
        if not fabric:
            for f in style_data["best_fabrics"]:
                if f not in used_fabrics:
                    fabric = f
                    break
        if not fabric:
            fabric = style_data["best_fabrics"][0]
        used_fabrics.add(fabric)

        # ── Step 4: colour suggestions — rotate across the tone's palette ──
        raw_colors = tone_data["best_colors"]
        # Clean "(parenthetical note)" from colour names
        clean_colors = [c.split("(")[0].strip() for c in raw_colors]
        # Rotate so each card shows a different colour as the lead
        start = (i * 2) % len(clean_colors)
        rotated = clean_colors[start:] + clean_colors[:start]
        colors = rotated[:3]

        # ── Step 5: personalised reason per card ─────────────────────────
        fabric_feel  = FABRICS.get(fabric, {}).get("feel", "beautiful drape").rstrip(".")
        occ_vibe     = occ_data["vibe"]
        height_notes = height_data["silhouette_advice"]
        height_tip   = height_notes[i % len(height_notes)] if height_notes else ""

        reason_templates = [
            f"{style_data['full_name']} in {fabric} is the right call for {occasion} — "
            f"{fabric_feel.lower()} is exactly the energy you want. "
            f"{colors[0]} will look great against {tone_data['display'].lower()} skin.",

            f"{fabric} {style_data['full_name']} for {occasion} makes sense — "
            f"{style_data['full_name']} suits a {height_cat} frame well "
            f"and {fabric_feel.lower()} keeps the look polished without overdoing it.",

            f"Go with {fabric} for this — {fabric_feel.lower()} reads well at a {occasion}. "
            f"{colors[0]} on {tone_data['display'].lower()} skin in a {style_data['full_name']} silhouette is a solid combination.",
        ]
        reason = reason_templates[i % len(reason_templates)]

        recs.append({
            "style":      style_data["full_name"],
            "fabric":     fabric,
            "colors":     colors,
            "reason":     reason,
            "confidence": "high" if i == 0 else "medium",
        })

    return {"recommendations": recs}


# ─────────────────────────────────────────────────────────────────────
# Proactive messages (server-side, for bob_proactive endpoint)
# ─────────────────────────────────────────────────────────────────────

def bob_proactive(trigger: str, user_context: dict | None = None) -> dict:
    """
    Generate a context-aware proactive nudge from BOB.
    The frontend fires specific triggers at key moments.

    Trigger values:
        "landing"        → user lands on the home page
        "style_picked"   → user selected a dress style
        "image_enhanced" → image was cleaned successfully
        "measurements_done" → measurements submitted
        "mesh_ready"     → 3D model is ready
        "idle_30s"       → user has been idle for 30 seconds on a step
    """
    ctx = UserContext(user_context or {})

    TRIGGER_MESSAGES = {
        "landing": (
            "Hey! I'm BOB 🎨 I know Indian fashion inside out — "
            "styles, fabrics, cuts, the works. Want me to suggest what suits you?"
        ),
        "style_picked": (
            f"Great choice! {_style_compliment(ctx.selected_style)} "
            "Let's upload a reference image next."
        ),
        "image_enhanced": (
            "Image looks clean! ✨ Now let's get your measurements so I can "
            "generate a perfectly fitted 3D preview."
        ),
        "measurements_done": (
            f"Perfect — I've got your measurements. {_height_note(ctx.height_cm)} "
            "Generating your 3D model now!"
        ),
        "mesh_ready": (
            "Your 3D preview is ready! 🎉 Rotate it, check the fit. "
            "Want me to suggest a fabric for this style based on your skin tone?"
        ),
        "idle_30s": (
            "Still here! 😄 Need help with this step? Just ask me anything."
        ),
    }

    reply = TRIGGER_MESSAGES.get(
        trigger,
        "I'm BOB — ask me anything about styles, fabrics, or this app! 🧵"
    )
    return {"reply": reply}


# ─────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────

def _is_recommendation_request(message: str) -> bool:
    """Detect if the user is asking BOB for a style recommendation."""
    keywords = [
        "suggest", "recommend", "what should i wear", "what suits",
        "what looks good", "which style", "which fabric", "what fabric",
        "style for me", "dress for me", "pick for me", "help me choose",
    ]
    msg = message.lower()
    return any(kw in msg for kw in keywords)


def _infer_occasion(message: str) -> str | None:
    """Try to extract occasion from the message text."""
    msg = message.lower()
    if any(w in msg for w in ["wedding", "bridal", "reception", "shaadi"]):
        return "wedding"
    if any(w in msg for w in ["festival", "diwali", "navratri", "eid", "pongal", "holi"]):
        return "festival"
    if any(w in msg for w in ["office", "work", "formal", "professional"]):
        return "formal"
    if any(w in msg for w in ["casual", "daily", "everyday", "home"]):
        return "casual"
    return None


def _build_recommendation_intro(ctx: UserContext, occasion: str) -> str:
    parts = []
    if ctx.skin_tone_display:
        parts.append(f"your **{ctx.skin_tone_display}** skin tone")
    if ctx.height_cm:
        parts.append(f"**{ctx.height_cm} cm** height")
    parts.append(f"a **{occasion}** occasion")

    intro_parts = " + ".join(parts)
    return f"Based on {intro_parts}, here are my top picks for you 🎨"


def _style_compliment(style: str | None) -> str:
    compliments = {
        "kurta": "Kurtas are incredibly versatile — great call.",
        "ghagra": "Ghagra is bold and beautiful — you're going all out! 🔥",
        "blouse_saree": "A well-fitted blouse makes the whole saree — solid choice.",
        "anarkali": "Anarkali is timeless. You're going to look stunning.",
        "salwar_kameez": "Salwar Kameez is a classic — never goes wrong.",
        "daily_wear": "Comfort is always in style. Good thinking.",
    }
    return compliments.get(style or "", "Excellent taste!")


def _height_note(height_cm: float | None) -> str:
    if not height_cm:
        return ""
    cat = get_height_category(height_cm)
    if cat == "petite":
        return "I'll keep your petite silhouette in mind for the recommendations."
    if cat == "tall":
        return "Your height is perfect for dramatic floor-length styles."
    return ""
