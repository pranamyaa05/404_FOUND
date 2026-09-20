"""
dieline_garment_panels.py
Semantically segments a garment 3D mesh into standard tailor panels,
UV-unwraps each panel, and generates a clean SVG dieline.
"""

import bpy
import bmesh
import mathutils
import os
import sys
import json
import codecs
import math

if hasattr(sys.stdout, "buffer") and sys.stdout.encoding != "utf-8":
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.buffer, "replace")
if hasattr(sys.stderr, "buffer") and sys.stderr.encoding != "utf-8":
    sys.stderr = codecs.getwriter("utf-8")(sys.stderr.buffer, "replace")


def reset_scene():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh)


def get_env_dirs():
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
    except NameError:
        script_dir = os.path.abspath(os.getcwd())
    uploads = os.environ.get("MORPHO_UPLOADS") or os.path.join(script_dir, "uploads")
    outputs = os.environ.get("MORPHO_OUTPUTS") or os.path.join(script_dir, "outputs")
    os.makedirs(uploads, exist_ok=True)
    os.makedirs(outputs, exist_ok=True)
    return uploads, outputs


def find_import_file(uploads_dir):
    import glob
    for ext in ("*.glb", "*.GLB", "*.obj", "*.OBJ", "*.stl", "*.STL"):
        files = glob.glob(os.path.join(uploads_dir, ext))
        if files:
            return files[0]
    raise FileNotFoundError(f"No mesh found in {uploads_dir}")


def import_mesh(path):
    if path.lower().endswith(".glb"):
        bpy.ops.import_scene.gltf(filepath=path)
    elif path.lower().endswith(".obj"):
        bpy.ops.wm.obj_import(filepath=path)
    elif path.lower().endswith(".stl"):
        bpy.ops.wm.stl_import(filepath=path)
    for obj in bpy.context.selected_objects:
        if obj.type == "MESH":
            return obj
    for obj in bpy.data.objects:
        if obj.type == "MESH":
            return obj
    raise RuntimeError("No mesh found after import")


def join_all_meshes():
    bpy.ops.object.select_all(action="DESELECT")
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    if not meshes:
        raise RuntimeError("No meshes to join")
    for m in meshes:
        m.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    obj = bpy.context.active_object
    obj.name = "Garment"
    return obj


def clean_mesh(obj):
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.remove_doubles(threshold=0.001)
    bpy.ops.mesh.delete_loose()
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode="OBJECT")


def simplify_mesh(obj, target_faces=3000):
    fc = len(obj.data.polygons)
    if fc > target_faces:
        ratio = target_faces / fc
        mod = obj.modifiers.new("Decimate", "DECIMATE")
        mod.ratio = ratio
        bpy.ops.object.modifier_apply(modifier="Decimate")
        print(f"[SIMPLIFY] Decimated {fc} to {len(obj.data.polygons)} faces")


def get_bbox(obj):
    verts_world = [obj.matrix_world @ v.co for v in obj.data.vertices]
    xs = [v.x for v in verts_world]
    ys = [v.y for v in verts_world]
    zs = [v.z for v in verts_world]
    return (min(xs), max(xs), min(ys), max(ys), min(zs), max(zs))


