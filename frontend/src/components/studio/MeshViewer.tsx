"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useStudioStore } from "@/store/studioStore";
import { generateMesh } from "@/lib/api";
import { fireBobMessage } from "@/hooks/useBobProactive";

interface Props {
  onNext: () => void;
  onBack: () => void;
}

// ── Scene setup: mirrors the image-to-3d-viewer branch viewer.js ──────────────
function SceneSetup() {
  const { gl, scene } = useThree();

  useEffect(() => {
    // ACES filmic tone mapping + dark background — same as branch
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.3;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;

    scene.background = new THREE.Color(0x070710);
    scene.fog = new THREE.FogExp2(0x070710, 0.04);
  }, [gl, scene]);

  return null;
}

// ── Auto-centers and scales the loaded model to fit the camera ────────────────
function Model({ url }: { url: string }) {
  const { scene: modelScene } = useGLTF(url);
  const { camera, controls } = useThree() as any;

  useEffect(() => {
    if (!modelScene) return;

    // Enable shadows on all meshes
    modelScene.traverse((n: any) => {
      if (n.isMesh) {
        n.castShadow = true;
        n.receiveShadow = true;
      }
    });

    // Auto-fit: scale to 2 units and center
    const box = new THREE.Box3().setFromObject(modelScene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const s = 2 / Math.max(size.x, size.y, size.z);
    modelScene.scale.setScalar(s);
    modelScene.position.sub(center.multiplyScalar(s));
    modelScene.position.y += (size.y * s) / 2;

    // Reset camera to a good viewing angle
    if (camera) {
      camera.position.set(2.5, 2, 3.5);
    }
    if (controls) {
      controls.target.copy(modelScene.position);
      controls.update();
    }
  }, [modelScene, camera, controls]);

  return <primitive object={modelScene} />;
}

// ── Grid helper — uses raw THREE.GridHelper like the branch viewer.js ─────────
function GridHelper() {
  const { scene } = useThree();
  useEffect(() => {
    const grid = new THREE.GridHelper(20, 40, 0x334466, 0x1e2a3a);
    grid.name = "__grid__";
    scene.add(grid);
    return () => { scene.remove(grid); };
  }, [scene]);
  return null;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MeshViewer({ onNext, onBack }: Props) {
  const { measurements, selectedStyle, enhancedImage, setMeshUrl, meshUrl } =
    useStudioStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guard against React StrictMode double-invoke
  const fetchingRef = useRef(false);

  useEffect(() => {
    if (!selectedStyle) return; // Skipped measurements is allowed
    if (meshUrl || fetchingRef.current) return;

    fetchingRef.current = true;
    const controller = new AbortController();

    const fetchMesh = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await generateMesh(
          measurements,
          selectedStyle,
          enhancedImage ?? ""
        );
        if (controller.signal.aborted) return;
        setMeshUrl(result.gltf_url);
        const { skinTone, measurements: m } = useStudioStore.getState();
        const heightNote =
          m && m.height < 155
            ? " Since you're petite, lighter fabrics will drape better."
            : m && m.height > 170
            ? " Your height suits dramatic floor-length styles perfectly."
            : "";
        fireBobMessage({
          text: `Your 3D model is ready! ${heightNote}\n\nWant me to suggest the best fabric for this style?`,
          quickReplies: [
            skinTone
              ? `Suggest fabrics for ${skinTone.displayName} skin`
              : "Suggest fabrics",
            "What colours work for me?",
            "How does this look for a wedding?",
          ],
        });
      } catch (err: any) {
        if (!controller.signal.aborted) {
          setError(err.message || "Could not generate mesh.");
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
        fetchingRef.current = false;
      }
    };

    fetchMesh();
    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="card">
      <h2 className="font-serif italic text-3xl text-surface-dark mb-2">
        3D Preview
      </h2>
      <p className="text-surface-dark/60 mb-4">
        Rotate · zoom · inspect your garment from every angle.
      </p>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4 border border-red-200 text-sm overflow-auto break-all">
          <strong>Generation Error:</strong> {error}
        </div>
      )}

      {/* Status bar — sits ABOVE the viewport, never blocks the grid */}
      {isLoading && (
        <div
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl mb-3"
          style={{ background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div
            className="w-4 h-4 rounded-full border-2 flex-shrink-0 animate-spin"
            style={{ borderColor: "rgba(255,255,255,0.15)", borderTopColor: "#818cf8" }}
          />
          <span className="text-sm font-serif italic" style={{ color: "rgba(255,255,255,0.75)" }}>
            ⏳ Generating via Trellis AI — this takes 1–3 min on first run…
          </span>
        </div>
      )}

      {/* Three.js Viewport — always rendered so grid is immediately interactive */}
      <div
        className="w-full rounded-xl overflow-hidden mb-6 relative"
        style={{ height: 520, background: "#070710" }}
      >
        <Canvas
          camera={{ position: [2, 1.5, 3], fov: 42 }}
          shadows
          style={{ width: "100%", height: "100%" }}
        >
          {/* Scene configuration — mirrors branch viewer.js */}
          <SceneSetup />

          {/* Lighting rig — same as branch */}
          <ambientLight color={0xffffff} intensity={1.0} />
          <directionalLight
            color={0xfff0e0}
            intensity={2.0}
            position={[4, 8, 5]}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <directionalLight
            color={0x6080ff}
            intensity={1.2}
            position={[-4, -1, -4]}
          />
          <directionalLight
            color={0xffffff}
            intensity={1.5}
            position={[0, 3, -8]}
          />
          <hemisphereLight
            color={0xffffff}
            groundColor={0x444444}
            intensity={0.6}
          />

          {/* Grid + ground */}
          <GridHelper />
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.001, 0]}>
            <planeGeometry args={[30, 30]} />
            <shadowMaterial opacity={0.35} />
          </mesh>

          {/* Model loaded from Trellis */}
          <Suspense fallback={null}>
            {meshUrl && <Model url={meshUrl} />}
          </Suspense>

          <OrbitControls
            enableDamping
            dampingFactor={0.06}
            minDistance={0.3}
            maxDistance={80}
            makeDefault
          />
        </Canvas>

        {/* Empty state */}
        {!isLoading && !meshUrl && !error && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            <div className="text-center">
              <div className="text-5xl mb-3">🧊</div>
              <div className="italic text-sm">3D scene ready — awaiting model</div>
            </div>
          </div>
        )}

        {/* Controls hint */}
        <div
          className="absolute bottom-3 right-4 text-xs"
          style={{ color: "rgba(255,255,255,0.3)", pointerEvents: "none" }}
        >
          Drag to rotate · Scroll to zoom
        </div>
      </div>

      <div className="flex gap-4">
        <button onClick={onBack} className="btn-outline flex-1">
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={isLoading}
          className="btn-primary flex-1"
        >
          Get Pattern →
        </button>
      </div>
    </div>
  );
}
