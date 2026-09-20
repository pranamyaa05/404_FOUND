"""
cloth_sim.py  — Headless Blender cloth-physics drape simulation
================================================================
Usage (called by FastAPI via subprocess):
    blender --background --python cloth_sim.py

Environment variables (set by FastAPI):
    CLOTH_GARMENT_GLB  : absolute path to the garment GLB (from Trellis)
    CLOTH_AVATAR_GLB   : absolute path to the body avatar GLB (from smpl_service)
    CLOTH_OUTPUT_GLB   : absolute path where the draped result should be written

What this script does
---------------------
1. Clears the default Blender scene
2. Imports the body avatar as a COLLISION object
3. Imports the garment mesh as a CLOTH object
   - Scales the garment to match avatar dimensions (height parity)
   - Positions the garment just above the avatar
4. Applies Blender's built-in Cloth modifier (Cotton preset)
5. Bakes the simulation for 30 frames
6. Jumps to the last frame so the garment is fully draped
7. Applies all modifiers so the result is a static mesh
8. Exports the combined scene (avatar + draped garment) as GLB
"""

import bpy
import sys
import os
import codecs
import math

# Force UTF-8 on Windows
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'replace')
    except Exception:
        pass
if sys.stderr.encoding != 'utf-8':
    try:
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'replace')
    except Exception:
        pass

garment_glb = os.environ.get("CLOTH_GARMENT_GLB", "")
avatar_glb  = os.environ.get("CLOTH_AVATAR_GLB",  "")
output_glb  = os.environ.get("CLOTH_OUTPUT_GLB",  "")

print(f"[cloth_sim] garment: {garment_glb}")
print(f"[cloth_sim] avatar:  {avatar_glb}")
print(f"[cloth_sim] output:  {output_glb}")

if not garment_glb or not os.path.exists(garment_glb):
    print("[cloth_sim] ERROR: CLOTH_GARMENT_GLB not found — aborting", file=sys.stderr)
    sys.exit(1)
if not output_glb:
    print("[cloth_sim] ERROR: CLOTH_OUTPUT_GLB not set — aborting", file=sys.stderr)
    sys.exit(1)


# ── 1. Clear default scene ─────────────────────────────────────────────────────
for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)

bpy.context.scene.frame_start = 1
bpy.context.scene.frame_end   = 40


# ── Helper: get bounding-box height of a collection of objects ─────────────────
def get_height(objects):
    min_z, max_z = float('inf'), float('-inf')
    for obj in objects:
        if obj.type == 'MESH':
            for v in obj.data.vertices:
                wv = obj.matrix_world @ v.co
                if wv.z < min_z: min_z = wv.z
                if wv.z > max_z: max_z = wv.z
    return max(max_z - min_z, 0.001)


def get_bbox(objects):
    mn = [float('inf')]*3
    mx = [float('-inf')]*3
    for obj in objects:
        if obj.type == 'MESH':
            for v in obj.data.vertices:
                wv = obj.matrix_world @ v.co
                for i in range(3):
                    mn[i] = min(mn[i], wv[i])
                    mx[i] = max(mx[i], wv[i])
    return mn, mx


# ── 2. Import avatar GLB (if provided) ────────────────────────────────────────
avatar_objects = []
if avatar_glb and os.path.exists(avatar_glb):
    bpy.ops.import_scene.gltf(filepath=avatar_glb)
    avatar_objects = [o for o in bpy.context.selected_objects if o.type == 'MESH']
    print(f"[cloth_sim] Imported {len(avatar_objects)} avatar mesh(es)")

    # Normalise avatar to 1.7 m tall (real human scale for Blender physics)
    avatar_h = get_height(avatar_objects)
    target_h = 1.7  # metres
    scale_factor = target_h / avatar_h
    for obj in avatar_objects:
        obj.scale *= scale_factor
    bpy.ops.object.select_all(action='DESELECT')
    for obj in avatar_objects:
        obj.select_set(True)
    bpy.ops.object.transform_apply(scale=True)

    # Centre the avatar over the world origin on XY, floor on Z=0
    mn, mx = get_bbox(avatar_objects)
    cx = (mn[0] + mx[0]) / 2
    cy = (mn[1] + mx[1]) / 2
    for obj in avatar_objects:
        obj.location.x -= cx
        obj.location.y -= cy
        obj.location.z -= mn[2]
    bpy.ops.object.transform_apply(location=True)

    # Add collision modifier to each avatar mesh
    for obj in avatar_objects:
        bpy.context.view_layer.objects.active = obj
        mod = obj.modifiers.new(name="Collision", type='COLLISION')
        # Tight collision settings so garment wraps the body
        mod.settings.thickness_outer = 0.004
        mod.settings.thickness_inner = 0.002
        mod.settings.cloth_friction  = 10.0

    mn_av, mx_av = get_bbox(avatar_objects)
    avatar_top_z = mx_av[2]
    avatar_bot_z = mn_av[2]
    print(f"[cloth_sim] Avatar height: {avatar_top_z - avatar_bot_z:.3f} m")
else:
    avatar_top_z = 1.7
    avatar_bot_z = 0.0
    print("[cloth_sim] No avatar provided; simulating garment without collision body")


