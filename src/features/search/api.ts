// Network calls for search. Components call these and store the results in state; no React in here.
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { KeywordTalk, RankedTalk, SentenceMatch } from './types';

// Keyword search: ILIKE over sentence text, grouped by talk
export async function keywordSearch(query: string): Promise<KeywordTalk[]> {
    const { data, error } = await supabase
        .from('sentence_embeddings')
        .select('text, talk_id, title, speaker, url')
        .ilike('text', `%${query}%`)
        .limit(20);

    if (error) throw new Error(`Search failed: ${error.message}`);

    const talks = new Map<string, KeywordTalk>();
    for (const row of data) {
        let talk = talks.get(row.talk_id);
        if (!talk) {
            talk = {
                talk_id: row.talk_id,
                title: row.title,
                speaker: row.speaker ?? 'Unknown Speaker',
                url: row.url,
                sentences: [],
            };
            talks.set(row.talk_id, talk);
        }
        talk.sentences.push(row.text);
    }
    return [...talks.values()];
}

// Get embedding via the embed-question Edge Function
export async function getEmbedding(text: string): Promise<number[]> {
    const { data, error } = await supabase.functions.invoke<{ embedding: number[] }>('embed-question', {
        body: { question: text },
    });
    if (error || !data) throw await functionError(error, 'Failed to get embedding');
    return data.embedding;
}

// Search sentences using vector similarity (match_sentences in Postgres)
export async function searchSentences(embedding: number[]): Promise<SentenceMatch[]> {
    const { data, error } = await supabase.rpc('match_sentences', {
        // The generated types call vector columns `string`: pgvector's text format is "[0.1,0.2,...]"
        query_embedding: JSON.stringify(embedding),
        match_count: 20,
    });

    if (error) throw new Error(`Database search failed: ${error.message}`);
    return data;
}

// Fetch full talk text by querying all sentences for given talk_ids, ordered by sentence_num.
// Uses a single batched query via .in() for all talk_ids — no parallel calls needed.
export async function fetchFullTalkText(talks: RankedTalk[]): Promise<RankedTalk[]> {
    if (!talks.length) return talks;

    const { data, error } = await supabase
        .from('sentence_embeddings')
        .select('talk_id, sentence_num, text')
        .in(
            'talk_id',
            talks.map((t) => t.talk_id),
        )
        .order('talk_id')
        .order('sentence_num');

    if (error) {
        console.warn('Failed to fetch full talk text, using snippets:', error.message);
        return talks;
    }

    // Group fetched sentences by talk_id
    const fullText = new Map<string, string[]>();
    for (const row of data) {
        const sentences = fullText.get(row.talk_id) ?? [];
        sentences.push(row.text);
        fullText.set(row.talk_id, sentences);
    }

    // Replace snippet text with full talk text
    return talks.map((talk) => ({ ...talk, text: fullText.get(talk.talk_id)?.join(' ') ?? talk.text }));
}

// Generate answer via the generate-answer Edge Function
export async function generateAnswer(question: string, contextTalks: RankedTalk[]): Promise<string> {
    const { data, error } = await supabase.functions.invoke<{ answer: string }>('generate-answer', {
        body: { question, context_talks: contextTalks },
    });
    if (error || !data) throw await functionError(error, 'Failed to generate answer');
    return data.answer;
}

// Our Edge Functions return { error: "..." } with a non-2xx status. supabase-js wraps that in a
// FunctionsHttpError whose .context is the raw Response, so read the message out of its body.
async function functionError(error: unknown, fallback: string): Promise<Error> {
    if (error instanceof FunctionsHttpError) {
        try {
            const body = (await error.context.json()) as { error?: string };
            if (body.error) return new Error(body.error);
        } catch {
            // body wasn't JSON; fall through
        }
    }
    return new Error(fallback);
}
