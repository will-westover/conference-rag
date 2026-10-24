import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';

type Message = { text: string; type: 'success' | 'error' };

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState<Message | null>(null);
    const [sending, setSending] = useState(false);

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!email.trim()) {
            setMessage({ text: 'Please enter your email', type: 'error' });
            return;
        }

        setSending(true);
        const { error } = await supabase.auth.signInWithOtp({
            email: email.trim(),
            options: {
                // Must be in Supabase → Authentication → URL Configuration → Redirect URLs
                emailRedirectTo: window.location.origin + window.location.pathname,
            },
        });
        setSending(false);

        setMessage(
            error
                ? { text: `Error: ${error.message}`, type: 'error' }
                : { text: 'Check your email for the magic link!', type: 'success' },
        );
    }

    return (
        <div id="login-screen" className="screen">
            <div className="container">
                <div className="card">
                    <h1>Conference Q&amp;A</h1>
                    <p className="subtitle">Ask questions about conference talks using AI</p>

                    <form id="login-form" onSubmit={handleSubmit}>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                        />
                        <button type="submit" className="btn-primary" disabled={sending}>
                            {sending ? 'Sending…' : 'Sign In with Magic Link'}
                        </button>
                        <p className="info-text">We'll send you a magic link to sign in</p>
                    </form>

                    {message && <div className={`message ${message.type}`}>{message.text}</div>}
                </div>
            </div>
        </div>
    );
}
