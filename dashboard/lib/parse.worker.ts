/// <reference lib="webworker" />
export type {};

import { parseNginxLogs } from './parse';
import type { NginxLog } from './types';

type ParseMessage = {
    rawLogs: string[];
    logFormat?: string;
    isFirstBatch: boolean;
};

export type ParseWorkerResult = {
    logs: NginxLog[];
    maxTimestamp: number | null;
    isFirstBatch: boolean;
};

self.onmessage = (e: MessageEvent<ParseMessage>) => {
    const { rawLogs, logFormat, isFirstBatch } = e.data;
    const parsed = parseNginxLogs(rawLogs, logFormat);

    let maxTimestamp: number | null = null;
    if (isFirstBatch) {
        for (const log of parsed) {
            if (log.timestamp) {
				const t = log.timestamp;
                if (maxTimestamp === null || t > maxTimestamp) maxTimestamp = t;
            }
        }
    }

    self.postMessage({ logs: parsed, maxTimestamp, isFirstBatch } satisfies ParseWorkerResult);
};
