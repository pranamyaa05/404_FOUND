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
    # When Blender runs with --python, use sys.argv to find the script
    try:
        # Try __file__ first (works in most contexts)
        script_path = os.path.abspath(__file__)
    except NameError:
        # Fallback: get from sys.argv when __file__ isn't available
        for arg in sys.argv:
            if arg.endswith('pipeline.py'):
                script_path = os.path.abspath(arg)
                break
        else:
            # Last resort: use current directory
            script_path = os.path.abspath(sys.argv[0])
    
    script_dir = os.path.dirname(script_path)
    print(f"[INIT] Script path: {script_path}")
    print(f"[INIT] Script directory: {script_dir}")

    # Allow external callers (e.g. FastAPI blender_runner.py) to pass per-job
    # directories via environment variables — falls back to the original
    # script-relative paths so standalone MP usage is unchanged.
    uploads_dir = os.environ.get("MORPHO_UPLOADS") or os.path.join(script_dir, "uploads")
    outputs_dir = os.environ.get("MORPHO_OUTPUTS") or os.path.join(script_dir, "outputs")

    print(f"[INIT] Uploads directory: {uploads_dir}")
    print(f"[INIT] Outputs directory: {outputs_dir}")

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
        # Fallback
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
    disp_mod.strength = 0.002  # 2mm outer clearing thickness
    
    bpy.context.view_layer.update() 
    bpy.ops.object.modifier_apply(modifier="Displace")
    
    # === NEW: Automated Geometry Optimization Step for Complex Meshes ===
    print(f"Analyzing mesh complexity... Total faces: {len(obj.data.polygons)}")
    
    # 1. Weld vertices that are nearly identical to fix corrupt STL imports
    bpy.ops.object.modifier_add(type='WELD')
    obj.modifiers["Weld"].merge_threshold = 0.0005 # 0.5mm merge zone
    bpy.ops.object.modifier_apply(modifier="Weld")

    # 2. Dynamic Poly-Count Reduction (Decimation)
    # The unfolding engine safely handles layouts under ~1,500 faces efficiently
    MAX_SAFE_FACO_COUNT = 1500 
    current_face_count = len(obj.data.polygons)
    
    if current_face_count > MAX_SAFE_FACO_COUNT:
        print(f"Warning: Mesh is too complex ({current_face_count} faces). Initiating optimization...")
        
        # Calculate target ratio to bring it down to a safe threshold
        target_ratio = MAX_SAFE_FACO_COUNT / current_face_count
        
        bpy.ops.object.modifier_add(type='DECIMATE')
        dec_mod = obj.modifiers["Decimate"]
        dec_mod.decimate_type = 'COLLAPSE'
        dec_mod.ratio = target_ratio
        dec_mod.use_symmetry = False
        
        # Apply the decimation to rebuild a lightweight structural hull
        bpy.ops.object.modifier_apply(modifier="Decimate")
        print(f"Optimization complete. Mesh reduced to {len(obj.data.polygons)} faces.")
        
    # 3. Clean up non-manifold or loose geometry that stalls the exporter
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.delete_loose()
    bpy.ops.mesh.dissolve_degenerate() # Removes zero-area faces/edges
    bpy.ops.object.mode_set(mode='OBJECT')
    # =====================================================================
    
    # ===========================================================================
    # =  MESH METRICS EXTRACTION - For Dynamic Sustainability Scoring         =
    # ===========================================================================
    print(f"\n[METRICS] Extracting mesh geometry metrics...")
    
    import mathutils
    import json
    
    # Calculate bounding box dimensions
    bbox_corners = [obj.matrix_world @ mathutils.Vector(corner) for corner in obj.bound_box]
    bbox_min = mathutils.Vector((min(v.x for v in bbox_corners),
                                   min(v.y for v in bbox_corners),
                                   min(v.z for v in bbox_corners)))
    bbox_max = mathutils.Vector((max(v.x for v in bbox_corners),
                                   max(v.y for v in bbox_corners),
                                   max(v.z for v in bbox_corners)))
    
    dimensions = bbox_max - bbox_min
    bbox_volume_m3 = (dimensions.x * dimensions.y * dimensions.z)  # in cubic meters
    
    # Calculate surface area (sum of all face areas)
    obj.data.calc_loop_triangles()
    surface_area_m2 = sum(tri.area for tri in obj.data.loop_triangles)
    
    # Calculate mesh volume using signed volume method
    mesh_volume_m3 = 0.0
    for tri in obj.data.loop_triangles:
        v0 = obj.data.vertices[tri.vertices[0]].co
        v1 = obj.data.vertices[tri.vertices[1]].co
        v2 = obj.data.vertices[tri.vertices[2]].co
        # Signed volume of tetrahedron formed by triangle and origin
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
    
    # Save metrics to JSON file for frontend consumption
    metrics_path = os.path.join(outputs_dir, "mesh_metrics.json")
    with open(metrics_path, 'w') as f:
        json.dump(metrics, f, indent=2)
    
    print(f"[METRICS] [OK] Mesh metrics calculated:")
    print(f"[METRICS]   Bounding Box: {dimensions.x:.3f}m x {dimensions.y:.3f}m x {dimensions.z:.3f}m")
    print(f"[METRICS]   Volume (bbox): {bbox_volume_m3:.6f} m^3")
    print(f"[METRICS]   Volume (mesh): {mesh_volume_m3:.6f} m^3")
    print(f"[METRICS]   Surface Area: {surface_area_m2:.6f} m^2")
    print(f"[METRICS]   Packaging Efficiency: {metrics['packaging_efficiency']['volume_utilization']:.2f}%")
    print(f"[METRICS]   Saved to: {metrics_path}\n")
    # ===========================================================================
    
    # =========================================================================
    # 7. Multi-Asset Export Configuration
    # =========================================================================
    glb_out_path = os.path.join(outputs_dir, "preview.glb")
    svg_out_path = os.path.join(outputs_dir, "dieline_pattern.svg")
    
    # File A: Highly compressed Web 3D GLB Viewport Payload
    print(f"\n[EXPORT] Exporting 3D preview to GLB format...")
    bpy.ops.export_scene.gltf(
        filepath=glb_out_path, 
        export_format='GLB', 
        use_selection=False
    )
    
    if os.path.exists(glb_out_path):
        glb_size_kb = os.path.getsize(glb_out_path) / 1024
        print(f"[EXPORT] [OK] GLB export successful: preview.glb ({glb_size_kb:.2f} KB)")
    else:
        raise RuntimeError("GLB export failed: preview.glb not created")
    
    # =========================================================================
    # File B: Flat Unwrapped Layout Execution via Direct Module Manipulation
    # =========================================================================
    # The io_mesh_paper_model addon requires careful setup to work headlessly.
    # We ensure the object is properly selected and in edit mode, then attempt
    # direct module access for maximum stability, with operator fallback.
    
    print(f"\n[EXPORT] Preparing mesh for 2D dieline unfold...")
    
    # Ensure object is active and completely selected in edit mode
    obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    
    print(f"[EXPORT] Attempting direct module unfold (Method 1: Direct API)...")
    
    # Method 1: Direct module access bypasses operator UI bugs in Blender 4.x
    try:
        import bl_ext.blender_org.export_paper_model.unfolder as unfolder_module
        from bl_ext.blender_org.export_paper_model.svg import Svg
        from mathutils import Vector
        
        # Create a proper style object for SVG export
        class ExportStyle:
            """Style configuration for SVG export"""
            line_width = 1.0
            line_style = 'SOLID'
        
        class UnfoldProperties:
            """Configuration object matching addon's expected property structure"""
            filepath = svg_out_path
            file_format = 'SVG'
            output_size_x = 2.0   # A3 width (meters)
            output_size_y = 2.0   # A3 height (meters)
            output_margin = 0.005   # 5mm margin
            output_dpi = 90
            scale = 1.0
            tab_style = 'NONE'
            number_style = 'NONE'
            sticker_width = 0.005
            paper_thickness = 0.0
            angle_epsilon = 3.14
            texture_type = 'NONE'
            nesting_method = 'BOUNDING_BOX'
            style = ExportStyle()

        props = UnfoldProperties()
        
        # Instantiate the Unfolder engine directly
        print(f"[EXPORT]   Initializing unfolder for {len(obj.data.polygons)} faces...")
        unfolder = unfolder_module.Unfolder(obj)
        unfolder.do_create_uvmap = False
        
        # Prepare, limit islands and cuts (1:1 scale, split across pages if too big)
        cage_size = Vector((props.output_size_x, props.output_size_y))
        print(f"[EXPORT]   Computing optimal layout (page size: A3)...")
        unfolder.prepare(cage_size, scale=1.0, limit_by_page=False)
        
        # Instantiate SVG exporter
        exporter = Svg(props)
        
        # Manually trigger SVG save avoiding the buggy UI operator wrapping
        print(f"[EXPORT]   Writing SVG to disk...")
        unfolder.save(props, exporter)
        unfolder = None
        
        if os.path.exists(svg_out_path):
            svg_size_kb = os.path.getsize(svg_out_path) / 1024
            print(f"[EXPORT] [OK] Direct module unfold successful: dieline_pattern.svg ({svg_size_kb:.2f} KB)")
        else:
            raise RuntimeError("Direct unfold completed but SVG file not created")
        
    except Exception as direct_exception:
        print(f"[EXPORT] [FAIL] Direct module method failed: {direct_exception}")
        print(f"[EXPORT] Attempting standard operator fallback (Method 2: Operator API)...")
        
        # Method 2: Standard operator fallback for environments where direct access fails
        try:
            bpy.ops.export_mesh.paper_model(
                filepath=svg_out_path,
                file_format='SVG',
                output_size_x=2.0,
                output_size_y=2.0,
                output_margin=0.005,
                output_dpi=90,
                scale=1.0,
                tab_style='NONE',
                number_style='NONE',
            )
            
            # Give file system a moment to write the file
            import time
            time.sleep(0.5)
            
            if os.path.exists(svg_out_path):
                svg_size_kb = os.path.getsize(svg_out_path) / 1024
                print(f"[EXPORT] [OK] Fallback operator export successful: dieline_pattern.svg ({svg_size_kb:.2f} KB)")
            else:
                # Check if file exists with different name/location
                outputs_dir = os.path.dirname(svg_out_path)
                for fname in os.listdir(outputs_dir):
                    if fname.endswith('.svg'):
                        print(f"[EXPORT] [WARN] SVG file found with unexpected name: {fname}")
                        # Rename to expected filename
                        actual_path = os.path.join(outputs_dir, fname)
                        os.rename(actual_path, svg_out_path)
                        svg_size_kb = os.path.getsize(svg_out_path) / 1024
                        print(f"[EXPORT] [OK] Renamed to dieline_pattern.svg ({svg_size_kb:.2f} KB)")
                        break
                else:
                    raise RuntimeError("Operator export completed but SVG file not created")
                
        except Exception as operator_exception:
            bpy.ops.object.mode_set(mode='OBJECT')
            error_msg = (
                f"All SVG export methods failed.\n"
                f"  - Direct module error: {direct_exception}\n"
                f"  - Operator error: {operator_exception}\n"
                f"Possible causes:\n"
                f"  1. io_mesh_paper_model addon not properly installed/enabled\n"
                f"  2. Mesh still too complex despite optimization ({len(obj.data.polygons)} faces)\n"
                f"  3. Non-manifold geometry or self-intersections in mesh\n"
                f"  4. Addon incompatible with Blender version (requires 4.2+)"
            )
            raise RuntimeError(error_msg)
            
    bpy.ops.object.mode_set(mode='OBJECT')
    
    print(f"\n[SUCCESS] ===========================================================")
    print(f"[SUCCESS] Pipeline completed successfully!")
    print(f"[SUCCESS] Assets generated:")
    print(f"[SUCCESS]   - 3D Preview:  {glb_out_path}")
    print(f"[SUCCESS]   - 2D Dieline:  {svg_out_path}")
    print(f"[SUCCESS] ===========================================================\n")

import sys
import traceback

if __name__ == "__main__":
    try:
        run_morpho_dynamic_pipeline()
    except Exception as e:
        print(f"PIPELINE FATAL ERROR: {str(e)}", file=sys.stderr)
        traceback.print_exc()
        sys.exit(1)