# ── 3. Import garment GLB ─────────────────────────────────────────────────────
bpy.ops.import_scene.gltf(filepath=garment_glb)
garment_objects = [o for o in bpy.context.selected_objects if o.type == 'MESH']
print(f"[cloth_sim] Imported {len(garment_objects)} garment mesh(es)")

# Scale garment to match avatar height (+ 2% ease so it fits over)
garment_h = get_height(garment_objects)
target_garment_h = (avatar_top_z - avatar_bot_z) * 1.02
garment_scale = target_garment_h / garment_h
for obj in garment_objects:
    obj.scale *= garment_scale
bpy.ops.object.select_all(action='DESELECT')
for obj in garment_objects:
    obj.select_set(True)
bpy.ops.object.transform_apply(scale=True)

# Centre garment XY over avatar; lift so bottom aligns with avatar top (will fall)
mn_g, mx_g = get_bbox(garment_objects)
cx = (mn_g[0] + mx_g[0]) / 2
cy = (mn_g[1] + mx_g[1]) / 2
for obj in garment_objects:
    obj.location.x -= cx
    obj.location.y -= cy
    obj.location.z += (avatar_top_z - mn_g[2]) + 0.05   # 5 cm gap above avatar top
bpy.ops.object.transform_apply(location=True)

# Subdivide garment for better cloth drape if polygon count is very low
for obj in garment_objects:
    bpy.context.view_layer.objects.active = obj
    if len(obj.data.polygons) < 500:
        subsurf = obj.modifiers.new(name="Subdiv", type='SUBSURF')
        subsurf.levels = 2
        bpy.ops.object.modifier_apply(modifier=subsurf.name)


# ── 4. Combine garment meshes into a single object (easier cloth setup) ────────
# Join into one mesh to apply a single Cloth modifier
bpy.ops.object.select_all(action='DESELECT')
for obj in garment_objects:
    obj.select_set(True)
if garment_objects:
    bpy.context.view_layer.objects.active = garment_objects[0]
    if len(garment_objects) > 1:
        bpy.ops.object.join()
    garment_obj = bpy.context.active_object
else:
    print("[cloth_sim] ERROR: No garment meshes after import", file=sys.stderr)
    sys.exit(1)


# ── 5. Add cloth modifier (Cotton-like preset) ────────────────────────────────
bpy.context.view_layer.objects.active = garment_obj
cloth_mod = garment_obj.modifiers.new(name="Cloth", type='CLOTH')
cs = cloth_mod.settings

# Cotton preset values
cs.quality                = 10
cs.mass                   = 0.30      # kg/m² (light cotton)
cs.tension_stiffness      = 15.0
cs.compression_stiffness  = 15.0
cs.shear_stiffness        = 5.0
cs.bending_stiffness      = 0.5       # low = flowy
cs.tension_damping        = 0.0
cs.compression_damping    = 0.0
cs.shear_damping          = 0.0
cs.bending_damping        = 0.5
cs.use_pressure           = False
# Gravity and velocity
cs.effector_weights.gravity = 1.0

# Collision settings (Blender 4.x: accessed via cloth_mod.collision_settings, not cs)
try:
    col = cloth_mod.collision_settings
    col.use_collision         = bool(avatar_objects)
    col.use_self_collision    = True
    col.collision_quality     = 3
    col.distance_min          = 0.004
except AttributeError:
    # Older Blender fallback
    cs.use_collision       = bool(avatar_objects)
    cs.use_self_collision  = True


# ── 6. Bake the simulation ────────────────────────────────────────────────────
print("[cloth_sim] Baking cloth simulation (40 frames)…")
bpy.context.scene.frame_set(1)

# Point cache bake — run through all frames
with bpy.context.temp_override(active_object=garment_obj):
    try:
        bpy.ops.ptcache.bake_all(bake=True)
        print("[cloth_sim] Bake complete via ptcache.")
    except Exception as e:
        print(f"[cloth_sim] ptcache bake failed ({e}); stepping frames manually…")
        for frame in range(1, 41):
            bpy.context.scene.frame_set(frame)
        print("[cloth_sim] Frame stepping done.")


# ── 7. Jump to last frame so mesh is fully draped ─────────────────────────────
bpy.context.scene.frame_set(40)

# Apply all modifiers to bake into static mesh
bpy.context.view_layer.objects.active = garment_obj
garment_obj.select_set(True)
for mod in list(garment_obj.modifiers):
    try:
        bpy.ops.object.modifier_apply(modifier=mod.name)
    except Exception as e:
        print(f"[cloth_sim] Could not apply modifier {mod.name}: {e}")


# ── 8. Export draped garment as GLB ──────────────────────────────────────────
print(f"[cloth_sim] Exporting draped GLB to: {output_glb}")
bpy.ops.object.select_all(action='DESELECT')
garment_obj.select_set(True)
bpy.context.view_layer.objects.active = garment_obj

bpy.ops.export_scene.gltf(
    filepath=output_glb,
    use_selection=True,
    export_format='GLB',
    export_apply=True,
    export_normals=True,
    export_materials='EXPORT',
)
print(f"[cloth_sim] Done. Output: {output_glb}")
