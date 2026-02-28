"use server";

import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({});

export async function generateSubInterests(interest: string) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not defined. Using mock data.");
      return [
        `${interest} Essentials`,
        `Advanced ${interest}`,
        `${interest} Tools`,
      ];
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are an AI that helps brainstorm and expand on interests. Given an interest, provide 3 to 5 highly relevant sub-interests or related topics.
Only provide a JSON array of strings as the response. Do not include any markdown formatting like \`\`\`json. Just the raw array.
Example: ["Sub Topic 1", "Sub Topic 2", "Sub Topic 3"]

Interest: ${interest}
`,
    });
    
    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    // Attempt to parse the array
    const cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const array = JSON.parse(cleanText);
    if (!Array.isArray(array)) throw new Error("Response is not an array");
    
    return array.slice(0, 5); // Return max 5 items
  } catch (error) {
    console.error("Gemini API error:", error);
    // Return mock data for fallback
    return [
      `${interest} Essentials`,
      `Advanced ${interest}`,
      `${interest} Tools`,
      `${interest} History`
    ];
  }
}
