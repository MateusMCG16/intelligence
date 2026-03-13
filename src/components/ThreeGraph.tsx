"use client";

import React, { useRef, useState, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text, Html } from "@react-three/drei";
import * as THREE from "three";
import { useInterestStore, InterestNode } from "@/store/useInterestStore";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { generateSubInterests } from "@/app/actions";

const SPHERE_GEO = new THREE.SphereGeometry(1, 32, 32);
const GLOW_GEO = new THREE.SphereGeometry(1, 16, 16);
const _tempColor = new THREE.Color();
const _worldPos = new THREE.Vector3();

const NodeComponent = React.memo(({
  node,
  onFocus,
  onExpand,
  isLoading,
}: {
  node: InterestNode;
  onFocus: (nodeId: string) => void;
  onExpand: (nodeId: string, label: string) => void;
  isLoading: boolean;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const textRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const { camera } = useThree();
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [scale, setScale] = useState(1);
  const targetScale = hovered ? 1.3 : 1;

  useFrame((state) => {
    const newScale = THREE.MathUtils.lerp(scale, targetScale, 0.15);
    if (Math.abs(newScale - scale) > 0.001) setScale(newScale);

    if (meshRef.current) {
      meshRef.current.position.set(node.x, node.y, node.z);
      meshRef.current.scale.setScalar(node.radius * scale);
    }

    if (glowRef.current) {
      glowRef.current.position.set(node.x, node.y, node.z);
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      glowRef.current.scale.setScalar(node.radius * scale * 1.8 * pulse);
    }

    if (textRef.current) {
      textRef.current.position.set(node.x, node.y - (node.radius * scale) - 0.7, node.z);
      camera.getWorldPosition(_worldPos);
      textRef.current.lookAt(_worldPos);
    }
  });

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      onExpand(node.id, node.label);
    } else {
      clickTimer.current = setTimeout(() => {
        clickTimer.current = null;
        onFocus(node.id);
      }, 250);
    }
  };

  return (
    <group>
      <mesh ref={glowRef} geometry={GLOW_GEO}>
        <meshBasicMaterial
          color={node.color}
          transparent
          opacity={hovered ? 0.3 : 0.15}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh
        ref={meshRef}
        geometry={SPHERE_GEO}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={node.color}
          emissive={node.color}
          emissiveIntensity={hovered ? 2 : 0.6}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      <group ref={textRef}>
        <Text
          fontSize={node.radius * 0.45}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.015}
          outlineColor="#000000"
          maxWidth={4}
          textAlign="center"
        >
          {node.label.length > 30 ? node.label.slice(0, 28) + "…" : node.label}
        </Text>
        
        {!node.parentId && (
          <Text
            position={[0, 0.45, 0]}
            fontSize={0.15}
            color={node.color}
            fillOpacity={0.6}
          >
            ROOT TOPIC
          </Text>
        )}
      </group>

      {isLoading && (
        <Html position={[node.x, node.y + node.radius + 0.8, node.z]} center>
          <div className="flex space-x-1.5 items-center bg-black/60 backdrop-blur-xl px-3 py-1.5 rounded-full border border-white/20">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></div>
          </div>
        </Html>
      )}
    </group>
  );
});

NodeComponent.displayName = "NodeComponent";

function LinksRenderer({ isPaused = false }: { isPaused?: boolean }) {
  const { nodes, links } = useInterestStore();
  const geometryRef = useRef<THREE.BufferGeometry>(null);

  const MAX_LINKS = 2000;
  // Usamos useRef para buffers de alta performance para evitar o erro de imutabilidade do React
  const positionsRef = useRef(new Float32Array(MAX_LINKS * 6));
  const colorsRef = useRef(new Float32Array(MAX_LINKS * 6));

  useFrame(() => {
    if (isPaused || !geometryRef.current || links.length === 0) return;

    const count = Math.min(links.length, MAX_LINKS);
    const nodeMap: Record<string, InterestNode> = {};
    for (let i = 0; i < nodes.length; i++) {
      nodeMap[nodes[i].id] = nodes[i];
    }

    const pos = positionsRef.current;
    const col = colorsRef.current;

    for (let i = 0; i < count; i++) {
      const l = links[i];
      const source = nodeMap[l.source];
      const target = nodeMap[l.target];
      if (source && target) {
        const i6 = i * 6;
        pos[i6] = source.x; pos[i6+1] = source.y; pos[i6+2] = source.z;
        pos[i6+3] = target.x; pos[i6+4] = target.y; pos[i6+5] = target.z;
        
        _tempColor.set(source.color);
        col[i6] = _tempColor.r; col[i6+1] = _tempColor.g; col[i6+2] = _tempColor.b;
        
        _tempColor.set(target.color);
        col[i6+3] = _tempColor.r; col[i6+4] = _tempColor.g; col[i6+5] = _tempColor.b;
      }
    }

    geometryRef.current.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geometryRef.current.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geometryRef.current.attributes.position.needsUpdate = true;
    geometryRef.current.attributes.color.needsUpdate = true;
    geometryRef.current.setDrawRange(0, count * 2);
  });

  return (
    <lineSegments>
      <bufferGeometry ref={geometryRef} />
      <lineBasicMaterial vertexColors transparent opacity={0.2} blending={THREE.AdditiveBlending} depthWrite={false} />
    </lineSegments>
  );
}

