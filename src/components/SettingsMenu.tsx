"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Trash2 } from "lucide-react";
import { useSettingsStore, AIProvider } from "@/store/useSettingsStore";
import { useInterestStore } from "@/store/useInterestStore";
import { checkAiProviders } from "@/app/actions";

const PROVIDERS: { id: AIProvider; label: string }[] = [
  { id: "auto", label: "Automático" },
  { id: "gemini", label: "Gemini" },
  { id: "groq", label: "Groq" },
  { id: "mistral", label: "Mistral" },
];

export default function SettingsMenu() {
  const { provider, setProvider, starsMotionEnabled, setStarsMotionEnabled } =
    useSettingsStore();
  const { nodes } = useInterestStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingStatuses, setIsLoadingStatuses] = useState(false);
  const [providerStatus, setProviderStatus] = useState<Record<string, boolean>>(
    {
      gemini: true,
      groq: true,
      mistral: true,
      auto: true,
    },
  );

  const handleOpen = async () => {
    setIsOpen(true);
    setIsLoadingStatuses(true);
    try {
      const status = await checkAiProviders();
      setProviderStatus({
        auto: true,
        ...status,
      });
    } catch (error) {
      console.error("Failed to check AI providers status", error);
    } finally {
      setIsLoadingStatuses(false);
    }
  };

  return (
    <div className="relative z-50">
      <button
        onClick={() => (isOpen ? setIsOpen(false) : handleOpen())}
        className="flex items-center justify-center w-10 h-10 bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl transition-all duration-300 text-white/80 hover:text-white cursor-pointer"
        title="Configurações"
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
                <div className="flex flex-col space-y-1">
                  {PROVIDERS.map((p) => {
                    const isDisabled = !providerStatus[p.id];
                    return (
                      <button
                        key={p.id}
                        disabled={isDisabled}
                        onClick={() => setProvider(p.id)}
                        className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                          provider === p.id && !isDisabled
                            ? "bg-blue-500/20 text-blue-400 font-medium"
                            : isDisabled
                              ? "text-white/20 cursor-not-allowed opacity-50"
                              : "text-white/60 hover:bg-white/10 hover:text-white cursor-pointer"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{p.label}</span>
                          {isLoadingStatuses && p.id !== "auto" && (
                            <div className="w-3 h-3 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                          )}
                        </div>
                        {provider === p.id && !isDisabled && (
                          <motion.div
                            layoutId="active-provider"
                            className="w-1.5 h-1.5 rounded-full bg-blue-400"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-2 border-b border-white/10">
                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 px-2 pt-1">
                  Espaço 3D
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
                    <span>Limpar Espaço</span>
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
