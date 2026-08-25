"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
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

// Replay window: new logs are replayed across this span so beacons appear at
// the same cadence they originally occurred rather than all at once.
const REPLAY_WINDOW_MS = 30_000; // matches poll interval

// Cap events per batch — keeps the globe readable if a single poll ever
// returns an unusually large burst.
const MAX_EVENTS_PER_BATCH = 120;

interface Props {
    // The latest parsed batch only, not the cumulative log history.
    logs: NginxLog[];
    locationMap: Map<string, Location>;
}

export default function LiveGlobeCard({ logs, locationMap }: Props) {
    const [events, setEvents] = useState<LiveEvent[]>([]);
    // Logs whose IP wasn't in locationMap yet — retried on each locationMap update
    const pendingRef = useRef<NginxLog[]>([]);
    const eventQueueRef = useRef<LiveEvent[]>([]);
    const eventIdRef = useRef(0);

    // Push an event directly onto the queue (no delay).
    const enqueue = useCallback((log: NginxLog, loc: Location) => {
        if (loc.lat == null || loc.lon == null) return;
        eventQueueRef.current.push({
            id: String(++eventIdRef.current),
            lat: loc.lat,
            lon: loc.lon,
            status: log.status,
        });
    }, []);

    // Schedule an event using the log's timestamp to replay it at the same
    // position within a REPLAY_WINDOW_MS span, so a batch of recent logs
    // trickles in over 30 s instead of all firing at once.
    const scheduleEnqueue = useCallback((log: NginxLog, loc: Location) => {
        if (loc.lat == null || loc.lon == null) return;
        const delay = log.timestamp != null
            ? Math.max(0, log.timestamp - (Date.now() - REPLAY_WINDOW_MS))
            : 0;
        if (delay <= 0) {
            enqueue(log, loc);
        } else {
            setTimeout(() => enqueue(log, loc), delay);
        }
    }, [enqueue]);

    // When a new batch arrives, resolve what we can, defer the rest to pendingRef
    useEffect(() => {
        if (logs.length === 0) return;

        const cutoff = Date.now() - RECENT_WINDOW_MS;
        const stillPending: NginxLog[] = [];

        // Sample down if the batch is unusually large — keeps the globe readable
        let batch = logs;
        if (batch.length > MAX_EVENTS_PER_BATCH) {
            const step = batch.length / MAX_EVENTS_PER_BATCH;
            batch = batch.filter((_, i) => Math.round(i % step) === 0).slice(0, MAX_EVENTS_PER_BATCH);
        }

        for (const log of batch) {
            // Skip historical data — only show recent requests
            if (!log.timestamp || log.timestamp < cutoff) continue;

            const loc = locationMap.get(log.ipAddress);
            if (loc) {
                scheduleEnqueue(log, loc);
            } else {
                stillPending.push(log);
            }
        }

        pendingRef.current.push(...stillPending);
    }, [logs, locationMap, scheduleEnqueue]);

    // When locationMap grows, retry any pending logs (enqueue immediately —
    // the replay window has already passed by the time the location resolves).
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
    }, [locationMap, enqueue]);

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