function PhysicsEngine({ isPaused = false }: { isPaused?: boolean }) {
  useFrame(() => {
    if (isPaused) return;
    const state = useInterestStore.getState();
    const { nodes, links } = state;
    if (nodes.length === 0) return;

    const nextNodes = nodes.map((node) => ({ ...node }));
    // Definimos explicitamente o tipo do Record para evitar o erro de lint
    const nodeMap: Record<string, InterestNode> = {};
    for (let i = 0; i < nextNodes.length; i++) nodeMap[nextNodes[i].id] = nextNodes[i];

    const k = 0.05; 
    const damping = 0.8; 
    const repulsion = 1.0;
    const centerAttract = 0.005;

    for (let i = 0; i < nextNodes.length; i++) {
      const n1 = nextNodes[i];
      let fx = -n1.x * centerAttract;
      let fy = -n1.y * centerAttract;
      let fz = -n1.z * centerAttract;

      for (let j = 0; j < nextNodes.length; j++) {
        if (i === j) continue;
        const n2 = nextNodes[j];
        const dx = n1.x - n2.x;
        const dy = n1.y - n2.y;
        const dz = n1.z - n2.z;
        let distSq = dx * dx + dy * dy + dz * dz;
        if (distSq < 0.2) distSq = 0.2;
        const dist = Math.sqrt(distSq);
        const f = repulsion / distSq;
        fx += (dx / dist) * f;
        fy += (dy / dist) * f;
        fz += (dz / dist) * f;
      }
      n1.vx += fx; n1.vy += fy; n1.vz += fz;
    }

    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      const source = nodeMap[link.source];
      const target = nodeMap[link.target];
      if (source && target) {
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dz = target.z - source.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
        const diff = dist - 4.5;
        const f = diff * k;
        const ofx = (dx / dist) * f;
        const ofy = (dy / dist) * f;
        const ofz = (dz / dist) * f;
        source.vx += ofx; source.vy += ofy; source.vz += ofz;
        target.vx -= ofx; target.vy -= ofy; target.vz -= ofz;
      }
    }

    for (let i = 0; i < nextNodes.length; i++) {
      const n = nextNodes[i];
      n.vx *= damping; n.vy *= damping; n.vz *= damping;
      const speedSq = n.vx * n.vx + n.vy * n.vy + n.vz * n.vz;
      if (speedSq < 0.00001) { n.vx = 0; n.vy = 0; n.vz = 0; }
      n.x += n.vx; n.y += n.vy; n.z += n.vz;
    }

    state.setNodes(nextNodes);
  });
  return null;
}

export default function ThreeGraph({ isSimulationPaused = false }: { isSimulationPaused?: boolean }) {
  const nodes = useInterestStore((state) => state.nodes);
  const addNodes = useInterestStore((state) => state.addNodes);
  const addTokens = useInterestStore((state) => state.addTokens);
  const setFocusTarget = useInterestStore((state) => state.setFocusTarget);
  const language = useLanguageStore((state) => state.language);
  const provider = useSettingsStore((state) => state.provider);
  const [loadingNodeId, setLoadingNodeId] = useState<string | null>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current && !isSimulationPaused) {
      groupRef.current.rotation.y += 0.0005;
    }
  });

  const handleFocus = useCallback((nodeId: string) => {
    const node = useInterestStore.getState().nodes.find((n) => n.id === nodeId);
    if (node) setFocusTarget({ x: node.x, y: node.y, z: node.z });
  }, [setFocusTarget]);

  const handleExpand = useCallback(async (id: string, label: string) => {
    if (loadingNodeId) return;
    setLoadingNodeId(id);
    try {
      const existingLabels = useInterestStore.getState().nodes.map((n) => n.label);
      const result = await generateSubInterests(label, language, existingLabels, provider);
      addNodes(result.topics, id);
      addTokens(result.tokens);
    } catch (err) { console.error(err); } finally { setLoadingNodeId(null); }
  }, [addNodes, addTokens, language, loadingNodeId, provider]);

  return (
    <>
      <PhysicsEngine isPaused={isSimulationPaused} />
      <group ref={groupRef}>
        <LinksRenderer isPaused={isSimulationPaused} />
        {nodes.map((node) => (
          <NodeComponent
            key={node.id}
            node={node}
            onFocus={handleFocus}
            onExpand={handleExpand}
            isLoading={loadingNodeId === node.id}
          />
        ))}
      </group>
    </>
  );
}
