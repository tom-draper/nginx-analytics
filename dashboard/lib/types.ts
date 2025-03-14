export type NginxLog = {
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

export type NginxError = {
    timestamp: Date;
    level: string;
    pid: number;
    tid: string;
    cid: string;
    message: string;
    clientAddress?: string;
    serverAddress?: string;
    request?: string;
    referrer?: string;
    host?: string;
}

export type SystemInfo = {
    uptime: number;
    timestamp: string;
    cpu: {
        model: string;
        cores: number;
        speed: number;
        usage: number | null;
    };
    memory: {
        free: number;
        available: number;
        used: number;
        total: number;
    };
    disk: {
        filesystem: string;
        size: number;
        used: number;
        mountedOn: string;
    }[]
}

export type HistoryData = {
    cpuUsage: number[],
    memoryUsage: number[],
    timestamps: number[]
}

export type LogSizes = {
    files: LogFilesSizes,
    summary: LogFilesSummary
}

export type LogFilesSizes = {
    name: string;
    size: number;
    extension: string;
}[]

export type LogFilesSummary = {
    totalSize: number;
    logFilesSize: number;
    compressedFilesSize: number;
    totalFiles: number;
    logFilesCount: number;
    compressedFilesCount: number;
}