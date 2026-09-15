import os
import time
import tempfile
from flask import Flask, request, jsonify, send_file
from dotenv import load_dotenv

# --- Fix for httpx.ReadTimeout on long ZeroGPU tasks ---
import httpx
original_init = httpx.Client.__init__
def patched_init(self, *args, **kwargs):
    kwargs['timeout'] = httpx.Timeout(600.0) # 10 minutes
    original_init(self, *args, **kwargs)
httpx.Client.__init__ = patched_init
# -------------------------------------------------------

try:
    from gradio_client import Client, handle_file
    HAS_GRADIO_CLIENT = True
except ImportError:
    HAS_GRADIO_CLIENT = False

load_dotenv()
hf_token = os.environ.get('HF_TOKEN')
app = Flask(__name__, static_folder='../frontend', static_url_path='')


@app.route('/api/config')
def get_config():
    return jsonify({'hf_token': hf_token})


@app.route('/')
def index():
    return app.send_static_file('index.html')


@app.route('/api/local_file')
def serve_local_file():
    """Serves GLB files that gradio_client downloaded to local temp folders."""
    path = request.args.get('path')
    if not path or not os.path.exists(path):
        return jsonify({'error': 'File not found'}), 404
    return send_file(path, mimetype='model/gltf-binary')


def make_client():
    """Create Gradio client with 3 retries for transient network errors."""
    # Set token so huggingface_hub (used internally by gradio_client) authenticates.
    # This is needed for ZeroGPU spaces — anonymous users get rejected.
    if hf_token:
        os.environ['HUGGING_FACE_HUB_TOKEN'] = hf_token
        os.environ['HF_TOKEN'] = hf_token

    for attempt in range(3):
        try:
            return Client("trellis-community/TRELLIS")
        except Exception as e:
            print(f"[Trellis] Client init attempt {attempt+1}/3 failed: {e}")
            if attempt == 2:
                raise
            time.sleep(3)


