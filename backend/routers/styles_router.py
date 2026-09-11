"""
Dress Styles Router
--------------------
Serves the dress styles reference data from data/styles.json.
No owner-specific — shared utility endpoint.
"""

import json
import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

router = APIRouter()

# Path to shared data file (relative to backend/)
STYLES_PATH = os.path.join(os.path.dirname(__file__), "../../data/styles.json")


@router.get("/styles")
def get_styles():
    """Return all dress styles with fabric and occasion info."""
    try:
        with open(STYLES_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        return JSONResponse(content=data)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="styles.json not found.")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="styles.json is malformed.")
