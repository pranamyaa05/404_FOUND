"""
Run this from the project root to debug TRELLIS API step by step.
Usage:  python test_trellis.py path\to\your\image.png
"""
import sys, os, time

try:
    from gradio_client import Client, handle_file
except ImportError:
    print("ERROR: pip install gradio-client")
    sys.exit(1)

IMG = sys.argv[1] if len(sys.argv) > 1 else None
if not IMG or not os.path.exists(IMG):
    print("Usage: python test_trellis.py <path-to-image>")
    sys.exit(1)

print(f"\n[1] Connecting to TRELLIS space (with auth)...")
# Set auth token so gradio_client authenticates with ZeroGPU
HF_TOKEN = os.environ.get('HF_TOKEN', '')
if HF_TOKEN:
    os.environ['HUGGING_FACE_HUB_TOKEN'] = HF_TOKEN
    print(f"    Using HF token: {HF_TOKEN[:8]}...")
else:
    print("    WARNING: No HF_TOKEN env var set. Running anonymously (may be rejected by ZeroGPU).")
client = Client("trellis-community/TRELLIS")
print("    Connected!")

print(f"\n[1.5] Initializing session directory (/load)...")
try:
    client.predict(api_name="/load")
    print("    Session initialized successfully.")
except Exception as e:
    print(f"    /load failed (this might be expected if no api_name exists): {e}")

print(f"\n[2] Preprocessing image: {IMG}")
try:
    preprocessed = client.predict(handle_file(IMG), api_name="/preprocess_image")
    print(f"    Result type : {type(preprocessed)}")
    print(f"    Result value: {preprocessed}")
except Exception as e:
    print(f"    FAILED: {e}")
    sys.exit(1)

# Unwrap dict/tuple
if isinstance(preprocessed, dict):
    preprocessed_path = preprocessed.get('path') or preprocessed.get('url') or IMG
elif isinstance(preprocessed, (list, tuple)):
    preprocessed_path = preprocessed[0]
    if isinstance(preprocessed_path, dict):
        preprocessed_path = preprocessed_path.get('path') or IMG
else:
    preprocessed_path = preprocessed
print(f"    Using path  : {preprocessed_path}")

print(f"\n[3] Initializing tab state (/lambda = single-image tab)...")
try:
    r = client.predict(api_name="/lambda")
    print(f"    Result: {r}")
except Exception as e:
    print(f"    FAILED: {e}")
    sys.exit(1)

print(f"\n[4] Initializing seed (/get_seed)...")
try:
    seed = client.predict(True, 0, api_name="/get_seed")
    print(f"    Seed returned: {seed}")
except Exception as e:
    print(f"    FAILED: {e}")
    seed = 0

print(f"\n[5] Calling generate_and_extract_glb...")
print(f"    Building base64 data URI from: {preprocessed_path}")
import base64
with open(preprocessed_path, 'rb') as f:
    b64 = base64.b64encode(f.read()).decode('utf-8')
image_data = {"url": f"data:image/png;base64,{b64}", "meta": {"_type": "gradio.FileData"}}
print(f"    Image data URI length: {len(image_data['url'])} chars")

try:
    result = client.predict(
        image_data,
        [],        # multiimages (empty = single mode)
        int(seed) if seed else 0,
        7.5,       # ss_guidance_strength
        12,        # ss_sampling_steps
        3.0,       # slat_guidance_strength
        12,        # slat_sampling_steps
        "stochastic",
        0.95,
        1024,
        api_name="/generate_and_extract_glb"
    )
    print(f"    SUCCESS! Result: {result}")
except Exception as e:
    import traceback
    print(f"    FAILED:")
    traceback.print_exc()
    sys.exit(1)

print("\nDone!")
