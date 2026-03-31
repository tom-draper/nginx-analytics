import { parseNginxLogs } from '../parse';

const ctx = self as unknown as Worker;

interface ParseRequest {
    logs: string[];
    logFormat?: string;
    batchId: number;
    isFirstBatch: boolean;
}

ctx.onmessage = (e: MessageEvent<ParseRequest>) => {
    const { logs, logFormat, batchId, isFirstBatch } = e.data;
    const parsed = parseNginxLogs(logs, logFormat);
    parsed.sort((a, b) => {
        if (a.timestamp === null) return 1;
        if (b.timestamp === null) return -1;
        return a.timestamp - b.timestamp;
    });
    ctx.postMessage({ parsed, batchId, isFirstBatch });
};
