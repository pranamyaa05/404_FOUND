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

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from services import image_service
import uuid
import os

router = APIRouter()


@router.post("/enhance-image")
async def enhance_image(file: UploadFile = File(...)):
    """
    Upload a dress reference image (PNG or JPG).
    Returns a URL to the enhanced (distraction-free) version.
    """
    # Validate file type
    if file.content_type not in ("image/png", "image/jpeg"):
        raise HTTPException(
            status_code=400,
            detail="Only PNG and JPG images are supported.",
        )

    # Read uploaded bytes
    image_bytes = await file.read()

    # Run enhancement pipeline
    try:
        output_filename = f"{uuid.uuid4().hex}_enhanced.png"
        output_path = os.path.join("temp", output_filename)
        image_service.enhance(image_bytes, output_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Enhancement failed: {str(e)}")

    return JSONResponse(
        content={"enhanced_image_url": f"/files/{output_filename}"}
    )
