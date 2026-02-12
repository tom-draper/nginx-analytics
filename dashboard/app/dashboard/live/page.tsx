"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { parseNginxLogs } from '@/lib/parse';
import type { LiveEvent } from '@/lib/components/live-globe';

const LiveGlobe = dynamic(() => import('@/lib/components/live-globe'), { ssr: false });

const POLL_INTERVAL = 30_000;
// Max events shown per polling cycle — keeps the globe readable at high traffic
const MAX_EVENTS_PER_BATCH = 120;
// Dispatch one event every N ms (throttled replay)
const DISPATCH_INTERVAL = 200; // 5/second → 150 events over 30s window

const LEGEND = [
    { label: '2xx Success',  color: '#1af073' },
    { label: '3xx Redirect', color: '#00bfff' },
    { label: '4xx Client',   color: '#ffaa4b' },
    { label: '5xx Server',   color: '#ff5050' },
];

export default function LivePage() {
    const [events, setEvents] = useState<LiveEvent[]>([]);
    const [reqCount, setReqCount] = useState(0);
    const [status, setStatus] = useState<'connecting' | 'live' | 'error'>('connecting');

    const positionsRef = useRef<Array<{ filename: string; position: number }> | null>(null);
    const includeCompressedRef = useRef(true);
    const eventQueueRef = useRef<LiveEvent[]>([]);
    const eventIdRef = useRef(0);

    // Drain the queue at a fixed rate so beacons appear spread out over the interval
    useEffect(() => {
        const interval = setInterval(() => {
            if (eventQueueRef.current.length > 0) {
                const event = eventQueueRef.current.shift()!;
                setEvents(prev => {
                    // Keep state bounded — the globe only needs recent unprocessed events
                    const trimmed = prev.length > 2000 ? prev.slice(-1000) : prev;
                    return [...trimmed, event];
                });
            }
        }, DISPATCH_INTERVAL);
        return () => clearInterval(interval);
    }, []);

    const fetchAndEnqueue = useCallback(async () => {
        try {
            let url = `/api/logs/access?includeCompressed=${includeCompressedRef.current}`;
            if (positionsRef.current) {
                url += `&positions=${encodeURIComponent(JSON.stringify(positionsRef.current))}`;
            }

            const res = await fetch(url);
            if (!res.ok) {
                if (res.status === 403 || res.status === 404) setStatus('error');
                return;
            }

            const data = await res.json();
            setStatus('live');

            if (!data.logs?.length) return;
            if (data.positions) positionsRef.current = data.positions;
            includeCompressedRef.current = false;

            // Parse raw log lines
            const parsed = parseNginxLogs(data.logs);
            if (parsed.length === 0) return;

            setReqCount(prev => prev + parsed.length);

            // Collect unique IPs that appear in this batch
            const uniqueIPs = [...new Set(parsed.map(l => l.ipAddress).filter(Boolean))];
            if (uniqueIPs.length === 0) return;

            // Resolve lat/lon for all IPs in one request
            const locRes = await fetch('/api/location', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(uniqueIPs),
            });
            if (!locRes.ok) return;

            const locations: Array<{ ipAddress: string; lat: number | null; lon: number | null }> = await locRes.json();
            const coordMap = new Map<string, { lat: number; lon: number }>();
            for (const loc of locations) {
                if (loc.lat != null && loc.lon != null) {
                    coordMap.set(loc.ipAddress, { lat: loc.lat, lon: loc.lon });
                }
            }

            // Build event objects, filtering to only those with known coordinates
            let newEvents: LiveEvent[] = [];
            for (const log of parsed) {
                const coords = coordMap.get(log.ipAddress);
                if (!coords) continue;
                newEvents.push({
                    id: String(++eventIdRef.current),
                    lat: coords.lat,
                    lon: coords.lon,
                    status: log.status,
                });
            }

            // Sample down if too many — keeps the globe readable at high traffic
            if (newEvents.length > MAX_EVENTS_PER_BATCH) {
                const step = newEvents.length / MAX_EVENTS_PER_BATCH;
                newEvents = newEvents.filter((_, i) => Math.round(i % step) === 0).slice(0, MAX_EVENTS_PER_BATCH);
            }

            eventQueueRef.current.push(...newEvents);
        } catch {
            setStatus('error');
        }
    }, []);

    useEffect(() => {
        fetchAndEnqueue();
        const interval = setInterval(fetchAndEnqueue, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchAndEnqueue]);

    return (
        <div className="relative w-full h-screen overflow-hidden" style={{ background: '#050810' }}>
            {/* Globe */}
            <LiveGlobe events={events} />

            {/* Header */}
            <div className="absolute top-6 left-6 flex items-center gap-4 z-10">
                <a
                    href="/dashboard"
                    className="text-[#99a1af] hover:text-white transition-colors duration-150 flex items-center gap-1 text-sm"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                    </svg>
                    Dashboard
                </a>
                <span className="text-[#99a1af] text-sm">·</span>
                <div className="flex items-center gap-2">
                    <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{
                            background: status === 'live' ? '#1af073' : status === 'error' ? '#ff5050' : '#ffaa4b',
                            boxShadow: status === 'live' ? '0 0 6px #1af073' : undefined,
                        }}
                    />
                    <span className="text-white text-sm font-medium tracking-wide">
                        {status === 'live' ? 'Live' : status === 'error' ? 'Unavailable' : 'Connecting…'}
                    </span>
                </div>
            </div>

            {/* Request counter */}
            {reqCount > 0 && (
                <div className="absolute top-6 right-6 text-right z-10">
                    <p className="text-white text-2xl font-bold tabular-nums">{reqCount.toLocaleString()}</p>
                    <p className="text-[#99a1af] text-xs mt-0.5">requests this session</p>
                </div>
            )}

            {/* Legend */}
            <div className="absolute bottom-6 left-6 flex flex-col gap-2 z-10">
                {LEGEND.map(({ label, color }) => (
                    <div key={label} className="flex items-center gap-2">
                        <span
                            className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: color, boxShadow: `0 0 6px ${color}` }}
                        />
                        <span className="text-[#99a1af] text-xs">{label}</span>
                    </div>
                ))}
            </div>

            {/* Queue depth indicator (only visible when there's a backlog) */}
            {eventQueueRef.current.length > 10 && (
                <div className="absolute bottom-6 right-6 text-[#99a1af] text-xs z-10">
                    {eventQueueRef.current.length} queued
                </div>
            )}
        </div>
    );
}
