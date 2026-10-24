import { useState, type FormEvent, type ReactNode } from 'react';

interface SearchPanelProps {
    id: 'keyword' | 'semantic' | 'rag';
    title: string;
    description: string;
    placeholder: string;
    buttonLabel: string;
    ready: boolean;
    onSearch: (query: string) => Promise<void>;
    // Whatever the parent puts between <SearchPanel> and </SearchPanel> (the results)
    children?: ReactNode;
}

// One reusable panel. The three search modes only differ in their props and in what onSearch does.
export default function SearchPanel({
    id,
    title,
    description,
    placeholder,
    buttonLabel,
    ready,
    onSearch,
    children,
}: SearchPanelProps) {
    const [query, setQuery] = useState(''); // what's typed in the box
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault(); // stop the browser's default form submit (a full page reload)
        const q = query.trim();
        if (!q) return;
        setLoading(true);
        try {
            await onSearch(q);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={`search-panel ${ready ? 'panel-ready' : 'panel-not-ready'}`} id={`${id}-panel`}>
            <div className="panel-header">
                <h3>{title}</h3>
                <span className={`status-badge ${ready ? 'ready' : 'not-ready'}`}>
                    {ready ? '🟢 Ready' : '🔴 Not Ready'}
                </span>
            </div>
            <p className="panel-description">{description}</p>

            {/* A <form> gives us "press Enter to search" for free */}
            <form className="panel-input" onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={placeholder}
                    autoComplete="off"
                    disabled={!ready}
                />
                <button type="submit" className="btn-primary" disabled={!ready || loading}>
                    {buttonLabel}
                </button>
            </form>

            <div className="search-results">
                {loading ? <div className="searching">Searching...</div> : children}
            </div>
        </div>
    );
}
