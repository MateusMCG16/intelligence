import { create } from "zustand";
import { persist } from "zustand/middleware";
import { areTopicsSimilar, dedupeTopics } from "@/lib/topicSimilarity";

export interface InterestNode {
  id: string;
  label: string;
  parentId: string | null;
  depth?: number;
  createdAt?: number;
  expandedAt?: number | null;
  // Intended visual positions
  x: number;
  y: number;
  z: number;
  // For force simulation
  vx: number;
  vy: number;
  vz: number;
  color: string;
  radius: number;
}

export interface InterestLink {
  source: string; // id
  target: string; // id
}

interface InterestStore {
  nodes: InterestNode[];
  links: InterestLink[];
  focusTarget: { x: number; y: number; z: number } | null;
  focusNodeId: string | null;
  addNode: (label: string, parentId?: string | null) => InterestNode;
  addNodes: (labels: string[], parentId: string) => InterestNode[];
  renameNode: (id: string, label: string) => boolean;
  removeNode: (id: string) => void;
  markNodeExpanded: (id: string) => void;
  setNodes: (nodes: InterestNode[]) => void;
  setFocusTarget: (target: { x: number; y: number; z: number } | null) => void;
  setFocusNodeId: (id: string | null) => void;
  clear: () => void;
  totalTokens: number;
  addTokens: (amount: number) => void;
}

const colors = [
  "#ff0000", // Red
  "#00ff00", // Green
  "#0066ff", // Blue
  "#ffff00", // Yellow
  "#ff00ff", // Magenta
  "#00ffff", // Cyan
  "#ff9900", // Orange
];

function getNodeDepth(nodes: InterestNode[], parentId: string | null) {
  if (!parentId) return 0;

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  let depth = 1;
  let current = nodeMap.get(parentId);
  const visited = new Set<string>();

  while (current?.parentId && !visited.has(current.id)) {
    visited.add(current.id);
    depth += 1;
    current = nodeMap.get(current.parentId);
  }

  return depth;
}

function collectDescendantIds(nodes: InterestNode[], nodeId: string) {
  const ids = new Set<string>([nodeId]);
  let changed = true;

  while (changed) {
    changed = false;
    nodes.forEach((node) => {
      if (node.parentId && ids.has(node.parentId) && !ids.has(node.id)) {
        ids.add(node.id);
        changed = true;
      }
    });
  }

  return ids;
}

export const useInterestStore = create<InterestStore>()(
  persist(
    (set, get) => ({
      nodes: [],
      links: [],
      focusTarget: null,
      focusNodeId: null,
      totalTokens: 0,
      addTokens: (amount) =>
        set((state) => ({ totalTokens: state.totalTokens + amount })),
      setFocusNodeId: (id) => set({ focusNodeId: id }),
      addNode: (label, parentId = null) => {
        const cleanedLabel = label.trim();
        const existingNode = get().nodes.find((node) =>
          areTopicsSimilar(node.label, cleanedLabel),
        );

        if (existingNode) {
          return existingNode;
        }

        const id = Math.random().toString(36).substring(2, 9);

        const nodes = get().nodes;
        const depth = getNodeDepth(nodes, parentId);
        const siblingCount = nodes.filter(
          (node) => node.parentId === parentId,
        ).length;
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));

        let startX = 0;
        let startY = 0;
        let startZ = 0;

        if (parentId) {
          const parentNode = nodes.find((n) => n.id === parentId);
          if (parentNode) {
            const angle = siblingCount * goldenAngle;
            const distance = 5 + depth * 1.4;

            startX = parentNode.x + Math.cos(angle) * distance;
            startY = parentNode.y + (siblingCount % 3 - 1) * 2.2;
            startZ = parentNode.z + Math.sin(angle) * distance;
          }
        } else {
          const rootAngle = siblingCount * goldenAngle;
          const rootDistance = siblingCount === 0 ? 0 : 4 + siblingCount * 1.2;

          startX = Math.cos(rootAngle) * rootDistance;
          startY = 0;
          startZ = Math.sin(rootAngle) * rootDistance;
        }

        const newNode: InterestNode = {
          id,
          label: cleanedLabel,
          parentId,
          depth,
          createdAt: Date.now(),
          expandedAt: null,
          x: startX,
          y: startY,
          z: startZ,
          vx: 0,
          vy: 0,
          vz: 0,
          color: colors[Math.floor(Math.random() * colors.length)],
          radius: parentId ? 0.6 : 1.2, // Smaller size for children
        };

        set((state) => {
          const newLinks = [...state.links];
          if (parentId) {
            newLinks.push({ source: parentId, target: id });
          }
          return {
            nodes: [...state.nodes, newNode],
            links: newLinks,
          };
        });

        return newNode;
      },
      addNodes: (labels, parentId) => {
        const uniqueLabels = dedupeTopics(
          labels,
          get().nodes.map((node) => node.label),
        );

        const createdNodes = uniqueLabels.map((label) =>
          get().addNode(label, parentId),
        );

        if (createdNodes.length > 0) get().markNodeExpanded(parentId);
        return createdNodes;
      },
      renameNode: (id, label) => {
        const cleanedLabel = label.trim();
        if (!cleanedLabel) return false;

        const hasSimilarNode = get().nodes.some(
          (node) =>
            node.id !== id && areTopicsSimilar(node.label, cleanedLabel),
        );
        if (hasSimilarNode) return false;

        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === id ? { ...node, label: cleanedLabel } : node,
          ),
        }));
        return true;
      },
      removeNode: (id) => {
        const removeIds = collectDescendantIds(get().nodes, id);

        set((state) => ({
          nodes: state.nodes.filter((node) => !removeIds.has(node.id)),
          links: state.links.filter(
            (link) => !removeIds.has(link.source) && !removeIds.has(link.target),
          ),
          focusNodeId: removeIds.has(state.focusNodeId ?? "")
            ? null
            : state.focusNodeId,
          focusTarget: removeIds.has(state.focusNodeId ?? "")
            ? null
            : state.focusTarget,
        }));
      },
      markNodeExpanded: (id) => {
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === id ? { ...node, expandedAt: Date.now() } : node,
          ),
        }));
      },
      setNodes: (nodes) => set({ nodes }),
      setFocusTarget: (target) => set({ focusTarget: target }),
      clear: () =>
        set({
          nodes: [],
          links: [],
          focusTarget: null,
          focusNodeId: null,
          totalTokens: 0,
        }),
    }),
    {
      name: "interest-storage",
      partialize: (state) => ({
        nodes: state.nodes,
        links: state.links,
        totalTokens: state.totalTokens,
        // We typically don't persist focusTarget, or we could.
        // Let's preserve everything, except we might not need to filter.
        // Omitting partialize will persist everything, which is fine.
      }),
    },
  ),
);
