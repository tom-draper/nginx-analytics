"use client";

import { useState } from "react";
import { Client } from "./client"
import { OS } from "./os";
import { DeviceType } from "./device-type";

type Page = 'client' | 'os' | 'device'

export function Device({
    clientCounts,
    osCounts,
    deviceTypeCounts,
    filterClient,
    setFilterClient,
    filterOS,
    setFilterOS,
    filterDeviceType,
    setFilterDeviceType,
}: {
    clientCounts: Record<string, number>;
    osCounts: Record<string, number>;
    deviceTypeCounts: Record<string, number>;
    filterClient: string | null;
    setFilterClient: (client: string | null) => void;
    filterOS: string | null;
    setFilterOS: (os: string | null) => void;
    filterDeviceType: string | null;
    setFilterDeviceType: (deviceType: string | null) => void;
}) {
    const [page, setPage] = useState<Page>('client')

    return (
        <div className="card flex-1 px-4 py-3 m-3 relative min-h-53">
            <h2 className="font-semibold">Device</h2>
            <div className="absolute flex top-[14px] right-4 text-xs text-[var(--text-muted3)]">
                <button className="px-[0.5em] hover:text-[var(--text)] cursor-pointer transition-colors duration-50 ease-in-out" onClick={() => {setPage('client')}} style={{ color: page === 'client' ? 'var(--highlight)' : '' }}>
                    Client
                </button>
                <button className="px-[0.5em] hover:text-[var(--text)] cursor-pointer transition-colors duration-50 ease-in-out" onClick={() => {setPage('os')}} style={{ color: page === 'os' ? 'var(--highlight)' : '' }}>
                    OS
                </button>
                <button className="px-[0.5em] hover:text-[var(--text)] cursor-pointer transition-colors duration-50 ease-in-out" onClick={() => {setPage('device')}} style={{ color: page === 'device' ? 'var(--highlight)' : '' }}>
                    Device
                </button>
            </div>

            {page === 'client' && <Client clientCounts={clientCounts} filterClient={filterClient} setFilterClient={setFilterClient} />}
            {page === 'os' && <OS osCounts={osCounts} filterOS={filterOS} setFilterOS={setFilterOS} />}
            {page === 'device' && <DeviceType deviceTypeCounts={deviceTypeCounts} filterDeviceType={filterDeviceType} setFilterDeviceType={setFilterDeviceType} />}
        </div>
    );
}
