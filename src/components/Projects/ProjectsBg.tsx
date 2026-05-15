"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Dots() {
  const dotsRef = useRef<THREE.Points>(null);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const geometry = useMemo(() => {
    const count = isMobile ? 200 : 500;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [isMobile]);

  useFrame(({ clock }) => {
    if (dotsRef.current) {
      dotsRef.current.rotation.y = clock.getElapsedTime() * 0.06;
    }
  });

  return (
    <points ref={dotsRef} geometry={geometry}>
      <pointsMaterial
        color={0x00d4ff}
        size={0.08}
        transparent
        opacity={0.3}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

export default function ProjectsBg() {
  return (
    <Canvas
      className="projectsBg"
      camera={{ position: [0, 0, 16], fov: 60 }}
      gl={{ alpha: true, antialias: false }}
      dpr={1}
      style={{ background: "transparent" }}
    >
      <Dots />
    </Canvas>
  );
}
