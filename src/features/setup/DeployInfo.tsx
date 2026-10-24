import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

// Build timestamp (injected by vite.config.ts) + page view counter.
// The counter works without logging in because page_views has anon INSERT + SELECT policies.
export default function DeployInfo() {
    const [views, setViews] = useState('...');
    const recorded = useRef(false); // survives re-renders without causing one

    useEffect(() => {
        // StrictMode runs effects twice in dev; the ref stops us from inserting two rows per visit
        if (recorded.current) return;
        recorded.current = true;

        supabase
            .from('page_views')
            .insert({ page_url: window.location.href, user_agent: navigator.userAgent })
            .then(() => supabase.from('page_views').select('*', { count: 'exact', head: true }))
            .then(({ count }) => setViews(count != null ? count.toLocaleString() : '—'));
    }, []);

    const built = new Date(__BUILD_TIME__);

    return (
        <div className="deploy-info">
            Updated: {built.toLocaleDateString()} {built.toLocaleTimeString()}
            &nbsp;·&nbsp; Views: {views}
        </div>
    );
}
