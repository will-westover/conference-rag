import type { Database } from '@/types/database';

// Types derived from the generated schema, so they update automatically when the database changes
export type SentenceRow = Database['public']['Tables']['sentence_embeddings']['Row'];
export type SentenceMatch = Database['public']['Functions']['match_sentences']['Returns'][number];

export interface Talk {
    talk_id: string;
    title: string;
    speaker: string;
    // match_sentences() doesn't return url (see its RETURNS TABLE in scripts/01_create_schema.py),
    // so semantic and RAG results have no link. TypeScript surfaced this; the old JS silently rendered href="undefined".
    url: string | null;
}

export interface KeywordTalk extends Talk {
    sentences: string[];
}

export interface RankedTalk extends Talk {
    text: string;
    avgSimilarity: number;
}

// One result shape per search mode. A "discriminated union": checking `status` tells TypeScript
// exactly which other fields exist, so you can't read `talks` while in the error state.
export type SearchState<T> =
    { status: 'idle' } | { status: 'error'; message: string } | ({ status: 'done' } & T);
