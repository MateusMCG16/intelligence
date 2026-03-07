"use server";

import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import type { Language } from "@/store/useLanguageStore";
import { dedupeTopics } from "@/lib/topicSimilarity";

// ── Clients ──────────────────────────────────────────────────────────────────
const geminiClient = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

const groqClient = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

const mistralApiKey = process.env.MISTRAL_API_KEY || null;

// ── Language config ──────────────────────────────────────────────────────────
const LANGUAGE_INSTRUCTIONS: Record<Language, string> = {
  pt: "Responda SEMPRE em português brasileiro.",
  en: "Always respond in English.",
};

// ── Shared prompt ────────────────────────────────────────────────────────────
function buildSystemPrompt(
  language: Language,
  existingInterests: string[] = [],
) {
  const existingConstraint =
    existingInterests.length > 0
      ? `\nIMPORTANT: Do not duplicate or return any of the following topics, as they already exist: ${JSON.stringify(existingInterests)}.`
      : "";

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
  const cleanText = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const array = JSON.parse(cleanText);
  if (!Array.isArray(array)) throw new Error("Response is not an array");
  return array.slice(0, 5);
}

export interface GenerateResponse {
  topics: string[];
  tokens: number;
}

export interface TopicSummaryResponse {
  summary: string;
  keyPoints: string[];
  questions: string[];
  tokens: number;
}

interface TopicSummaryContext {
  parent?: string | null;
  breadcrumb?: string[];
  children?: string[];
}

function buildTopicSummarySystemPrompt(language: Language) {
  return `You are an AI tutor that explains topics clearly and concisely.
Return ONLY a raw JSON object with this exact shape:
{
  "summary": "short paragraph with 2 to 4 sentences",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "questions": ["question 1", "question 2", "question 3"]
}

Rules:
- The summary must be easy to understand and practical.
- keyPoints must contain 3 short bullet-style strings.
- questions must contain 3 curiosity-driven follow-up questions.
- Do not include markdown.
- Do not include any text before or after the JSON.

${LANGUAGE_INSTRUCTIONS[language]}`;
}

function buildTopicSummaryUserPrompt(
  topic: string,
  context?: TopicSummaryContext,
) {
  const breadcrumb = context?.breadcrumb?.length
    ? context.breadcrumb.join(" > ")
    : "none";
  const parent = context?.parent ?? "none";
  const children = context?.children?.length
    ? context.children.join(", ")
    : "none";

  return `Topic: ${topic}
Parent topic: ${parent}
Path in map: ${breadcrumb}
Direct subtopics: ${children}`;
}

function parseTopicSummaryResponse(
  text: string,
): Omit<TopicSummaryResponse, "tokens"> {
  const cleanText = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const parsed = JSON.parse(cleanText) as {
    summary?: unknown;
    keyPoints?: unknown;
    questions?: unknown;
  };

  if (typeof parsed.summary !== "string") {
    throw new Error("Summary response is missing a valid summary");
  }

  const keyPoints = Array.isArray(parsed.keyPoints)
    ? parsed.keyPoints.filter(
        (item): item is string => typeof item === "string",
      )
    : [];

  const questions = Array.isArray(parsed.questions)
    ? parsed.questions.filter(
        (item): item is string => typeof item === "string",
      )
    : [];

  return {
    summary: parsed.summary,
    keyPoints: keyPoints.slice(0, 3),
    questions: questions.slice(0, 3),
  };
}

// ── Gemini provider ──────────────────────────────────────────────────────────
async function callGemini(
  interest: string,
  language: Language,
  existingInterests: string[],
): Promise<GenerateResponse> {
  if (!geminiClient) throw new Error("Gemini client not configured");

  const response = await geminiClient.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `${buildSystemPrompt(language, existingInterests)}\n\n${buildUserPrompt(interest)}`,
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");

  return {
    topics: dedupeTopics(parseResponse(text), existingInterests),
    tokens: response.usageMetadata?.totalTokenCount || 0,
  };
}

