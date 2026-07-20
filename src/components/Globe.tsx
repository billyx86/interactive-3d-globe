import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Stars,
  useTexture,
} from "@react-three/drei";
import * as THREE from "three";
import { CityMarkers } from "./CityMarkers";
import { getSunDirection } from "../lib/sun";
import { useGlobeStore } from "../store/globeStore";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

const EARTH_DAY =
  "https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg";
const EARTH_BUMP =
  "https://unpkg.com/three-globe@2.31.1/example/img/earth-topology.png";
const EARTH_NIGHT =
  "https://unpkg.com/three-globe@2.31.1/example/img/earth-night.jpg";
const EARTH_CLOUDS =
  "https://unpkg.com/three-globe@2.31.1/example/img/earth-water.png";

const RADIUS = 2;

function Earth() {
  const [dayMap, bumpMap, nightMap] = useTexture([
    EARTH_DAY,
    EARTH_BUMP,
    EARTH_NIGHT,
  ]);
  const showNightLights = useGlobeStore((s) => s.showNightLights);
  const earthRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  // Subtle cloud drift
  useFrame((_, dt) => {
    if (cloudsRef.current) cloudsRef.current.rotation.y += dt * 0.012;
  });

  const nightMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      map: nightMap,
      transparent: true,
      opacity: showNightLights ? 0.55 : 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, [nightMap, showNightLights]);

  return (
    <group>
      {/* Day Earth */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[RADIUS, 64, 64]} />
        <meshStandardMaterial
          map={dayMap}
          bumpMap={bumpMap}
          bumpScale={0.04}
          roughness={0.85}
          metalness={0.05}
        />
      </mesh>

      {/* City lights additive layer (visible on dark side via additive + sun shadowing approximation) */}
      <mesh material={nightMat}>
        <sphereGeometry args={[RADIUS * 1.002, 64, 64]} />
      </mesh>

      {/* Atmosphere glow */}
      <mesh scale={1.08}>
        <sphereGeometry args={[RADIUS, 48, 48]} />
        <meshBasicMaterial
          color="#4aa8ff"
          transparent
          opacity={0.07}
          side={THREE.BackSide}
        />
      </mesh>
      <mesh scale={1.035}>
        <sphereGeometry args={[RADIUS, 48, 48]} />
        <meshPhongMaterial
          color="#7dd3fc"
          transparent
          opacity={0.12}
          side={THREE.BackSide}
          shininess={20}
        />
      </mesh>

      {/* Thin cloud / specular water hint layer */}
      <mesh ref={cloudsRef} scale={1.012}>
        <sphereGeometry args={[RADIUS, 48, 48]} />
        <meshStandardMaterial
          color="#c7e7ff"
          transparent
          opacity={0.08}
          depthWrite={false}
        />
      </mesh>

      <CityMarkers radius={RADIUS * 1.02} />
    </group>
  );
}

function SunLight() {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);

  useFrame(() => {
    const sun = getSunDirection();
    if (lightRef.current) {
      // Place light far in sun direction
      const d = 12;
      lightRef.current.position.set(sun.x * d, sun.y * d, sun.z * d);
      lightRef.current.target.position.set(0, 0, 0);
      lightRef.current.target.updateMatrixWorld();
    }
  });

  return (
    <>
      <directionalLight
        ref={lightRef}
        intensity={2.4}
        color="#fff6e0"
        castShadow={false}
      />
      <object3D ref={targetRef} />
      <ambientLight intensity={0.12} color="#8ab4ff" />
      <hemisphereLight args={["#b1d4ff", "#0a0e1a", 0.25]} />
    </>
  );
}

function SceneControls() {
  const autoRotate = useGlobeStore((s) => s.autoRotate);
  const controlsRef = useRef<OrbitControlsImpl>(null);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={3.2}
      maxDistance={9}
      autoRotate={autoRotate}
      autoRotateSpeed={0.35}
      rotateSpeed={0.55}
    />
  );
}

function LoaderFallback() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.8;
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[RADIUS, 32, 32]} />
      <meshStandardMaterial color="#1e293b" wireframe />
    </mesh>
  );
}

export function Globe() {
  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 0.6, 5.2], fov: 42, near: 0.1, far: 100 }}
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <SunLight />
        <Stars
          radius={80}
          depth={40}
          count={3500}
          factor={3.2}
          saturation={0}
          fade
          speed={0.3}
        />
        <Suspense fallback={<LoaderFallback />}>
          <Earth />
        </Suspense>
        <SceneControls />
      </Canvas>
    </div>
  );
}
