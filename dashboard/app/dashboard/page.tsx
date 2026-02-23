import Dashboard from "@/lib/components/dashboard";
import { usingFileUpload, serverUrl, authToken } from "@/lib/environment";

async function fetchLogFormat(): Promise<string | undefined> {
    // Agent mode: fetch format from the agent's status endpoint
    if (serverUrl) {
        try {
            const headers: HeadersInit = {};
            if (authToken) headers.Authorization = `Bearer ${authToken}`;
            const res = await fetch(`${serverUrl}/api/status`, {
                headers,
                cache: 'no-store',
            });
            if (res.ok) {
                const data = await res.json();
                return data.logFormat || undefined;
            }
        } catch {
            // Fall through to env var
        }
    }

    // Standalone mode: use local env var
    return process.env.NGINX_ANALYTICS_LOG_FORMAT || undefined;
}

export default async function Home() {
    const logFormat = await fetchLogFormat();
    return <Dashboard fileUpload={usingFileUpload} demo={false} logFormat={logFormat} />
}
