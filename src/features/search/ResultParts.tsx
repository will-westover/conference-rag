import { similarityClass } from './ranking';
import type { Talk } from './types';

// Small presentational components shared by all three search modes.
// React escapes every {value} automatically, which is why the old escapeHtml() helper is gone.

export function TalkHeading({ talk }: { talk: Talk }) {
    return (
        <div>
            <div className="result-title">
                {talk.url ? (
                    <a href={talk.url} target="_blank" rel="noreferrer" className="result-title-link">
                        {talk.title}
                    </a>
                ) : (
                    talk.title
                )}
            </div>
            <div className="result-speaker">by {talk.speaker}</div>
        </div>
    );
}

export function SimilarityBadge({ similarity }: { similarity: number }) {
    return (
        <span className={`similarity-badge ${similarityClass(similarity)}`}>
            {(similarity * 100).toFixed(0)}%
        </span>
    );
}

// Wraps every match of `query` in <mark>, without ever building an HTML string
export function Highlight({ text, query }: { text: string; query: string }) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // split() with a capture group keeps the matches: odd indexes are the matched words
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return <>{parts.map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part))}</>;
}

export function ErrorMessage({ message }: { message: string }) {
    return <div className="result-error">Error: {message}</div>;
}
