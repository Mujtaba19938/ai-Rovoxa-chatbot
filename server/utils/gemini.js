import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

// Load environment variables in this file too
dotenv.config();

console.log("Gemini utility - API Key:", process.env.GEMINI_API_KEY ? "Present" : "Missing");
console.log("Gemini utility - API Key length:", process.env.GEMINI_API_KEY?.length || 0);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function generateResponse(userMessage) {
  try {
    const result = await model.generateContent(userMessage);
    const reply = result.response.text();
    return { success: true, reply };
  } catch (error) {
    console.error("Gemini API error:", error);
    return { success: false, error: error.message };
  }
}
