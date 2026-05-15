"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function Particles({ isMobile }: { isMobile: boolean }) {
  const nebulaRef = useRef<THREE.Points>(null);
  const helixRef = useRef<THREE.Group>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const { camera } = useThree();

  const { starGeo, nebGeo, helixGroup, shapes } = useMemo(() => {
    const starCount = isMobile ? 600 : 1400;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) {
      starPositions[i] = (Math.random() - 0.5) * 200;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));

    const nebulaCount = isMobile ? 300 : 700;
    const nebPos = new Float32Array(nebulaCount * 3);
    const nebColor = new Float32Array(nebulaCount * 3);
    for (let i = 0; i < nebulaCount; i++) {
      const r = 10 + Math.random() * 14;
      const phi = Math.acos(-1 + Math.random() * 2);
      const tht = Math.random() * Math.PI * 2;
      nebPos[i * 3] = r * Math.sin(phi) * Math.cos(tht);
      nebPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(tht);
      nebPos[i * 3 + 2] = r * Math.cos(phi) - 10;
      const t = (nebPos[i * 3 + 1] + r) / (2 * r);
      nebColor[i * 3] = lerp(0.49, 0.0, t);
      nebColor[i * 3 + 1] = lerp(0.23, 0.83, t);
      nebColor[i * 3 + 2] = lerp(0.93, 1.0, t);
    }
    const ng = new THREE.BufferGeometry();
    ng.setAttribute("position", new THREE.BufferAttribute(nebPos, 3));
    ng.setAttribute("color", new THREE.BufferAttribute(nebColor, 3));

    const colorA = new THREE.Color(0x00d4ff);
    const colorB = new THREE.Color(0x7c3aed);

    const hg = new THREE.Group();
    const helixHeight = 14;
    const helixRadius = 2.6;
    const helixTurns = 4;
    const strandPoints = 120;

    function buildStrand(phaseOffset: number, color: THREE.Color) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= strandPoints; i++) {
        const t = i / strandPoints;
        const angle = t * Math.PI * 2 * helixTurns + phaseOffset;
        pts.push(
          new THREE.Vector3(
            Math.cos(angle) * helixRadius,
            t * helixHeight - helixHeight / 2,
            Math.sin(angle) * helixRadius
          )
        );
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const geo = new THREE.TubeGeometry(curve, strandPoints * 2, 0.06, 6, false);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 });
      return new THREE.Mesh(geo, mat);
    }

    hg.add(buildStrand(0, colorA));
    hg.add(buildStrand(Math.PI, colorB));

    const rungCount = helixTurns * 8;
    for (let i = 0; i <= rungCount; i++) {
      const t = i / rungCount;
      const angle = t * Math.PI * 2 * helixTurns;
      const y = t * helixHeight - helixHeight / 2;
      const pA = new THREE.Vector3(Math.cos(angle) * helixRadius, y, Math.sin(angle) * helixRadius);
      const pB = new THREE.Vector3(Math.cos(angle + Math.PI) * helixRadius, y, Math.sin(angle + Math.PI) * helixRadius);
      const mixedColor = colorA.clone().lerp(colorB, t);
      const rungGeo = new THREE.BufferGeometry().setFromPoints([pA, pB]);
      const rungMat = new THREE.LineBasicMaterial({ color: mixedColor, transparent: true, opacity: 0.4 });
      hg.add(new THREE.Line(rungGeo, rungMat));

      [pA, pB].forEach((pt, idx) => {
        const sg2 = new THREE.SphereGeometry(0.1, 6, 6);
        const sm = new THREE.MeshBasicMaterial({ color: idx === 0 ? colorA : colorB });
        const sph = new THREE.Mesh(sg2, sm);
        sph.position.copy(pt);
        hg.add(sph);
      });
    }

    hg.position.set(7, 0, 0);
    hg.rotation.x = 0.15;

    const shapeData = [
      { geo: new THREE.OctahedronGeometry(0.5), pos: [-12, 5, -5] as [number, number, number], rot: [0.6, 0.4, 0.2], col: 0x00d4ff },
      { geo: new THREE.TetrahedronGeometry(0.4), pos: [-9, -4, -8] as [number, number, number], rot: [0.3, 0.8, 0.1], col: 0x7c3aed },
      { geo: new THREE.IcosahedronGeometry(0.35), pos: [12, -5, -10] as [number, number, number], rot: [0.5, 0.3, 0.7], col: 0xf472b6 },
      { geo: new THREE.DodecahedronGeometry(0.3), pos: [-14, -2, -6] as [number, number, number], rot: [0.2, 0.6, 0.4], col: 0x00d4ff },
      { geo: new THREE.OctahedronGeometry(0.25), pos: [11, 6, -4] as [number, number, number], rot: [0.7, 0.1, 0.5], col: 0x7c3aed },
    ];

    const floatingShapes = shapeData.map(({ geo, pos, rot, col }) => {
      const mat = new THREE.MeshBasicMaterial({ color: col, wireframe: true, transparent: true, opacity: 0.35 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...pos);
      return { mesh, rotSpeed: rot, floatOffset: Math.random() * Math.PI * 2 };
    });

    return { starGeo: sg, nebGeo: ng, helixGroup: hg, shapes: floatingShapes };
  }, [isMobile]);

  const startTime = useRef(Date.now());

  useFrame(() => {
    const elapsed = (Date.now() - startTime.current) / 1000;

    const targetX = lerp(camera.position.x, mouse.current.x * 1.5, 0.06);
    const targetY = lerp(camera.position.y, mouse.current.y * 0.5, 0.06);
    camera.position.x = targetX;
    camera.position.y = targetY;
    camera.lookAt(0, 0, 0);

    if (nebulaRef.current) {
      nebulaRef.current.rotation.y = elapsed * 0.04;
      nebulaRef.current.rotation.x = elapsed * 0.018;
    }

    if (helixRef.current) {
      helixRef.current.rotation.y = elapsed * 0.3;
      helixRef.current.position.y = Math.sin(elapsed * 0.5) * 0.6;
    }

    shapes.forEach(({ mesh, rotSpeed, floatOffset }) => {
      mesh.rotation.x += rotSpeed[0] * 0.008;
      mesh.rotation.y += rotSpeed[1] * 0.01;
      mesh.rotation.z += rotSpeed[2] * 0.007;
      mesh.position.y += Math.sin(elapsed + floatOffset) * 0.003;
    });
  });

  return (
    <>
      <points geometry={starGeo}>
        <pointsMaterial color={0xaaccff} size={0.12} transparent opacity={0.6} />
      </points>
      <points ref={nebulaRef} geometry={nebGeo}>
        <pointsMaterial
          size={isMobile ? 0.22 : 0.18}
          vertexColors
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
      <primitive ref={helixRef} object={helixGroup} />
      {shapes.map(({ mesh }, i) => (
        <primitive key={i} object={mesh} />
      ))}
      <MouseTracker mouse={mouse} />
    </>
  );
}

function MouseTracker({ mouse }: { mouse: React.MutableRefObject<{ x: number; y: number }> }) {
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [mouse]);
  return null;
}

export default function HeroCanvas() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  return (
    <Canvas
      className="heroCanvas"
      camera={{ position: [0, 0, 28], fov: 60 }}
      gl={{ alpha: true, powerPreference: "high-performance" }}
      dpr={isMobile ? 1 : Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 2)}
      style={{ background: "transparent" }}
    >
      <Particles isMobile={isMobile} />
    </Canvas>
  );
}
