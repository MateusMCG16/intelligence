"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Compass,
  LoaderCircle,
  Search,
  Sparkles,
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
    badge: "Conhecimento",
    title: "Leia um resumo rápido de cada tópico",
    subtitle:
      "Selecione um assunto do seu Space e veja uma explicação curta, limpa e feita por IA.",
    backToSpace: "Voltar ao Space",
    searchPlaceholder: "Buscar tópico...",
    topicsTitle: "Tópicos",
    topicsHint: "Clique em um tópico para gerar o resumo.",
    emptyTitle: "Seu espaço ainda está vazio",
    emptyDescription:
      "Adicione assuntos no mapa para começar a explorar resumos por IA.",
    createTopics: "Criar assuntos agora",
    selectTopic: "Escolha um tópico para começar.",
    summaryTitle: "Resumo do tópico",
    summaryHint: "Conteúdo gerado por IA com base no tópico selecionado.",
    loadingSummary: "Gerando resumo...",
    keyPoints: "Pontos principais",
    questions: "Perguntas para explorar",
    parentTopic: "Tópico pai",
    subtopics: "Subtópicos",
    noParent: "Este tópico está na raiz do mapa.",
    noChildren: "Este tópico ainda não possui subtópicos.",
    retry: "Tentar novamente",
    summaryError: "Não foi possível gerar o resumo agora.",
  },
  en: {
    badge: "Knowledge",
    title: "Read a quick summary for each topic",
    subtitle:
      "Select a topic from your Space and get a short, clean AI-generated explanation.",
    backToSpace: "Back to Space",
    searchPlaceholder: "Search topic...",
    topicsTitle: "Topics",
    topicsHint: "Click a topic to generate its summary.",
    emptyTitle: "Your space is still empty",
    emptyDescription: "Add topics to your map to start exploring AI summaries.",
    createTopics: "Create topics now",
    selectTopic: "Choose a topic to begin.",
    summaryTitle: "Topic summary",
    summaryHint: "AI-generated content based on the selected topic.",
    loadingSummary: "Generating summary...",
    keyPoints: "Key points",
    questions: "Questions to explore",
    parentTopic: "Parent topic",
    subtopics: "Subtopics",
    noParent: "This topic is at the root of the map.",
    noChildren: "This topic does not have subtopics yet.",
    retry: "Try again",
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
  if (!node) return [] as TopicNode[];

  const trail: TopicNode[] = [];
  let current: TopicNode | undefined = node;

  while (current) {
    trail.unshift(current);
    current = current.parentId ? nodeMap.get(current.parentId) : undefined;
  }

  return trail;
}

function TopicChip({
  label,
  color,
  onClick,
}: {
  label: string;
  color: string;
  onClick?: () => void;
}) {
  const Component = onClick ? "button" : "div";

  return (
    <Component
      onClick={onClick}
      className={`inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/70 transition-all duration-200 ${
        onClick
          ? "cursor-pointer hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          : "cursor-default"
      }`}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="truncate">{label}</span>
    </Component>
  );
}

