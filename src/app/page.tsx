"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { Stars, Environment, Float } from "@react-three/drei";
import ThreeGraph from "@/components/ThreeGraph";
import CameraController from "@/components/CameraController";
import LanguageSelector from "@/components/LanguageSelector";
import SettingsMenu from "@/components/SettingsMenu";
import SubjectListModal from "@/components/SubjectListModal";
import { useInterestStore } from "@/store/useInterestStore";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { Search, Compass, Sparkles, Target, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const [input, setInput] = useState("");
  const { addNode, nodes, totalTokens } = useInterestStore();
  const { language } = useLanguageStore();
  const { starsMotionEnabled } = useSettingsStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;

    const label = input.trim();
    setInput("");

    // Create the root node first
    const newNode = addNode(label);

    // Automatically trigger expansion
    try {
      setIsGenerating(true);
      // Import dynamic function here or at the top of the file
      const { generateSubInterests } = await import("@/app/actions");
      const existingLabels = useInterestStore
        .getState()
        .nodes.map((n: { label: string }) => n.label);
      const provider = useSettingsStore.getState().provider;
      const result = await generateSubInterests(
        label,
        language,
        existingLabels,
        provider,
      );
      useInterestStore.getState().addNodes(result.topics, newNode.id);
      useInterestStore.getState().addTokens(result.tokens);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="relative w-full h-screen bg-black overflow-hidden text-neutral-100 font-sans selection:bg-white/20">
      <div className="absolute inset-0 z-0">
        <Canvas
          camera={{ position: [0, 0, 15], fov: 60 }}
          frameloop={isSubjectModalOpen ? "demand" : "always"}
        >
          <color attach="background" args={["#050505"]} />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />

          <Float
            speed={isSubjectModalOpen ? 0 : 1}
            rotationIntensity={isSubjectModalOpen ? 0 : 0.2}
            floatIntensity={isSubjectModalOpen ? 0 : 0.2}
          >
            <ThreeGraph isSimulationPaused={isSubjectModalOpen} />
          </Float>

          <CameraController isRotationPaused={true} />
          <Stars
            radius={100}
            depth={50}
            count={5000}
            factor={4}
            saturation={0}
            fade
            speed={isSubjectModalOpen || !starsMotionEnabled ? 0 : 1.2}
          />
          <Environment preset="city" />
        </Canvas>
      </div>

      <div className="absolute top-0 w-full p-6 z-10 pointer-events-none">
        <div className="w-full flex items-center justify-between pointer-events-auto">
          <div className="flex items-center space-x-2 relative">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black">
              <Compass size={18} />
            </div>
            <h1
              onClick={() => setShowPanel(!showPanel)}
              className="text-xl font-medium tracking-tight cursor-pointer hover:text-white/80 transition-colors"
            >
              Intelligence Space
            </h1>

            <AnimatePresence>
              {showPanel && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full mt-4 left-0 bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-xl shadow-2xl pointer-events-auto flex items-center space-x-3 z-50 min-w-[200px]"
                >
                  <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-white/60 mb-0.5 uppercase tracking-wider font-semibold">
                      Tokens (Sessão)
                    </p>
                    <p className="text-xl font-medium text-white leading-none">
                      {totalTokens.toLocaleString()}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/knowledge"
              className="flex items-center justify-center w-10 h-10 bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl transition-all duration-300 text-white/80 hover:text-white cursor-pointer"
              title="Rota de Conhecimento"
            >
              <BookOpen size={18} />
            </Link>
            {mounted && nodes.length > 0 && (
              <>
                <button
                  onClick={() =>
                    useInterestStore
                      .getState()
                      .setFocusTarget({ x: 0, y: 0, z: 0 })
                  }
                  className="flex items-center space-x-2 text-white/60 hover:text-blue-400 transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10"
                  title="Centralizar Câmera"
                >
                  <Target size={16} />
                </button>
              </>
            )}
            <SubjectListModal
              isOpen={isSubjectModalOpen}
              onOpenChange={setIsSubjectModalOpen}
            />
            <SettingsMenu />
            <LanguageSelector />
          </div>
        </div>
      </div>

      <div className="absolute bottom-12 w-full z-10 pointer-events-none flex justify-center px-4">
        <div className="pointer-events-auto w-full max-w-lg">
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <div className="absolute inset-0 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl -z-10" />

            <Search className="absolute left-4 text-white/50" size={20} />

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isGenerating}
              placeholder="Enter an interest (e.g. Quantum Physics, Minimalist Art)..."
              className="w-full bg-transparent border-none py-4 pl-12 pr-12 text-white placeholder:text-white/40 focus:outline-none focus:ring-0 text-lg rounded-2xl disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={!input.trim() || isGenerating}
              className="absolute right-3 p-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:hover:bg-white/10 rounded-xl transition-colors duration-200 backdrop-blur-md border border-white/10 flex items-center justify-center"
            >
              {isGenerating ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Sparkles size={18} className="text-white" />
              )}
            </button>
          </form>

          <AnimatePresence>
            {mounted && nodes.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute -top-12 left-0 w-full text-center text-white/60 text-sm font-medium tracking-wide"
              >
                Start typing to generate an intelligence map
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
