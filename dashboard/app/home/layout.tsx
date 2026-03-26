import { Metadata } from 'next';

export const metadata: Metadata = {
    title: {
        absolute: 'NGINX Analytics - Self-Hosted Log Analytics for NGINX',
    },
    description: 'A free, open-source, self-hostable analytics dashboard for NGINX. Monitor real-time traffic, endpoint performance, geographic distribution, and device breakdowns — all from your own server logs.',
    alternates: {
        canonical: 'https://nginx.apianalytics.dev/home',
    },
};

const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'NGINX Analytics',
    description: 'A self-hostable analytics dashboard that generates insights from your NGINX logs. Monitor traffic and performance in real-time without compromising on user privacy.',
    url: 'https://nginx.apianalytics.dev',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
    },
    author: {
        '@type': 'Person',
        name: 'Tom Draper',
        url: 'https://github.com/tom-draper',
    },
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            {children}
        </>
    );
}
