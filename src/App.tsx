import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/features/auth/useSession';
import LoginScreen from '@/features/auth/LoginScreen';
import { useSearchReadiness } from '@/features/search/useSearchReadiness';
import KeywordSearch from '@/features/search/KeywordSearch';
import SemanticSearch from '@/features/search/SemanticSearch';
import AskQuestion from '@/features/search/AskQuestion';
import QuestionHistory from '@/features/history/QuestionHistory';
import DeployInfo from '@/features/setup/DeployInfo';
import SetupBanner from '@/features/setup/SetupBanner';

// Top of the component tree. It decides which screen to show based on the session.
export default function App() {
    const session = useSession();

    return (
        <>
            <DeployInfo />
            <SetupBanner />
            {/* undefined = still checking the saved session, so render nothing for a moment */}
            {session === undefined ? null : session ? <AppScreen user={session.user} /> : <LoginScreen />}
        </>
    );
}

// Only mounted once someone is logged in, so the readiness checks run with their JWT attached
function AppScreen({ user }: { user: User }) {
    const ready = useSearchReadiness();
    // "Lifting state up": AskQuestion and QuestionHistory are siblings, so the state they share lives
    // in their parent. AskQuestion bumps it after saving; QuestionHistory reloads when it changes.
    const [historyVersion, setHistoryVersion] = useState(0);

    return (
        <div id="app-screen" className="screen">
            <nav className="navbar">
                <h2>Conference Q&amp;A</h2>
                <div className="user-info">
                    <span>{user.email}</span>
                    {/* signOut fires SIGNED_OUT → useSession sets null → App re-renders the LoginScreen */}
                    <button className="btn-secondary" onClick={() => supabase.auth.signOut()}>
                        Logout
                    </button>
                </div>
            </nav>

            <div className="container">
                <div className="search-panels">
                    <KeywordSearch ready={ready.keyword} />
                    <SemanticSearch ready={ready.semantic} />
                    <AskQuestion ready={ready.rag} onAsked={() => setHistoryVersion((v) => v + 1)} />
                </div>
                <QuestionHistory refreshKey={historyVersion} />
            </div>
        </div>
    );
}
