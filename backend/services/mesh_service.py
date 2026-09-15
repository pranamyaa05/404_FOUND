"""
3D Mesh & Die-line Generation Service (Trellis Integration)
---------------------------------------
This service takes the enhanced image, calls the Trellis API via gradio_client
to generate a 3D .glb mesh, and then calls Blender headlessly to generate
a 2D SVG die-line pattern using blender_pipeline.py.
"""

import subprocess
import uuid
import os
import json
import logging
import traceback
import time
import base64
import shutil
import tempfile
from config import settings

hf_token = os.environ.get('HUGGINGFACE_API_KEY') or os.environ.get('HF_TOKEN')
if hf_token and hf_token.strip() != "your_huggingface_api_key_here":
    os.environ['HUGGING_FACE_HUB_TOKEN'] = hf_token
    os.environ['HF_TOKEN'] = hf_token

logger = logging.getLogger(__name__)

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLENDER_SCRIPTS_DIR = os.path.abspath(os.path.join(_BACKEND_DIR, "..", "blender-scripts"))
SCRIPT_PATH = os.path.join(BLENDER_SCRIPTS_DIR, "blender_pipeline.py")
TEMP_DIR = os.path.join(_BACKEND_DIR, "temp")

# Patch httpx to prevent timeouts on long Gradio operations
import httpx
original_init = httpx.Client.__init__
def patched_init(self, *args, **kwargs):
    kwargs['timeout'] = httpx.Timeout(600.0) # 10 minutes
    original_init(self, *args, **kwargs)
httpx.Client.__init__ = patched_init

