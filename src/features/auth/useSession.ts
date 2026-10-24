import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// Custom hook: the current Supabase session.
// undefined = still checking, null = logged out, Session = logged in (session.user, session.access_token).
export function useSession(): Session | null | undefined {
    const [session, setSession] = useState<Session | null | undefined>(undefined);

    useEffect(() => {
        // 1. Read any session already saved in this browser (e.g. returning from the magic link)
        supabase.auth.getSession().then(({ data }) => setSession(data.session));

        // 2. Subscribe to future changes: SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession));

        // Cleanup: React calls this when the component unmounts, so we don't leak listeners
        return () => subscription.unsubscribe();
    }, []); // [] = run once, when the component first appears

    return session;
}
