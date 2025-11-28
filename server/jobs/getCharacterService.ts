import axios from 'axios';
import PQueue from 'p-queue';

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
export const OPENAI_EMBED_MODEL = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';
export const OPENAI_CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';

// simple token estimate fallback
export function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}

// Create embeddings (batched)
export async function createEmbeddings(inputs: string[]) {
  const url = 'https://api.openai.com/v1/embeddings';
  const payload = { model: OPENAI_EMBED_MODEL, input: inputs };
  try {
    const resp = await axios.post(url, payload, {
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      timeout: 60000,
    });
    return resp.data.data.map((d: any) => d.embedding);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const detail = error.response?.data?.error?.message || error.message;
      throw new Error(`Embedding request failed: ${detail}`);
    }
    throw error;
  }
}

// Extract characters/personas using OpenAI LLM
export async function extractCharacters(bookTitle: string, bookDescription: string, sampleTexts: string[]) {
  const systemPrompt = `You are a careful assistant. Given book context and excerpts, return a JSON array of main characters.
Return ONLY valid JSON array. Each item must be:
{name: string, role: string, persona: string, example_phrases: [string]}.
If no characters found, return an empty array [].
Do NOT hallucinate characters; only return names explicitly present in the provided text/excerpts.`;

  const userPrompt = `Book title: ${bookTitle || 'Unknown'}
Book description: ${bookDescription || 'None'}

Excerpts:
${sampleTexts.join('\n\n---\n\n')}

Provide a JSON array as specified.`;

  const url = 'https://api.openai.com/v1/chat/completions';
  const payload = {
    model: OPENAI_CHAT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.0,
    max_tokens: 1500,
  };

  const resp = await axios.post(url, payload, { headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' } });
  const text = resp?.data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from character extraction LLM');

  const cleaned = text.replace(/```json|```/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    // fallback: try find JSON array
    const m = cleaned.match(/\[.*\]/s);
    if (m) return JSON.parse(m[0]);
    return [];
  }
}
