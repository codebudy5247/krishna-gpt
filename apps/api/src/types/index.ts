// src/types/index.ts

// ─── Gita Verse (raw data from API / seed file) ───────────────────────────────

export interface GitaVerseData {
  chapter: number;          // 1–18
  verse: number;            // verse number within chapter
  sanskrit: string;         // original Devanagari text
  transliteration?: string; // Roman transliteration
  wordMeanings?: string;    // word-by-word meaning from API
  translation: string;      // English translation (required)
  commentary?: string;      // optional commentary
  keywords: string[];       // life-theme tags for RAG retrieval
}

// Convenience alias for an array of verses
export type GitaVersesData = GitaVerseData[];

// ─── Qdrant vector payload ────────────────────────────────────────────────────

export interface VectorPayload {
  chapter: number;
  verse: number;
  sanskrit: string;
  transliteration?: string;
  wordMeanings?: string;
  translation: string;
  commentary?: string;
  keywords: string[];
  qdrantId: string;         // Qdrant point UUID
  postgresId: string;       // PostgreSQL row UUID
  embeddingText: string;    // combined text that was embedded
}

// ─── RAG search result ────────────────────────────────────────────────────────

export interface SearchResult {
  score: number;            // cosine similarity score (0–1)
  verse: VectorPayload;
}

// ─── Chat API ─────────────────────────────────────────────────────────────────

export interface ChatRequest {
  sessionId: string;
  conversationId?: string;  // omit to start a new conversation
  message: string;
}

export interface ChatResponse {
  conversationId: string;
  messageId: string;
  reply: string;
  citedVerses: CitedVerse[];
  timestamp: string;
}

// ─── Cited verse (returned in chat response metadata) ─────────────────────────

export interface CitedVerse {
  chapter: number;
  verse: number;
  sanskrit: string;
  transliteration?: string;
  translation: string;
  relevanceScore: number;
}

// ─── Gemini conversation history ──────────────────────────────────────────────

export interface ConversationHistory {
  role: 'user' | 'model';
  parts: [{ text: string }];
}