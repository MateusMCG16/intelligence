"use server";

import Groq from "groq-sdk";
import type { Language } from "@/store/useLanguageStore";
import { dedupeTopics } from "@/lib/topicSimilarity";

const groqClient = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

const LANGUAGE_INSTRUCTIONS: Record<Language, string> = {
  pt: "Responda SEMPRE em portugues brasileiro.",
  en: "Always respond in English.",
};

function buildSystemPrompt(
  language: Language,
  existingInterests: string[] = [],
) {
  const existingConstraint =
    existingInterests.length > 0
      ? `\nIMPORTANT: Do not duplicate or return any of the following topics, as they already exist: ${JSON.stringify(existingInterests)}.`
      : "";

  return `You are an AI that helps brainstorm and expand on interests. Given an interest, provide 3 to 5 highly relevant sub-interests or related topics.
Each topic name MUST be short and concise - maximum 3 to 4 words. Do not use long descriptions.${existingConstraint}
Only provide a JSON array of strings as the response. Do not include any markdown formatting like \`\`\`json. Just the raw array.
Example: ["Sub Topic 1", "Sub Topic 2", "Sub Topic 3"]

${LANGUAGE_INSTRUCTIONS[language]}`;
}

function buildUserPrompt(interest: string) {
  return `Interest: ${interest}`;
}

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

async function callGroq(
  interest: string,
  language: Language,
  existingInterests: string[],
): Promise<GenerateResponse> {
  if (!groqClient) throw new Error("Groq API key is not configured.");

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

async function callGroqTopicSummary(
  topic: string,
  language: Language,
  context?: TopicSummaryContext,
): Promise<TopicSummaryResponse> {
  if (!groqClient) throw new Error("Groq API key is not configured.");

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

export async function generateSubInterests(
  interest: string,
  language: Language = "pt",
  existingInterests: string[] = [],
): Promise<GenerateResponse> {
  return callGroq(interest, language, existingInterests);
}

export async function checkAiProviders(): Promise<Record<"groq", boolean>> {
  return {
    groq: Boolean(groqClient),
  };
}

export async function summarizeTopic({
  topic,
  language = "pt",
  context,
}: {
  topic: string;
  language?: Language;
  context?: TopicSummaryContext;
}): Promise<TopicSummaryResponse> {
  return callGroqTopicSummary(topic, language, context);
}
