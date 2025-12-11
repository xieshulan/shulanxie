import { GoogleGenAI, Type } from "@google/genai";
import { GeminiVisionResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const modelName = "gemini-2.5-flash";

const gestureSchema = {
  type: Type.OBJECT,
  properties: {
    gesture: {
      type: Type.STRING,
      enum: ["OPEN", "CLOSED", "NONE"],
      description: "The state of the hand visible in the image. CLOSED means a fist or contracted hand. OPEN means fingers spread or relaxed open palm. NONE means no hand clearly visible."
    },
    confidence: {
      type: Type.NUMBER,
      description: "Confidence score between 0 and 1."
    }
  },
  required: ["gesture", "confidence"]
};

export const detectGesture = async (base64Image: string): Promise<GeminiVisionResponse> => {
  try {
    // Remove data URL prefix if present
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|webp);base64,/, "");

    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64
            }
          },
          {
            text: "Analyze the hand gesture in this image. Is the hand OPEN (fingers spread/palm visible) or CLOSED (fist/clenched)? Return JSON."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: gestureSchema,
        temperature: 0.1, // Low temp for deterministic classification
      }
    });

    const text = response.text;
    if (!text) return { gesture: 'NONE', confidence: 0 };
    
    const result = JSON.parse(text) as GeminiVisionResponse;
    return result;
  } catch (error) {
    console.error("Gemini Vision Error:", error);
    return { gesture: 'NONE', confidence: 0 };
  }
};