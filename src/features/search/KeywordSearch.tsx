import { useState } from 'react';
import SearchPanel from './SearchPanel';
import { TalkHeading, Highlight, ErrorMessage } from './ResultParts';
import { keywordSearch } from './api';
import type { KeywordTalk, SearchState } from './types';

type KeywordState = SearchState<{ query: string; talks: KeywordTalk[] }>;

export default function KeywordSearch({ ready }: { ready: boolean }) {
    const [state, setState] = useState<KeywordState>({ status: 'idle' });

    async function search(query: string) {
        try {
            setState({ status: 'done', query, talks: await keywordSearch(query) });
        } catch (err) {
            setState({ status: 'error', message: err instanceof Error ? err.message : String(err) });
        }
    }

    return (
        <SearchPanel
            id="keyword"
            title="🔍 Keyword Search"
            description="Search conference talks by keyword. Works once you import the conference data."
            placeholder="Search by keyword..."
            buttonLabel="Search"
            ready={ready}
            onSearch={search}
        >
            {state.status === 'error' && <ErrorMessage message={state.message} />}
            {state.status === 'done' && state.talks.length === 0 && (
                <div className="no-results">No results found. Try different keywords.</div>
            )}
            {/* .map turns an array of data into an array of elements; key lets React track each one */}
            {state.status === 'done' &&
                state.talks.map((talk) => (
                    <div className="result-card" key={talk.talk_id}>
                        <TalkHeading talk={talk} />
                        <div className="result-sentences">
                            {talk.sentences.slice(0, 3).map((sentence, i) => (
                                <div key={i}>
                                    <Highlight text={sentence} query={state.query} />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
        </SearchPanel>
    );
}
