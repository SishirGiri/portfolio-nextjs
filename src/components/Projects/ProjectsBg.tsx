"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Dots({ isMobile }: { isMobile: boolean }) {
  const dotsRef = useRef<THREE.Points>(null);
  const startTime = useRef(Date.now());

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

  useFrame(() => {
    if (dotsRef.current) {
      const elapsed = (Date.now() - startTime.current) / 1000;
      dotsRef.current.rotation.y = elapsed * 0.06;
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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  return (
    <Canvas
      className="projectsBg"
      camera={{ position: [0, 0, 16], fov: 60 }}
      gl={{ alpha: true, antialias: false }}
      dpr={1}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", background: "transparent" }}
    >
      <Dots isMobile={isMobile} />
    </Canvas>
  );
}
