"""
3D Mesh & Die-line Generation Service
---------------------------------------
Owner: Member 1 & 2

This service calls Blender in headless (background) mode,
passing measurements and style as CLI arguments to the Python script.

Blender writes:
    - A GLTF file  → served at /files/<uuid>.gltf
    - An SVG file  → served at /files/<uuid>.svg

Dependencies: Blender installed + BLENDER_PATH set in .env
"""

import subprocess
import uuid
import os
import json
import logging
import traceback
from config import settings

logger = logging.getLogger(__name__)

# Absolute path to the blender scripts folder — never depends on CWD
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLENDER_SCRIPTS_DIR = os.path.abspath(
    os.path.join(_BACKEND_DIR, "..", "blender-scripts")
)
SCRIPT_PATH = os.path.join(BLENDER_SCRIPTS_DIR, "generate_mesh.py")

# Absolute path to the temp directory — safe regardless of CWD
TEMP_DIR = os.path.join(_BACKEND_DIR, "temp")


def generate(
    measurements: dict,
    style: str,
    image_url: str | None = None,
) -> dict:
    """
    Trigger a headless Blender run to generate the 3D mesh and die-lines.

    Args:
        measurements: Dict of body measurements in cm
                      e.g. {"height": 165, "chest": 90, ...}
        style:        Dress style ID e.g. "kurta"
        image_url:    Optional URL of enhanced dress texture image

    Returns:
        {
            "gltf_url":     "/files/<uuid>.gltf",
            "die_line_url": "/files/<uuid>.svg"
        }

    Raises:
        RuntimeError with a descriptive message if Blender is missing,
        the subprocess fails, or output files are not produced.
    """
    # Ensure temp directory exists (absolute path — no CWD dependency)
    os.makedirs(TEMP_DIR, exist_ok=True)

    run_id = uuid.uuid4().hex
    gltf_output = os.path.join(TEMP_DIR, f"{run_id}.gltf")
    svg_output  = os.path.join(TEMP_DIR, f"{run_id}.svg")

    logger.info(
        "[mesh] Starting generation: style=%s run_id=%s blender=%s",
        style, run_id, settings.BLENDER_PATH,
    )
    logger.info("[mesh] GLTF output path: %s", gltf_output)
    logger.info("[mesh] SVG  output path: %s", svg_output)
    logger.info("[mesh] Image URL (texture): %s", image_url)
    logger.info("[mesh] Script path: %s", SCRIPT_PATH)

    # ── Pre-flight checks ─────────────────────────────────────────────
    if not os.path.isfile(SCRIPT_PATH):
        raise RuntimeError(
            f"Blender script not found at: {SCRIPT_PATH}\n"
            "Make sure the blender-scripts/ folder is present next to the backend/."
        )

    # Detect missing Blender before subprocess and give a clear error
    blender_exe = settings.BLENDER_PATH
    # On Windows 'blender' alone won't resolve unless it is on PATH;
    # shutil.which returns None if the executable cannot be found.
    import shutil
    if not os.path.isfile(blender_exe) and shutil.which(blender_exe) is None:
        raise RuntimeError(
            f"Blender executable not found: '{blender_exe}'.\n"
            "Install Blender and set BLENDER_PATH in your .env file.\n"
            "Example (Windows): BLENDER_PATH=C:/Program Files/Blender Foundation/Blender 4.1/blender.exe"
        )

    # Serialize args as JSON string — Blender script reads from CLI
    args_json = json.dumps(
        {
            "measurements": measurements,
            "style": style,
            "image_url": image_url,
            "gltf_output": gltf_output,
            "svg_output": svg_output,
        }
    )

    cmd = [
        blender_exe,
        "--background",          # no GUI
        "--python", SCRIPT_PATH, # our script
        "--",                    # separator: everything after goes to the script
        args_json,
    ]

    logger.info("[mesh] Running: %s", " ".join(cmd[:4]) + " -- <json>")

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,  # 2-minute hard limit per generation
        )
    except FileNotFoundError as exc:
        logger.error("[mesh] Blender executable not found: %s", exc)
        raise RuntimeError(
            f"Blender executable not found: '{blender_exe}'.\n"
            "Install Blender and set BLENDER_PATH in your .env file."
        ) from exc
    except subprocess.TimeoutExpired as exc:
        logger.error("[mesh] Blender subprocess timed out after 120s")
        raise RuntimeError("Blender mesh generation timed out after 120 seconds.") from exc

    if result.stdout:
        logger.info("[mesh] Blender stdout:\n%s", result.stdout[-3000:])
    if result.stderr:
        logger.warning("[mesh] Blender stderr:\n%s", result.stderr[-3000:])

    if result.returncode != 0:
        raise RuntimeError(
            f"Blender exited with code {result.returncode}.\n"
            f"stderr (last 2000 chars): {result.stderr[-2000:]}"
        )

    # Verify output files were actually created
    if not os.path.exists(gltf_output):
        raise RuntimeError(
            f"Blender ran successfully but GLTF file was not created at: {gltf_output}"
        )
    if not os.path.exists(svg_output):
        raise RuntimeError(
            f"Blender ran successfully but SVG die-line file was not created at: {svg_output}"
        )

    logger.info("[mesh] Generation complete. run_id=%s", run_id)

    return {
        "gltf_url": f"/files/{run_id}.gltf",
        "die_line_url": f"/files/{run_id}.svg",
    }


# ──────────────────────────────────────────────────────────────────────
# TODO for Member 1 & 2:
#
# 1. Make sure BLENDER_PATH in .env points to your Blender executable.
#    Windows example: C:/Program Files/Blender Foundation/Blender 4.1/blender.exe
#
# 2. Implement the actual mesh generation in:
#       blender-scripts/generate_mesh.py
#
# 3. The script receives a single JSON string as sys.argv[1].
#    Parse it with json.loads(sys.argv[1]) inside the Blender script.
#
# 4. Once you have partial Blender output working, test by calling:
#       POST http://localhost:8000/generate-mesh
#    with a sample JSON body (see mesh_router.py for schema).
# ──────────────────────────────────────────────────────────────────────
