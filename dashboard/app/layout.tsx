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
    title: 'NGINX Analytics',
    description: 'A self-hostable analytics dashboard that generates insights from your NGINX logs. Monitor traffic and performance in real-time without compromising on user privacy.',
    keywords: ['NGINX', 'analytics', 'dashboard', 'log analysis', 'self-hosted', 'open source', 'privacy-focused', 'web server logs', 'traffic analysis'],
    openGraph: {
        title: 'NGINX Analytics Dashboard | Self-Hosted & Privacy-Focused',
        description: 'Visualize your NGINX log data with a modern, self-hosted dashboard.',
        url: 'https://nginx.apianalytics.dev', // Your website's canonical URL
        siteName: 'NGINX Analytics',
        images: [
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'NGINX Analytics Dashboard | Self-Hosted & Privacy-Focused',
        description: 'Visualize your NGINX log data with a modern, self-hosted dashboard.',
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
