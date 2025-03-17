"use client";

import { useState } from "react";
import { NginxLog } from "../../types";
import { Client } from "./client"
import { OS } from "./os";
import { DeviceType } from "./device-type";

type Page = 'client' | 'os' | 'device'

export function Device({ data }: { data: NginxLog[] }) {
    const [page, setPage] = useState<Page>('client')

    return (
        <div className="card flex-1 px-4 py-3 m-3 relative min-h-53">
            <h2 className="font-semibold">Device</h2>
            <div className="absolute flex top-[14px] right-4 text-xs text-[var(--text-muted3)]">
                <button className="px-[0.5em] hover:text-[var(--text)] cursor-pointer" onClick={() => {setPage('client')}} style={{ color: data && data.length && page === 'client' ? 'var(--highlight)' : '' }}>
                    Client
                </button>
                <button className="px-[0.5em] hover:text-[var(--text)] cursor-pointer" onClick={() => {setPage('os')}} style={{ color: data && data.length && page === 'os' ? 'var(--highlight)' : '' }}>
                    OS
                </button>
                <button className="px-[0.5em] hover:text-[var(--text)] cursor-pointer" onClick={() => {setPage('device')}} style={{ color: data&& data.length && page === 'device' ? 'var(--highlight)' : '' }}>
                    Device
                </button>
            </div>

            {page === 'client' && <Client data={data}/>}
            {page === 'os' && <OS data={data}/>}
            {page === 'device' && <DeviceType data={data}/>}
        </div>
    );
}
