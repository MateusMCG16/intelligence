"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function pseudoRandom(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453123;
  return value - Math.floor(value);
}

export default function ParticleField({ count = 1000 }) {
  const points = useRef<THREE.Points>(null);

  const particles = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      pos[i3] = (pseudoRandom(i * 3 + 1) - 0.5) * 100;
      pos[i3 + 1] = (pseudoRandom(i * 3 + 2) - 0.5) * 100;
      pos[i3 + 2] = (pseudoRandom(i * 3 + 3) - 0.5) * 100;
    }
    return pos;
  }, [count]);

  useFrame((state) => {
    if (!points.current) return;
    points.current.rotation.y = state.clock.getElapsedTime() * 0.02;
    points.current.rotation.x = state.clock.getElapsedTime() * 0.01;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.length / 3}
          array={particles}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        color="#ffffff"
        transparent
        opacity={0.2}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
