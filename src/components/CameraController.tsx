"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useInterestStore } from "@/store/useInterestStore";

/**
 * CameraController handles smooth camera movement and focus.
 */
interface CameraControllerProps {
  isRotationPaused?: boolean;
}

export default function CameraController({
  isRotationPaused = false,
}: CameraControllerProps) {
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const { focusTarget, focusNodeId } = useInterestStore();
  const targetVec = useRef(new THREE.Vector3(0, 0, 0));
  const defaultDistanceRef = useRef<number | null>(null);
  const offsetDir = useRef(new THREE.Vector3(0, 0, 1));
  const desiredPos = useRef(new THREE.Vector3(0, 0, 0));

  useFrame(() => {
    if (!controlsRef.current) return;

    // Determine desired target
    const desired = focusTarget
      ? new THREE.Vector3(focusTarget.x, focusTarget.y, focusTarget.z)
      : new THREE.Vector3(0, 0, 0);

    // Smoothly interpolate (lerp) towards the desired target
    // We use a slightly faster lerp for more responsiveness
    targetVec.current.lerp(desired, 0.1);

    // Apply to OrbitControls
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const controls = controlsRef.current as any;
    if (controls.target && controls.object?.position) {
      if (defaultDistanceRef.current === null) {
        defaultDistanceRef.current = controls.object.position.distanceTo(
          controls.target,
        );
      }

      offsetDir.current
        .copy(controls.object.position)
        .sub(controls.target)
        .normalize();

      const desiredDistance = focusNodeId
        ? 7
        : (defaultDistanceRef.current ?? 15);

      desiredPos.current
        .copy(targetVec.current)
        .addScaledVector(offsetDir.current, desiredDistance);

      controls.object.position.lerp(
        desiredPos.current,
        focusNodeId ? 0.12 : 0.08,
      );

      controls.target.copy(targetVec.current);
      // Only auto-rotate if we are NOT focusing on a specific node
      controls.autoRotate = !isRotationPaused && !focusNodeId;
      controls.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableZoom={true}
      minDistance={2}
      maxDistance={60}
      autoRotate={!isRotationPaused && !focusNodeId}
      autoRotateSpeed={0.8}
      enableDamping={true}
      dampingFactor={0.05}
    />
  );
}
