import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});


export const metadata: Metadata = {
    metadataBase: new URL('https://nginx.apianalytics.dev'),
    title: {
        default: 'NGINX Analytics',
        template: 'NGINX Analytics - %s',
    },
    description: 'A self-hostable analytics dashboard that generates insights from your NGINX logs. Monitor traffic and performance in real-time without compromising on user privacy.',
    keywords: ['NGINX', 'analytics', 'dashboard', 'log analysis', 'self-hosted', 'open source', 'privacy-focused', 'web server logs', 'traffic analysis'],
    authors: [{ name: 'Tom Draper', url: 'https://github.com/tom-draper' }],
    category: 'technology',
    openGraph: {
        title: 'NGINX Analytics - Self-Hosted & Privacy-Focused',
        description: 'Visualize your NGINX log data with a modern, self-hosted analytics dashboard. Monitor traffic and performance in real-time without compromising on user privacy.',
        url: 'https://nginx.apianalytics.dev',
        siteName: 'NGINX Analytics',
        images: [
            {
                url: '/dashboard.png',
                width: 1200,
                height: 630,
                alt: 'NGINX Analytics dashboard showing request traffic, geographic distribution, and endpoint performance',
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'NGINX Analytics - Self-Hosted & Privacy-Focused',
        description: 'Visualize your NGINX log data with a modern, self-hosted analytics dashboard.',
        images: ['/dashboard.png'],
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    alternates: {
        canonical: 'https://nginx.apianalytics.dev',
    },
};


export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className="light">
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				{children}
			</body>
		</html>
	);
}
