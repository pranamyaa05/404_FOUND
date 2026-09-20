"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useStudioStore, GarmentFit } from "@/store/studioStore";
import { fireBobMessage } from "@/hooks/useBobProactive";
import { generateMesh } from "@/lib/api";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { create } from "zustand";

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const useViewerControls = create<{
  wireMode: boolean;
  lightsOn: boolean;
  gridVisible: boolean;
  toggleWire: () => void;
  toggleLights: () => void;
  toggleGrid: () => void;
}>((set) => ({
  wireMode: false,
  lightsOn: true,
  gridVisible: true,
  toggleWire: () => set((s) => ({ wireMode: !s.wireMode })),
  toggleLights: () => set((s) => ({ lightsOn: !s.lightsOn })),
  toggleGrid: () => set((s) => ({ gridVisible: !s.gridVisible })),
}));

const useAlignmentStore = create<{
  scale: number;
  center: THREE.Vector3 | null;
  offsetY: number;
  setAlignment: (s: number, c: THREE.Vector3, y: number) => void;
}>((set) => ({
  scale: 0,
  center: null,
  offsetY: 0,
  setAlignment: (s, c, y) => set({ scale: s, center: c, offsetY: y }),
}));

function SceneSetup() {
  const { gl } = useThree();
  const lightsOn = useViewerControls((s) => s.lightsOn);

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.5;
  }, [gl]);

  return (
    <>
      <ambientLight color={0xffffff} intensity={lightsOn ? 1.6 : 0.2} />
      <directionalLight color={0xfff0dd} intensity={lightsOn ? 2.8 : 0} position={[5, 10, 7]} castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight color={0xffeedd} intensity={lightsOn ? 2.8 : 0} position={[0, 4, -8]} />
      <directionalLight color={0x90b0ff} intensity={lightsOn ? 1.0 : 0} position={[-5, 5, -5]} />
      <directionalLight color={0xffffff} intensity={lightsOn ? 1.8 : 0} position={[0, 6, -6]} />
      <directionalLight color={0xffeedd} intensity={lightsOn ? 1.2 : 0} position={[0, -2, 4]} />
      <hemisphereLight groundColor={0x666677} color={0xffffff} intensity={lightsOn ? 0.9 : 0.3} />
    </>
  );
}

