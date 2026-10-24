import { useEffect, useState } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface SearchReadiness {
    keyword: boolean;
    semantic: boolean;
    rag: boolean;
}

const NOT_READY: SearchReadiness = { keyword: false, semantic: false, rag: false };

// Custom hook: which of the three search modes are ready to use.
// Each check only runs if the previous one passed, so a fresh project makes as few calls as possible.
export function useSearchReadiness(): SearchReadiness {
    const [ready, setReady] = useState<SearchReadiness>(NOT_READY);

    useEffect(() => {
        // If the component unmounts before the checks finish, ignore the late result
        let cancelled = false;
        checkReadiness().then((result) => {
            if (!cancelled) setReady(result);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    return ready;
}

async function checkReadiness(): Promise<SearchReadiness> {
    const result = { ...NOT_READY };

    try {
        // --- Check 1: Any data at all? (keyword search just needs text) ---
        const { count: totalCount, error: totalError } = await supabase
            .from('sentence_embeddings')
            .select('*', { count: 'exact', head: true });

        result.keyword = !totalError && (totalCount ?? 0) > 0;
        if (!result.keyword) return result;

        // --- Check 2: Data with embeddings? (semantic search needs vectors) ---
        const { count, error } = await supabase
            .from('sentence_embeddings')
            .select('*', { count: 'exact', head: true })
            .not('embedding', 'is', null);
        if (error || !count) return result;

        // --- 1 embed-question call (only if DB has embeddings) ---
        const embed = await supabase.functions.invoke('embed-question', { body: { question: 'test' } });
        result.semantic = !embed.error;
        if (!result.semantic) return result;

        // --- 1 generate-answer call (only if semantic pipeline is ready) ---
        // A 400 (empty context) still proves the function is deployed and working.
        // 404 = not deployed; 501 = the skeleton's "not implemented yet" reply.
        const gen = await supabase.functions.invoke('generate-answer', {
            body: { question: 'test', context_talks: [] },
        });
        result.rag =
            !gen.error ||
            (gen.error instanceof FunctionsHttpError && ![404, 501].includes(gen.error.context.status));
    } catch (err) {
        console.log('Readiness check failed:', err instanceof Error ? err.message : err);
    }

    return result;
}
