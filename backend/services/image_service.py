"""
Image Enhancement Service
--------------------------
Owner: Member 5

Pipeline:
    1. Use rembg to remove background / isolate the dress
    2. [NEW] garment_service.isolate_garment() — privacy-preserving removal
       of face, hands, and non-garment body parts via MediaPipe Pose.
    3. Use OpenCV to sharpen and clean up the result
    4. Save final PNG to output_path

Dependencies: rembg, Pillow, opencv-python-headless, mediapipe
"""

import io
import cv2
import numpy as np
from PIL import Image
from rembg import remove

from services import garment_service


def enhance(image_bytes: bytes, output_path: str) -> None:
    """
    Process raw image bytes through the enhancement pipeline
    and save the result to output_path.

    Args:
        image_bytes: Raw bytes of the uploaded image.
        output_path: Full path where the cleaned PNG will be saved.
    """
    # ── Step 1: Remove background / distractions using rembg ──────────
    # rembg uses a pre-trained U2-Net model to isolate the foreground.
    cleaned_bytes = remove(image_bytes)

    # ── Step 2: Load result into PIL → numpy for OpenCV processing ─────
    pil_image = Image.open(io.BytesIO(cleaned_bytes)).convert("RGBA")
    np_image = np.array(pil_image)

    # ── Step 2b: Garment isolation — remove face/hands/legs (privacy) ──
    # isolate_garment() returns the original array unchanged on any error,
    # so this step never causes the pipeline to fail.
    np_image = garment_service.isolate_garment(np_image)

    # ── Step 3: Sharpen the RGB channels ──────────────────────────────
    rgb = cv2.cvtColor(np_image[:, :, :3], cv2.COLOR_RGB2BGR)

    # Unsharp mask: sharpen by subtracting blurred version
    blurred = cv2.GaussianBlur(rgb, (0, 0), sigmaX=3)
    sharpened = cv2.addWeighted(rgb, 1.5, blurred, -0.5, 0)

    # ── Step 4: Recombine with alpha channel and save ──────────────────
    sharpened_rgb = cv2.cvtColor(sharpened, cv2.COLOR_BGR2RGB)
    result = np.dstack([sharpened_rgb, np_image[:, :, 3]])  # reattach alpha
    result_pil = Image.fromarray(result, "RGBA")
    result_pil.save(output_path, format="PNG")


# ──────────────────────────────────────────────────────────────────────
# TODO for Member 5:
#
# The basic rembg pipeline above works well for solid-background images.
# If test results show hair/jewellery still bleeding through, consider:
#
#   1. Replacing rembg model:
#      remove(image_bytes, model_name="u2netp")   ← lighter model
#      remove(image_bytes, model_name="isnet-general-use")  ← better accuracy
#
#   2. Adding a hair-specific inpainting step with OpenCV or a 
#      HuggingFace segmentation model for finer control.
#
#   3. Using SAM (Segment Anything Model) via HuggingFace for 
#      pixel-accurate dress isolation.
# ──────────────────────────────────────────────────────────────────────
