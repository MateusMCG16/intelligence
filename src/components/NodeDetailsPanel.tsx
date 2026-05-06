"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BookOpen,
  ChevronRight,
  Edit3,
  GitBranch,
  Loader2,
  Maximize2,
  Network,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { generateSubInterests } from "@/app/actions";
import { useInterestStore, type InterestNode } from "@/store/useInterestStore";
import { useLanguageStore } from "@/store/useLanguageStore";

function getBreadcrumbs(
  node: InterestNode | undefined,
  nodeMap: Map<string, InterestNode>,
) {
  if (!node) return [];

  const trail: InterestNode[] = [];
  let current: InterestNode | undefined = node;
  const visited = new Set<string>();

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    trail.unshift(current);
    current = current.parentId ? nodeMap.get(current.parentId) : undefined;
  }

  return trail;
}

export default function NodeDetailsPanel() {
  const nodes = useInterestStore((state) => state.nodes);
  const focusNodeId = useInterestStore((state) => state.focusNodeId);
  const setFocusNodeId = useInterestStore((state) => state.setFocusNodeId);
  const setFocusTarget = useInterestStore((state) => state.setFocusTarget);
  const addNodes = useInterestStore((state) => state.addNodes);
  const addTokens = useInterestStore((state) => state.addTokens);
  const renameNode = useInterestStore((state) => state.renameNode);
  const removeNode = useInterestStore((state) => state.removeNode);
  const { language } = useLanguageStore();

  const [isRenaming, setIsRenaming] = useState(false);
  const [draftLabel, setDraftLabel] = useState("");
  const [isExpanding, setIsExpanding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const nodeMap = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes],
  );

  const selectedNode = focusNodeId ? nodeMap.get(focusNodeId) : undefined;

  const selectedChildren = useMemo(
    () =>
      selectedNode
        ? nodes.filter((node) => node.parentId === selectedNode.id)
        : [],
    [nodes, selectedNode],
  );

  const breadcrumbs = useMemo(
    () => getBreadcrumbs(selectedNode, nodeMap),
    [nodeMap, selectedNode],
  );

  if (!selectedNode) return null;

  const hasChildren = selectedChildren.length > 0;
  const wasExpanded = Boolean(selectedNode.expandedAt || hasChildren);

  const focusNode = (node: InterestNode) => {
    setFocusNodeId(node.id);
    setFocusTarget(null);
  };

  const startRename = () => {
    setDraftLabel(selectedNode.label);
    setErrorMessage(null);
    setIsRenaming(true);
  };

  const submitRename = () => {
    const renamed = renameNode(selectedNode.id, draftLabel);
    if (!renamed) {
      setErrorMessage("Nome vazio ou muito parecido com outro tópico.");
      return;
    }

    setIsRenaming(false);
    setErrorMessage(null);
  };

  const handleExpand = async () => {
    if (isExpanding) return;

    setIsExpanding(true);
    setErrorMessage(null);

    try {
      const existingLabels = useInterestStore
        .getState()
        .nodes.map((node) => node.label);
      const result = await generateSubInterests(
        selectedNode.label,
        language,
        existingLabels,
      );

      addNodes(result.topics, selectedNode.id);
      addTokens(result.tokens);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Nao foi possivel expandir este topico.",
      );
    } finally {
      setIsExpanding(false);
    }
  };

  const handleRemove = () => {
    const shouldRemove = window.confirm(
      `Remover "${selectedNode.label}" e todos os subtópicos?`,
    );
    if (!shouldRemove) return;

    removeNode(selectedNode.id);
  };

  return (
    <aside className="absolute right-4 top-24 bottom-32 z-20 w-[min(360px,calc(100vw-2rem))] pointer-events-auto">
      <div className="h-full flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/55 backdrop-blur-2xl shadow-2xl">
        <div className="flex items-start gap-3 border-b border-white/10 p-4">
          <div
            className="mt-1 h-3 w-3 shrink-0 rounded-full shadow-[0_0_18px_currentColor]"
            style={{
              color: selectedNode.color,
              backgroundColor: selectedNode.color,
            }}
          />

          <div className="min-w-0 flex-1">
            {isRenaming ? (
              <div className="space-y-2">
                <input
                  autoFocus
                  value={draftLabel}
                  onChange={(event) => setDraftLabel(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") submitRename();
                    if (event.key === "Escape") setIsRenaming(false);
                  }}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={submitRename}
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-white/90"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRenaming(false)}
                    className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/60 hover:bg-white/10 hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
                  Tópico selecionado
                </p>
                <h2 className="mt-1 break-words text-xl font-semibold leading-tight text-white">
                  {selectedNode.label}
                </h2>
              </>
            )}
          </div>

          <button
            type="button"
            aria-label="Fechar painel"
            title="Fechar painel"
            onClick={() => {
              setFocusNodeId(null);
              setFocusTarget(null);
            }}
            className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {breadcrumbs.length > 1 && (
            <div className="flex flex-wrap items-center gap-1 text-xs text-white/45">
              {breadcrumbs.map((item, index) => (
                <div key={item.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => focusNode(item)}
                    className="max-w-[120px] truncate hover:text-white"
                  >
                    {item.label}
                  </button>
                  {index < breadcrumbs.length - 1 && (
                    <ChevronRight size={12} />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[10px] uppercase tracking-widest text-white/30">
                Nível
              </p>
              <p className="mt-1 text-lg font-mono text-white/85">
                {selectedNode.depth ?? breadcrumbs.length - 1}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[10px] uppercase tracking-widest text-white/30">
                Filhos
              </p>
              <p className="mt-1 text-lg font-mono text-white/85">
                {selectedChildren.length}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[10px] uppercase tracking-widest text-white/30">
                Status
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-white/75">
                {wasExpanded ? "Expandido" : "Novo"}
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-100/80">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleExpand}
              disabled={isExpanding}
              className="flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isExpanding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              Expandir
            </button>

            <Link
              href={`/knowledge?topic=${selectedNode.id}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              <BookOpen size={16} />
              Estudar
            </Link>

            <button
              type="button"
              onClick={startRename}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-semibold text-white/65 transition hover:bg-white/10 hover:text-white"
            >
              <Edit3 size={16} />
              Renomear
            </button>

            <button
              type="button"
              onClick={handleRemove}
              className="flex items-center justify-center gap-2 rounded-xl border border-red-500/15 bg-red-500/10 px-3 py-3 text-sm font-semibold text-red-100/70 transition hover:bg-red-500/15 hover:text-red-100"
            >
              <Trash2 size={16} />
              Remover
            </button>
          </div>

          <button
            type="button"
            onClick={() => focusNode(selectedNode)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm font-semibold text-white/65 transition hover:bg-white/10 hover:text-white"
          >
            <Maximize2 size={16} />
            Reenquadrar tópico
          </button>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white/35">
              <GitBranch size={16} />
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em]">
                Subtópicos
              </h3>
            </div>

            {hasChildren ? (
              <div className="space-y-2">
                {selectedChildren.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => focusNode(child)}
                    className="flex w-full items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 text-left text-sm text-white/70 transition hover:border-white/10 hover:bg-white/10 hover:text-white"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: child.color }}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {child.label}
                    </span>
                    <ChevronRight size={14} className="text-white/30" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4 text-sm text-white/35">
                Nenhum subtópico criado ainda.
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2 text-[11px] text-white/35">
            <Network size={14} />
            Clique em outros nodes ou use a busca para trocar a seleção.
          </div>
        </div>
      </div>
    </aside>
  );
}
