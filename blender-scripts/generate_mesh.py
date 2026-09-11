"""
StitchSmart — Blender Headless Mesh & Die-line Generator
=========================================================
Owner: Member 1 & 2

This script is called by the FastAPI backend via subprocess:

    blender --background --python generate_mesh.py -- '<json_args>'

It receives a single JSON string as sys.argv[1] with the shape:
    {
        "measurements": { "height": 165, "chest": 90, "waist": 70,
                          "hip": 95, "shoulder": 40, "sleeveLength": 55 },
        "style":        "kurta",
        "image_url":    "/files/abc123_enhanced.png"  (or null),
        "gltf_output":  "/absolute/path/to/output.gltf",
        "svg_output":   "/absolute/path/to/output.svg"
    }

Outputs:
    - GLTF file  at gltf_output  → loaded by Three.js in the browser
    - SVG file   at svg_output   → shown as 2D die-line pattern

HOW TO RUN MANUALLY (for testing):
    blender --background --python generate_mesh.py -- '{"measurements":{"height":165,"chest":90,"waist":70,"hip":95,"shoulder":40,"sleeveLength":55},"style":"kurta","image_url":null,"gltf_output":"C:/tmp/test.gltf","svg_output":"C:/tmp/test.svg"}'
"""

import bpy
import sys
import json
import os
import math


# ─────────────────────────────────────────────────────────────────────
# 1. Parse arguments
# ─────────────────────────────────────────────────────────────────────

def parse_args() -> dict:
    """
    Blender passes everything after '--' as custom args.
    sys.argv looks like: ['blender', ..., '--python', 'script.py', '--', '<json>']
    We want the first arg after '--'.
    """
    argv = sys.argv
    separator = argv.index("--") + 1 if "--" in argv else len(argv)
    raw = argv[separator] if separator < len(argv) else "{}"
    return json.loads(raw)


# ─────────────────────────────────────────────────────────────────────
# 2. Scene helpers
# ─────────────────────────────────────────────────────────────────────

def clear_scene():
    """Remove all default objects from the Blender scene."""
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def add_camera_and_light():
    """Add a basic camera and sun lamp for GLTF export."""
    # Camera
    bpy.ops.object.camera_add(location=(0, -4, 1.5))
    cam = bpy.context.object
    cam.rotation_euler = (math.radians(80), 0, 0)
    bpy.context.scene.camera = cam

    # Light
    bpy.ops.object.light_add(type="SUN", location=(3, -3, 5))
    bpy.context.object.data.energy = 3.0


# ─────────────────────────────────────────────────────────────────────
# 3. Body mesh construction
# ─────────────────────────────────────────────────────────────────────

def build_body_mesh(measurements: dict) -> bpy.types.Object:
    """
    Create a simplified body mesh scaled to the given measurements.

    TODO (Member 1 & 2):
        Replace this placeholder capsule with your actual rigged
        human base mesh. Use shape keys (RKey) driven by the
        measurement values to morph the mesh.

    Current approach:
        - Create a capsule as a body stand-in
        - Scale it proportionally to height / chest measurements
    """
    height_m = measurements.get("height", 165) / 100.0   # cm → m
    chest_m  = measurements.get("chest",   90) / 100.0
    waist_m  = measurements.get("waist",   70) / 100.0
    hip_m    = measurements.get("hip",     95) / 100.0

    # Approximate body proportions from height
    torso_radius = chest_m / (2 * math.pi) * 2   # rough cylinder radius

    bpy.ops.mesh.primitive_cylinder_add(
        radius=torso_radius,
        depth=height_m,
        location=(0, 0, height_m / 2),
        vertices=32,
    )
    body = bpy.context.object
    body.name = "Body_Mesh"

    # TODO: Replace with shape-key morphing logic here.
    # Example reference:
    #   body.data.shape_keys.key_blocks["Chest"].value = chest_factor

    return body


# ─────────────────────────────────────────────────────────────────────
# 4. Dress mesh construction
# ─────────────────────────────────────────────────────────────────────

def build_dress_mesh(style: str, measurements: dict, body: bpy.types.Object) -> bpy.types.Object:
    """
    Create a dress mesh that fits over the body mesh.
    Each style has different geometry.

    TODO (Member 1 & 2):
        Replace placeholder geometry with proper cloth meshes per style.
        You can also use Blender's cloth simulation (physics) here.

    Supported styles:
        kurta | blouse_saree | ghagra | daily_wear
    """
    height_m  = measurements.get("height", 165) / 100.0
    chest_m   = measurements.get("chest",   90) / 100.0
    sleeve_m  = measurements.get("sleeveLength", 55) / 100.0

    dress_radius = (chest_m / (2 * math.pi) * 2) + 0.03  # slightly larger than body

    if style == "kurta":
        dress_depth = height_m * 0.6
        z_offset = height_m * 0.5
    elif style == "ghagra":
        dress_depth = height_m * 0.8
        z_offset = height_m * 0.4
    elif style == "blouse_saree":
        dress_depth = height_m * 0.25
        z_offset = height_m * 0.7
    else:  # daily_wear / default
        dress_depth = height_m * 0.55
        z_offset = height_m * 0.5

    bpy.ops.mesh.primitive_cylinder_add(
        radius=dress_radius,
        depth=dress_depth,
        location=(0, 0, z_offset),
        vertices=64,
    )
    dress = bpy.context.object
    dress.name = f"Dress_{style}"

    # TODO: Apply texture from image_url if provided.
    # See apply_texture() below.

    return dress


# ─────────────────────────────────────────────────────────────────────
# 5. Texture application
# ─────────────────────────────────────────────────────────────────────

