import type { RankedTalk, SentenceMatch } from './types';

// Pure functions (no network, no React), which is why they're easy to unit test in ranking.test.ts

// Group search results by talk, computing average similarity per talk, and keep the top 3
export function groupByTalk(sentences: SentenceMatch[]): RankedTalk[] {
    const byTalk = new Map<string, { talk: SentenceMatch; sentences: string[]; totalSimilarity: number }>();

    for (const sent of sentences) {
        let entry = byTalk.get(sent.talk_id);
        if (!entry) {
            entry = { talk: sent, sentences: [], totalSimilarity: 0 };
            byTalk.set(sent.talk_id, entry);
        }
        entry.sentences.push(sent.text);
        entry.totalSimilarity += sent.similarity;
    }

    return [...byTalk.values()]
        .map(({ talk, sentences: texts, totalSimilarity }) => ({
            talk_id: talk.talk_id,
            title: talk.title,
            speaker: talk.speaker,
            url: null,
            text: texts.join(' '),
            // TODO: Is average similarity the right metric? Alternatives worth researching:
            // - Max similarity (best single match per talk)
            // - Average of top-3 sentences (reduces noise from weak matches)
            // - Weighted by sentence count (rewards talks with more matches)
            avgSimilarity: totalSimilarity / texts.length,
        }))
        .sort((a, b) => b.avgSimilarity - a.avgSimilarity)
        .slice(0, 3);
}

export type SimilarityLevel = 'similarity-high' | 'similarity-mid' | 'similarity-low';

// Color bucket for a similarity score (CSS class names in styles.css)
export function similarityClass(similarity: number): SimilarityLevel {
    if (similarity >= 0.7) return 'similarity-high';
    if (similarity >= 0.4) return 'similarity-mid';
    return 'similarity-low';
}
