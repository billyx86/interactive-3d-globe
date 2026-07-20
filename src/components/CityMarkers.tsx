import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { CITIES, latLonToVector3, type City } from "../data/cities";
import { useGlobeStore } from "../store/globeStore";

function Marker({ city, radius }: { city: City; radius: number }) {
  const selected = useGlobeStore((s) => s.selectedCity);
  const setSelectedCity = useGlobeStore((s) => s.setSelectedCity);
  const isActive = selected?.id === city.id;
  const [hovered, setHovered] = useState(false);
  const pulseRef = useRef<THREE.Mesh>(null);
  const pos = useMemo(
    () => latLonToVector3(city.lat, city.lon, radius),
    [city.lat, city.lon, radius],
  );

  useFrame(({ clock }) => {
    if (pulseRef.current) {
      const t = (Math.sin(clock.elapsedTime * 2.5 + city.lat) + 1) / 2;
      const s = 1 + t * (isActive ? 1.6 : 0.8);
      pulseRef.current.scale.setScalar(s);
      const mat = pulseRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = isActive ? 0.45 - t * 0.35 : 0.25 - t * 0.2;
    }
  });

  const color = isActive ? "#38bdf8" : hovered ? "#7dd3fc" : "#fbbf24";

  return (
    <group position={[pos.x, pos.y, pos.z]}>
      <group
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "default";
        }}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedCity(isActive ? null : city);
        }}
      >
        <mesh ref={pulseRef}>
          <sphereGeometry args={[0.045, 16, 16]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.3}
            depthWrite={false}
          />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.028, 16, 16]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={isActive ? 1.4 : 0.7}
            roughness={0.3}
          />
        </mesh>
        {(hovered || isActive) && (
          <Html
            distanceFactor={8}
            style={{
              pointerEvents: "none",
              transform: "translate(-50%, -140%)",
            }}
            center
          >
            <div className="whitespace-nowrap rounded-md border border-sky-400/30 bg-slate-950/90 px-2 py-1 text-[11px] font-medium text-sky-100 shadow-lg backdrop-blur">
              {city.name}
              <span className="ml-1 text-slate-400">{city.country}</span>
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}

export function CityMarkers({ radius }: { radius: number }) {
  return (
    <group>
      {CITIES.map((city) => (
        <Marker key={city.id} city={city} radius={radius} />
      ))}
    </group>
  );
}