@app.route('/api/trellis/generate', methods=['POST'])
def trellis_generate():
    if not HAS_GRADIO_CLIENT:
        return jsonify({'error': 'Run: pip install gradio-client  then restart the server.'}), 502
    if not hf_token:
        return jsonify({'error': 'Missing HuggingFace Token in backend/.env'}), 401
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    image_files = request.files.getlist('image')
    local_paths = []
    for f in image_files:
        if not f.filename:
            continue
        # Always save as .png for consistent handling
        fd, path = tempfile.mkstemp(suffix='.png')
        os.close(fd)
        f.save(path)

        # Resize to max 1024px to prevent upload timeouts (WriteTimeout)
        try:
            from PIL import Image as PILImage
            img = PILImage.open(path).convert('RGBA')
            max_side = 1024
            if img.width > max_side or img.height > max_side:
                img.thumbnail((max_side, max_side), PILImage.LANCZOS)
                print(f"[Trellis] Resized {f.filename}: {img.size}")
            img.save(path, 'PNG')
        except ImportError:
            pass  # Pillow not installed, upload as-is
        except Exception as e:
            print(f"[Trellis] Resize warning: {e}")

        local_paths.append(path)

    if not local_paths:
        return jsonify({'error': 'No valid image provided'}), 400

    try:
        # ── 1. Connect and init session ────────────────────────────────────
        print("[Trellis] Connecting to Gradio space...")
        client = make_client()
        
        print("[Trellis] Initializing session directory on server...")
        client.predict(api_name="/start_session")

        # ── 2. Pre-process (background removal) ────────────────────────────
        print("[Trellis] Preprocessing image (background removal)...")
        preprocessed = client.predict(
            handle_file(local_paths[0]),
            api_name="/preprocess_image"
        )
        print(f"[Trellis] Preprocessed result: {preprocessed}")

        # Handle dict or tuple return from newer gradio_client versions
        if isinstance(preprocessed, dict):
            preprocessed = preprocessed.get('path') or preprocessed.get('url') or local_paths[0]
        elif isinstance(preprocessed, (list, tuple)):
            preprocessed = preprocessed[0]
            if isinstance(preprocessed, dict):
                preprocessed = preprocessed.get('path') or preprocessed.get('url')

        # ── 3. Initialize tab state (CRITICAL for FileNotFoundError fix) ───
        print("[Trellis] Initializing tab state...")
        client.predict(api_name="/lambda")     # "Single Image" tab

        # ── 4. Initialize seed state ────────────────────────────────────────
        print("[Trellis] Initializing seed state...")
        seed_result = client.predict(
            True,   # randomize_seed checkbox
            0,      # seed slider
            api_name="/get_seed"
        )
        # /get_seed returns the resolved seed (int)
        resolved_seed = int(seed_result) if seed_result is not None else 0
        print(f"[Trellis] Resolved seed: {resolved_seed}")

        # ── 5. Generate & extract GLB ───────────────────────────────────────
        print("[Trellis] Starting 3D generation. This may take 1-3 minutes...")
        
        # Use .submit() instead of .predict() to avoid httpx ReadTimeout on long zeroGPU tasks
        import base64
        def to_data_uri(path):
            with open(path, 'rb') as f:
                b64 = base64.b64encode(f.read()).decode('utf-8')
            return f"data:image/png;base64,{b64}"

        main_img = {"url": to_data_uri(preprocessed), "meta": {"_type": "gradio.FileData"}}
        
        job = client.submit(
            main_img,                             # image
            [],                                   # multiimages (empty list)
            resolved_seed,                        # seed
            7.5,                          # ss_guidance_strength
            12,                           # ss_sampling_steps
            3.0,                          # slat_guidance_strength
            12,                           # slat_sampling_steps
            "stochastic",                 # multiimage_algo
            0.95,                         # mesh_simplify
            1024,                         # texture_size
            api_name="/generate_and_extract_glb"
        )
        
        while not job.done():
            time.sleep(2)
            
        result = job.result()
        print(f"[Trellis] Generation result: {result}")

        # ── 7. Extract GLB path from result ────────────────────────────────
        # Result is a tuple: (video_local_path, litmodel3d_glb, download_btn_glb)
        glb_path = None

        def extract_glb(item):
            if isinstance(item, str) and item.lower().endswith('.glb'):
                return item
            if isinstance(item, dict):
                p = item.get('path') or ''
                if p.lower().endswith('.glb'):
                    return p
                u = item.get('url') or ''
                if u.lower().endswith('.glb'):
                    return u
            return None

        if isinstance(result, (list, tuple)):
            # Try from the end (download_btn is last and most reliable)
            for item in reversed(result):
                found = extract_glb(item)
                if found:
                    glb_path = found
                    break
            # Last resort: accept any .glb-like item in any position
            if not glb_path:
                for item in result:
                    found = extract_glb(item)
                    if found:
                        glb_path = found
                        break
        else:
            glb_path = extract_glb(result)

        if glb_path:
            print(f"[Trellis] ✅ GLB found at: {glb_path}")
            return jsonify({'glb_url': f'/api/local_file?path={glb_path}'})
        else:
            return jsonify({'error': f'No GLB found in result: {result}'}), 502

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/blender/generate_pattern', methods=['POST'])
def blender_generate_pattern():
    if 'model' not in request.files:
        return jsonify({'error': 'No GLB model provided'}), 400
        
    workspace_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    backend_dir = os.path.join(workspace_root, 'backend')
    pipeline_script = os.path.join(backend_dir, 'blender_pipeline.py')
    
    if not os.path.exists(pipeline_script):
        return jsonify({'error': f'Pipeline script not found at {pipeline_script}.'}), 404

    try:
        import subprocess
        import tempfile
        
        # Create a unique temp directory for this generation job
        temp_dir = tempfile.mkdtemp(prefix="blender_dieline_")
        uploads_dir = os.path.join(temp_dir, 'uploads')
        outputs_dir = os.path.join(temp_dir, 'outputs')
        os.makedirs(uploads_dir, exist_ok=True)
        os.makedirs(outputs_dir, exist_ok=True)
        
        # Save uploaded GLB
        model_file = request.files['model']
        input_glb_path = os.path.join(uploads_dir, 'input.glb')
        model_file.save(input_glb_path)
        
        # Locate blender executable
        import shutil
        blender_exe = shutil.which("blender")
        if not blender_exe:
            # Fallbacks for Windows
            possible_paths = [
                r"D:\Blender Foundation\Blender 4.5\blender.exe",
                r"C:\Program Files\Blender Foundation\Blender 4.5\blender.exe",
                r"C:\Program Files\Blender Foundation\Blender 4.4\blender.exe",
                r"C:\Program Files\Blender Foundation\Blender 4.3\blender.exe",
                r"C:\Program Files\Blender Foundation\Blender 4.2\blender.exe",
                r"C:\Program Files\Blender Foundation\Blender 4.1\blender.exe",
                r"C:\Program Files\Blender Foundation\Blender 4.0\blender.exe",
                r"C:\Program Files\Blender Foundation\Blender 3.6\blender.exe",
            ]
            for p in possible_paths:
                if os.path.exists(p):
                    blender_exe = p
                    break
                    
        if not blender_exe:
            return jsonify({'error': 'Blender executable not found. Please install Blender and add it to your system PATH.'}), 500
            
        # Run blender headlessly, passing the temp directories as environment variables
        print(f"[Blender] Using executable: {blender_exe}")
        print(f"[Blender] Running pipeline script: {pipeline_script}")
        cmd = [blender_exe, "--background", "--python", pipeline_script]
        
        # The pipeline.py uses MORPHO_UPLOADS and MORPHO_OUTPUTS env vars if present
        env = os.environ.copy()
        env["MORPHO_UPLOADS"] = uploads_dir
        env["MORPHO_OUTPUTS"] = outputs_dir
        
        result = subprocess.run(cmd, env=env, cwd=temp_dir, capture_output=True, text=True)
        
        if result.returncode != 0:
            with open(os.path.join(workspace_root, "blender_crash_log.txt"), "w") as f:
                f.write(f"--- STDOUT ---\n{result.stdout}\n\n--- STDERR ---\n{result.stderr}")
            print(f"[Blender Debug] Wrote crash logs to blender_crash_log.txt")
            return jsonify({'error': 'Blender execution failed. Ensure Blender 4.2+ is in PATH and Export Paper Model addon is enabled.'}), 500
            
        # The SVG might be paginated (e.g. dieline_pattern_1.svg)
        import glob
        svg_files = glob.glob(os.path.join(outputs_dir, '*.svg'))
        if not svg_files:
            with open(os.path.join(workspace_root, "blender_error_log.txt"), "w") as f:
                f.write(f"--- STDOUT ---\n{result.stdout}\n\n--- STDERR ---\n{result.stderr}")
            print(f"[Blender Debug] Wrote logs to blender_error_log.txt")
            return jsonify({'error': 'Blender completed but did not produce any SVG files.'}), 500
            
        svg_path = svg_files[0]
        with open(svg_path, 'r', encoding='utf-8') as f:
            svg_content = f.read()
            
        # Optional: Inject mesh metrics into the SVG
        import json
        metrics_path = os.path.join(outputs_dir, 'mesh_metrics.json')
        if os.path.exists(metrics_path):
            with open(metrics_path, 'r') as mf:
                metrics = json.load(mf)
                
            w = metrics.get('bounding_box', {}).get('width_m', 0.0)
            h = metrics.get('bounding_box', {}).get('height_m', 0.0)
            d = metrics.get('bounding_box', {}).get('depth_m', 0.0)
            
            import re
            
            # 1) Find the opening <svg> tag to parse and expand bounds
            svg_tag_match = re.search(r'<svg[^>]*>', svg_content)
            box_x, box_y = 10, 30
            scale = 1.0
            
            if svg_tag_match:
                svg_tag = svg_tag_match.group(0)
                w_match = re.search(r'\bwidth="([0-9\.]+)([^"]*)"', svg_tag)
                h_match = re.search(r'\bheight="([0-9\.]+)([^"]*)"', svg_tag)
                vb_match = re.search(r'viewBox="([^"]+)"', svg_tag)
                
                try:
                    vb_w, vb_h = 1000.0, 1000.0
                    min_x, min_y = 0.0, 0.0
                    
                    if vb_match:
                        vb = list(map(float, vb_match.group(1).split()))
                        min_x, min_y, vb_w, vb_h = vb
                    elif w_match and h_match:
                        vb_w = float(w_match.group(1))
                        vb_h = float(h_match.group(1))
                        
                    # Add 40% more canvas space to the right side
                    extra_w = vb_w * 0.40
                    new_vb_w = vb_w + extra_w
                    
                    new_svg_tag = svg_tag
                    new_vb_str = f'viewBox="{min_x} {min_y} {new_vb_w} {vb_h}"'
                    
                    if vb_match:
                        new_svg_tag = new_svg_tag.replace(vb_match.group(0), new_vb_str)
                    else:
                        new_svg_tag = new_svg_tag[:-1] + f' {new_vb_str}>'
                        
                    if w_match:
                        old_w_val = float(w_match.group(1))
                        unit = w_match.group(2)
                        new_w_val = old_w_val * (new_vb_w / vb_w)
                        new_svg_tag = new_svg_tag.replace(w_match.group(0), f'width="{new_w_val:.5f}{unit}"')
                        
                    svg_content = svg_content.replace(svg_tag, new_svg_tag)
                    
                    # 2) Calculate box position in the new blank space
                    box_w = 340
                    scale = (extra_w * 0.75) / box_w
                    box_x = min_x + vb_w + (extra_w * 0.125)
                    box_y = min_y + (vb_h * 0.1)
                except Exception as e:
                    print(f"Failed to expand SVG canvas: {e}")
            
            # Append a <g> tag before the closing </svg> tag
            stamp = (
                f'<g transform="translate({box_x}, {box_y}) scale({scale})">\n'
                f'  <rect x="0" y="0" width="340" height="105" fill="#f0f2f5" stroke="#333" stroke-width="2" rx="8" ry="8"/>\n'
                f'  <text x="15" y="32" font-family="monospace" font-size="16" font-weight="bold" fill="#111" style="text-anchor:start;">Mesh Bounds (meters)</text>\n'
                f'  <text x="15" y="62" font-family="monospace" font-size="14" fill="#333" style="text-anchor:start;">Width: {w} m</text>\n'
                f'  <text x="15" y="87" font-family="monospace" font-size="14" fill="#333" style="text-anchor:start;">Height: {h} m, Depth: {d} m</text>\n'
                f'</g>\n</svg>'
            )
            svg_content = svg_content.replace('</svg>', stamp)
            
        # Clean up temp dir (optional, but good practice)
        try:
            import shutil
            shutil.rmtree(temp_dir)
        except:
            pass
            
        return jsonify({'svg': svg_content})
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print('Starting Flask on port 5000...')
    app.run(port=5000, debug=True)
