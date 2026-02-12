"use client";

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { LiveEvent } from './live-globe';
import type { NginxLog } from '../types';
import type { Location } from '../location';

const LiveGlobe = dynamic(() => import('./live-globe'), { ssr: false });

// Only show requests logged within this window. Filters out the historical
// backlog that arrives on initial load without a complex first-batch check.
const RECENT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Dispatch rate to the globe — spreads events out visually
const DISPATCH_INTERVAL_MS = 200; // 5/second

interface Props {
    logs: NginxLog[];
    locationMap: Map<string, Location>;
}

export default function LiveGlobeCard({ logs, locationMap }: Props) {
    const [events, setEvents] = useState<LiveEvent[]>([]);
    const processedRef = useRef(0);
    // Logs whose IP wasn't in locationMap yet — retried on each locationMap update
    const pendingRef = useRef<NginxLog[]>([]);
    const eventQueueRef = useRef<LiveEvent[]>([]);
    const eventIdRef = useRef(0);

    const enqueue = (log: NginxLog, loc: Location) => {
        if (loc.lat == null || loc.lon == null) return;
        eventQueueRef.current.push({
            id: String(++eventIdRef.current),
            lat: loc.lat,
            lon: loc.lon,
            status: log.status,
        });
    };

    // When new logs arrive, resolve what we can, defer the rest to pendingRef
    useEffect(() => {
        const newLogs = logs.slice(processedRef.current);
        processedRef.current = logs.length;

        const cutoff = Date.now() - RECENT_WINDOW_MS;
        const stillPending: NginxLog[] = [];

        for (const log of newLogs) {
            // Skip historical data — only show recent requests
            if (!log.timestamp || log.timestamp.getTime() < cutoff) continue;

            const loc = locationMap.get(log.ipAddress);
            if (loc) {
                enqueue(log, loc);
            } else {
                stillPending.push(log);
            }
        }

        pendingRef.current.push(...stillPending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [logs]);

    // When locationMap grows, retry any pending logs
    useEffect(() => {
        if (pendingRef.current.length === 0) return;

        const stillPending: NginxLog[] = [];
        for (const log of pendingRef.current) {
            const loc = locationMap.get(log.ipAddress);
            if (loc) {
                enqueue(log, loc);
            } else {
                stillPending.push(log);
            }
        }
        pendingRef.current = stillPending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locationMap]);

    // Drain the queue at a steady rate so beacons appear spread out
    useEffect(() => {
        const interval = setInterval(() => {
            if (eventQueueRef.current.length === 0) return;
            const event = eventQueueRef.current.shift()!;
            setEvents(prev => {
                const trimmed = prev.length > 1000 ? prev.slice(-500) : prev;
                return [...trimmed, event];
            });
        }, DISPATCH_INTERVAL_MS);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="card m-3 mt-6 overflow-hidden relative" style={{ height: '24rem' }}>
            <div className="absolute inset-0">
                <LiveGlobe events={events} />
            </div>
            <h2 className="relative font-semibold px-4 pt-3 z-10">Live View</h2>
            <div className="absolute bottom-3 left-3 flex flex-col gap-1.5 pointer-events-none z-10">
                {[
                    { label: '2xx', color: '#1af073' },
                    { label: '3xx', color: '#00bfff' },
                    { label: '4xx', color: '#ffaa4b' },
                    { label: '5xx', color: '#ff5050' },
                ].map(({ label, color }) => (
                    <div key={label} className="flex items-center gap-1.5">
                        <span
                            className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: color, boxShadow: `0 0 5px ${color}` }}
                        />
                        <span className="text-[10px]" style={{ color: '#99a1af' }}>{label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
