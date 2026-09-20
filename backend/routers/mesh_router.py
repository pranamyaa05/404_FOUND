"""
3D Mesh & Die-line Router
--------------------------
Owner: Member 1 & 2

Endpoint:
    POST /generate-mesh
    - Accepts measurements (dict), dress style (str), and optional enhanced image URL
    - Calls the Blender headless pipeline via services/mesh_service.py
    - Returns:
        gltf_url     → URL of the generated GLTF 3D model
        die_line_url → URL of the generated SVG die-line pattern

Implementation is in services/mesh_service.py and blender-scripts/
"""

import logging
import traceback

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from services import mesh_service, smpl_service
from typing import Optional
import uuid
import os

router = APIRouter()
logger = logging.getLogger(__name__)


class AvatarRequest(BaseModel):
    measurements: dict[str, float]
    """
    Expected keys: height, chest, waist, hips (in cm)
    """


class MeshRequest(BaseModel):
    measurements: Optional[dict[str, float]] = None
    """
    Expected keys:
        height, chest, waist, hip, shoulder, sleeveLength
    All values in centimetres.
    Add more fields here as needed and update MeasurementForm.tsx to match.
    """
    style: str
    """
    One of: kurta | blouse_saree | ghagra | daily_wear
    Must match an id in data/styles.json
    """
    enhanced_image_url: Optional[str] = None
    """
    Optional — URL of the cleaned dress image (from /enhance-image).
    Used to texture the 3D mesh.
    """


@router.post("/generate-avatar")
def generate_avatar(body: AvatarRequest):
    """
    Generate a 3D GLB human body avatar fitting the target measurements
    using the SMPL parametric body model.
    """
    logger.info("[mesh-router] /generate-avatar request: %s", body.measurements)
    try:
        run_id = uuid.uuid4().hex
        output_filename = f"avatar_{run_id}.glb"
        output_path = os.path.join(mesh_service.TEMP_DIR, output_filename)

        smpl_service.generate_avatar_mesh(
            measurements=body.measurements,
            output_glb_path=output_path
        )
        return JSONResponse(content={"avatar_url": f"/files/{output_filename}"})
    except Exception as e:
        logger.error("[mesh-router] /generate-avatar FAILED:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Avatar generation failed: {str(e)}")


class ClothSimRequest(BaseModel):
    garment_glb_url: str   # e.g. "/files/abc123.glb"
    avatar_glb_url: Optional[str] = None   # e.g. "/files/avatar_xyz.glb"


@router.post("/simulate-cloth")
def simulate_cloth(body: ClothSimRequest):
    """
    Run Blender cloth physics to drape the garment GLB over the avatar GLB.
    Returns a new draped GLB URL.
    """
    import subprocess, shutil, glob as _glob

    logger.info("[mesh-router] /simulate-cloth garment=%s avatar=%s",
                body.garment_glb_url, body.avatar_glb_url)

    temp_dir = mesh_service.TEMP_DIR
    os.makedirs(temp_dir, exist_ok=True)

    def url_to_path(url: str) -> str:
        filename = url.split("/")[-1]
        return os.path.join(temp_dir, filename)

    garment_path = url_to_path(body.garment_glb_url)
    if not os.path.exists(garment_path):
        raise HTTPException(status_code=404, detail=f"Garment GLB not found: {garment_path}")

    avatar_path = url_to_path(body.avatar_glb_url) if body.avatar_glb_url else ""
    if avatar_path and not os.path.exists(avatar_path):
        logger.warning("[mesh-router] Avatar GLB not found (%s); proceeding without collision", avatar_path)
        avatar_path = ""

    # Locate Blender executable
    blender_exe = shutil.which("blender")
    if not blender_exe:
        for candidate in [
            r"D:\Blender Foundation\Blender 4.5\blender.exe",
            r"C:\Program Files\Blender Foundation\Blender 4.5\blender.exe",
            r"C:\Program Files\Blender Foundation\Blender 4.4\blender.exe",
            r"C:\Program Files\Blender Foundation\Blender 4.3\blender.exe",
        ]:
            if os.path.exists(candidate):
                blender_exe = candidate
                break

    if not blender_exe:
        raise HTTPException(status_code=500, detail="Blender not found on this system")

    run_id = uuid.uuid4().hex
    output_filename = f"draped_{run_id}.glb"
    output_path = os.path.join(temp_dir, output_filename)

    cloth_script = os.path.join(
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "blender-scripts")),
        "cloth_sim.py"
    )
    if not os.path.exists(cloth_script):
        raise HTTPException(status_code=500, detail=f"cloth_sim.py not found at {cloth_script}")

    env = os.environ.copy()
    env["CLOTH_GARMENT_GLB"] = garment_path
    env["CLOTH_AVATAR_GLB"]  = avatar_path
    env["CLOTH_OUTPUT_GLB"]  = output_path

    try:
        cmd = [blender_exe, "--background", "--python", cloth_script]
        logger.info("[mesh-router] Running: %s", " ".join(cmd))
        result = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=300)
        if os.path.exists(output_path):
            logger.info("[mesh-router] Cloth sim complete: %s", output_path)
        else:
            logger.error("[mesh-router] Cloth sim produced no output (exit %d).\nSTDOUT: %s\nSTDERR: %s",
                         result.returncode, result.stdout[-3000:], result.stderr[-3000:])
            raise RuntimeError("Blender cloth sim produced no output GLB")
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Cloth simulation timed out (>300s)")
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error("[mesh-router] /simulate-cloth FAILED:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Cloth simulation failed: {str(e)}")

    return JSONResponse(content={"draped_glb_url": f"/files/{output_filename}"})


@router.post("/generate-mesh")
def generate_mesh(body: MeshRequest):
    """
    Generate a 3D GLTF mesh and a 2D SVG die-line pattern
    using a headless Blender pipeline.
    """
    logger.info(
        "[mesh-router] /generate-mesh request: style=%s image_url=%s measurements_keys=%s",
        body.style,
        body.enhanced_image_url,
        list(body.measurements.keys()) if body.measurements else [],
    )
    try:
        result = mesh_service.generate(
            measurements=body.measurements,
            style=body.style,
            image_url=body.enhanced_image_url,
        )
    except Exception as e:
        # Log the full traceback so the real cause is visible in the backend terminal
        logger.error(
            "[mesh-router] /generate-mesh FAILED:\n%s",
            traceback.format_exc(),
        )
        raise HTTPException(status_code=500, detail=f"Mesh generation failed: {str(e)}")

    logger.info("[mesh-router] /generate-mesh success: %s", result)
    return JSONResponse(content=result)

    # Expected response shape:
    # {
    #   "gltf_url": "/files/<uuid>.gltf",
    #   "die_line_url": "/files/<uuid>.svg"
    # }