# ── Garment type → panel definitions ──────────────────────────────────────────
GARMENT_PANEL_DEFS = {
    # style_key: list of (panel_name, classifier_fn) in order of priority
    # classifier_fn(rel_x, rel_z, ny) -> bool
    "pants":         ["Waistband", "Left Leg Front", "Left Leg Back", "Right Leg Front", "Right Leg Back"],
    "trousers":      ["Waistband", "Left Leg Front", "Left Leg Back", "Right Leg Front", "Right Leg Back"],
    "shorts":        ["Waistband", "Left Leg", "Right Leg"],
    "skirt":         ["Front Panel", "Back Panel", "Waistband"],
    "lehenga":       ["Front Panel", "Back Panel", "Waistband", "Pallu"],
    "t-shirt":       ["Front Body", "Back Body", "Left Sleeve", "Right Sleeve"],
    "t shirt":       ["Front Body", "Back Body", "Left Sleeve", "Right Sleeve"],
    "formal shirt":  ["Front Left", "Front Right", "Back", "Left Sleeve", "Right Sleeve", "Collar"],
    "denim jacket":  ["Front Left", "Front Right", "Back", "Left Sleeve", "Right Sleeve", "Collar"],
    "jacket":        ["Front Left", "Front Right", "Back", "Left Sleeve", "Right Sleeve", "Collar"],
    "kurta":         ["Front Body", "Back Body", "Left Sleeve", "Right Sleeve", "Collar"],
    "anarkali":      ["Front Body", "Back Body", "Left Sleeve", "Right Sleeve", "Collar", "Skirt Panel"],
    "salwar kameez": ["Front Body", "Back Body", "Left Sleeve", "Right Sleeve", "Collar"],
    "blouse (saree)": ["Front Body", "Back Body", "Left Sleeve", "Right Sleeve"],
    "blouse":        ["Front Body", "Back Body", "Left Sleeve", "Right Sleeve"],
    "daily wear dress": ["Front Body", "Back Body", "Left Sleeve", "Right Sleeve", "Collar"],
    "dress":         ["Front Body", "Back Body", "Left Sleeve", "Right Sleeve", "Collar"],
    "gown":          ["Front Body", "Back Body", "Left Sleeve", "Right Sleeve", "Collar"],
}
DEFAULT_PANELS = ["Front Body", "Back Body", "Collar", "Left Sleeve", "Right Sleeve"]


def get_panel_order(garment_type: str) -> list:
    key = (garment_type or "dress").lower().strip()
    return GARMENT_PANEL_DEFS.get(key, DEFAULT_PANELS)


def classify_face_for_type(face_center_world, face_normal_world, bbox, garment_type: str) -> str:
    x, y, z = face_center_world
    nx, ny, nz = face_normal_world
    min_x, max_x, min_y, max_y, min_z, max_z = bbox
    height = max_z - min_z or 1
    width  = max_x - min_x or 1
    rel_z = (z - min_z) / height   # 0 = bottom, 1 = top
    rel_x = (x - min_x) / width    # 0 = left, 1 = right
    key = (garment_type or "dress").lower().strip()

    # ── Pants / Trousers / Shorts ────────────────────────────────────────────
    if key in ("pants", "trousers", "shorts"):
        if rel_z > 0.87:
            return "Waistband"
        is_left = rel_x < 0.5
        is_front = ny >= 0
        if key == "shorts":
            return "Left Leg" if is_left else "Right Leg"
        return ("Left Leg Front" if is_front else "Left Leg Back") if is_left else \
               ("Right Leg Front" if is_front else "Right Leg Back")

    # ── Skirt / Lehenga ───────────────────────────────────────────────────────
    if key in ("skirt", "lehenga"):
        if rel_z > 0.90:
            return "Waistband"
        if key == "lehenga" and rel_z > 0.70 and rel_x > 0.75:
            return "Pallu"
        return "Front Panel" if ny >= 0 else "Back Panel"

    # ── Jackets / Formal Shirt / Denim Jacket ────────────────────────────────
    if key in ("denim jacket", "jacket", "formal shirt"):
        if rel_z > 0.88 and 0.15 < rel_x < 0.85:
            return "Collar"
        if 0.45 < rel_z < 0.92 and rel_x < 0.18:
            return "Left Sleeve"
        if 0.45 < rel_z < 0.92 and rel_x > 0.82:
            return "Right Sleeve"
        if ny >= 0:
            return "Front Left" if rel_x < 0.5 else "Front Right"
        return "Back"

    # ── Anarkali — has a skirt panel below waist ──────────────────────────────
    if key == "anarkali":
        if rel_z > 0.85 and 0.2 < rel_x < 0.8:
            return "Collar"
        if 0.45 < rel_z < 0.90 and rel_x < 0.18:
            return "Left Sleeve"
        if 0.45 < rel_z < 0.90 and rel_x > 0.82:
            return "Right Sleeve"
        if rel_z < 0.30:
            return "Skirt Panel"
        return "Front Body" if ny >= 0 else "Back Body"

    # ── Default (Dress / Kurta / Blouse / Salwar / T-Shirt) ─────────────────
    if rel_z > 0.85 and 0.2 < rel_x < 0.8:
        return "Collar"
    if 0.45 < rel_z < 0.92 and rel_x < 0.18:
        return "Left Sleeve"
    if 0.45 < rel_z < 0.92 and rel_x > 0.82:
        return "Right Sleeve"
    return "Front Body" if ny >= 0 else "Back Body"


