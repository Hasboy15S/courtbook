"use client";

import React, { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export type SportMode = "FUTSAL" | "BADMINTON" | "TENNIS" | "BASKETBALL";

interface CourtSceneProps {
  mode: SportMode;
  autoRotate?: boolean;
}

// -----------------------------------------------------------------------------
// Procedural Line Helper using native THREE.LineSegments
// -----------------------------------------------------------------------------
function CourtLineSegments({
  points,
  color = "#ffffff",
  lineWidth = 1,
}: {
  points: [number, number, number][][];
  color?: string;
  lineWidth?: number;
}) {
  const lineGeometry = useMemo(() => {
    const flatPoints: number[] = [];
    points.forEach(([p1, p2]) => {
      flatPoints.push(...p1, ...p2);
    });
    const geom = new THREE.BufferGeometry();
    geom.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(flatPoints, 3)
    );
    return geom;
  }, [points]);

  return (
    <lineSegments geometry={lineGeometry}>
      <lineBasicMaterial color={color} linewidth={lineWidth} />
    </lineSegments>
  );
}

// -----------------------------------------------------------------------------
// Circular Arc Helper for Center Circle & Penalty Areas
// -----------------------------------------------------------------------------
function CourtArc({
  cx,
  cz,
  radius,
  startAngle = 0,
  endAngle = Math.PI * 2,
  segments = 32,
  color = "#ffffff",
}: {
  cx: number;
  cz: number;
  radius: number;
  startAngle?: number;
  endAngle?: number;
  segments?: number;
  color?: string;
}) {
  const arcPoints = useMemo(() => {
    const linePairs: [number, number, number][][] = [];
    const step = (endAngle - startAngle) / segments;
    for (let i = 0; i < segments; i++) {
      const a1 = startAngle + i * step;
      const a2 = startAngle + (i + 1) * step;
      linePairs.push([
        [cx + Math.cos(a1) * radius, 0.015, cz + Math.sin(a1) * radius],
        [cx + Math.cos(a2) * radius, 0.015, cz + Math.sin(a2) * radius],
      ]);
    }
    return linePairs;
  }, [cx, cz, radius, startAngle, endAngle, segments]);

  return <CourtLineSegments points={arcPoints} color={color} />;
}

