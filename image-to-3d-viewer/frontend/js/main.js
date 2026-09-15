import { initViewer, loadGlb, resetCamera, toggleWire, toggleLights, toggleGrid } from './viewer.js';

/* ── State ─────────────────────────────────────────────────────────────────── */
let currentMode   = 'single';   // 'single' | 'multi'
let selectedFiles = [];         // files ready to send
let glbBuffer     = null;

/* ── Expose to window (HTML onclick) ───────────────────────────────────────── */
window.generate      = generate;
window.switchViewportTab = switchViewportTab;
window.downloadGlb   = downloadGlb;
window.downloadSvg   = downloadSvg;
window.generateDieline = generateDieline;
window.resetCamera   = resetCamera;
window.toggleWire    = toggleWire;
window.toggleLights  = toggleLights;
window.toggleGrid    = toggleGrid;

/* ── Boot ───────────────────────────────────────────────────────────────────── */
initViewer('three-canvas');

fetch('/api/config')
  .then(r => r.json())
  .then(d => { if (d.hf_token) document.getElementById('hf-token').value = d.hf_token; })
  .catch(() => {});

/* ── Upload handlers ────────────────────────────────────────────────────────── */
const inputSingle = document.getElementById('image-input-single');
const zoneSingle  = document.getElementById('upload-zone-single');

inputSingle.addEventListener('change', e => { if (e.target.files.length) handleSingle(e.target.files); });
zoneSingle.addEventListener('dragover',  e => { e.preventDefault(); zoneSingle.classList.add('over'); });
zoneSingle.addEventListener('dragleave', () => zoneSingle.classList.remove('over'));
zoneSingle.addEventListener('drop', e => {
  e.preventDefault(); zoneSingle.classList.remove('over');
  if (e.dataTransfer.files.length) handleSingle(e.dataTransfer.files);
});

function handleSingle(files) {
  selectedFiles = [files[0]];
  const prev = document.getElementById('preview-single');
  prev.src = URL.createObjectURL(files[0]);
  prev.style.display = 'block';
  document.getElementById('upload-zone-single').style.display = 'none';
  document.getElementById('hint-single').textContent = `✔ ${files[0].name}`;
  document.getElementById('gen-btn').disabled = false;
}

/* ── UI helpers ─────────────────────────────────────────────────────────────── */
window.toggleBlender = function() {
  document.getElementById('bl-hd').classList.toggle('open');
  document.getElementById('bl-body').classList.toggle('open');
};

function setStatus(type, msg, spin = false) {
  const bar = document.getElementById('status-bar');
  bar.className = 'status ' + (type || '');
  if (type) bar.style.display = 'flex'; else bar.style.display = 'none';
  document.getElementById('status-txt').textContent = msg;
  const sp = document.getElementById('spinner');
  if (sp) sp.style.display = spin ? 'block' : 'none';
}

function setProgress(mode, pct = 0) {
  const wrap = document.getElementById('prog-wrap');
  const bar  = document.getElementById('prog-bar');
  if (mode === 'pulse') {
    wrap.className = 'prog-wrap pulse';
  } else if (mode === 'value') {
    wrap.className = 'prog-wrap';
    wrap.style.display = 'block';
    bar.style.width = pct + '%';
  } else {
    wrap.className = 'prog-wrap';
    wrap.style.display = 'none';
  }
}

/* ── GLB loading ────────────────────────────────────────────────────────────── */
async function fetchAndLoadGlb(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Failed to download GLB: HTTP ' + resp.status);
  const buf = await resp.arrayBuffer();
  glbBuffer = buf;

  loadGlb(buf, (verts, faces) => {
    const badge = document.getElementById('model-badge');
    if (badge) {
      badge.textContent = verts.toLocaleString() + ' verts · ' + faces.toLocaleString() + ' faces';
      badge.style.display = 'block';
    }
    document.getElementById('vp-overlay').style.display = 'none';
    setStatus('ok', '✅ 3D mesh loaded!');
    setProgress('value', 100);
    document.getElementById('dl-section').style.display = '';
    const btn = document.getElementById('gen-btn');
    btn.disabled = false;
    btn.textContent = '✨ Generate Another';
  }, err => {
    console.error('[GLTFLoader]', err);
    setStatus('err', '❌ Failed to parse GLB: ' + (err.message || err));
    document.getElementById('gen-btn').disabled = false;
    document.getElementById('gen-btn').textContent = '✨ Generate 3D Mesh';
  });
}

