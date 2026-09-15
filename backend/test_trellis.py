import os
import sys
import glob
import logging
import time
import base64
import httpx

# Patch httpx to never timeout — Trellis cold starts can take 60+ seconds
_orig_init = httpx.Client.__init__
def _patched_init(self, *args, **kwargs):
    kwargs['timeout'] = httpx.Timeout(600.0)
    _orig_init(self, *args, **kwargs)
httpx.Client.__init__ = _patched_init
sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(os.getcwd())
logging.basicConfig(level=logging.INFO)

hf_token = os.environ.get('HF_TOKEN') or os.environ.get('HUGGING_FACE_HUB_TOKEN')
if not hf_token:
    print('ERROR: set HF_TOKEN or HUGGING_FACE_HUB_TOKEN before running this test')
    sys.exit(1)
os.environ['HF_TOKEN'] = hf_token
os.environ['HUGGING_FACE_HUB_TOKEN'] = hf_token

images = glob.glob('temp/*.png')
if not images:
    print('ERROR: no test image in temp/')
    sys.exit(1)

local_image = images[0]
print(f'[test] Using image: {local_image}')

from gradio_client import Client, handle_file

def to_data_uri(path):
    with open(path, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode('utf-8')
    return f'data:image/png;base64,{b64}'

client = Client('trellis-community/TRELLIS', token=hf_token)
print('[test] Connected! Starting session...')
client.predict(api_name='/start_session')

print('[test] Preprocessing image...')
preprocessed = client.predict(handle_file(local_image), api_name='/preprocess_image')
print(f'[test] Preprocessed type={type(preprocessed)} val={str(preprocessed)[:120]}')

if isinstance(preprocessed, dict):
    preprocessed_path = preprocessed.get('path') or local_image
elif isinstance(preprocessed, (list, tuple)):
    item = preprocessed[0]
    preprocessed_path = item.get('path') if isinstance(item, dict) else item
else:
    preprocessed_path = preprocessed if isinstance(preprocessed, str) else local_image

print(f'[test] Preprocessed path: {preprocessed_path}')
print('[test] Init tab state...')
client.predict(api_name='/lambda')
seed_result = client.predict(True, 0, api_name='/get_seed')
resolved_seed = int(seed_result) if seed_result is not None else 0
print(f'[test] Seed: {resolved_seed}')

print('[test] Submitting GLB generation (this takes ~2min)...')
main_img = {'url': to_data_uri(preprocessed_path), 'meta': {'_type': 'gradio.FileData'}}
job = client.submit(main_img, [], resolved_seed, 7.5, 12, 3.0, 12, 'stochastic', 0.95, 1024, api_name='/generate_and_extract_glb')

while not job.done():
    time.sleep(5)
    print('[test] Still generating...')

result = job.result()
print(f'[test] Result={str(result)[:400]}')

# Extract GLB
glb_path = None
def extract_glb(item):
    if isinstance(item, str) and item.lower().endswith('.glb'):
        return item
    if isinstance(item, dict):
        p = item.get('path') or ''
        if p.lower().endswith('.glb'): return p
        u = item.get('url') or ''
        if u.lower().endswith('.glb'): return u
    return None

if isinstance(result, (list, tuple)):
    for item in reversed(result):
        found = extract_glb(item)
        if found:
            glb_path = found
            break
else:
    glb_path = extract_glb(result)

if glb_path and os.path.exists(glb_path):
    size = os.path.getsize(glb_path)
    print(f'[test] SUCCESS! GLB at: {glb_path} ({size} bytes)')
else:
    print(f'[test] FAIL - no GLB found. Full result: {result}')
