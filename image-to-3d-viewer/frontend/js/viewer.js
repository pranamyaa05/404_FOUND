import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader }    from 'three/addons/loaders/GLTFLoader.js';

/* ---- Three.js Scene ---- */
let scene, camera, renderer, controls;
let currentModel = null;
let sunLight, fillLight, hemi, ambient, grid;
let wireMode = false;
let lightsOn = true;

const loader = new GLTFLoader();

export function initViewer(canvasId) {
    const canvas = document.getElementById(canvasId);
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.outputColorSpace    = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled   = true;
    renderer.shadowMap.type      = THREE.PCFSoftShadowMap;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070710);
    scene.fog = new THREE.FogExp2(0x070710, 0.04);

    camera = new THREE.PerspectiveCamera(42, 1, 0.01, 500);
    camera.position.set(2, 1.5, 3);

    controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance   = 0.3;
    controls.maxDistance   = 80;

    ambient = new THREE.AmbientLight(0xffffff, 1.0); // Increased ambient for global brightness
    scene.add(ambient);

    sunLight = new THREE.DirectionalLight(0xfff0e0, 2.0);
    sunLight.position.set(4, 8, 5);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width  = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);

    fillLight = new THREE.DirectionalLight(0x6080ff, 1.2); // Increased fill light
    fillLight.position.set(-4, -1, -4);
    scene.add(fillLight);
    
    const backLight = new THREE.DirectionalLight(0xffffff, 1.5); // New back light
    backLight.position.set(0, 3, -8);
    scene.add(backLight);

    hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6); // Brighter hemisphere light
    scene.add(hemi);

    const groundGeo = new THREE.PlaneGeometry(30, 30);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const ground    = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    grid = new THREE.GridHelper(16, 32, 0x252538, 0x1a1a2e);
    scene.add(grid);

    function resize() {
      const vp = canvas.parentElement;
      renderer.setSize(vp.clientWidth, vp.clientHeight);
      camera.aspect = vp.clientWidth / vp.clientHeight;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize);
    resize();

    (function loop() { 
        requestAnimationFrame(loop); 
        controls.update(); 
        renderer.render(scene, camera); 
    })();
}

export function loadGlb(buffer, onSuccess, onError) {
    if (currentModel) {
        scene.remove(currentModel);
        currentModel.traverse(n => {
            if (n.isMesh) {
                n.geometry.dispose();
                (Array.isArray(n.material) ? n.material : [n.material]).forEach(m => m.dispose());
            }
        });
        currentModel = null;
    }

    loader.parse(buffer, '', gltf => {
        const model = gltf.scene;
        model.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });

        const box  = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const ctr  = box.getCenter(new THREE.Vector3());
        const s    = 2 / Math.max(size.x, size.y, size.z);
        model.scale.setScalar(s);
        model.position.sub(ctr.multiplyScalar(s));
        model.position.y += size.y * s / 2;

        scene.add(model);
        currentModel = model;

        camera.position.set(2.5, 2, 3.5);
        controls.target.copy(model.position);
        controls.update();

        let verts = 0, faces = 0;
        model.traverse(n => {
            if (n.isMesh) {
                verts += n.geometry.attributes.position.count;
                const idx = n.geometry.index;
                faces += idx ? idx.count / 3 : n.geometry.attributes.position.count / 3;
            }
        });
        
        onSuccess(verts, Math.round(faces));
    }, onError);
}

export function resetCamera() {
    camera.position.set(2, 1.5, 3);
    controls.target.set(0,0,0);
    controls.update();
}

export function toggleWire() {
    wireMode = !wireMode;
    if (currentModel) {
        currentModel.traverse(n => { 
            if (n.isMesh) n.material.wireframe = wireMode; 
        });
    }
}

export function toggleLights() {
    lightsOn = !lightsOn;
    sunLight.visible = lightsOn;
    fillLight.visible = lightsOn;
    hemi.visible = lightsOn;
    ambient.intensity = lightsOn ? 0.5 : 1.2;
}

export function toggleGrid() {
    grid.visible = !grid.visible;
}
