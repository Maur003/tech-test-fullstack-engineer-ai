import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

let testModel: LanguageModel | undefined;

export function setChatModelForTests(model: LanguageModel | undefined) {
  testModel = model;
}

export function resolveChatModel(): LanguageModel {
  if (testModel) return testModel;
  return createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
  })(process.env.GEMINI_MODEL || "gemini-2.5-flash");
}