def segment_panels(obj, garment_type: str = "dress"):
    bbox = get_bbox(obj)
    mesh = obj.data
    panels = {}
    for face in mesh.polygons:
        center_world = obj.matrix_world @ face.center
        normal_world = (obj.matrix_world.to_3x3() @ face.normal).normalized()
        panel = classify_face_for_type(
            (center_world.x, center_world.y, center_world.z),
            (normal_world.x, normal_world.y, normal_world.z),
            bbox,
            garment_type,
        )
        panels.setdefault(panel, []).append(face.index)
    for name, faces in panels.items():
        print(f"[SEGMENT] Panel '{name}': {len(faces)} faces")
    return panels


def extract_panel_object(source_obj, face_indices, panel_name):
    bpy.context.view_layer.objects.active = source_obj
    if bpy.context.mode != 'OBJECT':
        bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.select_all(action="DESELECT")
    source_obj.select_set(True)
    bpy.ops.object.duplicate(linked=False)
    panel_obj = bpy.context.view_layer.objects.active
    panel_obj.name = panel_name
    bpy.context.view_layer.objects.active = panel_obj
    face_set = set(face_indices)
    for f in panel_obj.data.polygons:
        f.select = f.index in face_set
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="INVERT")
    bpy.ops.mesh.delete(type="FACE")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.delete_loose()
    bpy.ops.object.mode_set(mode="OBJECT")
    return panel_obj


def smart_unwrap_panel(panel_obj):
    bpy.context.view_layer.objects.active = panel_obj
    panel_obj.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    if not panel_obj.data.uv_layers:
        panel_obj.data.uv_layers.new(name="UVMap")
    bpy.ops.uv.smart_project(
        angle_limit=math.radians(66),
        island_margin=0.01,
        area_weight=0.0,
        correct_aspect=True,
        scale_to_bounds=True,
    )
    bpy.ops.object.mode_set(mode="OBJECT")


def get_real_size_cm(panel_obj):
    verts = [panel_obj.matrix_world @ v.co for v in panel_obj.data.vertices]
    if not verts:
        return 0, 0
    xs = [v.x for v in verts]
    zs = [v.z for v in verts]
    return round((max(xs) - min(xs)) * 100, 1), round((max(zs) - min(zs)) * 100, 1)


PANEL_COLOURS = {
    "Front Body": "#4a90d9",
    "Back Body": "#7b68ee",
    "Collar": "#e8856a",
    "Left Sleeve": "#5cb85c",
    "Right Sleeve": "#f0ad4e",
}
SEAM_PX = 14


