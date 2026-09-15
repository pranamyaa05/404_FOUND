import bpy
import os
import sys
import codecs
import addon_utils
import glob

# Force UTF-8 output to prevent Windows cp1252 charmap encoding errors
if sys.stdout.encoding != 'utf-8':
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'replace')
if sys.stderr.encoding != 'utf-8':
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'replace')


def run_morpho_dynamic_pipeline():
    # 1. Context-Safe Database-Level Scene Reset
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
        
    # 2. Automatically locate project directories relative to THIS SCRIPT
    try:
        script_path = os.path.abspath(__file__)
    except NameError:
        for arg in sys.argv:
            if arg.endswith('.py'):
                script_path = os.path.abspath(arg)
                break
        else:
            script_path = os.path.abspath(sys.argv[0])
    
    script_dir = os.path.dirname(script_path)
    print(f"[INIT] Script path: {script_path}")
    print(f"[INIT] Script directory: {script_dir}")

    uploads_dir = os.environ.get("MORPHO_UPLOADS") or os.path.join(script_dir, "uploads")
    outputs_dir = os.environ.get("MORPHO_OUTPUTS") or os.path.join(script_dir, "outputs")

    os.makedirs(uploads_dir, exist_ok=True)
    os.makedirs(outputs_dir, exist_ok=True)
    
    # 3. Discover any uploaded mesh file inside /uploads/
    valid_extensions = ('*.glb', '*.GLB', '*.stl', '*.STL', '*.obj', '*.OBJ')
    staged_files = []
    for ext in valid_extensions:
        staged_files.extend(glob.glob(os.path.join(uploads_dir, ext)))
        
    if not staged_files:
        raise FileNotFoundError(f"Staging zone empty! Please place a GLB, STL or OBJ mesh inside:\n{uploads_dir}")
        
    import_path = staged_files[0]
    print(f"Morpho Engine compiling file: {import_path}")

    # 4. Programmatic Extension Handling
    addon_name = "bl_ext.blender_org.export_paper_model"
    default_activated, state_loaded = addon_utils.check(addon_name)
    if not state_loaded:
        try:
            addon_utils.enable(addon_name, default_set=True)
        except Exception:
            raise RuntimeError("Paper Model extension could not be initialized.")

    # 5. Native mesh import execution
    if import_path.lower().endswith('.glb'):
        bpy.ops.import_scene.gltf(filepath=import_path)
    elif import_path.lower().endswith('.stl'):
        bpy.ops.wm.stl_import(filepath=import_path)
    elif import_path.lower().endswith('.obj'):
        bpy.ops.wm.obj_import(filepath=import_path)
        
    # Find the imported mesh object
    obj = None
    for o in bpy.context.selected_objects:
        if o.type == 'MESH':
            obj = o
            break
    if not obj:
        for o in bpy.data.objects:
            if o.type == 'MESH':
                obj = o
                break

    if not obj:
        raise RuntimeError("No mesh data found in the imported file.")
        
    bpy.context.view_layer.objects.active = obj
    obj.name = "Target_Product_Mesh"
    
    # 6. Apply 2mm Form-Fitting Cushion Envelope Padding
    bpy.ops.object.modifier_add(type='DISPLACE')
    disp_mod = obj.modifiers["Displace"]
    disp_mod.strength = 0.002
    
    bpy.context.view_layer.update() 
    bpy.ops.object.modifier_apply(modifier="Displace")
    
    # === NEW: Automated Geometry Optimization Step for Complex Meshes ===
    print(f"Analyzing mesh complexity... Total faces: {len(obj.data.polygons)}")
    
    bpy.ops.object.modifier_add(type='WELD')
    obj.modifiers["Weld"].merge_threshold = 0.0005
    bpy.ops.object.modifier_apply(modifier="Weld")

    MAX_SAFE_FACO_COUNT = 1500 
    current_face_count = len(obj.data.polygons)
    
    if current_face_count > MAX_SAFE_FACO_COUNT:
        print(f"Warning: Mesh is too complex ({current_face_count} faces). Initiating optimization...")
        target_ratio = MAX_SAFE_FACO_COUNT / current_face_count
        
        bpy.ops.object.modifier_add(type='DECIMATE')
        dec_mod = obj.modifiers["Decimate"]
        dec_mod.decimate_type = 'COLLAPSE'
        dec_mod.ratio = target_ratio
        dec_mod.use_symmetry = False
        
        bpy.ops.object.modifier_apply(modifier="Decimate")
        print(f"Optimization complete. Mesh reduced to {len(obj.data.polygons)} faces.")
        
    # Clean up non-manifold or loose geometry
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.delete_loose()
    bpy.ops.mesh.dissolve_degenerate()
    bpy.ops.object.mode_set(mode='OBJECT')
    
    # =====================================================================
    # STRUCTURED SEAM MARKING (To join front, back, top)
    # =====================================================================
    print("\n[SEAMS] Applying structured seam strategy (Front/Back clamshell)...")
    import bmesh
    
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    
    bm = bmesh.from_edit_mesh(obj.data)
    bm.edges.ensure_lookup_table()
    bm.faces.ensure_lookup_table()
    bm.verts.ensure_lookup_table()
    
    # Clear existing seams
    for e in bm.edges:
        e.seam = False
        
    try:
        min_y = min([v.co.y for v in bm.verts])
        max_y = max([v.co.y for v in bm.verts])
        min_z = min([v.co.z for v in bm.verts])
        max_z = max([v.co.z for v in bm.verts])
        
        z_center = (min_z + max_z) / 2.0
        y_top_threshold = max_y - ((max_y - min_y) * 0.15) # Top 15% (Shoulders/Top)
        
        # Mark front vs back faces based on Z (depth)
        for f in bm.faces:
            f.tag = True if f.calc_center_median().z > z_center else False
            
        # Find edges forming the boundary between Front and Back faces
        side_seam_edges = []
        for e in bm.edges:
            if len(e.link_faces) == 2:
                if e.link_faces[0].tag != e.link_faces[1].tag:
                    side_seam_edges.append(e)
                    
        # Mark them as Seams, EXCEPT for the top 15% (to keep front/back joined at top)
        seams_marked = 0
        for e in side_seam_edges:
            edge_y = (e.verts[0].co.y + e.verts[1].co.y) / 2.0
            if edge_y < y_top_threshold:
                e.seam = True
                seams_marked += 1
                
        bmesh.update_edit_mesh(obj.data)
        print(f"[SEAMS] Marked {seams_marked} side seam edges.")
    except Exception as e:
        print(f"[SEAMS] Failed to mark structured seams: {e}")
        
    bpy.ops.object.mode_set(mode='OBJECT')
    # =====================================================================
    
    # MESH METRICS EXTRACTION
    import mathutils
    import json
    
    bbox_corners = [obj.matrix_world @ mathutils.Vector(corner) for corner in obj.bound_box]
    bbox_min = mathutils.Vector((min(v.x for v in bbox_corners),
                                   min(v.y for v in bbox_corners),
                                   min(v.z for v in bbox_corners)))
    bbox_max = mathutils.Vector((max(v.x for v in bbox_corners),
                                   max(v.y for v in bbox_corners),
                                   max(v.z for v in bbox_corners)))
    
    dimensions = bbox_max - bbox_min
    bbox_volume_m3 = (dimensions.x * dimensions.y * dimensions.z)
    
    obj.data.calc_loop_triangles()
    surface_area_m2 = sum(tri.area for tri in obj.data.loop_triangles)
    
    mesh_volume_m3 = 0.0
    for tri in obj.data.loop_triangles:
        v0 = obj.data.vertices[tri.vertices[0]].co
        v1 = obj.data.vertices[tri.vertices[1]].co
        v2 = obj.data.vertices[tri.vertices[2]].co
        mesh_volume_m3 += v0.dot(v1.cross(v2)) / 6.0
    mesh_volume_m3 = abs(mesh_volume_m3)
    
    metrics = {
        "bounding_box": {
            "width_m": round(dimensions.x, 4),
            "height_m": round(dimensions.y, 4),
            "depth_m": round(dimensions.z, 4),
            "volume_m3": round(bbox_volume_m3, 6)
        },
        "mesh": {
            "surface_area_m2": round(surface_area_m2, 6),
            "volume_m3": round(mesh_volume_m3, 6),
            "face_count": len(obj.data.polygons),
            "vertex_count": len(obj.data.vertices)
        },
        "packaging_efficiency": {
            "volume_utilization": round((mesh_volume_m3 / bbox_volume_m3) * 100, 2) if bbox_volume_m3 > 0 else 0,
            "surface_to_volume_ratio": round(surface_area_m2 / mesh_volume_m3, 2) if mesh_volume_m3 > 0 else 0
        }
    }
    
    metrics_path = os.path.join(outputs_dir, "mesh_metrics.json")
    with open(metrics_path, 'w') as f:
        json.dump(metrics, f, indent=2)
    
    # 7. Multi-Asset Export Configuration
    glb_out_path = os.path.join(outputs_dir, "preview.glb")
    svg_out_path = os.path.join(outputs_dir, "dieline_pattern.svg")
    
    print(f"\n[EXPORT] Exporting 3D preview to GLB format...")
    bpy.ops.export_scene.gltf(
        filepath=glb_out_path, 
        export_format='GLB', 
        use_selection=False
    )
    
    # File B: Flat Unwrapped Layout Execution
    print(f"\n[EXPORT] Preparing mesh for 2D dieline unfold...")
    
    obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    
    print(f"[EXPORT] Attempting direct module unfold (Method 1: Direct API)...")
    
    try:
        import bl_ext.blender_org.export_paper_model.unfolder as unfolder_module
        from bl_ext.blender_org.export_paper_model.svg import Svg
        from mathutils import Vector
        
        class ExportStyle:
            line_width = 1.0
            line_style = 'SOLID'
        
        class UnfoldProperties:
            filepath = svg_out_path
            file_format = 'SVG'
            output_size_x = 2.0
            output_size_y = 2.0
            output_margin = 0.05
            output_dpi = 90
            scale = 1.0
            tab_style = 'NONE'
            number_style = 'NONE'
            sticker_width = 0.005
            paper_thickness = 0.0
            angle_epsilon = 0.001
            texture_type = 'NONE'
            nesting_method = 'BOUNDING_BOX'
            style = ExportStyle()

        props = UnfoldProperties()
        
        print(f"[EXPORT]   Initializing unfolder for {len(obj.data.polygons)} faces...")
        unfolder = unfolder_module.Unfolder(obj)
        unfolder.do_create_uvmap = False
        
        cage_size = Vector((props.output_size_x, props.output_size_y))
        print(f"[EXPORT]   Computing optimal layout (page size: A3)...")
        unfolder.prepare(cage_size, scale=1.0, limit_by_page=False)
        
        exporter = Svg(props)
        
        print(f"[EXPORT]   Writing SVG to disk...")
        unfolder.save(props, exporter)
        unfolder = None
        
        if not os.path.exists(svg_out_path):
            raise RuntimeError("Direct unfold completed but SVG file not created")
            
    except Exception as direct_exception:
        print(f"[EXPORT] [FAIL] Direct module method failed: {direct_exception}")
        print(f"[EXPORT] Attempting standard operator fallback (Method 2: Operator API)...")
        
        try:
            res = bpy.ops.export_mesh.paper_model(
                filepath=svg_out_path,
                file_format='SVG',
                output_size_x=2.0,
                output_size_y=2.0,
                output_margin=0.05,
                output_dpi=90,
                scale=1.0,
                tab_style='NONE',
                number_style='NONE',
            )
            if 'CANCELLED' in res:
                raise RuntimeError(f"Operator returned CANCELLED")
            if not os.path.exists(svg_out_path):
                raise RuntimeError("Operator completed but SVG file not created")
        except Exception as operator_exception:
            bpy.ops.object.mode_set(mode='OBJECT')
            raise RuntimeError(f"All SVG export methods failed. Direct: {direct_exception}, Operator: {operator_exception}")
            
    bpy.ops.object.mode_set(mode='OBJECT')
    print(f"\n[SUCCESS] Pipeline completed successfully!")

if __name__ == "__main__":
    import traceback
    try:
        run_morpho_dynamic_pipeline()
    except Exception as e:
        print(f"PIPELINE FATAL ERROR: {str(e)}", file=sys.stderr)
        traceback.print_exc()
        sys.exit(1)
