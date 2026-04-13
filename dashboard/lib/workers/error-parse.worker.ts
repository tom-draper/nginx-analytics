import { parseNginxErrors } from '../parse';
import { NginxError } from '../types';

const ctx = self as unknown as Worker;

interface ErrorParseRequest {
    logs: string[];
    batchId: number;
}

ctx.onmessage = (e: MessageEvent<ErrorParseRequest>) => {
    const { logs, batchId } = e.data;
    const parsed: NginxError[] = parseNginxErrors(logs);
    ctx.postMessage({ parsed, batchId });
};
