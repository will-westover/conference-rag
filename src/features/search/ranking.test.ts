import { describe, expect, it } from 'vitest';
import { groupByTalk, similarityClass } from './ranking';
import type { SentenceMatch } from './types';

// Test helper: build a fake match_sentences() row with only the fields a test cares about
function match(talk_id: string, similarity: number, text = 'sentence'): SentenceMatch {
    return {
        id: `${talk_id}-${similarity}`,
        talk_id,
        title: `Talk ${talk_id}`,
        speaker: 'Speaker',
        text,
        similarity,
    };
}

describe('groupByTalk', () => {
    it('ranks talks by average similarity and keeps the top 3', () => {
        const talks = groupByTalk([
            match('a', 0.9),
            match('b', 0.5),
            match('b', 0.7),
            match('c', 0.8),
            match('d', 0.2),
        ]);
        expect(talks.map((t) => t.talk_id)).toEqual(['a', 'c', 'b']);
        expect(talks[2]?.avgSimilarity).toBeCloseTo(0.6);
    });

    it("joins each talk's sentences in the order they arrived", () => {
        const [talk] = groupByTalk([match('a', 0.9, 'First.'), match('a', 0.8, 'Second.')]);
        expect(talk?.text).toBe('First. Second.');
    });

    it('returns an empty list when nothing matched', () => {
        expect(groupByTalk([])).toEqual([]);
    });
});

describe('similarityClass', () => {
    it('buckets scores at the 0.4 and 0.7 boundaries', () => {
        expect(similarityClass(0.7)).toBe('similarity-high');
        expect(similarityClass(0.69)).toBe('similarity-mid');
        expect(similarityClass(0.4)).toBe('similarity-mid');
        expect(similarityClass(0.39)).toBe('similarity-low');
    });
});
