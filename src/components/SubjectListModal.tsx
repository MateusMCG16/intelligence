"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, List, X } from "lucide-react";
import { useInterestStore, InterestNode } from "@/store/useInterestStore";

type SubjectNode = Pick<InterestNode, "id" | "label" | "parentId" | "color">;
type TreeInterestNode = SubjectNode & { children: TreeInterestNode[] };

const buildTree = (nodes: SubjectNode[]): TreeInterestNode[] => {
  const map = new Map<string, TreeInterestNode>();
  nodes.forEach((n) => map.set(n.id, { ...n, children: [] }));
  const roots: TreeInterestNode[] = [];
  nodes.forEach((n) => {
    if (n.parentId && map.has(n.parentId)) {
      map.get(n.parentId)?.children.push(map.get(n.id)!);
    } else {
      roots.push(map.get(n.id)!);
    }
  });
  return roots;
};

const collectParentIds = (tree: TreeInterestNode[]): string[] => {
  const parentIds: string[] = [];

  const visit = (node: TreeInterestNode) => {
    if (node.children.length > 0) {
      parentIds.push(node.id);
      node.children.forEach(visit);
    }
  };

  tree.forEach(visit);
  return parentIds;
};

const TreeNode = ({
  node,
  level = 0,
  collapsedIds,
  onToggle,
}: {
  node: TreeInterestNode;
  level?: number;
  collapsedIds: Set<string>;
  onToggle: (nodeId: string) => void;
}) => {
  const hasChildren = node.children.length > 0;
  const isCollapsed = collapsedIds.has(node.id);

  return (
    <div className="flex flex-col">
      <div
        className="flex items-center gap-2 py-1.5 px-2 hover:bg-white/10 rounded-lg cursor-default"
        style={{ paddingLeft: `${level * 0.5 + 0.5}rem` }}
      >
        {hasChildren ? (
          <button
            onClick={() => onToggle(node.id)}
            className="p-0.5 rounded text-white/50 hover:text-white/90 hover:bg-white/10 transition-colors"
            aria-label={isCollapsed ? "Expandir tópico" : "Recolher tópico"}
            title={isCollapsed ? "Expandir" : "Recolher"}
          >
            <ChevronRight
              size={14}
              className={`transition-transform ${isCollapsed ? "" : "rotate-90"}`}
            />
          </button>
        ) : (
          level > 0 && <span className="text-white/35 text-xs">↳</span>
        )}
        <div
          className="w-2 h-2 rounded-full mr-2 shadow-md"
          style={{ backgroundColor: node.color, opacity: 0.8 }}
        />
        <span className="text-sm text-white/90">{node.label}</span>
      </div>
      {hasChildren && !isCollapsed && (
        <div className="ml-4 pl-3 border-l border-white/10 flex flex-col">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              collapsedIds={collapsedIds}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface SubjectListModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SubjectListModal({
  isOpen,
  onOpenChange,
}: SubjectListModalProps) {
  const [snapshotNodes, setSnapshotNodes] = useState<SubjectNode[]>([]);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) return;

    const currentNodes = useInterestStore.getState().nodes.map((node) => ({
      id: node.id,
      label: node.label,
      parentId: node.parentId,
      color: node.color,
    }));

    setSnapshotNodes(currentNodes);
    setCollapsedIds(new Set());
  }, [isOpen]);

  const roots = useMemo(() => buildTree(snapshotNodes), [snapshotNodes]);
  const allParentIds = useMemo(() => collectParentIds(roots), [roots]);

  const toggleNode = useCallback((nodeId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setCollapsedIds(new Set());
  }, []);

  const collapseAll = useCallback(() => {
    setCollapsedIds(new Set(allParentIds));
  }, [allParentIds]);

  return (
    <>
      <button
        onClick={() => onOpenChange(true)}
        className="flex items-center justify-center w-10 h-10 bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl transition-all duration-300 text-white/80 hover:text-white cursor-pointer"
        title="Lista de Assuntos"
      >
        <List size={18} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-32">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/75"
              onClick={() => onOpenChange(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, type: "spring", bounce: 0 }}
              className="relative w-full max-w-2xl max-h-[70vh] bg-black/45 backdrop-blur-[10px] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
                <h2 className="text-lg font-medium text-white/90">
                  Assuntos no Espaço
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={expandAll}
                    className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white/70 hover:text-white transition-colors"
                  >
                    Expandir tudo
                  </button>
                  <button
                    onClick={collapseAll}
                    className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white/70 hover:text-white transition-colors"
                  >
                    Recolher tudo
                  </button>
                  <button
                    onClick={() => onOpenChange(false)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {roots.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {roots.map((root) => (
                      <div
                        key={root.id}
                        className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden"
                      >
                        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-white/[0.02]">
                          <button
                            onClick={() =>
                              root.children.length > 0 && toggleNode(root.id)
                            }
                            className="flex items-center gap-2 min-w-0 text-left"
                          >
                            {root.children.length > 0 ? (
                              <ChevronRight
                                size={14}
                                className={`text-white/60 transition-transform ${collapsedIds.has(root.id) ? "" : "rotate-90"}`}
                              />
                            ) : (
                              <span className="w-[14px]" />
                            )}

                            <div
                              className="w-2.5 h-2.5 rounded-full shadow-md"
                              style={{
                                backgroundColor: root.color,
                                opacity: 0.9,
                              }}
                            />
                            <span className="text-sm font-medium text-white truncate">
                              {root.label}
                            </span>
                          </button>
                          <span className="text-[11px] text-white/50 whitespace-nowrap ml-3">
                            {root.children.length} subitem
                            {root.children.length === 1 ? "" : "s"}
                          </span>
                        </div>

                        <div className="p-2">
                          {root.children.length > 0 ? (
                            !collapsedIds.has(root.id) && (
                              <div className="flex flex-col">
                                {root.children.map((child) => (
                                  <TreeNode
                                    key={child.id}
                                    node={child}
                                    level={1}
                                    collapsedIds={collapsedIds}
                                    onToggle={toggleNode}
                                  />
                                ))}
                              </div>
                            )
                          ) : (
                            <div className="px-2 py-1 text-xs text-white/45">
                              Sem subitens para este tópico.
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-white/40 text-sm">
                    Nenhum assunto no espaço ainda.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
