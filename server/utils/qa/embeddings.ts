import { z } from "zod";

import { createEmbeddings, OPENAI_API_KEY } from "../../jobs/getCharacterService";

const CONVERSATION_HISTORY_SCHEMA = z
  .array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().trim().min(1),
    }),
  )
  .max(4);

export const QUESTION_SCHEMA = z.object({
  question: z.string().min(1),
  conversation_history: CONVERSATION_HISTORY_SCHEMA.optional(),
  bookTitle: z.string().min(1),
});

export type QuestionPayload = z.infer<typeof QUESTION_SCHEMA>;

export async function embedQuestion(question: string): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI is not configured");
  }

  const trimmed = question.trim();
  if (!trimmed) {
    throw new Error("Question must not be empty");
  }

  const [embedding] = await createEmbeddings([trimmed]);
  if (!embedding?.length) {
    throw new Error("Failed to generate embedding for question");
  }

  return embedding;
}
