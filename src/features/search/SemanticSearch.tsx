import { useState } from 'react';
import SearchPanel from './SearchPanel';
import { TalkHeading, SimilarityBadge, ErrorMessage } from './ResultParts';
import { getEmbedding, searchSentences } from './api';
import type { SearchState, SentenceMatch } from './types';

type SemanticState = SearchState<{ sentences: SentenceMatch[] }>;

export default function SemanticSearch({ ready }: { ready: boolean }) {
    const [state, setState] = useState<SemanticState>({ status: 'idle' });

    async function search(query: string) {
        try {
            // Step 1: Get embedding (embed-question Edge Function)
            const embedding = await getEmbedding(query);
            // Step 2: Search for similar sentences (match_sentences in Postgres)
            setState({ status: 'done', sentences: await searchSentences(embedding) });
        } catch (err) {
            setState({ status: 'error', message: err instanceof Error ? err.message : String(err) });
        }
    }

    return (
        <SearchPanel
            id="semantic"
            title="🧠 Semantic Search"
            description="Find similar content by meaning, not just keywords. Requires embeddings and the embed-question Edge Function."
            placeholder="Search by meaning..."
            buttonLabel="Search"
            ready={ready}
            onSearch={search}
        >
            {state.status === 'error' && <ErrorMessage message={state.message} />}
            {state.status === 'done' && state.sentences.length === 0 && (
                <div className="no-results">No similar content found. Try a different query.</div>
            )}
            {state.status === 'done' &&
                state.sentences.map((s) => (
                    <div className="result-card" key={s.id}>
                        <div className="result-card-header">
                            <TalkHeading talk={{ ...s, url: null }} />
                            <SimilarityBadge similarity={s.similarity} />
                        </div>
                        <div className="result-sentences">{s.text}</div>
                    </div>
                ))}
        </SearchPanel>
    );
}
