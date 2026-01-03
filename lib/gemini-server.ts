/**
 * Gemini AI Server Utility for Next.js API Routes
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-2.5-flash";

if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY is missing in environment variables");
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const model = genAI ? genAI.getGenerativeModel({ model: MODEL_NAME }) : null;

export async function generateResponse(userMessage: string) {
  if (!genAI || !model) {
    throw new Error("Gemini API key not configured");
  }

  try {
    const result = await model.generateContent(userMessage);
    
    if (!result?.response) {
      throw new Error("Empty response from Gemini");
    }

    const reply = result.response.text();
    return { success: true, reply };
  } catch (error: any) {
    console.error("❌ Gemini API error:", error);
    return { 
      success: false, 
      error: error.message || "Failed to generate response" 
    };
  }
}

export { MODEL_NAME };

