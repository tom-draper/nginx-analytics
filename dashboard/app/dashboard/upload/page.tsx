import { Metadata } from 'next';
import Dashboard from "@/lib/components/dashboard";

export const metadata: Metadata = {
    title: 'Upload',
    robots: { index: false, follow: false },
};

export default function Home() {
    return <Dashboard fileUpload={true} demo={false} />
}

