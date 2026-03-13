"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Compass,
  LoaderCircle,
  Search,
  Sparkles,
  Menu,
  X,
  Layers,
  HelpCircle,
} from "lucide-react";
import { summarizeTopic, type TopicSummaryResponse } from "@/app/actions";
import { useInterestStore, type InterestNode } from "@/store/useInterestStore";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useSettingsStore } from "@/store/useSettingsStore";

type TopicNode = Pick<InterestNode, "id" | "label" | "parentId" | "color">;

type Copy = {
  badge: string;
  title: string;
  subtitle: string;
  backToSpace: string;
  searchPlaceholder: string;
  topicsTitle: string;
  topicsHint: string;
  emptyTitle: string;
  emptyDescription: string;
  createTopics: string;
  selectTopic: string;
  summaryTitle: string;
  summaryHint: string;
  loadingSummary: string;
  keyPoints: string;
  questions: string;
  parentTopic: string;
  subtopics: string;
  noParent: string;
  noChildren: string;
  retry: string;
  summaryError: string;
};

const COPY: Record<"pt" | "en", Copy> = {
  pt: {
    badge: "Knowledge Hub",
    title: "Exploração de Conhecimento",
    subtitle:
      "Aprofunde-se nos tópicos do seu mapa mental com resumos inteligentes.",
    backToSpace: "Explorar Mapa",
    searchPlaceholder: "Filtrar tópicos...",
    topicsTitle: "Seus Tópicos",
    topicsHint: "Escolha um assunto abaixo",
    emptyTitle: "Seu espaço está vazio",
    emptyDescription: "Gere alguns tópicos no seu Space para vê-los aqui.",
    createTopics: "Ir para o Space",
    selectTopic: "Selecione um tópico na barra lateral para começar a leitura.",
    summaryTitle: "Resumo Estruturado",
    summaryHint: "Síntese gerada por IA",
    loadingSummary: "Sintetizando informações...",
    keyPoints: "Pontos Cruciais",
    questions: "Caminhos para Curiosidade",
    parentTopic: "Origem",
    subtopics: "Desdobramentos",
    noParent: "Este tópico está na raiz do mapa.",
    noChildren: "Fim da ramificação atual.",
    retry: "Tentar Novamente",
    summaryError: "Não foi possível gerar o resumo agora.",
  },
  en: {
    badge: "Knowledge Hub",
    title: "Knowledge Exploration",
    subtitle:
      "Deepen your understanding with AI-powered summaries of your topics.",
    backToSpace: "Back to Map",
    searchPlaceholder: "Filter topics...",
    topicsTitle: "Your Topics",
    topicsHint: "Select a subject below",
    emptyTitle: "Your space is empty",
    emptyDescription: "Generate some topics in your Space to see them here.",
    createTopics: "Go to Space",
    selectTopic: "Select a topic from the sidebar to start reading.",
    summaryTitle: "Structured Summary",
    summaryHint: "AI-generated synthesis",
    loadingSummary: "Synthesizing information...",
    keyPoints: "Key Insights",
    questions: "Curiosity Paths",
    parentTopic: "Source",
    subtopics: "Branches",
    noParent: "This topic is at the root of the map.",
    noChildren: "End of current branch.",
    retry: "Try Again",
    summaryError: "Could not generate the summary right now.",
  },
};

function getChildrenMap(nodes: TopicNode[]) {
  const map = new Map<string, TopicNode[]>();
  nodes.forEach((node) => {
    if (!node.parentId) return;
    const current = map.get(node.parentId) ?? [];
    current.push(node);
    map.set(node.parentId, current);
  });
  return map;
}

function getBreadcrumbs(
  node: TopicNode | undefined,
  nodeMap: Map<string, TopicNode>,
) {
  if (!node) return [];
  const trail: TopicNode[] = [];
  let current: TopicNode | undefined = node;
  while (current) {
    trail.unshift(current);
    current = current.parentId ? nodeMap.get(current.parentId) : undefined;
  }
  return trail;
}

