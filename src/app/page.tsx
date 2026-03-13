"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Float, Html, Stars } from "@react-three/drei";
import ThreeGraph from "@/components/ThreeGraph";
import CameraController from "@/components/CameraController";
import LanguageSelector from "@/components/LanguageSelector";
import SettingsMenu from "@/components/SettingsMenu";
import SubjectListModal from "@/components/SubjectListModal";
import { useInterestStore } from "@/store/useInterestStore";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { Search, Compass, Sparkles, Target, BookOpen, Activity, Zap, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function SceneLoader() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-4 bg-black/40 p-8 rounded-full backdrop-blur-3xl">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
        <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold">Neural Space Syncing</span>
      </div>
    </Html>
  );
}

export default function Home() {
  const [input, setInput] = useState("");
  const { addNode, nodes, totalTokens } = useInterestStore();
  const { language } = useLanguageStore();
  const { starsMotionEnabled } = useSettingsStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;

    const label = input.trim();
    setInput("");
    const newNode = addNode(label);

    try {
      setIsGenerating(true);
      const { generateSubInterests } = await import("@/app/actions");
      const existingLabels = useInterestStore.getState().nodes.map((n) => n.label);
      const provider = useSettingsStore.getState().provider;
      const result = await generateSubInterests(label, language, existingLabels, provider);
      useInterestStore.getState().addNodes(result.topics, newNode.id);
      useInterestStore.getState().addTokens(result.tokens);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!mounted) return (
    <div className="w-full h-screen bg-[#020202] flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-white/10 animate-spin" />
    </div>
  );

  return (
    <main className="relative w-full h-screen bg-[#050505] overflow-hidden text-neutral-100 font-sans selection:bg-white/20">
      <div className="absolute inset-0 z-0">
        <Canvas
          camera={{ position: [0, 0, 15], fov: 60 }}
          gl={{ 
            antialias: true,
            powerPreference: "high-performance" 
          }}
          dpr={[1, 2]}
        >
          <color attach="background" args={["#020202"]} />
          <ambientLight intensity={0.4} />
          <pointLight position={[10, 10, 10]} intensity={1.5} color="#4444ff" />
          <pointLight position={[-10, -10, -10]} intensity={1} color="#ff44ff" />

          <Suspense fallback={<SceneLoader />}>
            <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.2}>
              <ThreeGraph isSimulationPaused={isSubjectModalOpen} />
            </Float>
            <Stars
              radius={100}
              depth={60}
              count={starsMotionEnabled ? 5000 : 2000}
              factor={4}
              saturation={0}
              fade
              speed={isSubjectModalOpen || !starsMotionEnabled ? 0 : 0.6}
            />
          </Suspense>

          <CameraController isRotationPaused={true} />
        </Canvas>
      </div>

      <div className="absolute top-0 w-full p-4 lg:p-8 z-10 pointer-events-none">
        <div className="flex items-start justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col gap-4 pointer-events-auto"
          >
            <div className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                <Compass size={22} />
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg font-bold tracking-[0.15em] uppercase text-white">
                  Intelligence<span className="text-white/40">Space</span>
                </h1>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">System Online</span>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {nodes.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col gap-3 min-w-[200px]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/40">
                      <Activity size={12} />
                      <span className="text-[10px] uppercase font-bold tracking-tighter">Neural Capacity</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400">{nodes.length} Nodes</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(nodes.length * 5, 100)}%` }}
                      className="h-full bg-white/40"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                      <Zap size={14} />
                    </div>
                    <div>
                      <p className="text-[9px] text-white/40 uppercase font-bold tracking-widest">Sessão / Tokens</p>
                      <p className="text-lg font-mono text-white leading-none">
                        {totalTokens.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <div className="flex items-center space-x-3 pointer-events-auto">
            <Link
              href="/knowledge"
              className="group flex items-center justify-center w-12 h-12 bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl transition-all text-white/60 hover:text-white"
            >
              <BookOpen size={20} />
            </Link>
            
            {nodes.length > 0 && (
              <button
                onClick={() => useInterestStore.getState().setFocusTarget({ x: 0, y: 0, z: 0 })}
                className="flex items-center justify-center w-12 h-12 bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl transition-all text-white/60 hover:text-blue-400"
              >
                <Target size={20} />
              </button>
            )}
            
            <div className="h-12 w-[1px] bg-white/10 mx-1" />
            
            <SubjectListModal isOpen={isSubjectModalOpen} onOpenChange={setIsSubjectModalOpen} />
            <SettingsMenu />
            <LanguageSelector />
          </div>
        </div>
      </div>

      <div className="absolute bottom-12 w-full z-10 pointer-events-none flex flex-col items-center gap-6 px-4">
        <div className="pointer-events-auto w-full max-w-xl">
          <form onSubmit={handleSubmit} className="relative group">
            <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-white/40" />
            <div className="absolute -top-1 -right-1 w-2 h-2 border-t border-r border-white/40" />
            <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b border-l border-white/40" />
            <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-white/40" />

            <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] -z-10" />

            <div className="flex items-center px-5">
              <Search className="text-white/30 shrink-0" size={20} />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isGenerating}
                placeholder="Expand your knowledge..."
                className="w-full bg-transparent border-none py-5 px-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-0 text-lg rounded-2xl disabled:opacity-50 font-medium tracking-tight"
              />
              <button
                type="submit"
                disabled={!input.trim() || isGenerating}
                className="p-2.5 bg-white text-black rounded-xl shadow-xl flex items-center justify-center"
              >
                {isGenerating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Sparkles size={18} />
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
