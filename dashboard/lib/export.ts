import { NginxLog } from "./types"

export const exportCSV = (logs: NginxLog[]) => {
    let csv = 'timestamp,path,method,status,ipAddress,userAgent,responseSize,httpVersion,referrer\n';
    for (const log of logs) {
        csv += `${log.timestamp ? new Date(log.timestamp).toISOString() : ''},${log.path ?? ''},${log.method ?? ''},${log.status ?? ''},${log.ipAddress ?? ''},${log.userAgent ?? ''},${log.responseSize ?? ''},${log.httpVersion ?? ''},${log.referrer ?? ''}\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nginx-analytics-${new Date().toJSON().replace(/[: ._]/g, '-')}.csv`;
    a.click()
}