// -----------------------------------------------------------------------------
// Futsal 3D Court (40m x 20m -> 11 x 5.5 units)
// -----------------------------------------------------------------------------
function FutsalModel({ active }: { active: boolean }) {
  const length = 11;
  const width = 5.5;
  const halfL = length / 2;
  const halfW = width / 2;
  const y = 0.015;

  const lines = useMemo(() => {
    const pairs: [number, number, number][][] = [
      // Outer perimeter
      [[-halfL, y, -halfW], [halfL, y, -halfW]],
      [[halfL, y, -halfW], [halfL, y, halfW]],
      [[halfL, y, halfW], [-halfL, y, halfW]],
      [[-halfL, y, halfW], [-halfL, y, -halfW]],
      // Halfway line
      [[0, y, -halfW], [0, y, halfW]],
      // Penalty mark ticks (at 6m from goal)
      [[-halfL + 1.65, y, -0.2], [-halfL + 1.65, y, 0.2]],
      [[halfL - 1.65, y, -0.2], [halfL - 1.65, y, 0.2]],
    ];
    return pairs;
  }, [halfL, halfW, y]);

  if (!active) return null;

  return (
    <group>
      {/* Stadium Apron Run-off */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
        <planeGeometry args={[12.4, 6.8]} />
        <meshStandardMaterial color="#0b110d" roughness={0.9} />
      </mesh>

      {/* Turf Surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[length, width]} />
        <meshStandardMaterial
          color="#123d2b"
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* Markings */}
      <CourtLineSegments points={lines} color="#ffffff" />
      {/* Center Circle (r = 1.4) */}
      <CourtArc cx={0} cz={0} radius={1.4} color="#ccff00" />
      {/* Left Penalty Arc */}
      <CourtArc
        cx={-halfL}
        cz={0}
        radius={1.7}
        startAngle={-Math.PI / 2}
        endAngle={Math.PI / 2}
        color="#ffffff"
      />
      {/* Right Penalty Arc */}
      <CourtArc
        cx={halfL}
        cz={0}
        radius={1.7}
        startAngle={Math.PI / 2}
        endAngle={(3 * Math.PI) / 2}
        color="#ffffff"
      />

      {/* 3D Goals */}
      {/* Left Goal */}
      <group position={[-halfL, 0, 0]}>
        <mesh position={[-0.2, 0.7, 0]}>
          <boxGeometry args={[0.08, 0.08, 1.8]} />
          <meshStandardMaterial color="#ccff00" />
        </mesh>
        <mesh position={[-0.2, 0.35, -0.9]}>
          <boxGeometry args={[0.08, 0.7, 0.08]} />
          <meshStandardMaterial color="#ccff00" />
        </mesh>
        <mesh position={[-0.2, 0.35, 0.9]}>
          <boxGeometry args={[0.08, 0.7, 0.08]} />
          <meshStandardMaterial color="#ccff00" />
        </mesh>
      </group>

      {/* Right Goal */}
      <group position={[halfL, 0, 0]}>
        <mesh position={[0.2, 0.7, 0]}>
          <boxGeometry args={[0.08, 0.08, 1.8]} />
          <meshStandardMaterial color="#ccff00" />
        </mesh>
        <mesh position={[0.2, 0.35, -0.9]}>
          <boxGeometry args={[0.08, 0.7, 0.08]} />
          <meshStandardMaterial color="#ccff00" />
        </mesh>
        <mesh position={[0.2, 0.35, 0.9]}>
          <boxGeometry args={[0.08, 0.7, 0.08]} />
          <meshStandardMaterial color="#ccff00" />
        </mesh>
      </group>
    </group>
  );
}

// -----------------------------------------------------------------------------
// Badminton 3D Court (13.4m x 6.1m -> 9.5 x 4.3 units)
// -----------------------------------------------------------------------------
function BadmintonModel({ active }: { active: boolean }) {
  const length = 9.5;
  const width = 4.3;
  const halfL = length / 2;
  const halfW = width / 2;
  const y = 0.015;

  const singlesInset = 0.32;
  const shortServiceInset = 1.35;
  const backDoublesInset = 0.54;

  const lines = useMemo(() => {
    const pairs: [number, number, number][][] = [
      // Outer doubles boundary
      [[-halfL, y, -halfW], [halfL, y, -halfW]],
      [[halfL, y, -halfW], [halfL, y, halfW]],
      [[halfL, y, halfW], [-halfL, y, halfW]],
      [[-halfL, y, halfW], [-halfL, y, -halfW]],
      // Singles sidelines
      [[-halfL, y, -halfW + singlesInset], [halfL, y, -halfW + singlesInset]],
      [[-halfL, y, halfW - singlesInset], [halfL, y, halfW - singlesInset]],
      // Center division line
      [[-halfL, y, 0], [-shortServiceInset, y, 0]],
      [[shortServiceInset, y, 0], [halfL, y, 0]],
      // Short service lines
      [[-shortServiceInset, y, -halfW], [-shortServiceInset, y, halfW]],
      [[shortServiceInset, y, -halfW], [shortServiceInset, y, halfW]],
      // Doubles long service lines (back)
      [[-halfL + backDoublesInset, y, -halfW], [-halfL + backDoublesInset, y, halfW]],
      [[halfL - backDoublesInset, y, -halfW], [halfL - backDoublesInset, y, halfW]],
    ];
    return pairs;
  }, [halfL, halfW, y, singlesInset, shortServiceInset, backDoublesInset]);

  if (!active) return null;

  return (
    <group>
      {/* Stadium Apron */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
        <planeGeometry args={[10.6, 5.4]} />
        <meshStandardMaterial color="#0b110d" roughness={0.9} />
      </mesh>

      {/* PBSI Green Mat Surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[length, width]} />
        <meshStandardMaterial
          color="#165b40"
          roughness={0.65}
          metalness={0.05}
        />
      </mesh>

      <CourtLineSegments points={lines} color="#ffffff" />

      {/* Net Across the Middle */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[0.04, 0.7, width + 0.4]} />
          <meshStandardMaterial
            color="#2a382f"
            wireframe
            roughness={0.9}
          />
        </mesh>
        <mesh position={[0, 0.8, 0]}>
          <boxGeometry args={[0.06, 0.05, width + 0.4]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, 0.42, -halfW - 0.2]}>
          <cylinderGeometry args={[0.04, 0.04, 0.85]} />
          <meshStandardMaterial color="#ccff00" />
        </mesh>
        <mesh position={[0, 0.42, halfW + 0.2]}>
          <cylinderGeometry args={[0.04, 0.04, 0.85]} />
          <meshStandardMaterial color="#ccff00" />
        </mesh>
      </group>
    </group>
  );
}

// -----------------------------------------------------------------------------
// Tennis 3D Court (23.77m x 10.97m -> 11.5 x 5.3 units)
// -----------------------------------------------------------------------------
function TennisModel({ active }: { active: boolean }) {
  const length = 11.5;
  const width = 5.3;
  const halfL = length / 2;
  const halfW = width / 2;
  const y = 0.015;

  const alleyInset = 0.65;
  const serviceLineInset = 3.1;

  const lines = useMemo(() => {
    const pairs: [number, number, number][][] = [
      // Doubles sidelines & Baselines
      [[-halfL, y, -halfW], [halfL, y, -halfW]],
      [[halfL, y, -halfW], [halfL, y, halfW]],
      [[halfL, y, halfW], [-halfL, y, halfW]],
      [[-halfL, y, halfW], [-halfL, y, -halfW]],
      // Singles sidelines
      [[-halfL, y, -halfW + alleyInset], [halfL, y, -halfW + alleyInset]],
      [[-halfL, y, halfW - alleyInset], [halfL, y, halfW - alleyInset]],
      // Service lines
      [[-halfL + serviceLineInset, y, -halfW + alleyInset], [-halfL + serviceLineInset, y, halfW - alleyInset]],
      [[halfL - serviceLineInset, y, -halfW + alleyInset], [halfL - serviceLineInset, y, halfW - alleyInset]],
      // Center service line
      [[-halfL + serviceLineInset, y, 0], [halfL - serviceLineInset, y, 0]],
      // Center marks on baselines
      [[-halfL, y, 0], [-halfL + 0.3, y, 0]],
      [[halfL - 0.3, y, 0], [halfL, y, 0]],
    ];
    return pairs;
  }, [halfL, halfW, y, alleyInset, serviceLineInset]);

  if (!active) return null;

  return (
    <group>
      {/* Stadium Apron */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
        <planeGeometry args={[12.8, 6.6]} />
        <meshStandardMaterial color="#0b110d" roughness={0.9} />
      </mesh>

      {/* In-court Surface (US Open Deep Blue) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[length, width]} />
        <meshStandardMaterial
          color="#1e4675"
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      <CourtLineSegments points={lines} color="#ffffff" />

      {/* Tennis Net in Middle */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0.35, 0]}>
          <boxGeometry args={[0.04, 0.7, width + 0.8]} />
          <meshStandardMaterial color="#1a251e" wireframe />
        </mesh>
        <mesh position={[0, 0.7, 0]}>
          <boxGeometry args={[0.06, 0.06, width + 0.8]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, 0.35, 0]}>
          <boxGeometry args={[0.08, 0.7, 0.08]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, 0.38, -halfW - 0.4]}>
          <cylinderGeometry args={[0.05, 0.05, 0.8]} />
          <meshStandardMaterial color="#ccff00" />
        </mesh>
        <mesh position={[0, 0.38, halfW + 0.4]}>
          <cylinderGeometry args={[0.05, 0.05, 0.8]} />
          <meshStandardMaterial color="#ccff00" />
        </mesh>
      </group>
    </group>
  );
}