function Model({
  url,
  isAvatar = false,
  isDraped = false,
  skinHex = "#E8A87C",
  manualScaleX = 1,
  manualScaleY = 1,
  manualScaleZ = 1,
  manualOffsetX = 0,
  manualOffsetY = 0,
  manualOffsetZ = 0,
  manualRotateX = 0,
  manualRotateY = 0,
  manualRotateZ = 0,
}: {
  url: string;
  isAvatar?: boolean;
  isDraped?: boolean;
  skinHex?: string;
  manualScaleX?: number;
  manualScaleY?: number;
  manualScaleZ?: number;
  manualOffsetX?: number;
  manualOffsetY?: number;
  manualOffsetZ?: number;
  manualRotateX?: number;
  manualRotateY?: number;
  manualRotateZ?: number;
}) {
  const { scene: rawScene } = useGLTF(url);
  const { camera, controls } = useThree() as any;
  const wireMode = useViewerControls((s) => s.wireMode);
  const { scale, center, offsetY, setAlignment } = useAlignmentStore();

  const modelScene = useMemo(() => {
    const cloned = rawScene.clone();
    cloned.traverse((n: any) => {
      if (n.isMesh) {
        n.castShadow = true;
        n.receiveShadow = true;
        if (n.geometry) n.geometry.computeVertexNormals();
        if (isAvatar) {
          n.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(skinHex), roughness: 0.45, metalness: 0.05, wireframe: wireMode, side: THREE.DoubleSide,
          });
        } else if (n.material) {
          if (n.material.isMeshStandardMaterial || n.material.isMeshPhysicalMaterial) {
            n.material = n.material.clone();
            if (!n.material.map) n.material.color.set(0xffffff);
            else n.material.color.multiplyScalar(2.2);
            n.material.roughness = Math.min(n.material.roughness, 0.75);
            n.material.metalness = 0;
            n.material.envMapIntensity = 1.8;
          }
          n.material.wireframe = wireMode;
          n.material.side = THREE.DoubleSide;
          n.material.needsUpdate = true;
        }
      }
    });
    return cloned;
  }, [rawScene, isAvatar, skinHex, wireMode]);

  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!modelScene || !groupRef.current || !isAvatar) return;
    const group = groupRef.current;
    group.scale.setScalar(1);
    group.position.set(0, 0, 0);
    group.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(modelScene);
    const size = box.getSize(new THREE.Vector3());
    const objCenter = box.getCenter(new THREE.Vector3());

    const s = 2 / Math.max(size.x, size.y, size.z);
    const dy = (size.y * s) / 2;
    
    const currentStore = useAlignmentStore.getState();
    if (Math.abs(currentStore.scale - s) > 0.0001 || !currentStore.center || currentStore.center.distanceTo(objCenter) > 0.0001) {
      setAlignment(s, objCenter, dy);
    }

    group.scale.setScalar(s);
    group.position.sub(objCenter.clone().multiplyScalar(s));
    group.position.y += dy;

    if (camera) camera.position.set(2.5, 2, 3.5);
    if (controls) {
      controls.target.copy(group.position);
      controls.update();
    }
  }, [modelScene, isAvatar, camera, controls, setAlignment]);

  useEffect(() => {
    if (!modelScene || !groupRef.current || isAvatar) return;
    const group = groupRef.current;
    group.scale.setScalar(1);
    group.position.set(0, 0, 0);
    group.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(modelScene);
    const size = box.getSize(new THREE.Vector3());
    const objCenter = box.getCenter(new THREE.Vector3());

    const avatarScale = scale > 0 ? scale : (2 / Math.max(size.x, size.y, size.z));
    const scaleVec = new THREE.Vector3(
      avatarScale * manualScaleX,
      avatarScale * manualScaleY,
      avatarScale * manualScaleZ
    );

    group.scale.copy(scaleVec);
    group.position.sub(objCenter.clone().multiply(scaleVec));

    group.position.y += (scale > 0 ? offsetY : (size.y * scaleVec.y) / 2) + manualOffsetY;
    group.position.x += manualOffsetX;
    group.position.z += manualOffsetZ;
    group.rotation.set(manualRotateX, manualRotateY, manualRotateZ);
  }, [modelScene, isAvatar, isDraped, scale, center, offsetY, manualScaleX, manualScaleY, manualScaleZ, manualOffsetX, manualOffsetY, manualOffsetZ, manualRotateX, manualRotateY, manualRotateZ]);

  return (
    <group ref={groupRef}>
      <primitive object={modelScene} />
    </group>
  );
}


function GridHelper() {
  const { scene } = useThree();
  const gridVisible = useViewerControls((s) => s.gridVisible);

  useEffect(() => {
    if (!gridVisible) return;
    const grid = new THREE.GridHelper(20, 40, 0xcccccc, 0xe5e5e5);
    scene.add(grid);
    
    const groundGeo = new THREE.PlaneGeometry(20, 20);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.2 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    return () => {
      scene.remove(grid);
      scene.remove(ground);
      groundGeo.dispose();
      groundMat.dispose();
    };
  }, [scene, gridVisible]);
  
  return null;
}

