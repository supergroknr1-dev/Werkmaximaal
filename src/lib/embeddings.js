// OpenAI text-embedding-3-small wrapper voor semantic search.
// 1536 dimensies, ~$0.02 per 1M tokens (een NL-zin = ~10 tokens).
// Cosine similarity tussen 2 vectors → match-score 0-1.

import { openai } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";

const MODEL = "text-embedding-3-small";

export async function embedText(tekst) {
  const { embedding } = await embed({
    model: openai.embedding(MODEL),
    value: tekst,
  });
  return embedding;
}

export async function embedManyTexts(teksten) {
  const { embeddings } = await embedMany({
    model: openai.embedding(MODEL),
    values: teksten,
  });
  return embeddings;
}

// Cosine similarity tussen 2 vectors van zelfde lengte. Return 0-1.
export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
