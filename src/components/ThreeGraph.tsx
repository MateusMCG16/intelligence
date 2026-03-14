"use client";

import React, {
  useRef,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import { Text, Billboard } from "@react-three/drei";
import * as THREE from "three";
import { useInterestStore, InterestNode } from "@/store/useInterestStore";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { generateSubInterests } from "@/app/actions";

const SPHERE_GEO = new THREE.IcosahedronGeometry(1, 15); // Much smoother and more organic than a standard sphere
const _tempObject = new THREE.Object3D();
const _tempColor = new THREE.Color();

// Physics mutable data interface
interface PhysicsData {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  scale: number;
}

/**
 * Optimized Node Labels using distance-based culling
 */
const NodeLabels = ({
  nodes,
  physicsRef,
  loadingNodeId,
}: {
  nodes: InterestNode[];
  physicsRef: React.MutableRefObject<Record<string, PhysicsData>>;
  loadingNodeId: string | null;
}) => {
  const { camera } = useThree();
  const labelsRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!labelsRef.current) return;

    // Simple LOD: Only show labels for nodes close to the camera
    labelsRef.current.children.forEach((child, i) => {
      const node = nodes[i];
      if (!node) return;
      const data = physicsRef.current[node.id];
      if (!data) return;

      const dist = camera.position.distanceTo(
        new THREE.Vector3(data.x, data.y, data.z),
      );
      const visible = dist < 35; // Slightly closer for clarity
      child.visible = visible;

      if (visible) {
        // Adjust text position to be slightly more offset from the glowing orb
        child.position.set(
          data.x,
          data.y - data.radius * data.scale - 1.2,
          data.z,
        );
        // Fade opacity based on distance? (Text doesn't support opacity easily here, but visibility is fine)
      }
    });
  });

  return (
    <group ref={labelsRef}>
      {nodes.map((node) => (
        <Billboard key={`label-${node.id}`}>
          <Text
            fontSize={node.radius * 0.45}
            color="#ffffff"
            anchorX="center"
            anchorY="top"
            outlineWidth={0.03}
            outlineColor="#000000"
            maxWidth={6}
            textAlign="center"
            font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
          >
            {node.label.length > 30
              ? node.label.slice(0, 28) + "…"
              : node.label}
            {loadingNodeId === node.id ? " [syncing...]" : ""}
          </Text>
        </Billboard>
      ))}
    </group>
  );
};

function LinksRenderer({
  physicsRef,
}: {
  physicsRef: React.MutableRefObject<Record<string, PhysicsData>>;
}) {
  const { nodes, links } = useInterestStore();
  const geometryRef = useRef<THREE.BufferGeometry>(null);

  const MAX_LINKS = 3000;
  const positionsRef = useRef(new Float32Array(MAX_LINKS * 6));
  const colorsRef = useRef(new Float32Array(MAX_LINKS * 6));

  const nodeMap = useMemo(() => {
    const map: Record<string, InterestNode> = {};
    for (let i = 0; i < nodes.length; i++) map[nodes[i].id] = nodes[i];
    return map;
  }, [nodes]);

  useFrame(() => {
    if (!geometryRef.current || links.length === 0) return;

    const count = Math.min(links.length, MAX_LINKS);
    const pos = positionsRef.current;
    const col = colorsRef.current;
    const phys = physicsRef.current;

    for (let i = 0; i < count; i++) {
      const l = links[i];
      const source = phys[l.source];
      const target = phys[l.target];
      const sourceNode = nodeMap[l.source];
      const targetNode = nodeMap[l.target];

      if (source && target && sourceNode && targetNode) {
        const i6 = i * 6;
        pos[i6] = source.x;
        pos[i6 + 1] = source.y;
        pos[i6 + 2] = source.z;
        pos[i6 + 3] = target.x;
        pos[i6 + 4] = target.y;
        pos[i6 + 5] = target.z;

        _tempColor.set(sourceNode.color);
        col[i6] = _tempColor.r;
        col[i6 + 1] = _tempColor.g;
        col[i6 + 2] = _tempColor.b;

        _tempColor.set(targetNode.color);
        col[i6 + 3] = _tempColor.r;
        col[i6 + 4] = _tempColor.g;
        col[i6 + 5] = _tempColor.b;
      }
    }

    geometryRef.current.setAttribute(
      "position",
      new THREE.BufferAttribute(pos, 3),
    );
    geometryRef.current.setAttribute(
      "color",
      new THREE.BufferAttribute(col, 3),
    );
    geometryRef.current.attributes.position.needsUpdate = true;
    geometryRef.current.attributes.color.needsUpdate = true;
    geometryRef.current.setDrawRange(0, count * 2);
    geometryRef.current.computeBoundingSphere();
  });

  return (
    <lineSegments frustumCulled={false}>
      <bufferGeometry ref={geometryRef} />
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.3}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
}

