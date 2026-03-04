import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'pt' | 'en';

interface LanguageStore {
    language: Language;
    setLanguage: (lang: Language) => void;
}

export const LANGUAGE_LABELS: Record<Language, string> = {
    pt: 'PT',
    en: 'EN',
};

export const LANGUAGE_NAMES: Record<Language, string> = {
    pt: 'Português',
    en: 'English',
};

export const LANGUAGE_FLAGS: Record<Language, string> = {
    pt: '🇧🇷',
    en: '🇺🇸',
};

export const useLanguageStore = create<LanguageStore>()(
    persist(
        (set) => ({
            language: 'pt',
            setLanguage: (language) => set({ language }),
        }),
        {
            name: 'language-storage',
        }
    )
);
