import axios from "axios";
import { OPENAI_API_KEY, OPENAI_CHAT_MODEL } from "../../jobs/getCharacterService";

const QA_SYSTEM_PROMPT =
  "You are a helpful AI assistant answering questions about a specific book. " +
  "Use only the provided excerpts to craft an accurate, concise response. " +
  "Cite chapters or pages when available. If the answer cannot be derived from the excerpts, say you do not know. Make sure to provide answer in under 400 words. ";

const Optimize_User_Query_Prompt = 
`You are an assistant that rewrites vague user requests into concise, high-signal search queries optimized for semantic similarity search over book chunk embeddings.

Rules for output:
- Use the book title and recent conversation to add useful context.
- Avoid filler words ("please", "summarize", "is that important" -> instead produce keywords and focused intent).
- Produce a single short search query (6-20 words preferred). Focus on nouns, topics, concepts, and explicit questions that will match book chunks.
- Do NOT include methodology or explanation in the output. 
- If the user question already includes clear keywords, preserve them. If it's very short/vague, expand with context from conversation and book title.
- RETURN ONLY the optimized query string. No quotes, no JSON, no explanations.
`;

type ConversationHistoryEntry = {
  role: "user" | "assistant";
  content: string;
};

interface GenerateAnswerParams {
  question: string;
  context: string;
  ConversationHistoryEntry?: ConversationHistoryEntry[];
}

export async function generateAnswer({
  question,
  context,
  conversationHistory = [],
}: GenerateAnswerParams): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI is not configured");
  }

  const sanitizedHistory = conversationHistory
    .map((entry) => ({
      role: entry.role,
      content: entry.content.trim(),
    }))
    .filter((entry) => entry.content.length > 0)
    .slice(-4);

  const historyIntro =
    sanitizedHistory.length > 0
      ? [
          {
            role: "system" as const,
            content:
              "The following are the most recent conversation messages between the user and assistant (oldest to newest). Use them to maintain conversatoin context. user might reference to earlier conversations so make sure if he us asking from your prvious conversations. context: ",
          },
        ]
      : [];

  const historyMessages = sanitizedHistory.map((entry) => ({
    role: entry.role,
    content: entry.content,
  }));

  const userContentPrefix =
    sanitizedHistory.length > 0
      ? "The previous messages above are the latest exchanges in this chat. Use them for context.\n\n"
      : "";

  const payload = {
    model: OPENAI_CHAT_MODEL,
    messages: [
      { role: "system", content: QA_SYSTEM_PROMPT },
      ...historyIntro,
      ...historyMessages,
      { role: "user", content: `${userContentPrefix}Question: ${question}\n\n Book Context:\n${context}` },
    ],
    temperature: 0.2

  };

  try {
    const response = await axios.post("https://api.openai.com/v1/chat/completions", payload, {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 60000,
    });

    const answer = response?.data?.choices?.[0]?.message?.content?.trim();
    return answer || "I wasn't able to derive an answer from the available excerpts.";
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const detail = error.response?.data?.error?.message || error.message;
      throw new Error(`Answer generation failed: ${detail}`);
    }
    throw error;
  }
}

// ---  Optimize user query -------
// move this to separate file


interface OptimizeQueryOptions {
  question: string;
  conversationHistory?: ConversationHistoryEntry[];
  bookTitle?: string;
}

export async function optimizeUserQuery({
  question,
  conversationHistory = [],
  bookTitle = "",
}: OptimizeQueryOptions): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");

  try {
  const sanitizedHistory = conversationHistory
    .map((entry) => ({
      role: entry.role,
      content: entry.content.trim(),
    }))
    .filter((entry) => entry.content.length > 0)
    .slice(-4);

  const historyMessages = sanitizedHistory.map((entry) => ({
    role: entry.role,
    content: entry.content,
  }));

const userPrompt = `
Book Title: ${bookTitle || "Unknown"}
Conversation:
${historyMessages || "[empty]"}

User Question: ${question}

Return ONLY the optimized query string, nothing else.
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_CHAT_MODEL,
        temperature: 0,
        max_tokens: 200,
        messages: [
          { role: "system", content: Optimize_User_Query_Prompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content || "";

    return cleanOptimizedQuery(raw);
  } catch (err) {
    console.error("optimizeUserQuery error:", err);
    throw new Error("Failed to optimize user query");
  }
}

/**
 * Sanitizes the model output to ensure clean embedding input.
 */
function cleanOptimizedQuery(output: string): string {
  let cleaned = output.trim();

  // remove code fences or markdown
  cleaned = cleaned.replace(/```[\s\S]*?```/g, "");
  cleaned = cleaned.replace(/`+/g, "");

  // remove leading "Here is...", "Optimized query:", etc.
  cleaned = cleaned.replace(/^.*?:\s*/i, "");

  // strip quotes
  cleaned = cleaned.replace(/^"(.*)"$/, "$1");
  cleaned = cleaned.replace(/^'(.*)'$/, "$1");

  // collapse multiple spaces/newlines
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}
