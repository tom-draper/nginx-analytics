import Link from 'next/link';

export default function NotFound() {
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
            <h1 style={{ fontSize: '4rem', fontWeight: 700, color: 'var(--highlight)', lineHeight: 1 }}>
                404
            </h1>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--bold-text)' }}>
                Page not found
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '400px' }}>
                The page you are looking for does not exist or has been moved.
            </p>
            <Link
                href="/dashboard"
                style={{
                    marginTop: '0.5rem',
                    padding: '0.5rem 1.25rem',
                    background: 'var(--highlight)',
                    color: 'var(--inverted-text)',
                    borderRadius: 'var(--border-radius)',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'inline-block',
                }}
            >
                Back to dashboard
            </Link>
        </div>
    );
}
