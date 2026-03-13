'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: 'var(--background)',
            color: 'var(--text)',
            fontFamily: 'Inter, Helvetica, Arial, sans-serif',
            gap: '1rem',
            padding: '2rem',
            textAlign: 'center',
        }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--bold-text)' }}>
                Something went wrong
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '400px' }}>
                {error.message || 'An unexpected error occurred.'}
            </p>
            {error.digest && (
                <p style={{ color: 'var(--text-muted2)', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                    Error ID: {error.digest}
                </p>
            )}
            <button
                onClick={reset}
                style={{
                    marginTop: '0.5rem',
                    padding: '0.5rem 1.25rem',
                    background: 'var(--highlight)',
                    color: 'var(--inverted-text)',
                    border: 'none',
                    borderRadius: 'var(--border-radius)',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                }}
            >
                Try again
            </button>
        </div>
    );
}
