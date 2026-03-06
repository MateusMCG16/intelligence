import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AIProvider = "auto" | "gemini" | "groq" | "mistral";

interface SettingsStore {
  provider: AIProvider;
  setProvider: (provider: AIProvider) => void;
  starsMotionEnabled: boolean;
  setStarsMotionEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      provider: "auto",
      setProvider: (provider) => set({ provider }),
      starsMotionEnabled: true,
      setStarsMotionEnabled: (enabled) => set({ starsMotionEnabled: enabled }),
    }),
    {
      name: "settings-storage",
    },
  ),
);