export default function ThreeGraph({
  isSimulationPaused = false,
}: {
  isSimulationPaused?: boolean;
}) {
  const nodes = useInterestStore((state) => state.nodes);
  const links = useInterestStore((state) => state.links);
  const addNodes = useInterestStore((state) => state.addNodes);
  const addTokens = useInterestStore((state) => state.addTokens);
  const setFocusTarget = useInterestStore((state) => state.setFocusTarget);
  const setFocusNodeId = useInterestStore((state) => state.setFocusNodeId);
  const focusNodeId = useInterestStore((state) => state.focusNodeId);
  const language = useLanguageStore((state) => state.language);
  const provider = useSettingsStore((state) => state.provider);

  const [loadingNodeId, setLoadingNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const hitMeshRef = useRef<THREE.InstancedMesh>(null);
  const physicsRef = useRef<Record<string, PhysicsData>>({});
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    document.body.style.cursor = hoveredNodeId ? "pointer" : "default";
    return () => {
      document.body.style.cursor = "default";
    };
  }, [hoveredNodeId]);

  // Sync physics data with store nodes
  useEffect(() => {
    const current = physicsRef.current;
    nodes.forEach((node) => {
      if (!current[node.id]) {
        current[node.id] = {
          id: node.id,
          x: node.x + (Math.random() - 0.5) * 8,
          y: node.y + (Math.random() - 0.5) * 8,
          z: node.z + (Math.random() - 0.5) * 8,
          vx: node.vx,
          vy: node.vy,
          vz: node.vz,
          radius: node.radius,
          scale: 0.05,
        };
      }
    });

    const nodeIds = new Set(nodes.map((n) => n.id));
    Object.keys(current).forEach((id) => {
      if (!nodeIds.has(id)) delete current[id];
    });
  }, [nodes]);

  useFrame((state) => {
    if (nodes.length === 0) return;

    if (!isSimulationPaused) {
      const physArray = Object.values(physicsRef.current);
      const k = 0.15;
      const damping = 0.88;
      const repulsion = 3.5; // Increased repulsion for better spacing
      const centerAttract = 0.01;

      for (let i = 0; i < physArray.length; i++) {
        const n1 = physArray[i];
        n1.vx -= n1.x * centerAttract;
        n1.vy -= n1.y * centerAttract;
        n1.vz -= n1.z * centerAttract;

        for (let j = i + 1; j < physArray.length; j++) {
          const n2 = physArray[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dz = n1.z - n2.z;
          let distSq = dx * dx + dy * dy + dz * dz;
          if (distSq < 1.5) distSq = 1.5;
          const f = repulsion / distSq;
          const dist = Math.sqrt(distSq);
          const fx = (dx / dist) * f;
          const fy = (dy / dist) * f;
          const fz = (dz / dist) * f;
          n1.vx += fx;
          n1.vy += fy;
          n1.vz += fz;
          n2.vx -= fx;
          n2.vy -= fy;
          n2.vz -= fz;
        }
      }

      for (let i = 0; i < links.length; i++) {
        const link = links[i];
        const source = physicsRef.current[link.source];
        const target = physicsRef.current[link.target];
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dz = target.z - source.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
          const diff = dist - 8; // Increased link distance
          const f = diff * k;
          const ofx = (dx / dist) * f;
          const ofy = (dy / dist) * f;
          const ofz = (dz / dist) * f;
          source.vx += ofx;
          source.vy += ofy;
          source.vz += ofz;
          target.vx -= ofx;
          target.vy -= ofy;
          target.vz -= ofz;
        }
      }

      for (let i = 0; i < physArray.length; i++) {
        const n = physArray[i];
        n.vx *= damping;
        n.vy *= damping;
        n.vz *= damping;
        n.x += n.vx;
        n.y += n.vy;
        n.z += n.vz;

        const targetScale = hoveredNodeId === n.id ? 1.6 : 1.0;
        n.scale = THREE.MathUtils.lerp(n.scale, targetScale, 0.1);
      }
    }

    if (focusNodeId) {
      const data = physicsRef.current[focusNodeId];
      if (data) setFocusTarget({ x: data.x, y: data.y, z: data.z });
    }

    if (meshRef.current || hitMeshRef.current) {
      const time = state.clock.getElapsedTime();
      nodes.forEach((node, i) => {
        const data = physicsRef.current[node.id];
        if (!data) return;

        _tempObject.position.set(data.x, data.y, data.z);
        // Add a very subtle pulse to all nodes
        const pulse = 1.0 + Math.sin(time * 2 + i) * 0.03;
        const s = node.radius * data.scale * pulse;
        _tempObject.scale.set(s, s, s);
        _tempObject.updateMatrix();

        if (meshRef.current) {
          meshRef.current.setMatrixAt(i, _tempObject.matrix);
        }

        if (hitMeshRef.current) {
          _tempObject.scale.setScalar(s * 1.9);
          _tempObject.updateMatrix();
          hitMeshRef.current.setMatrixAt(i, _tempObject.matrix);
        }

        _tempColor.set(node.color);
        // Hover makes it glow significantly more
        if (hoveredNodeId === node.id) {
          _tempColor.multiplyScalar(3.5);
        } else {
          _tempColor.multiplyScalar(1.2);
        }
        if (meshRef.current) {
          meshRef.current.setColorAt(i, _tempColor);
        }
      });
      if (meshRef.current) {
        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor)
          meshRef.current.instanceColor.needsUpdate = true;
        meshRef.current.computeBoundingSphere();
      }
      if (hitMeshRef.current) {
        hitMeshRef.current.instanceMatrix.needsUpdate = true;
        hitMeshRef.current.computeBoundingSphere();
      }
    }
  });

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined) {
      const node = nodes[e.instanceId];
      if (node) setHoveredNodeId(node.id);
    } else {
      setHoveredNodeId(null);
    }
  };

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.instanceId === undefined) return;
    e.stopPropagation();

    const node = nodes[e.instanceId];
    if (!node) return;

    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      handleExpand(node.id, node.label);
    } else {
      clickTimer.current = setTimeout(() => {
        clickTimer.current = null;
        handleFocus(node.id);
      }, 250);
    }
  };

  const handleFocus = useCallback(
    (nodeId: string) => {
      setFocusNodeId(nodeId);
      const data = physicsRef.current[nodeId];
      if (data) setFocusTarget({ x: data.x, y: data.y, z: data.z });
    },
    [setFocusNodeId, setFocusTarget],
  );

  const handleExpand = useCallback(
    async (id: string, label: string) => {
      if (loadingNodeId) return;
      setLoadingNodeId(id);
      try {
        const existingLabels = useInterestStore
          .getState()
          .nodes.map((n) => n.label);
        const result = await generateSubInterests(
          label,
          language,
          existingLabels,
          provider,
        );
        addNodes(result.topics, id);
        addTokens(result.tokens);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingNodeId(null);
      }
    },
    [addNodes, addTokens, language, loadingNodeId, provider],
  );

  return (
    <group>
      <LinksRenderer physicsRef={physicsRef} />

      <instancedMesh
        key={`nodes-hit-${nodes.length}`}
        ref={hitMeshRef}
        args={[SPHERE_GEO, undefined, nodes.length]}
        frustumCulled={false}
        onPointerMove={handlePointerMove}
        onPointerOut={() => setHoveredNodeId(null)}
        onPointerDown={handlePointerDown}
      >
        <meshBasicMaterial
          transparent
          opacity={0}
          depthWrite={false}
          colorWrite={false}
        />
      </instancedMesh>

      <instancedMesh
        key={`nodes-${nodes.length}`}
        ref={meshRef}
        args={[SPHERE_GEO, undefined, nodes.length]}
        frustumCulled={false}
        onPointerMove={handlePointerMove}
        onPointerOut={() => setHoveredNodeId(null)}
        onPointerDown={handlePointerDown}
      >
        <meshPhysicalMaterial
          roughness={0.15}
          metalness={0.2}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
          reflectivity={0.5}
          emissiveIntensity={15}
          toneMapped={false}
        />
      </instancedMesh>

      <NodeLabels
        nodes={nodes}
        physicsRef={physicsRef}
        loadingNodeId={loadingNodeId}
      />

      <pointLight
        position={[0, 0, 0]}
        intensity={3}
        distance={60}
        color="#ffffff"
      />
    </group>
  );
}
