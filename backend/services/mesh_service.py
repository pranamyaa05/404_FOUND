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
from config import settings

# Absolute path to the blender scripts folder
BLENDER_SCRIPTS_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../blender-scripts")
)
SCRIPT_PATH = os.path.join(BLENDER_SCRIPTS_DIR, "generate_mesh.py")


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
    """
    run_id = uuid.uuid4().hex
    gltf_output = os.path.abspath(os.path.join("temp", f"{run_id}.gltf"))
    svg_output = os.path.abspath(os.path.join("temp", f"{run_id}.svg"))

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
        settings.BLENDER_PATH,
        "--background",          # no GUI
        "--python", SCRIPT_PATH, # our script
        "--",                    # separator: everything after goes to the script
        args_json,
    ]

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=120,  # 2-minute hard limit per generation
    )

    if result.returncode != 0:
        raise RuntimeError(
            f"Blender exited with code {result.returncode}.\n"
            f"stderr: {result.stderr[-2000:]}"  # last 2000 chars of error
        )

    # Verify output files were actually created
    if not os.path.exists(gltf_output):
        raise RuntimeError("Blender ran but GLTF file was not created.")
    if not os.path.exists(svg_output):
        raise RuntimeError("Blender ran but SVG die-line file was not created.")

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
