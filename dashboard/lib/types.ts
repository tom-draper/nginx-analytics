export type LogRow = {
    ipAddress: string;
    timestamp: Date | null;
    method: string;
    path: string;
    httpVersion: string;
    status: number | null; 
    responseSize: number | null;
    referrer: string;
    userAgent: string;
}


export type Data = LogRow[]