def generate_svg(panels_uv, output_path, measurements=None):
    PAGE_W = 1684
    PAGE_H = 2384
    MARGIN = 50
    PAD = 30
    
    # Find the "Back" panel (or fallback to the largest panel if no back panel exists)
    back_panel = next((p for p in panels_uv if "back" in p["name"].lower()), None)
    if not back_panel and panels_uv:
        back_panel = max(panels_uv, key=lambda p: p["width_cm"] * p["height_cm"])
        
    lines = [
        '<?xml version="1.0" encoding="utf-8"?>',
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{PAGE_W}" height="{PAGE_H}" viewBox="0 0 {PAGE_W} {PAGE_H}">',
        "<defs>",
        '  <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">',
        '    <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#e8e8e8" stroke-width="0.5"/>',
        "  </pattern>",
        "  <style>",
        "    .outline { fill: none; stroke-width: 3; stroke-linecap: round; }",
        "    .fill { fill-opacity: 0.15; }",
        "    .seam { fill: none; stroke-width: 2; stroke-dasharray: 10,6; stroke-opacity: 0.6; }",
        "  </style>",
        "</defs>",
        f'<rect width="{PAGE_W}" height="{PAGE_H}" fill="url(#grid)"/>',
        f'<rect x="1" y="1" width="{PAGE_W-2}" height="{PAGE_H-2}" fill="none" stroke="#ccc" stroke-width="1"/>',
    ]

    if back_panel:
        name = back_panel["name"]
        w_cm = max(back_panel["width_cm"], 4.0)
        h_cm = max(back_panel["height_cm"], 4.0)
        colour = PANEL_COLOURS.get(name, "#7b68ee")
        loops = back_panel["loops_uv"]
        
        # Enlarge to fit the entire grid
        avail_w = PAGE_W - 2 * MARGIN
        avail_h = PAGE_H - 2 * MARGIN
        
        scale_px = min(avail_w / w_cm, avail_h / h_cm) * 0.85
        panel_w_px = w_cm * scale_px
        panel_h_px = h_cm * scale_px
        
        # Center horizontally and vertically
        cx = (PAGE_W - panel_w_px) / 2
        cy = (PAGE_H - panel_h_px) / 2

        if loops:
            def poly_area(poly):
                area = 0.0
                n = len(poly)
                for i in range(n):
                    u1, v1 = poly[i]
                    u2, v2 = poly[(i + 1) % n]
                    area += (u1 * v2 - u2 * v1)
                return abs(area) / 2.0

            # Calculate area for each loop
            loop_areas = [(poly, poly_area(poly)) for poly in loops if len(poly) >= 3]
            if loop_areas:
                max_area = max(a for _, a in loop_areas)
                # Keep only loops that are at least 5% the size of the largest loop
                filtered_loops = [poly for poly, a in loop_areas if a > max_area * 0.05]
                
                # If everything got filtered out (unlikely), fallback to original
                if not filtered_loops:
                    filtered_loops = [poly for poly, a in loop_areas]

                all_uvs = [uv for poly in filtered_loops for uv in poly]
                
                if all_uvs:
                    min_u = min(u for u, v in all_uvs)
                    max_u = max(u for u, v in all_uvs)
                    min_v = min(v for u, v in all_uvs)
                    max_v = max(v for u, v in all_uvs)
                    uv_w = max_u - min_u or 1
                    uv_h = max_v - min_v or 1

                    # Recalculate aspect ratio based on the filtered UV bounds instead of the old panel width/height
                    # The original w_cm / h_cm was for the entire noisy bounding box.
                    # We want to use the avail_w and avail_h to maximize the filtered content.
                    aspect = uv_w / uv_h
                    if avail_w / avail_h > aspect:
                        # Constrained by height
                        panel_h_px = avail_h * 0.9
                        panel_w_px = panel_h_px * aspect
                    else:
                        # Constrained by width
                        panel_w_px = avail_w * 0.9
                        panel_h_px = panel_w_px / aspect
                        
                    cx = (PAGE_W - panel_w_px) / 2
                    cy = (PAGE_H - panel_h_px) / 2
            
                    lines.append(f'<g transform="translate({cx},{cy})">')

                    def uv_to_px(u, v):
                        px = (u - min_u) / uv_w * panel_w_px
                        py = (1 - (v - min_v) / uv_h) * panel_h_px
                        return px, py

                    for poly_uvs in filtered_loops:
                        if len(poly_uvs) < 3:
                            continue
                        pts = " ".join(f"{uv_to_px(u,v)[0]:.1f},{uv_to_px(u,v)[1]:.1f}" for u, v in poly_uvs)
                        lines.append(f'  <polygon points="{pts}" class="fill" fill="{colour}"/>')
                        lines.append(f'  <polygon points="{pts}" class="outline" stroke="{colour}"/>')
                        
                        seam_pts_raw = [uv_to_px(u, v) for u, v in poly_uvs]
                        cx2 = sum(p[0] for p in seam_pts_raw) / len(seam_pts_raw)
                        cy2 = sum(p[1] for p in seam_pts_raw) / len(seam_pts_raw)
                        seam_pts = " ".join(
                            f"{cx2 + (px - cx2)*0.88:.1f},{cy2 + (py - cy2)*0.88:.1f}"
                            for px, py in seam_pts_raw
                        )
                        lines.append(f'  <polygon points="{seam_pts}" class="seam" stroke="{colour}"/>')
        
        lines.append("</g>")

    lines.append("</svg>")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"[SVG] Written {len(lines)} lines to {output_path}")