export default function MeshViewer({ onNext, onBack }: Props) {
  const { 
    measurements, garmentGallery, avatarUrl, skinTone, 
    wardrobe, activeWardrobeId, setActiveWardrobeId, addWardrobeItem, updateWardrobeItem, removeWardrobeItem, updateActiveGarmentFit
  } = useStudioStore();

  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeItem = wardrobe.find(w => w.id === activeWardrobeId);



  const handleGenerateMesh = async (imageId: string, style: string, enhancedUrl: string) => {
    setIsGenerating(imageId);
    setError(null);
    try {
      const result = await generateMesh(measurements, style, enhancedUrl);
      addWardrobeItem({
        id: imageId + Date.now(), // Generate a unique wardrobe ID
        style: style,
        meshUrl: result.gltf_url,
        drapedUrl: null,
        dieLineUrl: result.die_line_url,
        fit: { scaleX: 0.45, scaleY: 0.45, scaleZ: 0.45, offsetX: 0, offsetY: 0, offsetZ: 0, rotateX: 0, rotateY: 0, rotateZ: 0 },
        sourceImageId: imageId
      });
      fireBobMessage({
        text: `Generated 3D mesh for ${style}! You can now layer other garments and adjust their fit.`,
        quickReplies: []
      });
    } catch (err: any) {
      setError(`Generation failed for ${style}: ${err.message || String(err)}`);
    } finally {
      setIsGenerating(null);
    }
  };

  return (
    <div className="card">
      <h2 className="font-serif italic text-3xl text-surface-dark mb-2">3D Studio (Wardrobe Layering)</h2>
      <p className="text-surface-dark/60 mb-4">
        Generate 3D meshes for your uploaded images. Select layers below to adjust their fit.
      </p>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4 border border-red-200 text-sm overflow-auto break-all">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Wardrobe Item Generation Panel */}
      <div className="flex gap-4 mb-4 overflow-x-auto pb-2">
        {garmentGallery.map(img => (
          <div key={img.id} className="min-w-[140px] bg-surface-light border border-surface-dark/10 rounded-xl p-3 flex flex-col items-center">
            <div className="text-xs font-medium text-surface-dark mb-2">{img.style}</div>
            <div className="w-20 h-20 bg-black/5 rounded mb-2 overflow-hidden border border-surface-dark/5">
              {img.enhanced ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img.enhanced} alt={img.style} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-surface-dark/40 text-center p-2">
                  No image
                </div>
              )}
            </div>
            <button 
              className="w-full bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-medium py-1.5 rounded transition-colors disabled:opacity-50"
              disabled={!img.enhanced || isGenerating !== null}
              onClick={() => img.enhanced && handleGenerateMesh(img.id, img.style, img.enhanced)}
            >
              {isGenerating === img.id ? "Generating..." : "Generate 3D"}
            </button>
          </div>
        ))}
      </div>

      {/* Adjustments Panel (Only shows if an item is selected) */}
      {activeItem && !activeItem.drapedUrl && (
        <div className="bg-surface-light border border-primary/30 shadow-[0_4px_12px_rgba(201,123,60,0.1)] rounded-xl p-4 mb-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm font-medium text-surface-dark">
              Adjusting Layer: <span className="text-primary font-bold">{activeItem.style}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-surface-dark/70 mb-1">Scale X (Width) ({activeItem.fit.scaleX.toFixed(2)}x)</label>
              <input type="range" min="0.2" max="2.0" step="0.01" value={activeItem.fit.scaleX} onChange={(e) => updateActiveGarmentFit({ scaleX: parseFloat(e.target.value)})} className="w-full accent-primary" />
            </div>
            <div>
              <label className="block text-xs text-surface-dark/70 mb-1">Scale Y (Height) ({activeItem.fit.scaleY.toFixed(2)}x)</label>
              <input type="range" min="0.2" max="2.0" step="0.01" value={activeItem.fit.scaleY} onChange={(e) => updateActiveGarmentFit({ scaleY: parseFloat(e.target.value)})} className="w-full accent-primary" />
            </div>
            <div>
              <label className="block text-xs text-surface-dark/70 mb-1">Scale Z (Depth) ({activeItem.fit.scaleZ.toFixed(2)}x)</label>
              <input type="range" min="0.2" max="2.0" step="0.01" value={activeItem.fit.scaleZ} onChange={(e) => updateActiveGarmentFit({ scaleZ: parseFloat(e.target.value)})} className="w-full accent-primary" />
            </div>
            <div>
              <label className="block text-xs text-surface-dark/70 mb-1">Offset X (Left/Right) ({activeItem.fit.offsetX.toFixed(2)})</label>
              <input type="range" min="-1.5" max="1.5" step="0.01" value={activeItem.fit.offsetX} onChange={(e) => updateActiveGarmentFit({ offsetX: parseFloat(e.target.value)})} className="w-full accent-primary" />
            </div>
            <div>
              <label className="block text-xs text-surface-dark/70 mb-1">Offset Y (Up/Down) ({activeItem.fit.offsetY.toFixed(2)})</label>
              <input type="range" min="-1.5" max="1.5" step="0.01" value={activeItem.fit.offsetY} onChange={(e) => updateActiveGarmentFit({ offsetY: parseFloat(e.target.value)})} className="w-full accent-primary" />
            </div>
            <div>
              <label className="block text-xs text-surface-dark/70 mb-1">Offset Z (Forward/Back) ({activeItem.fit.offsetZ.toFixed(2)})</label>
              <input type="range" min="-1.5" max="1.5" step="0.01" value={activeItem.fit.offsetZ} onChange={(e) => updateActiveGarmentFit({ offsetZ: parseFloat(e.target.value)})} className="w-full accent-primary" />
            </div>
            <div>
              <label className="block text-xs text-surface-dark/70 mb-1">Rotate X (Pitch) ({(activeItem.fit.rotateX * (180/Math.PI)).toFixed(0)}°)</label>
              <input type="range" min="-3.14" max="3.14" step="0.01" value={activeItem.fit.rotateX} onChange={(e) => updateActiveGarmentFit({ rotateX: parseFloat(e.target.value)})} className="w-full accent-primary" />
            </div>
            <div>
              <label className="block text-xs text-surface-dark/70 mb-1">Rotate Y (Yaw) ({(activeItem.fit.rotateY * (180/Math.PI)).toFixed(0)}°)</label>
              <input type="range" min="-3.14" max="3.14" step="0.01" value={activeItem.fit.rotateY} onChange={(e) => updateActiveGarmentFit({ rotateY: parseFloat(e.target.value)})} className="w-full accent-primary" />
            </div>
            <div>
              <label className="block text-xs text-surface-dark/70 mb-1">Rotate Z (Roll) ({(activeItem.fit.rotateZ * (180/Math.PI)).toFixed(0)}°)</label>
              <input type="range" min="-3.14" max="3.14" step="0.01" value={activeItem.fit.rotateZ} onChange={(e) => updateActiveGarmentFit({ rotateZ: parseFloat(e.target.value)})} className="w-full accent-primary" />
            </div>
          </div>
        </div>
      )}

      {/* Main Viewport & Sidebars */}
      <div className="flex gap-4 mb-6">
        
        {/* Left Sidebar: Layers */}
        <div className="w-48 flex-shrink-0 rounded-xl border border-surface-dark/10 shadow-sm overflow-y-auto bg-surface-paper/50 flex flex-col p-2">
          <div className="text-xs font-serif italic text-surface-dark/60 font-bold mb-2 px-2 pt-1 uppercase">Active Layers</div>
          
          {/* Avatar Base Layer (Static) */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-white/40 mb-2 border border-surface-dark/5 opacity-70 grayscale">
             <div className="w-6 h-6 rounded bg-surface-dark/10 flex items-center justify-center text-xs"></div>
             <div className="text-xs font-medium text-surface-dark">Avatar</div>
          </div>

          {/* Dynamic Wardrobe Layers */}
          {wardrobe.map(item => (
            <div 
              key={item.id} 
              onClick={() => setActiveWardrobeId(item.id)}
              className={`flex items-center justify-between p-2 rounded-lg mb-1 cursor-pointer transition-all border ${
                activeWardrobeId === item.id 
                  ? "bg-primary/10 border-primary shadow-[0_2px_8px_rgba(201,123,60,0.15)]" 
                  : "bg-white border-surface-dark/10 hover:border-surface-dark/30"
              }`}
            >
              <div className="flex items-center gap-2">
                 <div className="w-6 h-6 rounded bg-surface-dark/5 flex items-center justify-center text-xs">
                   {item.drapedUrl ? "" : ""}
                 </div>
                 <div className="flex flex-col">
                   <div className="text-xs font-medium text-surface-dark leading-tight">{item.style}</div>
                   {item.drapedUrl && <div className="text-[9px] text-green-600 font-bold">Simulated</div>}
                 </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); removeWardrobeItem(item.id); }}
                className="text-surface-dark/30 hover:text-red-500 w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-50 transition-colors"
                title="Remove layer"
              ></button>
            </div>
          ))}

          {wardrobe.length === 0 && (
            <div className="text-[10px] text-center p-4 text-surface-dark/40 italic">
              Generate 3D meshes above to add layers.
            </div>
          )}
        </div>

        {/* Center: Three.js Viewport */}
        <div className="flex-1 rounded-xl overflow-hidden relative border border-surface-dark/10 shadow-sm" style={{ height: 520, background: "#fbf8f0" }}>
          
          {isGenerating !== null && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-4">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mb-2" />
              <span className="text-sm font-serif italic text-surface-dark">Generating 3D model for {garmentGallery.find(g => g.id === isGenerating)?.style}...</span>
            </div>
          )}

          <Canvas camera={{ position: [2, 1.5, 3], fov: 42 }} shadows style={{ width: "100%", height: "100%" }}>
            <SceneSetup />
            <GridHelper />

            <Suspense fallback={null}>
              {avatarUrl && <Model url={avatarUrl} isAvatar skinHex={skinTone?.hex || "#E8A87C"} />}
            </Suspense>

            {wardrobe.map(item => (
              <Suspense fallback={null} key={item.id}>
                <Model 
                  url={item.drapedUrl || item.meshUrl} 
                  isDraped={!!item.drapedUrl} 
                  manualScaleX={item.fit.scaleX} 
                  manualScaleY={item.fit.scaleY} 
                  manualScaleZ={item.fit.scaleZ} 
                  manualOffsetX={item.fit.offsetX} 
                  manualOffsetY={item.fit.offsetY} 
                  manualOffsetZ={item.fit.offsetZ}
                  manualRotateX={item.fit.rotateX}
                  manualRotateY={item.fit.rotateY}
                  manualRotateZ={item.fit.rotateZ}
                />
              </Suspense>
            ))}

            <OrbitControls enableDamping dampingFactor={0.06} makeDefault />
          </Canvas>

          {/* Floating Controls Overlay */}
          <div className="absolute top-4 left-4 flex gap-2 z-10">
            <button onClick={() => useViewerControls.getState().toggleWire()} className="bg-white/80 hover:bg-white text-surface-dark font-medium text-[10px] px-2 py-1 rounded shadow backdrop-blur">Wireframe</button>
            <button onClick={() => useViewerControls.getState().toggleLights()} className="bg-white/80 hover:bg-white text-surface-dark font-medium text-[10px] px-2 py-1 rounded shadow backdrop-blur">Lights</button>
            <button onClick={() => useViewerControls.getState().toggleGrid()} className="bg-white/80 hover:bg-white text-surface-dark font-medium text-[10px] px-2 py-1 rounded shadow backdrop-blur">Grid</button>
          </div>
          
          <div className="absolute bottom-3 right-4 text-xs font-medium z-10" style={{ color: "rgba(50,42,33,0.6)", pointerEvents: "none" }}>
            Drag to rotate · Scroll to zoom
          </div>
        </div>
      </div>

      <div className="flex gap-4 mt-6">
        <button onClick={onBack} className="btn-outline flex-1">← Back</button>
        <button onClick={onNext} disabled={wardrobe.length === 0} className="btn-primary flex-1">Get Pattern (Dieline) →</button>
      </div>
    </div>
  );
}
