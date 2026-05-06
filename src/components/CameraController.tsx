"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { type InterestNode, useInterestStore } from "@/store/useInterestStore";

const MIN_DISTANCE = 4;
const MAX_DISTANCE = 90;
const BASE_FREE_MOVE_SPEED = 9;
const FAST_FREE_MOVE_SPEED = 20;

type OrbitControlsRef = React.ComponentRef<typeof OrbitControls> & {
  object: THREE.Camera;
  target: THREE.Vector3;
  autoRotate: boolean;
  update: () => void;
};

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

function calculateGraphFrame(nodes: InterestNode[]) {
  if (nodes.length === 0) {
    return {
      center: { x: 0, y: 0, z: 0 },
      fitDistance: 15,
      focusDistance: 7,
    };
  }

  const center = nodes.reduce(
    (acc, node) => ({
      x: acc.x + node.x,
      y: acc.y + node.y,
      z: acc.z + node.z,
    }),
    { x: 0, y: 0, z: 0 },
  );
  center.x /= nodes.length;
  center.y /= nodes.length;
  center.z /= nodes.length;

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  let maxDepth = 0;
  let maxRadius = 0;

  for (const node of nodes) {
    const dx = node.x - center.x;
    const dy = node.y - center.y;
    const dz = node.z - center.z;
    maxRadius = Math.max(
      maxRadius,
      Math.sqrt(dx * dx + dy * dy + dz * dz) + node.radius,
    );

    let depth = 0;
    let parentId = node.parentId;
    const visited = new Set<string>();

    while (parentId && !visited.has(parentId)) {
      visited.add(parentId);
      const parent = nodeById.get(parentId);
      if (!parent) break;
      depth += 1;
      parentId = parent.parentId;
    }

    maxDepth = Math.max(maxDepth, depth);
  }

  const estimatedRadius = Math.max(
    maxRadius,
    Math.sqrt(nodes.length) * 4,
    maxDepth * 5,
    8,
  );

  return {
    center,
    fitDistance: THREE.MathUtils.clamp(estimatedRadius * 1.7, 15, 80),
    focusDistance: THREE.MathUtils.clamp(7 + estimatedRadius * 0.12, 7, 16),
  };
}

/**
 * CameraController handles smooth camera movement and focus.
 */
interface CameraControllerProps {
  isRotationPaused?: boolean;
  isFreeNavigationEnabled?: boolean;
}