def run():
    garment_type = os.environ.get("GARMENT_TYPE", "dress").lower().strip()
    print(f"[DIELINE] Garment type from env: '{garment_type}'")
    reset_scene()
    uploads_dir, outputs_dir = get_env_dirs()
    import_path = find_import_file(uploads_dir)
    print(f"[IMPORT] {import_path}")
    import_mesh(import_path)
    obj = join_all_meshes()
    print(f"[MESH] {len(obj.data.polygons)} faces, {len(obj.data.vertices)} verts")
    clean_mesh(obj)
    simplify_mesh(obj, target_faces=3000)

    # Export GLB preview
    glb_path = os.path.join(outputs_dir, "preview.glb")
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=glb_path, export_format="GLB", use_selection=True)
    print(f"[EXPORT] GLB: {glb_path}")

    panels_dict = segment_panels(obj, garment_type=garment_type)
    PANEL_ORDER = get_panel_order(garment_type)
    print(f"[DIELINE] Garment type: '{garment_type}' → panels: {PANEL_ORDER}")
    panels_uv_data = []

    for panel_name in PANEL_ORDER:
        face_indices = panels_dict.get(panel_name, [])
        if not face_indices:
            print(f"[PANEL] Skipping '{panel_name}' — no faces classified")
            continue
        print(f"[PANEL] Processing '{panel_name}' ({len(face_indices)} faces)...")
        try:
            panel_obj = extract_panel_object(obj, face_indices, panel_name)
            if len(panel_obj.data.polygons) == 0:
                bpy.data.objects.remove(panel_obj, do_unlink=True)
                continue
            smart_unwrap_panel(panel_obj)
            mesh = panel_obj.data
            loops_uv = []
            if mesh.uv_layers:
                uv_layer = mesh.uv_layers.active.data
                for poly in mesh.polygons:
                    loops_uv.append([uv_layer[li].uv.to_tuple() for li in poly.loop_indices])
            w_cm, h_cm = get_real_size_cm(panel_obj)
            panels_uv_data.append({
                "name": panel_name,
                "loops_uv": loops_uv,
                "width_cm": max(w_cm, 5),
                "height_cm": max(h_cm, 5),
                "face_count": len(face_indices),
            })
            bpy.data.objects.remove(panel_obj, do_unlink=True)
        except Exception as e:
            print(f"[PANEL] Error '{panel_name}': {e}")
            import traceback; traceback.print_exc()

    if not panels_uv_data:
        raise RuntimeError("No panels could be extracted from the garment mesh")

    measurements = None
    meas_json = os.environ.get("GARMENT_MEASUREMENTS")
    if meas_json:
        try:
            measurements = json.loads(meas_json)
        except Exception:
            pass

    svg_path = os.path.join(outputs_dir, "dieline_pattern.svg")
    generate_svg(panels_uv_data, svg_path, measurements=measurements)

    metrics = {
        "panels": [{"name": p["name"], "width_cm": p["width_cm"], "height_cm": p["height_cm"], "faces": p["face_count"]} for p in panels_uv_data],
        "total_panels": len(panels_uv_data),
    }
    with open(os.path.join(outputs_dir, "mesh_metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)

    print("\n[SUCCESS] Dieline:", svg_path)
    print("[SUCCESS] GLB:", glb_path)
    print("[SUCCESS] Panels:", [p["name"] for p in panels_uv_data])


import traceback
if __name__ == "__main__":
    try:
        run()
    except Exception as e:
        print(f"PIPELINE FATAL ERROR: {e}", file=sys.stderr)
        traceback.print_exc()
        sys.exit(1)