// ── Groq provider (fallback) ─────────────────────────────────────────────────
async function callGroq(
  interest: string,
  language: Language,
  existingInterests: string[],
): Promise<GenerateResponse> {
  if (!groqClient) throw new Error("Groq client not configured");

  const response = await groqClient.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: buildSystemPrompt(language, existingInterests),
      },
      { role: "user", content: buildUserPrompt(interest) },
    ],
    temperature: 0.7,
    max_tokens: 256,
  });

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("No response from Groq");

  return {
    topics: dedupeTopics(parseResponse(text), existingInterests),
    tokens: response.usage?.total_tokens || 0,
  };
}

// ── Mistral provider (fallback) ──────────────────────────────────────────────
async function callMistral(
  interest: string,
  language: Language,
  existingInterests: string[],
): Promise<GenerateResponse> {
  if (!mistralApiKey) throw new Error("Mistral client not configured");

  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${mistralApiKey}`,
    },
    body: JSON.stringify({
      model: "mistral-small-latest",
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(language, existingInterests),
        },
        { role: "user", content: buildUserPrompt(interest) },
      ],
      temperature: 0.7,
      max_tokens: 256,
    }),
  });

  if (!response.ok) {
    throw new Error(`Mistral API Error: ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.choices[0]?.message?.content;
  if (!text) throw new Error("No response from Mistral");

  return {
    topics: dedupeTopics(parseResponse(text), existingInterests),
    tokens: data.usage?.total_tokens || 0,
  };
}

async function callGeminiTopicSummary(
  topic: string,
  language: Language,
  context?: TopicSummaryContext,
): Promise<TopicSummaryResponse> {
  if (!geminiClient) throw new Error("Gemini client not configured");

  const response = await geminiClient.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `${buildTopicSummarySystemPrompt(language)}\n\n${buildTopicSummaryUserPrompt(topic, context)}`,
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");

  return {
    ...parseTopicSummaryResponse(text),
    tokens: response.usageMetadata?.totalTokenCount || 0,
  };
}

async function callGroqTopicSummary(
  topic: string,
  language: Language,
  context?: TopicSummaryContext,
): Promise<TopicSummaryResponse> {
  if (!groqClient) throw new Error("Groq client not configured");

  const response = await groqClient.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: buildTopicSummarySystemPrompt(language),
      },
      {
        role: "user",
        content: buildTopicSummaryUserPrompt(topic, context),
      },
    ],
    temperature: 0.6,
    max_tokens: 500,
  });

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("No response from Groq");

  return {
    ...parseTopicSummaryResponse(text),
    tokens: response.usage?.total_tokens || 0,
  };
}

async function callMistralTopicSummary(
  topic: string,
  language: Language,
  context?: TopicSummaryContext,
): Promise<TopicSummaryResponse> {
  if (!mistralApiKey) throw new Error("Mistral client not configured");

  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${mistralApiKey}`,
    },
    body: JSON.stringify({
      model: "mistral-small-latest",
      messages: [
        {
          role: "system",
          content: buildTopicSummarySystemPrompt(language),
        },
        {
          role: "user",
          content: buildTopicSummaryUserPrompt(topic, context),
        },
      ],
      temperature: 0.6,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`Mistral API Error: ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.choices[0]?.message?.content;
  if (!text) throw new Error("No response from Mistral");

  return {
    ...parseTopicSummaryResponse(text),
    tokens: data.usage?.total_tokens || 0,
  };
}