function downloadGlb() {
  if (!glbBuffer) return;
  const blob = new Blob([glbBuffer], { type: 'model/gltf-binary' });
  Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: 'mesh.glb'
  }).click();
}

/* ── Generate ───────────────────────────────────────────────────────────────── */
async function generate() {
  if (!selectedFiles.length) return;
  const btn = document.getElementById('gen-btn');
  btn.disabled = true;
  btn.textContent = '⏳ Working...';
  document.getElementById('dl-section').style.display = 'none';
  glbBuffer = null;
  setProgress('pulse');

  try {
    const form = new FormData();
    selectedFiles.forEach(f => form.append('image', f));

    setStatus('info', `Sending to TRELLIS on HuggingFace ZeroGPU...`, true);
    const resp = await fetch('/api/trellis/generate', { method: 'POST', body: form });
    const data = await resp.json();

    if (!resp.ok || data.error) throw new Error(data.error || `Server error ${resp.status}`);
    if (!data.glb_url) throw new Error('Backend returned no GLB URL.');

    setStatus('info', 'Downloading & rendering 3D mesh...', true);
    await fetchAndLoadGlb(data.glb_url);

    // Enable the dieline generation button once 3D mesh is ready
    document.getElementById('gen-dieline-btn').disabled = false;
    
    // Show the GLB download button in the tab bar
    document.getElementById('tab-dl-glb').style.display = 'block';

  } catch (err) {
    console.error(err);
    setStatus('err', '❌ ' + (err.message || String(err)));
    btn.disabled = false;
    btn.textContent = '✨ Generate 3D Mesh';
    setProgress('off');
  }
}

/* ── 2D Dieline Pattern Generator ───────────────────────────────────────────── */
let svgContent = null;

function switchViewportTab(tabId) {
  document.getElementById('vp-tab-3d').classList.toggle('active', tabId === '3d');
  document.getElementById('vp-tab-2d').classList.toggle('active', tabId === '2d');
  
  // Update borders to show active state properly
  document.getElementById('vp-tab-3d').style.borderBottomColor = tabId === '3d' ? 'var(--accent)' : 'transparent';
  document.getElementById('vp-tab-2d').style.borderBottomColor = tabId === '2d' ? 'var(--accent)' : 'transparent';

  document.getElementById('three-canvas').style.display = tabId === '3d' ? 'block' : 'none';
  document.getElementById('svg-container').style.display = tabId === '2d' ? 'block' : 'none';
  
  if (tabId === '3d') {
    // Force Three.js to recalculate the canvas bounds after display block
    window.dispatchEvent(new Event('resize'));
  }
}

async function generateDieline() {
  if (!glbBuffer) return;
  
  const btn = document.getElementById('gen-dieline-btn');
  btn.disabled = true;
  btn.textContent = '⏳ Running Blender...';
  setStatus('info', 'Executing Blender Paper Model addon (this may take a moment)...', true);
  setProgress('pulse');
  
  try {
    const formData = new FormData();
    const blob = new Blob([glbBuffer], { type: 'model/gltf-binary' });
    formData.append('model', blob, 'mesh.glb');
    
    const resp = await fetch('/api/blender/generate_pattern', {
      method: 'POST',
      body: formData
    });
    
    const data = await resp.json();
    if (!resp.ok || data.error) throw new Error(data.error || `Server error ${resp.status}`);
    
    // Switch viewport tab to 2D
    switchViewportTab('2d');
    
    // Inject SVG and apply CSS so it scales to fit the container
    svgContent = data.svg;
    const container = document.getElementById('svg-container');
    container.innerHTML = svgContent;
    
    const svgEl = container.querySelector('svg');
    if (svgEl) {
      svgEl.style.width = '100%';
      svgEl.style.height = 'auto';
      svgEl.style.maxHeight = '100%';
      // Enable basic browser panning by ensuring it fits
    }
    
    // Show download buttons
    document.getElementById('dl-svg-btn').style.display = 'block';
    document.getElementById('tab-dl-svg').style.display = 'block';
    
    setStatus('ok', '✅ 2D Pattern generated successfully!');
    setProgress('value', 100);
    btn.textContent = '✨ Regenerate Pattern';
    btn.disabled = false;
    
  } catch(err) {
    console.error(err);
    setStatus('err', '❌ ' + (err.message || String(err)));
    btn.disabled = false;
    btn.textContent = '✂️ Generate 2D Pattern';
    setProgress('off');
  }
}

function downloadSvg() {
  if (!svgContent) return;
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: 'dieline_pattern.svg'
  }).click();
}
