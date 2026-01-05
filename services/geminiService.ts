import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client lazily - API key will be provided by user
let ai: GoogleGenAI | null = null;

const getAI = () => {
  if (!ai) {
    // Try to get API key from localStorage or prompt user
    let apiKey = localStorage.getItem('GEMINI_API_KEY');
    if (!apiKey) {
      apiKey = prompt('Please enter your Gemini API key:');
      if (apiKey) {
        localStorage.setItem('GEMINI_API_KEY', apiKey);
      }
    }
    if (apiKey) {
      ai = new GoogleGenAI({ apiKey });
    }
  }
  return ai;
};

/**
 * Analyzes the uploaded 9-grid image to provide a caption or context.
 * Uses gemini-2.5-flash-preview for vision capabilities.
 */
export const analyzeGridImage = async (base64Image: string): Promise<string> => {
  const client = getAI();
  if (!client) {
    throw new Error("No API key provided. Please refresh and enter your Gemini API key.");
  }
  
  try {
    // Strip the data:image/jpeg;base64, prefix if present
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash-preview-05-20',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
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
