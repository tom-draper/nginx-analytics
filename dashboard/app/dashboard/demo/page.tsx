import { Metadata } from 'next';
import Dashboard from "@/lib/components/dashboard";

export const metadata: Metadata = {
    title: 'Demo',
    description: 'Try the NGINX Analytics dashboard with live demo data. Explore traffic insights, endpoint performance, geographic distribution, and device breakdowns — no setup required.',
    alternates: {
        canonical: 'https://nginx.apianalytics.dev/dashboard/demo',
    },
};

export default function Home() {
    return <Dashboard fileUpload={false} demo={true} />
}
