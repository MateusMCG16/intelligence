"use client";

import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, Float, TrackballControls, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useInterestStore, InterestNode, InterestLink } from '@/store/useInterestStore';
import { generateSubInterests } from '@/app/actions';

function NodeComponent({
    node,
    onExpand
}: {
    node: InterestNode;
    onExpand: (nodeId: string, label: string) => void;
}) {
    const meshRef = useRef<THREE.Mesh>(null);
    const textRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);
    const { camera } = useThree();

    useFrame(() => {
        if (meshRef.current) {
            meshRef.current.position.set(node.x, node.y, node.z);
        }
        if (textRef.current && meshRef.current) {
            textRef.current.position.set(node.x, node.y - node.radius - 0.5, node.z);
            textRef.current.quaternion.copy(camera.quaternion); // billboard
        }
    });

    return (
        <group>
            <mesh
                ref={meshRef}
                onClick={(e) => {
                    e.stopPropagation();
                    onExpand(node.id, node.label);
                }}
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
            >
                <sphereGeometry args={[node.radius, 32, 32]} />
                <meshPhysicalMaterial
                    color={hovered ? "#ffffff" : node.color}
                    emissive={node.color}
                    emissiveIntensity={hovered ? 0.8 : 0.2}
                    roughness={0.1}
                    metalness={0.5}
                    transmission={0.5}
                    thickness={1.5}
                    clearcoat={1}
                    clearcoatRoughness={0.1}
                />
            </mesh>

            <group ref={textRef}>
                {/* Glow effect text */}
                <Text
                    fontSize={0.4}
                    color="#ffffff"
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.02}
                    outlineColor="#000000"
                    renderOrder={1}
                >
                    {node.label}
                </Text>
            </group>
        </group>
    );
}

function LinksRenderer() {
    const { nodes, links } = useInterestStore();
    const linesRef = useRef<THREE.LineSegments>(null);

    const geometry = useMemo(() => {
        return new THREE.BufferGeometry();
    }, []);

    useFrame(() => {
        if (!linesRef.current) return;

        const positions = new Float32Array(links.length * 6);
        let idx = 0;

        // Quick lookup
        const nodeMap = new Map<string, InterestNode>();
        nodes.forEach(n => nodeMap.set(n.id, n));

        links.forEach(l => {
            const source = nodeMap.get(l.source);
            const target = nodeMap.get(l.target);
            if (source && target) {
                positions[idx++] = source.x;
                positions[idx++] = source.y;
                positions[idx++] = source.z;
                positions[idx++] = target.x;
                positions[idx++] = target.y;
                positions[idx++] = target.z;
            }
        });

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.attributes.position.needsUpdate = true;
    });

    return (
        <lineSegments ref={linesRef} geometry={geometry}>
            <lineBasicMaterial color="#ffffff" opacity={0.2} transparent depthWrite={false} />
        </lineSegments>
    );
}

function PhysicsEngine() {
    const { nodes, links } = useInterestStore();

    useFrame(() => {
        const k = 0.05; // spring strength
        const damping = 0.8;
        const repulsion = 1.0;
        const centerAttract = 0.005;

        // Repulsion and Center Attract
        for (let i = 0; i < nodes.length; i++) {
            const n1 = nodes[i];
            let fx = -n1.x * centerAttract;
            let fy = -n1.y * centerAttract;
            let fz = -n1.z * centerAttract;

            for (let j = 0; j < nodes.length; j++) {
                if (i === j) continue;
                const n2 = nodes[j];

                const dx = n1.x - n2.x;
                const dy = n1.y - n2.y;
                const dz = n1.z - n2.z;
                let distSq = dx * dx + dy * dy + dz * dz;
                if (distSq < 0.1) distSq = 0.1; // prevent divide by 0

                let dist = Math.sqrt(distSq);

                const f = repulsion / distSq;
                fx += (dx / dist) * f;
                fy += (dy / dist) * f;
                fz += (dz / dist) * f;
            }
            n1.vx += fx;
            n1.vy += fy;
            n1.vz += fz;
        }

        // Spring Forces
        const nodeMap = new Map<string, InterestNode>();
        nodes.forEach(n => nodeMap.set(n.id, n));

        links.forEach(link => {
            const source = nodeMap.get(link.source);
            const target = nodeMap.get(link.target);
            if (source && target) {
                const dx = target.x - source.x;
                const dy = target.y - source.y;
                const dz = target.z - source.z;
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                const diff = dist - 3.5; // ideal length

                const f = diff * k;
                const fx = (dx / dist) * f;
                const fy = (dy / dist) * f;
                const fz = (dz / dist) * f;

                source.vx += fx;
                source.vy += fy;
                source.vz += fz;
                target.vx -= fx;
                target.vy -= fy;
                target.vz -= fz;
            }
        });

        // Apply Velocities
        nodes.forEach(n => {
            n.vx *= damping;
            n.vy *= damping;
            n.vz *= damping;

            // Speed limit
            const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy + n.vz * n.vz);
            if (speed < 0.001) {
                n.vx = 0; n.vy = 0; n.vz = 0;
            }

            n.x += n.vx;
            n.y += n.vy;
            n.z += n.vz;
        });
    });

    return null;
}

export default function ThreeGraph() {
    const { nodes, addNodes } = useInterestStore();
    const [loadingNodeId, setLoadingNodeId] = useState<string | null>(null);

    const handleExpand = async (id: string, label: string) => {
        if (loadingNodeId) return;
        setLoadingNodeId(id);
        try {
            const sub = await generateSubInterests(label);
            addNodes(sub, id);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingNodeId(null);
        }
    };

    return (
        <>
            <PhysicsEngine />
            <LinksRenderer />

            {nodes.map(node => (
                <NodeComponent
                    key={node.id}
                    node={node}
                    onExpand={handleExpand}
                />
            ))}

            {/* Loading Indicator for specific node */}
            {loadingNodeId && nodes.map(node => {
                if (node.id === loadingNodeId) {
                    return (
                        <Html key={`html-${node.id}`} position={[node.x, node.y + node.radius + 0.5, node.z]} center>
                            <div className="flex space-x-1 items-center bg-black/50 px-2 py-1 rounded-full backdrop-blur-md">
                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                            </div>
                        </Html>
                    )
                }
                return null;
            })}
        </>
    );
}
