import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client
// Note: process.env.API_KEY is injected by the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Analyzes the uploaded 9-grid image to provide a caption or context.
 * Uses gemini-2.5-flash-image for efficient vision capabilities.
 */
export const analyzeGridImage = async (base64Image: string): Promise<string> => {
  try {
    // Strip the data:image/jpeg;base64, prefix if present
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png', // Assuming PNG for simplicity in canvas export, widely supported
              data: cleanBase64
            }
          },
          {
            text: "This is a 3x3 grid image (jiugongge). Briefly describe the overall theme or content of these photos in one enticing sentence for social media."
          }
        ]
      }
    });

    return response.text || "Could not generate description.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze image with AI.");
  }
};
