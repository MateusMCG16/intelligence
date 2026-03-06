"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useInterestStore } from "@/store/useInterestStore";

/**
 * CameraController replaces the basic OrbitControls.
 * It smoothly animates the orbit target to the selected node's position.
 */
interface CameraControllerProps {
  isRotationPaused?: boolean;
}

export default function CameraController({
  isRotationPaused = false,
}: CameraControllerProps) {
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const { focusTarget } = useInterestStore();
  const targetVec = useRef(new THREE.Vector3(0, 0, 0));

  useFrame(() => {
    if (!controlsRef.current) return;

    // Determine desired target
    const desired = focusTarget
      ? new THREE.Vector3(focusTarget.x, focusTarget.y, focusTarget.z)
      : new THREE.Vector3(0, 0, 0);

    // Smoothly interpolate (lerp) towards the desired target
    targetVec.current.lerp(desired, 0.05);

    // Apply to OrbitControls
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const controls = controlsRef.current as any;
    if (controls.target) {
      controls.target.copy(targetVec.current);
      controls.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableZoom={true}
      minDistance={2}
      maxDistance={50}
      autoRotate={!isRotationPaused}
      autoRotateSpeed={0.5}
    />
  );
}
