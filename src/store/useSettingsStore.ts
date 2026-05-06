import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsStore {
  starsMotionEnabled: boolean;
  setStarsMotionEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      starsMotionEnabled: true,
      setStarsMotionEnabled: (enabled) => set({ starsMotionEnabled: enabled }),
    }),
    {
      name: "settings-storage",
      merge: (persistedState, currentState) => {
        const persistedSettings = {
          ...((persistedState ?? {}) as Partial<SettingsStore> & {
            provider?: unknown;
          }),
        };
        delete persistedSettings.provider;

        return {
          ...currentState,
          ...persistedSettings,
        };
      },
    },
  ),
);