export default function KnowledgePage() {
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [summaryCache, setSummaryCache] = useState<
    Record<string, TopicSummaryResponse>
  >({});
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const nodes = useInterestStore((state) => state.nodes);
  const addTokens = useInterestStore((state) => state.addTokens);
  const language = useLanguageStore((state) => state.language);
  const provider = useSettingsStore((state) => state.provider);
  const copy = COPY[language];

  useEffect(() => {
    setHydrated(true);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  }, []);

  const topicNodes = useMemo(() => {
    return [...nodes]
      .sort((a, b) => a.label.localeCompare(b.label))
      .map(({ id, label, parentId, color }) => ({
        id,
        label,
        parentId,
        color,
      }));
  }, [nodes]);

  const nodeMap = useMemo(
    () => new Map(topicNodes.map((n) => [n.id, n])),
    [topicNodes],
  );
  const childrenMap = useMemo(() => getChildrenMap(topicNodes), [topicNodes]);

  const filteredNodes = useMemo(() => {
    const q = query.toLowerCase().trim();
    return q
      ? topicNodes.filter((n) => n.label.toLowerCase().includes(q))
      : topicNodes;
  }, [query, topicNodes]);

  const selectedNode = selectedId ? nodeMap.get(selectedId) : undefined;
  const breadcrumbs = useMemo(
    () => getBreadcrumbs(selectedNode, nodeMap),
    [nodeMap, selectedNode],
  );
  const selectedParent = selectedNode?.parentId
    ? nodeMap.get(selectedNode.parentId)
    : undefined;
  const selectedChildren = useMemo(
    () => (selectedNode ? (childrenMap.get(selectedNode.id) ?? []) : []),
    [childrenMap, selectedNode],
  );

  const summaryKey = selectedNode
    ? `${language}:${provider}:${selectedNode.id}`
    : null;
  const selectedSummary = summaryKey ? summaryCache[summaryKey] : undefined;

  useEffect(() => {
    if (!selectedNode || !summaryKey || summaryCache[summaryKey]) return;

    let cancelled = false;
    const load = async () => {
      setLoadingKey(summaryKey);
      setSummaryError(null);
      try {
        const result = await summarizeTopic({
          topic: selectedNode.label,
          language,
          provider,
          context: {
            parent: selectedParent?.label ?? null,
            breadcrumb: breadcrumbs.map((n) => n.label),
            children: selectedChildren.map((n) => n.label).slice(0, 6),
          },
        });
        if (cancelled) return;
        setSummaryCache((prev) => ({ ...prev, [summaryKey]: result }));
        addTokens(result.tokens);
      } catch (err) {
        if (!cancelled)
          setSummaryError(
            err instanceof Error ? err.message : copy.summaryError,
          );
      } finally {
        if (!cancelled) setLoadingKey(null);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [
    selectedNode,
    summaryKey,
    language,
    provider,
    refreshIndex,
    summaryCache,
    breadcrumbs,
    selectedParent,
    selectedChildren,
    addTokens,
    copy.summaryError,
  ]);

  return (
    <main className="relative min-h-screen bg-[#050505] text-neutral-200 selection:bg-white/10 font-sans">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,_rgba(50,50,255,0.1),_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,_rgba(150,50,255,0.05),_transparent_40%)]" />
      </div>

      <div className="relative z-10 flex min-h-screen">
        <AnimatePresence mode="wait">
          {sidebarOpen && (
            <motion.aside
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              className="fixed lg:sticky top-0 h-screen w-80 shrink-0 border-r border-white/5 bg-black/40 backdrop-blur-3xl z-40 overflow-hidden flex flex-col"
            >
              <div className="p-6 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black">
                    <BookOpen size={16} />
                  </div>
                  <span className="font-semibold tracking-tight text-white">
                    {copy.badge}
                  </span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden p-1.5 hover:bg-white/5 rounded-lg text-white/50"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                <div className="relative flex items-center">
                  <Search className="absolute left-3 text-white/30" size={14} />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={copy.searchPlaceholder}
                    className="w-full bg-white/5 border border-white/5 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-white/10 placeholder:text-white/20 text-white"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                {filteredNodes.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => {
                      setSelectedId(node.id);
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                    className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                      selectedId === node.id
                        ? "bg-white/10 text-white shadow-xl"
                        : "text-white/50 hover:bg-white/5 hover:text-white/80"
                    }`}
                  >
                    <div
                      className="w-2 h-2 rounded-full shrink-0 shadow-[0_0_8px_rgba(255,255,255,0.2)]"
                      style={{ backgroundColor: node.color }}
                    />
                    <span className="text-sm font-medium truncate">
                      {node.label}
                    </span>
                    <ChevronRight
                      size={14}
                      className={`ml-auto transition-transform ${selectedId === node.id ? "rotate-0 opacity-100" : "-rotate-90 opacity-0 group-hover:opacity-40"}`}
                    />
                  </button>
                ))}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        <div className="flex-1 flex flex-col relative min-w-0">
          <header className="sticky top-0 z-30 w-full p-4 lg:p-6 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-3 pointer-events-auto">
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl hover:bg-white/10 transition-colors text-white/80"
                >
                  <Menu size={20} />
                </button>
              )}
              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl hover:bg-white/10 transition-colors text-sm font-medium text-white/80"
              >
                <Compass size={18} />
                <span className="hidden sm:inline">{copy.backToSpace}</span>
              </Link>
            </div>

            <div className="pointer-events-auto flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase tracking-widest text-white/40 font-bold">
                <Sparkles size={12} />
                AI Enhanced
              </div>
            </div>
          </header>

          <section className="w-full max-w-4xl mx-auto px-6 pb-24 pt-4 flex-1">
            {!hydrated ? (
              <div className="space-y-8 animate-pulse">
                <div className="h-12 w-2/3 bg-white/5 rounded-2xl" />
                <div className="h-40 w-full bg-white/5 rounded-3xl" />
              </div>
            ) : !selectedNode ? (
              <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-white/20">
                  <Layers size={40} />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-white/80">
                    {copy.selectTopic}
                  </h2>
                  <p className="text-white/40 mt-2 max-w-sm">{copy.subtitle}</p>
                </div>
                {topicNodes.length === 0 && (
                  <Link
                    href="/"
                    className="px-6 py-3 bg-white text-black rounded-2xl font-semibold hover:bg-white/90 transition-colors"
                  >
                    {copy.createTopics}
                  </Link>
                )}
              </div>
            ) : (
              <motion.div
                key={selectedNode.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-12"
              >
                <header className="space-y-6">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-white/40">
                    {breadcrumbs.map((node, i) => (
                      <div key={node.id} className="flex items-center gap-2">
                        <span
                          className="hover:text-white/60 cursor-pointer transition-colors"
                          onClick={() => setSelectedId(node.id)}
                        >
                          {node.label}
                        </span>
                        {i < breadcrumbs.length - 1 && (
                          <ChevronRight size={12} />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-4 h-4 rounded-full shadow-[0_0_15px_currentColor]"
                        style={{
                          color: selectedNode.color,
                          backgroundColor: selectedNode.color,
                        }}
                      />
                      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
                        {selectedNode.label}
                      </h1>
                    </div>
                  </div>
                </header>

                <div className="space-y-10">
                  {loadingKey === summaryKey && !selectedSummary ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-white/[0.02] border border-white/5 rounded-[40px]">
                      <LoaderCircle
                        size={32}
                        className="animate-spin text-white/20"
                      />
                      <p className="text-sm text-white/40 font-medium">
                        {copy.loadingSummary}
                      </p>
                    </div>
                  ) : summaryError && !selectedSummary ? (
                    <div className="p-10 text-center bg-red-500/5 border border-red-500/10 rounded-[40px] space-y-4">
                      <p className="text-white/60">{summaryError}</p>
                      <button
                        onClick={() => setRefreshIndex((i) => i + 1)}
                        className="px-4 py-2 bg-white/10 rounded-xl text-sm hover:bg-white/20 transition-colors text-white"
                      >
                        {copy.retry}
                      </button>
                    </div>
                  ) : selectedSummary ? (
                    <div className="space-y-12">
                      <section className="relative">
                        <div className="absolute -left-6 top-0 bottom-0 w-1 bg-white/5 rounded-full hidden sm:block" />
                        <p className="text-xl sm:text-2xl leading-relaxed text-white/80 font-normal">
                          {selectedSummary.summary}
                        </p>
                      </section>

                      <div className="grid sm:grid-cols-2 gap-8">
                        <section className="space-y-6">
                          <div className="flex items-center gap-2 text-white/30">
                            <Layers size={18} />
                            <h3 className="text-xs uppercase tracking-widest font-bold">
                              {copy.keyPoints}
                            </h3>
                          </div>
                          <ul className="space-y-4">
                            {selectedSummary.keyPoints.map((point, i) => (
                              <motion.li
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                key={i}
                                className="flex gap-4 text-white/70 leading-relaxed text-sm sm:text-base"
                              >
                                <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />
                                {point}
                              </motion.li>
                            ))}
                          </ul>
                        </section>

                        <section className="space-y-6">
                          <div className="flex items-center gap-2 text-white/30">
                            <HelpCircle size={18} />
                            <h3 className="text-xs uppercase tracking-widest font-bold">
                              {copy.questions}
                            </h3>
                          </div>
                          <div className="space-y-4">
                            {selectedSummary.questions.map((q, i) => (
                              <motion.div
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                key={i}
                                className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl text-white/60 hover:text-white/80 hover:bg-white/5 transition-all group"
                              >
                                <p className="text-sm italic">
                                  &ldquo;{q}&rdquo;
                                </p>
                              </motion.div>
                            ))}
                          </div>
                        </section>
                      </div>

                      <footer className="pt-12 border-t border-white/5 space-y-8">
                        <div className="flex flex-col sm:flex-row gap-8">
                          <div className="flex-1 space-y-4">
                            <h4 className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-bold">
                              {copy.parentTopic}
                            </h4>
                            {selectedParent ? (
                              <button
                                onClick={() => setSelectedId(selectedParent.id)}
                                className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-colors w-full group text-white/70"
                              >
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{
                                    backgroundColor: selectedParent.color,
                                  }}
                                />
                                <span className="text-sm font-medium">
                                  {selectedParent.label}
                                </span>
                                <ArrowLeft
                                  size={14}
                                  className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                                />
                              </button>
                            ) : (
                              <p className="text-sm text-white/20 italic">
                                {copy.noParent}
                              </p>
                            )}
                          </div>

                          <div className="flex-[2] space-y-4">
                            <h4 className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-bold">
                              {copy.subtopics}
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedChildren.length > 0 ? (
                                selectedChildren.map((child) => (
                                  <button
                                    key={child.id}
                                    onClick={() => setSelectedId(child.id)}
                                    className="px-4 py-2 bg-white/5 border border-white/5 rounded-xl text-sm font-medium hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-2 text-white/70"
                                  >
                                    <div
                                      className="w-1.5 h-1.5 rounded-full"
                                      style={{ backgroundColor: child.color }}
                                    />
                                    {child.label}
                                  </button>
                                ))
                              ) : (
                                <p className="text-sm text-white/20 italic">
                                  {copy.noChildren}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </footer>
                    </div>
                  ) : null}
                </div>
              </motion.div>
            )}
          </section>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </main>
  );
}
