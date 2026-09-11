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

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from services import mesh_service
from typing import Optional

router = APIRouter()


class MeshRequest(BaseModel):
    measurements: dict[str, float]
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


@router.post("/generate-mesh")
async def generate_mesh(body: MeshRequest):
    """
    Generate a 3D GLTF mesh and a 2D SVG die-line pattern
    using a headless Blender pipeline.
    """
    try:
        result = mesh_service.generate(
            measurements=body.measurements,
            style=body.style,
            image_url=body.enhanced_image_url,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Mesh generation failed: {str(e)}")

    return JSONResponse(content=result)
    # Expected response shape:
    # {
    #   "gltf_url": "/files/<uuid>.gltf",
    #   "die_line_url": "/files/<uuid>.svg"
    # }
