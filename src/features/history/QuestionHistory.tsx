// Step 07: the logged-in user's own past questions. RLS guarantees the query only returns their rows.

export interface QuestionHistoryProps {
    // A number the parent bumps after each new answer, so this list knows to reload
    refreshKey: number;
}

// TODO: import { useEffect, useState } from 'react' and { supabase } from '@/lib/supabase' (TypeScript errors on unused imports, so add them as you use them)

// TODO: after `supabase db push` + `npm run gen:types`, add: type QuestionRow = Database['public']['Tables']['question_history']['Row']

export default function QuestionHistory(_props: QuestionHistoryProps) {
    // TODO: rename `_props` to `{ refreshKey }` once you use it (the leading _ tells TypeScript "unused on purpose")

    // TODO: const [rows, setRows] = useState<QuestionRow[]>([]) to hold the questions you load

    // TODO: useEffect that selects id, question, answer, created_at from question_history, newest first, limit 20, then setRows; dependency array [refreshKey]

    // TODO: return a <div className="search-panel"> with an <h3> heading and one <div className="result-card" key={row.id}> per row (question, answer, date)

    return null; // delete once the TODOs above are done
}
