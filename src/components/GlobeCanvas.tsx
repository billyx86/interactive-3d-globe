import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { CityMarkers } from "./CityMarkers";
import { getSunDirection } from "../lib/sun";
import { useGlobeStore } from "../store/globeStore";

const EARTH_DAY =
  "https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg";
const EARTH_BUMP =
  "https://unpkg.com/three-globe@2.31.1/example/img/earth-topology.png";
const EARTH_NIGHT =
  "https://unpkg.com/three-globe@2.31.1/example/img/earth-night.jpg";

const RADIUS = 2;

/** Night lights visible only on the dark side of Earth (dot product with sun). */
function createNightSideMaterial(
  nightMap: THREE.Texture,
  enabled: boolean,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      nightMap: { value: nightMap },
      sunDirection: { value: new THREE.Vector3(1, 0, 0) },
      opacity: { value: enabled ? 1.0 : 0.0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormalWorld;

      void main() {
        vUv = uv;
        // Object-space normal → world (earth group has no scale skew)
        vNormalWorld = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D nightMap;
      uniform vec3 sunDirection;
      uniform float opacity;
      varying vec2 vUv;
      varying vec3 vNormalWorld;

      void main() {
        // Day side: normal faces sun (positive). Night side: negative.
        float dayFactor = dot(normalize(vNormalWorld), normalize(sunDirection));
        // Soft terminator band so lights fade near the twilight zone
        float nightFactor = smoothstep(0.05, -0.15, dayFactor);
        vec3 nightColor = texture2D(nightMap, vUv).rgb;
        // Emphasize bright city lights, damp residual day pixels in the texture
        float luminance = dot(nightColor, vec3(0.299, 0.587, 0.114));
        float cityMask = smoothstep(0.05, 0.35, luminance);
        float alpha = nightFactor * cityMask * opacity * 0.95;
        gl_FragColor = vec4(nightColor * 1.35, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  });
}

function Earth() {
  const [dayMap, bumpMap, nightMap] = useTexture([
    EARTH_DAY,
    EARTH_BUMP,
    EARTH_NIGHT,
  ]);
  const showNightLights = useGlobeStore((s) => s.showNightLights);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const nightMat = useMemo(
    () => createNightSideMaterial(nightMap, showNightLights),
    [nightMap, showNightLights],
  );

  useFrame((_, dt) => {
    if (cloudsRef.current) cloudsRef.current.rotation.y += dt * 0.012;
    // Keep night-side mask aligned with the live sun direction
    const sun = getSunDirection();
    nightMat.uniforms.sunDirection.value.set(sun.x, sun.y, sun.z);
    nightMat.uniforms.opacity.value = showNightLights ? 1.0 : 0.0;
  });

  return (
    <group>
      <mesh>
        <sphereGeometry args={[RADIUS, 64, 64]} />
        <meshStandardMaterial
          map={dayMap}
          bumpMap={bumpMap}
          bumpScale={0.04}
          roughness={0.85}
          metalness={0.05}
        />
      </mesh>

      <mesh material={nightMat}>
        <sphereGeometry args={[RADIUS * 1.002, 64, 64]} />
      </mesh>

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

  useFrame(() => {
    const sun = getSunDirection();
    if (lightRef.current) {
      const d = 12;
      lightRef.current.position.set(sun.x * d, sun.y * d, sun.z * d);
      lightRef.current.target.position.set(0, 0, 0);
      lightRef.current.target.updateMatrixWorld();
    }
  });

  return (
    <>
      <directionalLight ref={lightRef} intensity={2.4} color="#fff6e0" />
      <ambientLight intensity={0.12} color="#8ab4ff" />
      <hemisphereLight args={["#b1d4ff", "#0a0e1a", 0.25]} />
    </>
  );
}

function SceneControls() {
  const autoRotate = useGlobeStore((s) => s.autoRotate);
  return (
    <OrbitControls
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

/** Client-only R3F canvas (imported dynamically from Globe.tsx). */
export default function GlobeCanvas() {
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
