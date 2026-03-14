"use client";

import React, { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Html, Billboard } from "@react-three/drei";
import * as THREE from "three";
import { useInterestStore, InterestNode } from "@/store/useInterestStore";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { generateSubInterests } from "@/app/actions";

const SPHERE_GEO = new THREE.SphereGeometry(1, 32, 32);
const _tempColor = new THREE.Color();

// Interface para dados mutáveis de física
interface PhysicsData {
  id: string;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  radius: number;
}

const NodeComponent = React.memo(({
  node,
  onFocus,
  onExpand,
  isLoading,
  physicsRef,
}: {
  node: InterestNode;
  onFocus: (nodeId: string) => void;
  onExpand: (nodeId: string, label: string) => void;
  isLoading: boolean;
  physicsRef: React.MutableRefObject<Record<string, PhysicsData>>;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const billboardRef = useRef<THREE.Group>(null);
  const htmlRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [scale, setScale] = useState(1);
  const targetScale = hovered ? 1.4 : 1;

  useFrame(() => {
    const data = physicsRef.current[node.id];
    if (!data || !meshRef.current) return;

    // Interpolação de escala
    const newScale = THREE.MathUtils.lerp(scale, targetScale, 0.2);
    if (Math.abs(newScale - scale) > 0.001) setScale(newScale);

    // Atualiza posição do mesh
    meshRef.current.position.set(data.x, data.y, data.z);
    meshRef.current.scale.setScalar(node.radius * scale);

    // Atualiza posição do Billboard (texto embaixo)
    if (billboardRef.current) {
      billboardRef.current.position.set(data.x, data.y - (node.radius * scale) - 0.8, data.z);
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
          emissiveIntensity={hovered ? 25 : 12}
          toneMapped={false}
          roughness={0}
          metalness={0.8}
        />
        {hovered && <pointLight color={node.color} intensity={5} distance={10} decay={2} />}
      </mesh>

      <Billboard ref={billboardRef}>
        <Text
          fontSize={node.radius * 0.45}
          color="#ffffff"
          anchorX="center"
          anchorY="top"
          outlineWidth={0.02}
          outlineColor="#000000"
          maxWidth={5}
          textAlign="center"
          font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
        >
          {node.label.length > 30 ? node.label.slice(0, 28) + "…" : node.label}
        </Text>
      </Billboard>

      {isLoading && (
        <Html 
          distanceFactor={15} 
          position={[0, node.radius + 0.8, 0]} 
          center
        >
          <div 
            ref={htmlRef}
            className="flex space-x-1 items-center bg-black/40 backdrop-blur-md px-2 py-1 rounded-full border border-white/10 scale-50"
          >
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse [animation-delay:200ms]"></div>
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse [animation-delay:400ms]"></div>
          </div>
        </Html>
      )}
    </group>
  );
});

NodeComponent.displayName = "NodeComponent";

function LinksRenderer({ physicsRef }: { physicsRef: React.MutableRefObject<Record<string, PhysicsData>> }) {
  const { nodes, links } = useInterestStore();
  const geometryRef = useRef<THREE.BufferGeometry>(null);

  const MAX_LINKS = 2000;
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
        pos[i6] = source.x; pos[i6+1] = source.y; pos[i6+2] = source.z;
        pos[i6+3] = target.x; pos[i6+4] = target.y; pos[i6+5] = target.z;
        
        _tempColor.set(sourceNode.color);
        col[i6] = _tempColor.r; col[i6+1] = _tempColor.g; col[i6+2] = _tempColor.b;
        
        _tempColor.set(targetNode.color);
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
      <lineBasicMaterial vertexColors transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
    </lineSegments>
  );
}

export default function ThreeGraph({ isSimulationPaused = false }: { isSimulationPaused?: boolean }) {
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
  const groupRef = useRef<THREE.Group>(null);

  // Física em Ref para performance extrema
  const physicsRef = useRef<Record<string, PhysicsData>>({});

  // Inicializa física quando os nodes mudam no store
  useEffect(() => {
    const current = physicsRef.current;
    nodes.forEach(node => {
      if (!current[node.id]) {
        current[node.id] = {
          id: node.id,
          x: node.x, y: node.y, z: node.z,
          vx: node.vx, vy: node.vy, vz: node.vz,
          radius: node.radius
        };
      }
    });
    // Limpa nodes removidos
    const nodeIds = new Set(nodes.map(n => n.id));
    Object.keys(current).forEach(id => {
      if (!nodeIds.has(id)) delete current[id];
    });
  }, [nodes]);

  useFrame(() => {
    if (isSimulationPaused || nodes.length === 0) return;

    const physArray = Object.values(physicsRef.current);
    const k = 0.12; 
    const damping = 0.92; 
    const repulsion = 1.8;
    const centerAttract = 0.01;

    // Repulsão entre todos e atração ao centro
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
        if (distSq < 0.5) distSq = 0.5;
        const f = repulsion / distSq;
        const dist = Math.sqrt(distSq);
        const fx = (dx / dist) * f;
        const fy = (dy / dist) * f;
        const fz = (dz / dist) * f;
        n1.vx += fx; n1.vy += fy; n1.vz += fz;
        n2.vx -= fx; n2.vy -= fy; n2.vz -= fz;
      }
    }

    // Atração de links
    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      const source = physicsRef.current[link.source];
      const target = physicsRef.current[link.target];
      if (source && target) {
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dz = target.z - source.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
        const diff = dist - 5;
        const f = diff * k;
        const ofx = (dx / dist) * f;
        const ofy = (dy / dist) * f;
        const ofz = (dz / dist) * f;
        source.vx += ofx; source.vy += ofy; source.vz += ofz;
        target.vx -= ofx; target.vy -= ofy; target.vz -= ofz;
      }
    }

    // Aplicar velocidade e damping
    for (let i = 0; i < physArray.length; i++) {
      const n = physArray[i];
      n.vx *= damping; n.vy *= damping; n.vz *= damping;
      n.x += n.vx; n.y += n.vy; n.z += n.vz;
    }

    // ATUALIZA FOCO DINAMICAMENTE
    if (focusNodeId) {
      const data = physicsRef.current[focusNodeId];
      if (data) {
        setFocusTarget({ x: data.x, y: data.y, z: data.z });
      }
    }
  });

  const handleFocus = useCallback((nodeId: string) => {
    setFocusNodeId(nodeId);
    const data = physicsRef.current[nodeId];
    if (data) setFocusTarget({ x: data.x, y: data.y, z: data.z });
  }, [setFocusNodeId, setFocusTarget]);

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
    <group 
      ref={groupRef} 
      onPointerMissed={() => {
        setFocusNodeId(null);
        setFocusTarget(null);
      }}
    >
      <LinksRenderer physicsRef={physicsRef} />
      {nodes.map((node) => (
        <NodeComponent
          key={node.id}
          node={node}
          onFocus={handleFocus}
          onExpand={handleExpand}
          isLoading={loadingNodeId === node.id}
          physicsRef={physicsRef}
        />
      ))}
    </group>
  );
}
