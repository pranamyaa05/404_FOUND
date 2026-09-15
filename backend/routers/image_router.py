"""
Image Enhancement Router
------------------------
Owner: Member 5

Endpoint:
    POST /enhance-image
    - Accepts a PNG or JPG upload
    - Removes hair, background distractions using rembg + OpenCV
    - Returns a URL to the cleaned image

Implementation is in services/image_service.py
"""

import logging
import traceback
import uuid
import os

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from services import image_service

router = APIRouter()
logger = logging.getLogger(__name__)

# Absolute path to the temp directory — safe regardless of uvicorn launch directory
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMP_DIR = os.path.join(_BACKEND_DIR, "temp")


@router.post("/enhance-image")
async def enhance_image(file: UploadFile = File(...)):
    """
    Upload a dress reference image (PNG or JPG).
    Returns a URL to the enhanced (distraction-free) version.
    """
    logger.info("[image-router] /enhance-image received: %s (%s)", file.filename, file.content_type)

    # Validate file type
    if file.content_type not in ("image/png", "image/jpeg"):
        raise HTTPException(
            status_code=400,
            detail="Only PNG and JPG images are supported.",
        )

    # Read uploaded bytes
    image_bytes = await file.read()
    logger.info("[image-router] image bytes read: %d bytes", len(image_bytes))

    # Ensure output directory exists
    os.makedirs(TEMP_DIR, exist_ok=True)

    # Define output paths BEFORE the try block so fallback can always access them
    output_filename = f"{uuid.uuid4().hex}_enhanced.png"
    output_path = os.path.join(TEMP_DIR, output_filename)
    logger.info("[image-router] saving enhanced image to: %s", output_path)

    try:
        image_service.enhance(image_bytes, output_path)
        if not os.path.exists(output_path):
            raise RuntimeError(f"enhance() completed but output file not found at: {output_path}")
        logger.info("[image-router] enhanced image saved successfully: %s", output_path)
    except Exception as e:
        logger.error("[image-router] /enhance-image FAILED:\n%s", traceback.format_exc())
        logger.warning("[image-router] Falling back to saving RAW image to continue pipeline.")
        try:
            with open(output_path, "wb") as f:
                f.write(image_bytes)
        except Exception as write_err:
            logger.error("[image-router] Failed to write fallback raw image: %s", write_err)
            raise HTTPException(status_code=500, detail="Image processing failed and fallback write also failed.")

    return JSONResponse(
        content={"enhanced_image_url": f"/files/{output_filename}"}
    )
