import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Live',
    robots: { index: false, follow: false },
};

export default function LiveLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
