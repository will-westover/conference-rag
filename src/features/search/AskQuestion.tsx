import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import SearchPanel from './SearchPanel';
import { TalkHeading, SimilarityBadge, ErrorMessage } from './ResultParts';
import { getEmbedding, searchSentences, fetchFullTalkText, generateAnswer } from './api';
import { groupByTalk, similarityClass } from './ranking';
import type { RankedTalk, SearchState } from './types';

type AskState = SearchState<{ answer: string; topTalks: RankedTalk[] }>;

interface AskQuestionProps {
    ready: boolean;
    // Called after an answer is saved, so the parent can refresh the history list
    onAsked?: () => void;
}

export default function AskQuestion({ ready, onAsked }: AskQuestionProps) {
    const [state, setState] = useState<AskState>({ status: 'idle' });

    async function ask(question: string) {
        try {
            // Step 1: Get embedding
            const embedding = await getEmbedding(question);
            // Step 2: Search for similar sentences
            const sentences = await searchSentences(embedding);
            // Step 3: Group by talk (with similarity scores)
            const topTalks = groupByTalk(sentences);
            // Step 4: Fetch full talk text for richer context
            const enrichedTalks = await fetchFullTalkText(topTalks);
            // Step 5: Generate answer with full context
            const answer = await generateAnswer(question, enrichedTalks);

            setState({ status: 'done', answer, topTalks });

            // Save to history. No user_id here: the column defaults to auth.uid() from our JWT,
            // and the insert policy rejects any row stamped with someone else's id.
            const { error: saveError } = await supabase.from('question_history').insert({ question, answer });
            if (saveError) console.warn('Could not save question history:', saveError.message);
            else onAsked?.();
        } catch (err) {
            setState({ status: 'error', message: err instanceof Error ? err.message : String(err) });
        }
    }

    // Derived value: computed from state on every render, so it never needs its own useState
    const overall =
        state.status === 'done' && state.topTalks.length
            ? state.topTalks.reduce((sum, t) => sum + t.avgSimilarity, 0) / state.topTalks.length
            : 0;

    return (
        <SearchPanel
            id="rag"
            title="🤖 Ask a Question (RAG)"
            description="Get AI-generated answers based on conference talks. Requires all Edge Functions deployed."
            placeholder="Ask a question about conference talks..."
            buttonLabel="Ask"
            ready={ready}
            onSearch={ask}
        >
            {state.status === 'error' && <ErrorMessage message={state.message} />}
            {state.status === 'done' && (
                <>
                    <div className={`result-card rag-answer rag-${similarityClass(overall)}`}>
                        <div className="result-card-header">
                            <div className="result-title">AI Answer</div>
                            <SimilarityBadge similarity={overall} />
                        </div>
                        <div className="result-sentences">{state.answer}</div>
                    </div>

                    <div className="result-sources">
                        <strong>Sources:</strong>
                    </div>
                    {state.topTalks.map((talk) => (
                        <div className="result-card result-source" key={talk.talk_id}>
                            <div className="result-card-header">
                                <TalkHeading talk={talk} />
                                <SimilarityBadge similarity={talk.avgSimilarity} />
                            </div>
                        </div>
                    ))}
                </>
            )}
        </SearchPanel>
    );
}