// -----------------------------------------------------------------------------
// Basketball 3D Court (28m x 15m -> 10 x 5.4 units)
// -----------------------------------------------------------------------------
function BasketballModel({ active }: { active: boolean }) {
  const length = 10;
  const width = 5.4;
  const halfL = length / 2;
  const halfW = width / 2;
  const y = 0.015;

  const lines = useMemo(() => {
    const pairs: [number, number, number][][] = [
      // Outer perimeter
      [[-halfL, y, -halfW], [halfL, y, -halfW]],
      [[halfL, y, -halfW], [halfL, y, halfW]],
      [[halfL, y, halfW], [-halfL, y, halfW]],
      [[-halfL, y, halfW], [-halfL, y, -halfW]],
      // Half court line
      [[0, y, -halfW], [0, y, halfW]],
      // Left key / paint area
      [[-halfL, y, -1.0], [-halfL + 1.9, y, -1.0]],
      [[-halfL, y, 1.0], [-halfL + 1.9, y, 1.0]],
      [[-halfL + 1.9, y, -1.0], [-halfL + 1.9, y, 1.0]],
      // Right key / paint area
      [[halfL, y, -1.0], [halfL - 1.9, y, -1.0]],
      [[halfL, y, 1.0], [halfL - 1.9, y, 1.0]],
      [[halfL - 1.9, y, -1.0], [halfL - 1.9, y, 1.0]],
    ];
    return pairs;
  }, [halfL, halfW, y]);

  if (!active) return null;

  return (
    <group>
      {/* Stadium Run-off Apron */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
        <planeGeometry args={[11.6, 6.8]} />
        <meshStandardMaterial color="#090f0b" roughness={0.9} />
      </mesh>

      {/* Hardwood Maple Court Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[length, width]} />
        <meshStandardMaterial
          color="#9c5421"
          roughness={0.4}
          metalness={0.05}
        />
      </mesh>

      {/* Painted Keys */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-halfL + 0.95, 0.008, 0]}>
        <planeGeometry args={[1.9, 2.0]} />
        <meshStandardMaterial color="#682c0e" roughness={0.5} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[halfL - 0.95, 0.008, 0]}>
        <planeGeometry args={[1.9, 2.0]} />
        <meshStandardMaterial color="#682c0e" roughness={0.5} />
      </mesh>

      {/* Boundary Lines */}
      <CourtLineSegments points={lines} color="#ffffff" />

      {/* Center Circle */}
      <CourtArc cx={0} cz={0} radius={1.2} color="#ccff00" />

      {/* Left Free Throw Circle */}
      <CourtArc cx={-halfL + 1.9} cz={0} radius={0.8} color="#ffffff" />
      {/* Right Free Throw Circle */}
      <CourtArc cx={halfL - 1.9} cz={0} radius={0.8} color="#ffffff" />

      {/* Left 3-Point Arc */}
      <CourtArc
        cx={-halfL + 0.5}
        cz={0}
        radius={2.3}
        startAngle={-Math.PI / 2.3}
        endAngle={Math.PI / 2.3}
        color="#ffffff"
      />
      {/* Right 3-Point Arc */}
      <CourtArc
        cx={halfL - 0.5}
        cz={0}
        radius={2.3}
        startAngle={Math.PI - Math.PI / 2.3}
        endAngle={Math.PI + Math.PI / 2.3}
        color="#ffffff"
      />

      {/* Left Basketball Hoop & Post */}
      <group position={[-halfL + 0.4, 0, 0]}>
        <mesh position={[-0.4, 0.9, 0]}>
          <cylinderGeometry args={[0.04, 0.05, 1.8]} />
          <meshStandardMaterial color="#222" />
        </mesh>
        <mesh position={[-0.15, 1.6, 0]} rotation={[0, 0, -Math.PI / 4]}>
          <cylinderGeometry args={[0.03, 0.03, 0.6]} />
          <meshStandardMaterial color="#222" />
        </mesh>
        <mesh position={[0, 1.5, 0]}>
          <boxGeometry args={[0.04, 0.5, 0.7]} />
          <meshStandardMaterial color="#ffffff" opacity={0.7} transparent />
        </mesh>
        <mesh position={[0.18, 1.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.14, 0.02, 8, 24]} />
          <meshStandardMaterial color="#ff5500" />
        </mesh>
      </group>

      {/* Right Basketball Hoop & Post */}
      <group position={[halfL - 0.4, 0, 0]}>
        <mesh position={[0.4, 0.9, 0]}>
          <cylinderGeometry args={[0.04, 0.05, 1.8]} />
          <meshStandardMaterial color="#222" />
        </mesh>
        <mesh position={[0.15, 1.6, 0]} rotation={[0, 0, Math.PI / 4]}>
          <cylinderGeometry args={[0.03, 0.03, 0.6]} />
          <meshStandardMaterial color="#222" />
        </mesh>
        <mesh position={[0, 1.5, 0]}>
          <boxGeometry args={[0.04, 0.5, 0.7]} />
          <meshStandardMaterial color="#ffffff" opacity={0.7} transparent />
        </mesh>
        <mesh position={[-0.18, 1.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.14, 0.02, 8, 24]} />
          <meshStandardMaterial color="#ff5500" />
        </mesh>
      </group>
    </group>
  );
}

