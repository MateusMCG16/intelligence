"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe } from 'lucide-react';
import {
    useLanguageStore,
    Language,
    LANGUAGE_FLAGS,
    LANGUAGE_NAMES,
} from '@/store/useLanguageStore';

const LANGUAGES: Language[] = ['pt', 'en'];

export default function LanguageSelector() {
    const { language, setLanguage } = useLanguageStore();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            {/* Toggle button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl transition-all duration-300 text-white/80 hover:text-white cursor-pointer"
            >
                <Globe size={16} />
                <span className="text-sm font-medium">{LANGUAGE_FLAGS[language]}</span>
            </button>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Invisible overlay to close on click outside */}
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />

                        <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.95 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            className="absolute right-0 top-full mt-2 z-50 min-w-[140px] bg-white/5 backdrop-blur-2xl border border-white/10 rounded-xl overflow-hidden shadow-2xl"
                        >
                            {LANGUAGES.map((lang) => (
                                <button
                                    key={lang}
                                    onClick={() => {
                                        setLanguage(lang);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-200 cursor-pointer ${language === lang
                                        ? 'bg-white/10 text-white'
                                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    <span className="text-base">{LANGUAGE_FLAGS[lang]}</span>
                                    <span className="font-medium">{LANGUAGE_NAMES[lang]}</span>
                                    {language === lang && (
                                        <motion.div
                                            layoutId="lang-check"
                                            className="ml-auto w-1.5 h-1.5 bg-white rounded-full"
                                        />
                                    )}
                                </button>
                            ))}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
