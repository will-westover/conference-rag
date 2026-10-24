import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import { ErrorMessage } from '@/features/search/ResultParts';

type QuestionRow = Database['public']['Tables']['question_history']['Row'];

export interface QuestionHistoryProps {
    // A number the parent bumps after each new answer, so this list knows to reload
    refreshKey: number;
}

// Step 07: the logged-in user's own past questions.
// There is no "WHERE user_id = me" in this query: RLS adds it inside Postgres, so this
// component can't show someone else's rows even if its code had a bug.
export default function QuestionHistory({ refreshKey }: QuestionHistoryProps) {
    const [rows, setRows] = useState<QuestionRow[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        supabase
            .from('question_history')
            .select('id, question, answer, created_at, user_id')
            .order('created_at', { ascending: false })
            .limit(20)
            .then(({ data, error }) => {
                if (cancelled) return;
                setError(error?.message ?? null);
                setRows(data ?? []);
            });
        return () => {
            cancelled = true;
        };
    }, [refreshKey]); // re-runs whenever the parent bumps refreshKey

    async function clearHistory() {
        // Also needs no user filter: the "delete own history" policy limits it to this user's rows.
        // (.gte on id is only there because supabase-js refuses a DELETE with no filter at all.)
        const { error } = await supabase.from('question_history').delete().gte('id', 0);
        if (error) setError(error.message);
        else setRows([]);
    }

    return (
        <div className="search-panel panel-ready" id="history-panel">
            <div className="panel-header">
                <h3>🕘 Your Past Questions</h3>
                {rows.length > 0 && (
                    <button className="btn-secondary" onClick={clearHistory}>
                        Clear
                    </button>
                )}
            </div>
            <p className="panel-description">
                Only you can see these. Row Level Security filters them to your account inside the database.
            </p>

            {error && <ErrorMessage message={error} />}
            {!error && rows.length === 0 && (
                <div className="no-results">No questions yet. Ask one above and it will show up here.</div>
            )}
            {rows.map((row) => (
                <details className="result-card" key={row.id}>
                    <summary className="result-card-header">
                        <span className="result-title">{row.question}</span>
                        <span className="result-speaker">{new Date(row.created_at).toLocaleString()}</span>
                    </summary>
                    <div className="result-sentences">{row.answer}</div>
                </details>
            ))}
        </div>
    );
}
