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
import glob
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
# Prefer the new semantic panel dieline script; fall back to older versions
SCRIPT_PATH = os.path.join(BLENDER_SCRIPTS_DIR, "dieline_garment_panels.py")
if not os.path.exists(SCRIPT_PATH):
    SCRIPT_PATH = os.path.join(BLENDER_SCRIPTS_DIR, "blender_pipeline_structured.py")
if not os.path.exists(SCRIPT_PATH):
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

            # gradio_client 2.7+ uses token=, not hf_token=
            client = Client(
                "trellis-community/TRELLIS",
                token=hf_token if hf_token else None
            )
            break
        except Exception as e:
            logger.warning(f"[mesh] Client init attempt {attempt+1}/5 failed: {e}")
            if attempt == 4:
                raise
            wait = 15 * (attempt + 1)
            logger.info(f"[mesh] HF Space warming up... retrying in {wait}s")
            time.sleep(wait)

    try:
        logger.info("[mesh] Trellis: Initializing session...")
        client.predict(api_name="/start_session")
        
        logger.info("[mesh] Trellis: Preprocessing image...")
        preprocessed = client.predict(handle_file(local_image), api_name="/preprocess_image")
        
        # In gradio_client 2.7.0, preprocess_image returns a plain local file path string
        if isinstance(preprocessed, str):
            preprocessed_path = preprocessed
        elif isinstance(preprocessed, dict):
            preprocessed_path = preprocessed.get('path') or preprocessed.get('url') or local_image
        elif isinstance(preprocessed, (list, tuple)):
            item = preprocessed[0]
            preprocessed_path = item.get('path') if isinstance(item, dict) else (item if isinstance(item, str) else local_image)
        else:
            preprocessed_path = local_image

        logger.info(f"[mesh] Trellis: Preprocessed path = {preprocessed_path}")

        logger.info("[mesh] Trellis: Initializing tab and seed...")
        client.predict(api_name="/lambda")
        seed_result = client.predict(True, 0, api_name="/get_seed")
        resolved_seed = int(seed_result) if seed_result is not None else 0

        logger.info("[mesh] Trellis: Submitting GLB generation task...")
        main_img = {"url": to_data_uri(preprocessed_path), "meta": {"_type": "gradio.FileData"}}
        
        job = client.submit(
            main_img, [], resolved_seed, 7.5, 12, 3.0, 12, "stochastic", 0.95, 1024,
            api_name="/generate_and_extract_glb"
        )
        
        logger.info("[mesh] Trellis: Waiting for job to complete...")
        iteration = 0
        while not job.done():
            time.sleep(2)
            iteration += 1
            if iteration % 5 == 0:
                logger.info(f"[mesh] Trellis: Job still running (iteration {iteration})...")
            
        logger.info("[mesh] Trellis: Fetching job result...")
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
        # Pass body measurements and garment type to dieline script
        if measurements:
            env["GARMENT_MEASUREMENTS"] = json.dumps(measurements)
        env["GARMENT_TYPE"] = (style or "dress").lower().strip()
        cmd = [blender_exe, "--background", "--python", SCRIPT_PATH]
        logger.info("[mesh] Executing: %s", " ".join(cmd))
        try:
            b_result = subprocess.run(cmd, env=env, cwd=morpho_dir, capture_output=True, text=True, timeout=300)
            # NOTE: The Export Paper Model addon emits a harmless BMesh __del__ exception
            # that causes Blender to exit with code 1 even on a successful run.
            # We therefore check for output files rather than the return code.
            preview_exists = os.path.exists(os.path.join(outputs_dir, "preview.glb"))
            svg_exists = bool(glob.glob(os.path.join(outputs_dir, "*.svg")))
            if not preview_exists and not svg_exists:
                logger.error("[mesh] Blender produced no output files (exit %d).\nSTDOUT: %s\nSTDERR: %s",
                             b_result.returncode, b_result.stdout[-2000:], b_result.stderr[-2000:])
                with open(os.path.join(_BACKEND_DIR, "blender_error_log.txt"), "w") as f:
                    f.write(f"--- STDOUT ---\n{b_result.stdout}\n\n--- STDERR ---\n{b_result.stderr}")
            else:
                logger.info("[mesh] Blender finished (exit %d). Outputs present — proceeding.", b_result.returncode)
        except subprocess.TimeoutExpired:
            logger.error("[mesh] Blender timed out after 300s")
        except Exception as e:
            logger.error("[mesh] Blender execution error:\n%s", traceback.format_exc())
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