def apply_texture(obj: bpy.types.Object, image_path: str):
    """
    Apply the enhanced dress image as a texture on the dress mesh.

    TODO (Member 1 & 2):
        This works for a simple UV-unwrapped mesh.
        For more complex geometry, set up a proper UV map first.

    Args:
        obj:        The dress mesh object.
        image_path: Absolute local path to the texture image.
    """
    if not os.path.exists(image_path):
        print(f"[StitchSmart] Texture file not found: {image_path}. Skipping texture.")
        return

    mat = bpy.data.materials.new(name="DressMaterial")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]

    # Load image texture
    tex_image_node = mat.node_tree.nodes.new("ShaderNodeTexImage")
    tex_image_node.image = bpy.data.images.load(image_path)

    # Connect texture → BSDF base color
    mat.node_tree.links.new(
        tex_image_node.outputs["Color"],
        bsdf.inputs["Base Color"],
    )

    # Assign material to object
    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)

    # UV unwrap
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project()
    bpy.ops.object.mode_set(mode="OBJECT")


# ─────────────────────────────────────────────────────────────────────
# 6. Die-line / 2D pattern generation
# ─────────────────────────────────────────────────────────────────────

def export_die_lines(dress: bpy.types.Object, svg_output: str, measurements: dict):
    """
    Generate 2D die-line patterns from the dress mesh.

    Approach:
        1. UV-unwrap the dress mesh to get a flat 2D layout
        2. Extract UV island outlines
        3. Write them as SVG paths (one path per panel)

    TODO (Member 1 & 2):
        The current implementation writes a placeholder SVG.
        Replace with actual UV island extraction once your dress
        mesh geometry is finalised.

        For more accurate die-lines consider:
        - bpy.ops.uv.export_layout() for quick UV export (PNG/SVG)
        - Writing custom UV loop traversal for labeled panels

    Args:
        dress:       The dress mesh object.
        svg_output:  Absolute path to write the SVG file.
        measurements: Used to annotate seam allowances (typically 1–2 cm).
    """
    # ── Quick UV layout export via Blender's built-in operator ────────
    # This is the fastest path to a working SVG die-line.
    bpy.context.view_layer.objects.active = dress
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=66.0, island_margin=0.02)
    bpy.ops.object.mode_set(mode="OBJECT")

    # Export UV layout to SVG
    bpy.ops.uv.export_layout(
        filepath=svg_output,
        export_all=False,
        modified=False,
        mode="SVG",
        size=(2048, 2048),
        opacity=0.25,
        check_existing=False,
    )

    # ── Annotate SVG with seam allowance note ─────────────────────────
    _annotate_svg(svg_output, measurements)

    print(f"[StitchSmart] Die-line SVG saved: {svg_output}")


def _annotate_svg(svg_path: str, measurements: dict):
    """
    Append measurement annotations and seam allowance note to the SVG.
    Simple string injection — no external XML library needed.
    """
    seam_cm = 1.5  # standard seam allowance

    annotation = (
        f'\n  <text x="20" y="30" font-family="Arial" font-size="18" fill="#333">'
        f'StitchSmart Pattern — Seam allowance: {seam_cm} cm</text>\n'
        f'  <text x="20" y="55" font-family="Arial" font-size="14" fill="#666">'
        f'H:{measurements.get("height","?")}cm  '
        f'C:{measurements.get("chest","?")}cm  '
        f'W:{measurements.get("waist","?")}cm  '
        f'Hip:{measurements.get("hip","?")}cm</text>\n'
    )

    try:
        with open(svg_path, "r", encoding="utf-8") as f:
            content = f.read()
        # Inject before closing </svg> tag
        content = content.replace("</svg>", annotation + "</svg>")
        with open(svg_path, "w", encoding="utf-8") as f:
            f.write(content)
    except Exception as e:
        print(f"[StitchSmart] SVG annotation warning: {e}")


# ─────────────────────────────────────────────────────────────────────
# 7. GLTF export
# ─────────────────────────────────────────────────────────────────────

def export_gltf(gltf_output: str):
    """
    Export the entire scene as a GLTF 2.0 file.
    The frontend Three.js viewer loads this file.

    Args:
        gltf_output: Absolute path to write the .gltf file.
    """
    bpy.ops.export_scene.gltf(
        filepath=gltf_output,
        export_format="GLTF_SEPARATE",   # .gltf + .bin + textures
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
    )
    print(f"[StitchSmart] GLTF saved: {gltf_output}")


# ─────────────────────────────────────────────────────────────────────
# 8. Main entry point
# ─────────────────────────────────────────────────────────────────────

def main():
    args = parse_args()

    measurements  = args.get("measurements", {})
    style         = args.get("style", "kurta")
    image_url     = args.get("image_url")        # may be None
    gltf_output   = args["gltf_output"]
    svg_output    = args["svg_output"]

    print(f"[StitchSmart] Starting mesh generation: style={style}")
    print(f"[StitchSmart] Measurements: {measurements}")

    # Ensure output directories exist
    os.makedirs(os.path.dirname(gltf_output), exist_ok=True)
    os.makedirs(os.path.dirname(svg_output), exist_ok=True)

    # ── Build scene ───────────────────────────────────────────────────
    clear_scene()
    add_camera_and_light()

    body  = build_body_mesh(measurements)
    dress = build_dress_mesh(style, measurements, body)

    # Apply dress texture if an enhanced image was provided
    if image_url:
        # image_url is a relative /files/ path — resolve to local disk
        local_image = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "../backend/temp",
                         os.path.basename(image_url))
        )
        apply_texture(dress, local_image)

    # ── Export ────────────────────────────────────────────────────────
    export_die_lines(dress, svg_output, measurements)
    export_gltf(gltf_output)

    print("[StitchSmart] Done.")


if __name__ == "__main__":
    main()
