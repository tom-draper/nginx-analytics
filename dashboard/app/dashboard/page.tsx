"use client";

import { useSearchParams } from "next/navigation";
import NetworkBackground from "@/lib/components/network-background";
import Dashboard from "@/lib/components/dashboard";
import FileUpload from "@/lib/components/file-upload";
import { useState } from "react";

export default function Home() {
    const [accessLogs, setAccessLogs] = useState<string[]>([]);

    const params = useSearchParams();
    const upload = params.get('upload') === 'true'

    if (upload && accessLogs.length === 0) {
        return (
            <div className="relative w-full h-screen bg-[var(--background)]">
                <NetworkBackground />
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <FileUpload setAccessLogs={setAccessLogs}/>
                </div>
            </div>
        )
    }

    return <Dashboard accessLogs={accessLogs} setAccessLogs={setAccessLogs}/>
}