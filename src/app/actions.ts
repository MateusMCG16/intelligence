"use server";

import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';
import type { Language } from '@/store/useLanguageStore';

// ── Clients ──────────────────────────────────────────────────────────────────
const geminiClient = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

const groqClient = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

// ── Language config ──────────────────────────────────────────────────────────
const LANGUAGE_INSTRUCTIONS: Record<Language, string> = {
  pt: 'Responda SEMPRE em português brasileiro.',
  en: 'Always respond in English.',
};

// ── Shared prompt ────────────────────────────────────────────────────────────
function buildSystemPrompt(language: Language, existingInterests: string[] = []) {
  const existingConstraint = existingInterests.length > 0
    ? `\nIMPORTANT: Do not duplicate or return any of the following topics, as they already exist: ${JSON.stringify(existingInterests)}.`
    : '';

  return `You are an AI that helps brainstorm and expand on interests. Given an interest, provide 3 to 5 highly relevant sub-interests or related topics.
Each topic name MUST be short and concise — maximum 3 to 4 words. Do not use long descriptions.${existingConstraint}
Only provide a JSON array of strings as the response. Do not include any markdown formatting like \`\`\`json. Just the raw array.
Example: ["Sub Topic 1", "Sub Topic 2", "Sub Topic 3"]

${LANGUAGE_INSTRUCTIONS[language]}`;
}

function buildUserPrompt(interest: string) {
  return `Interest: ${interest}`;
}

// ── Response parser ──────────────────────────────────────────────────────────
function parseResponse(text: string): string[] {
  const cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const array = JSON.parse(cleanText);
  if (!Array.isArray(array)) throw new Error("Response is not an array");
  return array.slice(0, 5);
}



// ── Gemini provider ──────────────────────────────────────────────────────────
async function callGemini(interest: string, language: Language, existingInterests: string[]): Promise<string[]> {
  if (!geminiClient) throw new Error("Gemini client not configured");

  const response = await geminiClient.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: `${buildSystemPrompt(language, existingInterests)}\n\n${buildUserPrompt(interest)}`,
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");

  return parseResponse(text);
}

// ── Groq provider (fallback) ─────────────────────────────────────────────────
async function callGroq(interest: string, language: Language, existingInterests: string[]): Promise<string[]> {
  if (!groqClient) throw new Error("Groq client not configured");

  const response = await groqClient.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      { role: 'system', content: buildSystemPrompt(language, existingInterests) },
      { role: 'user', content: buildUserPrompt(interest) },
    ],
    temperature: 0.7,
    max_tokens: 256,
  });

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("No response from Groq");

  return parseResponse(text);
}

// ── Main function with automatic fallback ────────────────────────────────────
export async function generateSubInterests(interest: string, language: Language = 'pt', existingInterests: string[] = []): Promise<string[]> {
  // If no API keys at all, throw error
  if (!geminiClient && !groqClient) {
    throw new Error("No API keys configured. Please set GEMINI_API_KEY or GROQ_API_KEY.");
  }

  // Try Gemini first
  if (geminiClient) {
    try {
      console.log("[AI] Trying Gemini...");
      const result = await callGemini(interest, language, existingInterests);
      console.log("[AI] ✅ Gemini responded successfully");
      return result;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.warn(`[AI] ⚠️ Gemini failed: ${errMsg}`);

      // Check if it's a rate limit / quota error
      const isRateLimit = errMsg.includes('429') ||
        errMsg.includes('quota') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('rate') ||
        errMsg.includes('limit');

      if (isRateLimit) {
        console.log("[AI] 🔄 Rate limit detected. Falling back to Groq...");
      } else {
        console.log("[AI] 🔄 Gemini error. Falling back to Groq...");
      }
    }
  }

  // Fallback to Groq
  if (groqClient) {
    try {
      console.log("[AI] Trying Groq (llama-3.1-8b-instant)...");
      const result = await callGroq(interest, language, existingInterests);
      console.log("[AI] ✅ Groq responded successfully");
      return result;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[AI] ❌ Groq also failed: ${errMsg}`);
    }
  }

  // Both failed — throw error
  throw new Error("All AI providers failed. Please try again later.");
}