// -----------------------------------------------------------------------------
// Main Scene Root with Responsive Auto-Scaling & Safe Bounded Parallax
// -----------------------------------------------------------------------------
function CourtContainer({
  mode,
  autoRotate = true,
}: {
  mode: SportMode;
  autoRotate?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const targetRotationY = useRef(0);
  const mouseTilt = useRef({ x: 0, y: 0 });
  const { size } = useThree();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;
      // Controlled tilt bounds to prevent clipping at extreme angles
      mouseTilt.current = {
        x: Math.max(-0.06, Math.min(0.06, nx * 0.06)),
        y: Math.max(-0.04, Math.min(0.04, ny * 0.04)),
      };
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (autoRotate) {
      targetRotationY.current += delta * 0.14;
    }

    // Dynamic responsive scale based on aspect ratio & sport geometry
    const aspect = size.width / Math.max(size.height, 1);
    const aspectFactor = aspect < 1.1 ? Math.max(0.68, aspect * 0.82) : 1.0;
    const sportFactor =
      mode === "BADMINTON"
        ? 1.15
        : mode === "TENNIS"
        ? 0.94
        : mode === "BASKETBALL"
        ? 1.02
        : 0.98;
    const targetScale = aspectFactor * sportFactor;

    // Smooth scale lerp during transitions & resizes
    groupRef.current.scale.setScalar(
      THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, 0.08)
    );

    // Smooth lerp rotation with safe bounded mouse parallax
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetRotationY.current + mouseTilt.current.x,
      0.05
    );
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      mouseTilt.current.y,
      0.05
    );
  });

  return (
    <group ref={groupRef} position={[0, -0.2, 0]}>
      {/* Active Sports Model */}
      <FutsalModel active={mode === "FUTSAL"} />
      <BadmintonModel active={mode === "BADMINTON"} />
      <TennisModel active={mode === "TENNIS"} />
      <BasketballModel active={mode === "BASKETBALL"} />
    </group>
  );
}

function subscribeReducedMotion(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// -----------------------------------------------------------------------------
// Scene Export with Canvas, Lights & Optimal Isometric Camera Placement
// -----------------------------------------------------------------------------
export default function Court3DScene({ mode, autoRotate = true }: CourtSceneProps) {
  const reducedMotion = React.useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false
  );

  return (
    <Canvas
      camera={{ position: [0, 15, 20], fov: 36 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%", pointerEvents: "auto" }}
    >
      {/* Clean Sports Stadium Lighting */}
      <ambientLight intensity={1.3} />
      <directionalLight position={[10, 16, 8]} intensity={1.8} />
      <directionalLight position={[-10, 14, -8]} intensity={0.9} color="#9ec700" />
      <directionalLight position={[0, 12, -10]} intensity={0.7} />

      {/* The 3D Court with Responsive Scale & Safe Parallax */}
      <CourtContainer mode={mode} autoRotate={autoRotate && !reducedMotion} />
    </Canvas>
  );
}
