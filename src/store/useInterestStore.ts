import { create } from "zustand";
import { persist } from "zustand/middleware";
import { areTopicsSimilar, dedupeTopics } from "@/lib/topicSimilarity";

export interface InterestNode {
  id: string;
  label: string;
  parentId: string | null;
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
  addNodes: (labels: string[], parentId: string) => void;
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

export const useInterestStore = create<InterestStore>()(
  persist(
    (set, get) => ({
      nodes: [],
      links: [],
      focusTarget: null,
      focusNodeId: null,
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

        // Position logic - start close to parent if exists, otherwise near origin
        let startX = (Math.random() - 0.5) * 2;
        let startY = (Math.random() - 0.5) * 2;
        let startZ = (Math.random() - 0.5) * 2;

        if (parentId) {
          const parentNode = get().nodes.find((n) => n.id === parentId);
          if (parentNode) {
            // Spawn slightly offset from parent
            startX = parentNode.x + (Math.random() - 0.5) * 0.5;
            startY = parentNode.y + (Math.random() - 0.5) * 0.5;
            startZ = parentNode.z + (Math.random() - 0.5) * 0.5;
          }
        }

        const newNode: InterestNode = {
          id,
          label: cleanedLabel,
          parentId,
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

        uniqueLabels.forEach((label) => get().addNode(label, parentId));
      },
      setNodes: (nodes) => set({ nodes }),
      setFocusTarget: (target) => set({ focusTarget: target }),
      clear: () =>
        set({ nodes: [], links: [], focusTarget: null, totalTokens: 0 }),
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
