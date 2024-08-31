import { GoogleGenerativeAI } from "@google/generative-ai";
import { Buffer } from "buffer";
import { extractMeasureValue } from "../utils/responseHandler";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const getMeasureValueFromGeminiLLM = async (
  imageBuffer: Buffer
): Promise<number> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = "What is the measurement value in the image?";

    const imagePart = {
      inlineData: {
        data: imageBuffer.toString("base64"),
        mimeType: "image/png",
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = await response.text();

    return extractMeasureValue(text);
  } catch (error) {
    console.error("Erro ao obter valor da medição do Gemini LLM:", error);
    throw new Error("Erro ao obter valor da medição do Gemini LLM.");
  }
};
