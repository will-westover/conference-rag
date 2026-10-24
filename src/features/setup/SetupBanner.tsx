import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';

type CheckStatus = 'success' | 'error' | 'warning' | 'pending';

// Shows setup problems (can't reach Supabase) plus the redirect-URL reminder.
// Hidden once the connection checks out or the user dismisses it.
export default function SetupBanner() {
    const [connection, setConnection] = useState<{ status: CheckStatus; text: string }>({
        status: 'pending',
        text: 'Checking Supabase connection...',
    });
    const [dismissed, setDismissed] = useState(readDismissed);
    const [copied, setCopied] = useState(false);

    const pageUrl = window.location.origin + window.location.pathname;

    useEffect(() => {
        supabase.auth
            .getSession()
            .then(({ error }) =>
                setConnection(
                    error
                        ? { status: 'error', text: `Connection failed: ${error.message}` }
                        : { status: 'success', text: 'Supabase connection OK' },
                ),
            )
            .catch(() => setConnection({ status: 'error', text: 'Connection failed - check config' }));
    }, []);

    if (connection.status === 'success' || dismissed) return null; // returning null renders nothing

    function dismiss() {
        setDismissed(true);
        try {
            sessionStorage.setItem('setup_banner_dismissed', 'true');
        } catch {
            // storage blocked (private window); the banner just comes back next visit
        }
    }

    async function copyUrl() {
        try {
            await navigator.clipboard.writeText(pageUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy URL:', err);
        }
    }

    return (
        <div className="setup-banner">
            <div className="setup-banner-content">
                <div className="setup-banner-header">
                    <span className="setup-icon">⚙️</span>
                    <h3>Setup Required</h3>
                    <button className="close-btn" title="Dismiss" onClick={dismiss}>
                        ×
                    </button>
                </div>

                <div className="setup-url-section">
                    <label>Your GitHub Pages URL:</label>
                    <div className="url-copy-container">
                        <code>{pageUrl}</code>
                        <button
                            className={`copy-btn ${copied ? 'copied' : ''}`}
                            title="Copy URL"
                            onClick={copyUrl}
                        >
                            {copied ? '✅' : '📋'}
                        </button>
                    </div>
                    <small>Add this URL to Supabase → Authentication → URL Configuration</small>
                </div>

                <div className="setup-checklist">
                    <CheckItem status="success" text="Supabase credentials configured" />
                    <CheckItem status={connection.status} text={connection.text} />
                    <CheckItem status="warning" text={`Add ${pageUrl} to Supabase redirect URLs`} />
                </div>

                <div className="setup-links">
                    <a
                        href={supabaseRedirectSettingsUrl()}
                        target="_blank"
                        rel="noreferrer"
                        className="setup-link"
                    >
                        🔗 Configure Supabase Redirect URLs
                    </a>
                    <a href={setupGuideUrl(pageUrl)} target="_blank" rel="noreferrer" className="setup-link">
                        📖 View Full Setup Guide
                    </a>
                </div>
            </div>
        </div>
    );
}

const ICONS: Record<CheckStatus, string> = { success: '✅', error: '❌', warning: '⚠️', pending: '⏳' };

function CheckItem({ status, text }: { status: CheckStatus; text: string }) {
    return (
        <div className={`setup-item ${status}`}>
            <span className="check-icon">{ICONS[status]}</span>
            <span>{text}</span>
        </div>
    );
}

function readDismissed(): boolean {
    try {
        return sessionStorage.getItem('setup_banner_dismissed') === 'true';
    } catch {
        return false;
    }
}

function supabaseRedirectSettingsUrl(): string {
    const projectId = new URL(env.supabaseUrl).hostname.split('.')[0];
    return `https://supabase.com/dashboard/project/${projectId}/auth/url-configuration`;
}

// On GitHub Pages, link to the README in the repo; locally, fall back to the relative path
function setupGuideUrl(pageUrl: string): string {
    if (!pageUrl.includes('github.io')) return 'README.md';
    const repoName = window.location.pathname.split('/').filter(Boolean)[0] ?? 'conference-rag';
    const username = pageUrl.split('.github.io')[0]?.split('//')[1];
    return `https://github.com/${username}/${repoName}/blob/main/README.md`;
}
