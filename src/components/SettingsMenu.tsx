"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Trash2 } from "lucide-react";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useInterestStore } from "@/store/useInterestStore";
import { checkAiProviders } from "@/app/actions";

export default function SettingsMenu() {
  const { starsMotionEnabled, setStarsMotionEnabled } = useSettingsStore();
  const { nodes } = useInterestStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingStatuses, setIsLoadingStatuses] = useState(false);
  const [isGroqConfigured, setIsGroqConfigured] = useState(true);

  const handleOpen = async () => {
    setIsOpen(true);
    setIsLoadingStatuses(true);
    try {
      const status = await checkAiProviders();
      setIsGroqConfigured(status.groq);
    } catch (error) {
      console.error("Failed to check Groq provider status", error);
      setIsGroqConfigured(false);
    } finally {
      setIsLoadingStatuses(false);
    }
  };

  return (
    <div className="relative z-50">
      <button
        onClick={() => (isOpen ? setIsOpen(false) : handleOpen())}
        className="flex items-center justify-center w-10 h-10 bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl transition-all duration-300 text-white/80 hover:text-white cursor-pointer"
        title="Configuracoes"
      >
        <Settings size={18} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute right-0 top-full mt-2 z-50 min-w-[220px] bg-white/5 backdrop-blur-2xl border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-2 border-b border-white/10">
                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 px-2 pt-1">
                  Provedor de IA
                </h3>

                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-blue-500/10 text-blue-400 text-sm">
                  <div className="flex items-center gap-2">
                    <span>Groq</span>
                    {isLoadingStatuses && (
                      <div className="w-3 h-3 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                    )}
                  </div>
                  <span className="text-xs text-white/50">
                    {isGroqConfigured ? "Configurado" : "Sem chave"}
                  </span>
                </div>
              </div>

              <div className="p-2 border-b border-white/10">
                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 px-2 pt-1">
                  Espaco 3D
                </h3>

                <button
                  onClick={() => setStarsMotionEnabled(!starsMotionEnabled)}
                  className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all duration-200"
                  role="switch"
                  aria-checked={starsMotionEnabled}
                >
                  <span>Movimento das estrelas</span>

                  <span className="flex items-center gap-2">
                    <span className="text-xs text-white/60">
                      {starsMotionEnabled ? "Ligado" : "Desligado"}
                    </span>
                    <span
                      className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors duration-200 ${
                        starsMotionEnabled ? "bg-emerald-500/70" : "bg-white/20"
                      }`}
                    >
                      <motion.span
                        layout
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 35,
                        }}
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ${
                          starsMotionEnabled ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </span>
                  </span>
                </button>
              </div>

              {nodes.length > 0 && (
                <div className="p-2">
                  <button
                    onClick={() => {
                      useInterestStore.getState().clear();
                      setIsOpen(false);
                    }}
                    className="flex items-center space-x-2 w-full px-3 py-2.5 rounded-lg text-sm text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={16} />
                    <span>Limpar Espaco</span>
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