// ── Main function with automatic fallback ────────────────────────────────────
export async function generateSubInterests(
  interest: string,
  language: Language = "pt",
  existingInterests: string[] = [],
  provider: "auto" | "gemini" | "groq" | "mistral" = "auto",
): Promise<GenerateResponse> {
  // If no API keys at all, throw error
  if (!geminiClient && !groqClient && !mistralApiKey) {
    throw new Error(
      "No API keys configured. Please set GEMINI_API_KEY, GROQ_API_KEY or MISTRAL_API_KEY.",
    );
  }

  if (provider === "gemini" || provider === "auto") {
    if (geminiClient) {
      try {
        console.log("[AI] Trying Gemini...");
        const result = await callGemini(interest, language, existingInterests);
        console.log("[AI] ✅ Gemini responded successfully");
        return result;
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.warn(`[AI] ⚠️ Gemini failed: ${errMsg}`);
        if (provider === "gemini") throw new Error(`Gemini Error: ${errMsg}`);
        console.log("[AI] 🔄 Falling back to next provider...");
      }
    } else if (provider === "gemini") {
      throw new Error("Gemini API key is not configured.");
    }
  }

  if (provider === "groq" || provider === "auto") {
    if (groqClient) {
      try {
        console.log("[AI] Trying Groq (llama-3.1-8b-instant)...");
        const result = await callGroq(interest, language, existingInterests);
        console.log("[AI] ✅ Groq responded successfully");
        return result;
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error(`[AI] ❌ Groq failed: ${errMsg}`);
        if (provider === "groq") throw new Error(`Groq Error: ${errMsg}`);
        console.log("[AI] 🔄 Falling back to next provider...");
      }
    } else if (provider === "groq") {
      throw new Error("Groq API key is not configured.");
    }
  }

  if (provider === "mistral" || provider === "auto") {
    if (mistralApiKey) {
      try {
        console.log("[AI] Trying Mistral (mistral-small-latest)...");
        const result = await callMistral(interest, language, existingInterests);
        console.log("[AI] ✅ Mistral responded successfully");
        return result;
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error(`[AI] ❌ Mistral failed: ${errMsg}`);
        if (provider === "mistral") throw new Error(`Mistral Error: ${errMsg}`);
      }
    } else if (provider === "mistral") {
      throw new Error("Mistral API key is not configured.");
    }
  }

  // All failed — throw error
  throw new Error(
    "All AI providers failed or no configured providers were available. Please try again later.",
  );
}

export async function checkAiProviders(): Promise<
  Record<"gemini" | "groq" | "mistral", boolean>
> {
  const status = {
    gemini: false,
    groq: false,
    mistral: false,
  };

  if (geminiClient) {
    try {
      await callGemini("test", "en", []);
      status.gemini = true;
    } catch {
      status.gemini = false;
    }
  }

  if (groqClient) {
    try {
      await callGroq("test", "en", []);
      status.groq = true;
    } catch {
      status.groq = false;
    }
  }

  if (mistralApiKey) {
    try {
      await callMistral("test", "en", []);
      status.mistral = true;
    } catch {
      status.mistral = false;
    }
  }

  return status;
}

export async function summarizeTopic({
  topic,
  language = "pt",
  provider = "auto",
  context,
}: {
  topic: string;
  language?: Language;
  provider?: "auto" | "gemini" | "groq" | "mistral";
  context?: TopicSummaryContext;
}): Promise<TopicSummaryResponse> {
  if (!geminiClient && !groqClient && !mistralApiKey) {
    throw new Error(
      "No API keys configured. Please set GEMINI_API_KEY, GROQ_API_KEY or MISTRAL_API_KEY.",
    );
  }

  if (provider === "gemini" || provider === "auto") {
    if (geminiClient) {
      try {
        return await callGeminiTopicSummary(topic, language, context);
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (provider === "gemini") throw new Error(`Gemini Error: ${errMsg}`);
      }
    } else if (provider === "gemini") {
      throw new Error("Gemini API key is not configured.");
    }
  }

  if (provider === "groq" || provider === "auto") {
    if (groqClient) {
      try {
        return await callGroqTopicSummary(topic, language, context);
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (provider === "groq") throw new Error(`Groq Error: ${errMsg}`);
      }
    } else if (provider === "groq") {
      throw new Error("Groq API key is not configured.");
    }
  }

  if (provider === "mistral" || provider === "auto") {
    if (mistralApiKey) {
      try {
        return await callMistralTopicSummary(topic, language, context);
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (provider === "mistral") throw new Error(`Mistral Error: ${errMsg}`);
      }
    } else if (provider === "mistral") {
      throw new Error("Mistral API key is not configured.");
    }
  }

  throw new Error(
    "All AI providers failed or no configured providers were available. Please try again later.",
  );
}