def to_data_uri(path):
    with open(path, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode('utf-8')
    return f"data:image/png;base64,{b64}"

def generate(measurements: dict | None, style: str, image_url: str | None = None) -> dict:
    os.makedirs(TEMP_DIR, exist_ok=True)
    run_id = uuid.uuid4().hex

    if not image_url:
        raise RuntimeError("Trellis generation requires an enhanced_image_url.")

    # 1. Resolve local path of the image
    image_filename = image_url.split('/')[-1]
    local_image = os.path.join(TEMP_DIR, image_filename)
    if not os.path.exists(local_image):
        raise RuntimeError(f"Local image not found: {local_image}")

    from gradio_client import Client
    try:
        from gradio_client import handle_file
    except ImportError:
        from gradio_client import file as handle_file

    # Resize image to max 1024px to prevent upload timeouts (WriteTimeout) in gradio_client
    try:
        from PIL import Image as PILImage
        img = PILImage.open(local_image).convert('RGBA')
        max_side = 1024
        if img.width > max_side or img.height > max_side:
            img.thumbnail((max_side, max_side), PILImage.LANCZOS)
            logger.info(f"[mesh] Resized {local_image} to {img.size}")
            img.save(local_image, 'PNG')
    except Exception as e:
        logger.warning(f"[mesh] Image resize skipped or failed: {e}")

    # Retry loop to handle HF ZeroGPU cold starts (space needs up to 60s to warm up)
    client = None
    for attempt in range(5):
        try:
            import sys
            if hasattr(sys.stdout, 'reconfigure'):
                sys.stdout.reconfigure(encoding='utf-8')
            if hasattr(sys.stderr, 'reconfigure'):
                sys.stderr.reconfigure(encoding='utf-8')
                
            client = Client(
                "trellis-community/TRELLIS",
                hf_token=hf_token if hf_token else None
            )
            break
        except Exception as e:
            logger.warning(f"[mesh] Client init attempt {attempt+1}/5 failed: {e}")
            if attempt == 4:
                raise
            logger.info(f"[mesh] Waiting 15s for HF Space to warm up...")
            time.sleep(15)

    try:
        logger.info("[mesh] Trellis: Initializing session...")
        client.predict(api_name="/start_session")
        
        logger.info("[mesh] Trellis: Preprocessing image...")
        preprocessed = client.predict(handle_file(local_image), api_name="/preprocess_image")
        
        if isinstance(preprocessed, dict):
            preprocessed = preprocessed.get('path') or preprocessed.get('url') or local_image
        elif isinstance(preprocessed, (list, tuple)):
            preprocessed = preprocessed[0]
            if isinstance(preprocessed, dict):
                preprocessed = preprocessed.get('path') or preprocessed.get('url')

        logger.info("[mesh] Trellis: Initializing tab and seed...")
        client.predict(api_name="/lambda")
        seed_result = client.predict(True, 0, api_name="/get_seed")
        resolved_seed = int(seed_result) if seed_result is not None else 0

        logger.info("[mesh] Trellis: Submitting GLB generation task...")
        main_img = {"url": to_data_uri(preprocessed), "meta": {"_type": "gradio.FileData"}}
        
        job = client.submit(
            main_img, [], resolved_seed, 7.5, 12, 3.0, 12, "stochastic", 0.95, 1024,
            api_name="/generate_and_extract_glb"
        )
        
        while not job.done():
            time.sleep(2)
            
        result = job.result()
        logger.info("[mesh] Trellis: Generation complete.")

        # Extract GLB path
        glb_path = None
        def extract_glb(item):
            if isinstance(item, str) and item.lower().endswith('.glb'): return item
            if isinstance(item, dict):
                val = item.get('path') or item.get('url')
                if str(val).lower().endswith('.glb'): return val
            return None

        if isinstance(result, (list, tuple)):
            for item in reversed(result):
                found = extract_glb(item)
                if found:
                    glb_path = found
                    break
        else:
            glb_path = extract_glb(result)

        if not glb_path or not os.path.exists(glb_path):
            raise RuntimeError(f"Trellis GLB extraction failed. Result: {result}")

    except Exception as e:
        logger.error("[mesh] Trellis pipeline failed:\n%s", traceback.format_exc())
        raise RuntimeError(f"Trellis API failed: {str(e)}")

    # 3. Call Blender for die-lines
    logger.info("[mesh] Running Blender paper model pipeline...")
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
                
    has_blender = bool(blender_exe)

    morpho_dir = tempfile.mkdtemp(prefix="morpho_")
    uploads_dir = os.path.join(morpho_dir, "uploads")
    outputs_dir = os.path.join(morpho_dir, "outputs")
    os.makedirs(uploads_dir, exist_ok=True)
    os.makedirs(outputs_dir, exist_ok=True)

    input_glb = os.path.join(uploads_dir, "input.glb")
    shutil.copy2(glb_path, input_glb)

    if has_blender:
        env = os.environ.copy()
        env["MORPHO_UPLOADS"] = uploads_dir
        env["MORPHO_OUTPUTS"] = outputs_dir
        cmd = [blender_exe, "--background", "--python", SCRIPT_PATH]
        logger.info("[mesh] Executing: %s", " ".join(cmd))
        try:
            b_result = subprocess.run(cmd, env=env, cwd=morpho_dir, capture_output=True, text=True, timeout=180)
            if b_result.returncode != 0:
                logger.error("[mesh] Blender failed, but proceeding with raw Trellis GLB:\n%s", b_result.stderr[-2000:])
        except Exception as e:
            logger.error("[mesh] Blender execution error (proceeding with raw Trellis GLB):\n%s", traceback.format_exc())
    else:
        logger.warning("[mesh] Blender not found, skipping die-line generation. Using raw Trellis model.")

    preview_glb = os.path.join(outputs_dir, "preview.glb")
    if not os.path.exists(preview_glb):
        preview_glb = input_glb  # Fallback to trellis raw

    dieline_svg = os.path.join(outputs_dir, "dieline_pattern.svg")
    if not os.path.exists(dieline_svg):
        import glob
        svgs = glob.glob(os.path.join(outputs_dir, "*.svg"))
        if svgs:
            dieline_svg = svgs[0]

    # Inject mesh metrics into the SVG if available
    if os.path.exists(dieline_svg):
        metrics_path = os.path.join(outputs_dir, 'mesh_metrics.json')
        if os.path.exists(metrics_path):
            try:
                import json
                with open(metrics_path, 'r') as mf:
                    metrics = json.load(mf)
                    
                w = metrics.get('bounding_box', {}).get('width_m', 0.0)
                h = metrics.get('bounding_box', {}).get('height_m', 0.0)
                d = metrics.get('bounding_box', {}).get('depth_m', 0.0)
                
                import re
                with open(dieline_svg, 'r', encoding='utf-8') as f:
                    svg_content = f.read()
                    
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
                        logger.error(f"Failed to expand SVG canvas: {e}")
                
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
                
                with open(dieline_svg, 'w', encoding='utf-8') as f:
                    f.write(svg_content)
                    
            except Exception as e:
                logger.error(f"Failed to inject metrics into SVG: {e}")
    else:
        logger.warning("[mesh] SVG generation failed, using dummy SVG")
        dieline_svg = os.path.join(outputs_dir, "dieline_dummy.svg")
        with open(dieline_svg, 'w') as f:
            f.write('<svg width="200" height="100"><text x="10" y="50">SVG Generation Failed</text></svg>')

    # 4. Copy to temp dir to serve
    # Naming as .glb works with useGLTF in frontend
    final_glb_path = os.path.join(TEMP_DIR, f"{run_id}.glb")
    final_svg_path = os.path.join(TEMP_DIR, f"{run_id}.svg")
    
    shutil.copy2(preview_glb, final_glb_path)
    shutil.copy2(dieline_svg, final_svg_path)

    try:
        shutil.rmtree(morpho_dir)
    except: pass

    logger.info("[mesh] Generation complete. run_id=%s", run_id)
    return {
        "gltf_url": f"/files/{run_id}.glb",
        "die_line_url": f"/files/{run_id}.svg"
    }