export default function CameraController({
  isRotationPaused = false,
  isFreeNavigationEnabled = false,
}: CameraControllerProps) {
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const nodes = useInterestStore((state) => state.nodes);
  const focusTarget = useInterestStore((state) => state.focusTarget);
  const focusNodeId = useInterestStore((state) => state.focusNodeId);
  const setFocusTarget = useInterestStore((state) => state.setFocusTarget);
  const setFocusNodeId = useInterestStore((state) => state.setFocusNodeId);

  const graphFrame = useMemo(() => calculateGraphFrame(nodes), [nodes]);
  const targetVec = useRef(new THREE.Vector3(0, 0, 0));
  const offsetDir = useRef(new THREE.Vector3(0, 0, 1));
  const desiredPos = useRef(new THREE.Vector3(0, 0, 0));
  const desiredTarget = useRef(new THREE.Vector3(0, 0, 0));
  const freeMoveVector = useRef(new THREE.Vector3(0, 0, 0));
  const freeMoveForward = useRef(new THREE.Vector3(0, 0, -1));
  const freeMoveRight = useRef(new THREE.Vector3(1, 0, 0));
  const freeMoveUp = useRef(new THREE.Vector3(0, 1, 0));
  const pressedKeys = useRef(new Set<string>());
  const lastFocusNodeId = useRef<string | null>(null);
  const focusDistanceRef = useRef(graphFrame.focusDistance);
  const isFocusSettledRef = useRef(false);
  const wasProgrammaticActiveRef = useRef(false);

  useEffect(() => {
    pressedKeys.current.clear();
    if (!isFreeNavigationEnabled) return;

    const movementKeys = new Set([
      "w",
      "a",
      "s",
      "d",
      "q",
      "e",
      "shift",
    ]);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      const key = event.key.toLowerCase();
      if (!movementKeys.has(key)) return;

      event.preventDefault();
      pressedKeys.current.add(key);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      pressedKeys.current.delete(event.key.toLowerCase());
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      pressedKeys.current.clear();
    };
  }, [isFreeNavigationEnabled]);

  useFrame((_, delta) => {
    if (!controlsRef.current) return;

    const controls = controlsRef.current as OrbitControlsRef;
    if (!controls.target || !controls.object?.position) return;

    if (lastFocusNodeId.current !== focusNodeId) {
      lastFocusNodeId.current = focusNodeId;
      isFocusSettledRef.current = false;
      if (focusNodeId) {
        focusDistanceRef.current = graphFrame.focusDistance;
      }
    }

    controls.autoRotate = !isRotationPaused && !focusNodeId && !focusTarget;
    const isProgrammaticActive = Boolean(focusTarget || focusNodeId);

    if (isFreeNavigationEnabled && pressedKeys.current.size > 0) {
      freeMoveVector.current.set(0, 0, 0);

      controls.object.getWorldDirection(freeMoveForward.current);
      freeMoveRight.current
        .crossVectors(freeMoveForward.current, controls.object.up)
        .normalize();
      freeMoveUp.current.set(0, 1, 0);

      if (pressedKeys.current.has("w")) {
        freeMoveVector.current.add(freeMoveForward.current);
      }
      if (pressedKeys.current.has("s")) {
        freeMoveVector.current.sub(freeMoveForward.current);
      }
      if (pressedKeys.current.has("d")) {
        freeMoveVector.current.add(freeMoveRight.current);
      }
      if (pressedKeys.current.has("a")) {
        freeMoveVector.current.sub(freeMoveRight.current);
      }
      if (pressedKeys.current.has("e")) {
        freeMoveVector.current.add(freeMoveUp.current);
      }
      if (pressedKeys.current.has("q")) {
        freeMoveVector.current.sub(freeMoveUp.current);
      }

      if (freeMoveVector.current.lengthSq() > 0) {
        const speed = pressedKeys.current.has("shift")
          ? FAST_FREE_MOVE_SPEED
          : BASE_FREE_MOVE_SPEED;

        freeMoveVector.current.normalize().multiplyScalar(speed * delta);
        controls.object.position.add(freeMoveVector.current);
        controls.target.add(freeMoveVector.current);
        targetVec.current.add(freeMoveVector.current);

        if (focusNodeId) setFocusNodeId(null);
        if (focusTarget) setFocusTarget(null);
        wasProgrammaticActiveRef.current = false;

        controls.update();
        return;
      }
    }

    if (!isProgrammaticActive) {
      wasProgrammaticActiveRef.current = false;
      controls.update();
      return;
    }

    if (!wasProgrammaticActiveRef.current) {
      targetVec.current.copy(controls.target);
      wasProgrammaticActiveRef.current = true;
    }

    desiredTarget.current.set(
      focusNodeId && focusTarget ? focusTarget.x : graphFrame.center.x,
      focusNodeId && focusTarget ? focusTarget.y : graphFrame.center.y,
      focusNodeId && focusTarget ? focusTarget.z : graphFrame.center.z,
    );

    targetVec.current.lerp(desiredTarget.current, focusNodeId ? 0.14 : 0.11);

    offsetDir.current.copy(controls.object.position).sub(controls.target);
    if (offsetDir.current.lengthSq() < 0.0001) {
      offsetDir.current.set(0, 0, 1);
    }
    offsetDir.current.normalize();

    const currentDistance = controls.object.position.distanceTo(
      controls.target,
    );
    const desiredDistance =
      focusNodeId && isFocusSettledRef.current
        ? currentDistance
        : focusNodeId
          ? focusDistanceRef.current
          : graphFrame.fitDistance;

    desiredPos.current
      .copy(targetVec.current)
      .addScaledVector(offsetDir.current, desiredDistance);

    controls.object.position.lerp(
      desiredPos.current,
      focusNodeId ? 0.13 : 0.1,
    );

    controls.target.copy(targetVec.current);
    controls.update();

    const isTargetSettled =
      targetVec.current.distanceTo(desiredTarget.current) < 0.05;
    const isPositionSettled =
      controls.object.position.distanceTo(desiredPos.current) < 0.08;

    if (isTargetSettled && isPositionSettled) {
      if (focusNodeId) {
        isFocusSettledRef.current = true;
      } else if (focusTarget) {
        setFocusTarget(null);
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      enableZoom={true}
      screenSpacePanning={false}
      minDistance={MIN_DISTANCE}
      maxDistance={MAX_DISTANCE}
      autoRotate={!isRotationPaused && !focusNodeId}
      autoRotateSpeed={0.8}
      enableDamping={true}
      dampingFactor={0.08}
      zoomSpeed={0.9}
      panSpeed={0.75}
      rotateSpeed={0.65}
    />
  );
}