export default function KnowledgePage() {
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
    const frame = window.requestAnimationFrame(() => {
      setHydrated(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const topicNodes = useMemo<TopicNode[]>(() => {
    return [...nodes]
      .sort((a, b) => a.label.localeCompare(b.label))
      .map(({ id, label, parentId, color }) => ({
        id,
        label,
        parentId,
        color,
      }));
  }, [nodes]);

  const nodeMap = useMemo(() => {
    return new Map(topicNodes.map((node) => [node.id, node]));
  }, [topicNodes]);

  const childrenMap = useMemo(() => getChildrenMap(topicNodes), [topicNodes]);

  const filteredNodes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return topicNodes;

    return topicNodes.filter((node) =>
      node.label.toLowerCase().includes(normalizedQuery),
    );
  }, [query, topicNodes]);

  const resolvedSelectedId =
    selectedId && filteredNodes.some((node) => node.id === selectedId)
      ? selectedId
      : (filteredNodes[0]?.id ?? null);

  const selectedNode = resolvedSelectedId
    ? nodeMap.get(resolvedSelectedId)
    : undefined;

  const breadcrumbs = useMemo(() => {
    return getBreadcrumbs(selectedNode, nodeMap);
  }, [nodeMap, selectedNode]);

  const selectedParent = useMemo(() => {
    return selectedNode?.parentId
      ? nodeMap.get(selectedNode.parentId)
      : undefined;
  }, [nodeMap, selectedNode]);

  const selectedChildren = useMemo(() => {
    return selectedNode ? (childrenMap.get(selectedNode.id) ?? []) : [];
  }, [childrenMap, selectedNode]);

  const summaryKey = selectedNode
    ? `${language}:${provider}:${selectedNode.id}`
    : null;

  const selectedSummary = summaryKey ? summaryCache[summaryKey] : undefined;

  useEffect(() => {
    if (!selectedNode || !summaryKey) return;
    if (summaryCache[summaryKey]) {
      setSummaryError(null);
      return;
    }

    let cancelled = false;

    const loadSummary = async () => {
      setLoadingKey(summaryKey);
      setSummaryError(null);

      try {
        const result = await summarizeTopic({
          topic: selectedNode.label,
          language,
          provider,
          context: {
            parent: selectedParent?.label ?? null,
            breadcrumb: breadcrumbs.map((node) => node.label),
            children: selectedChildren.map((node) => node.label).slice(0, 6),
          },
        });

        if (cancelled) return;

        setSummaryCache((prev) => ({
          ...prev,
          [summaryKey]: result,
        }));
        addTokens(result.tokens);
      } catch (error) {
        if (cancelled) return;
        setSummaryError(
          error instanceof Error ? error.message : copy.summaryError,
        );
      } finally {
        if (!cancelled) {
          setLoadingKey((current) => (current === summaryKey ? null : current));
        }
      }
    };

    void loadSummary();

    return () => {
      cancelled = true;
    };
  }, [
    addTokens,
    breadcrumbs,
    copy.summaryError,
    language,
    provider,
    refreshIndex,
    selectedChildren,
    selectedNode,
    selectedParent,
    summaryCache,
    summaryKey,
  ]);

  const retrySummary = () => {
    if (!summaryKey) return;

    setSummaryCache((prev) => {
      const next = { ...prev };
      delete next[summaryKey];
      return next;
    });
    setRefreshIndex((value) => value + 1);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-neutral-100 selection:bg-white/20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.16),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(192,132,252,0.1),_transparent_30%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,_rgba(255,255,255,0.03),_transparent_25%)]" />

      <div className="relative flex min-h-screen w-full flex-col px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6 flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-2xl lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-white/55">
              <BookOpen size={14} />
              {copy.badge}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-black shadow-lg">
                <Compass size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  {copy.title}
                </h1>
                <p className="mt-1 max-w-2xl text-sm text-white/60 sm:text-base">
                  {copy.subtitle}
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/75 transition-all duration-200 hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={16} />
            {copy.backToSpace}
          </Link>
        </motion.div>

        {!hydrated ? (
          <div className="grid flex-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-2xl" />
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-2xl" />
          </div>
        ) : topicNodes.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-white/[0.05] p-8 text-center shadow-2xl backdrop-blur-2xl"
            >
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/8 text-white/80">
                <Sparkles size={30} />
              </div>
              <h2 className="text-2xl font-semibold text-white">
                {copy.emptyTitle}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-white/60 sm:text-base">
                {copy.emptyDescription}
              </p>
              <Link
                href="/"
                className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-medium text-white/80 transition-all duration-200 hover:border-white/20 hover:bg-white/12 hover:text-white"
              >
                <ArrowLeft size={16} />
                {copy.createTopics}
              </Link>
            </motion.div>
          </div>
        ) : (
          <div className="grid flex-1 items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
            <motion.aside
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
              className="flex w-full flex-col self-start rounded-[28px] border border-white/10 bg-white/[0.04] p-4 shadow-2xl backdrop-blur-2xl lg:sticky lg:top-6"
            >
              <div className="mb-4 w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                <div className="flex items-center gap-2 text-white/50">
                  <Search size={16} />
                  <input
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={copy.searchPlaceholder}
                    className="w-full bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mb-4 w-full px-1">
                <h2 className="text-sm font-semibold text-white/85">
                  {copy.topicsTitle}
                </h2>
                <p className="mt-1 text-xs leading-5 text-white/45">
                  {copy.topicsHint}
                </p>
              </div>

              <div className="w-full max-h-[30rem] space-y-2 overflow-y-auto pr-[6px] overscroll-contain">
                {filteredNodes.map((node) => {
                  const isActive = node.id === resolvedSelectedId;

                  return (
                    <button
                      key={node.id}
                      onClick={() => setSelectedId(node.id)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${
                        isActive
                          ? "border-white/20 bg-white/12 text-white shadow-lg"
                          : "border-white/10 bg-white/[0.03] text-white/65 hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-start gap-2">
                          <span
                            className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: node.color }}
                          />
                          <span className="break-words text-sm font-medium leading-5">
                            {node.label}
                          </span>
                        </div>
                        <ChevronRight
                          size={16}
                          className={
                            isActive ? "text-white/80" : "text-white/35"
                          }
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.aside>

            <motion.section
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
              className="flex min-h-0 flex-col gap-6"
            >
              {selectedNode ? (
                <>
                  <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-2xl">
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-2 h-3 w-3 shrink-0 rounded-full shadow-md"
                        style={{ backgroundColor: selectedNode.color }}
                      />
                      <div className="min-w-0">
                        <h2 className="break-words text-3xl font-semibold leading-tight text-white sm:text-4xl">
                          {selectedNode.label}
                        </h2>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {breadcrumbs.map((node, index) => (
                            <div
                              key={node.id}
                              className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/60"
                            >
                              <span className="truncate">{node.label}</span>
                              {index < breadcrumbs.length - 1 && (
                                <ChevronRight
                                  size={12}
                                  className="text-white/30"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-2xl">
                      <div className="mb-5">
                        <h3 className="text-lg font-semibold text-white">
                          {copy.summaryTitle}
                        </h3>
                        <p className="mt-1 text-sm text-white/50">
                          {copy.summaryHint}
                        </p>
                      </div>

                      {loadingKey === summaryKey && !selectedSummary ? (
                        <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-8 text-white/60">
                          <LoaderCircle size={24} className="animate-spin" />
                          <p className="text-sm">{copy.loadingSummary}</p>
                        </div>
                      ) : summaryError && !selectedSummary ? (
                        <div className="flex min-h-[220px] flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-8 text-center">
                          <p className="max-w-md text-sm leading-6 text-white/55">
                            {summaryError}
                          </p>
                          <button
                            onClick={retrySummary}
                            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition-all duration-200 hover:border-white/20 hover:bg-white/10 hover:text-white"
                          >
                            {copy.retry}
                          </button>
                        </div>
                      ) : selectedSummary ? (
                        <div className="space-y-6">
                          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                            <p className="text-base leading-8 text-white/80">
                              {selectedSummary.summary}
                            </p>
                          </div>

                          <div className="grid gap-4 xl:grid-cols-2">
                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                              <h4 className="text-sm font-semibold text-white">
                                {copy.keyPoints}
                              </h4>
                              <div className="mt-4 space-y-3">
                                {selectedSummary.keyPoints.map((point) => (
                                  <div
                                    key={point}
                                    className="flex items-start gap-3 text-sm leading-6 text-white/72"
                                  >
                                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/45" />
                                    <span>{point}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                              <h4 className="text-sm font-semibold text-white">
                                {copy.questions}
                              </h4>
                              <div className="mt-4 space-y-3">
                                {selectedSummary.questions.map((question) => (
                                  <div
                                    key={question}
                                    className="flex items-start gap-3 text-sm leading-6 text-white/72"
                                  >
                                    <span className="mt-1 text-white/40">
                                      ?
                                    </span>
                                    <span>{question}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="grid gap-6 xl:grid-cols-2">
                      <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-2xl">
                        <h3 className="text-sm font-semibold text-white">
                          {copy.parentTopic}
                        </h3>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {selectedParent ? (
                            <TopicChip
                              label={selectedParent.label}
                              color={selectedParent.color}
                              onClick={() => setSelectedId(selectedParent.id)}
                            />
                          ) : (
                            <p className="text-sm text-white/50">
                              {copy.noParent}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-2xl">
                        <h3 className="text-sm font-semibold text-white">
                          {copy.subtopics}
                        </h3>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {selectedChildren.length > 0 ? (
                            selectedChildren
                              .slice(0, 8)
                              .map((topic) => (
                                <TopicChip
                                  key={topic.id}
                                  label={topic.label}
                                  color={topic.color}
                                  onClick={() => setSelectedId(topic.id)}
                                />
                              ))
                          ) : (
                            <p className="text-sm text-white/50">
                              {copy.noChildren}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center rounded-[30px] border border-dashed border-white/10 bg-white/[0.04] p-8 text-center text-white/45 shadow-2xl backdrop-blur-2xl">
                  {copy.selectTopic}
                </div>
              )}
            </motion.section>
          </div>
        )}
      </div>
    </main>
  );
}
