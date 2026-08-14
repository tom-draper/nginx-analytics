import { NginxLog } from "./types"

function escapeCSVValue(value: string | number | null): string {
    let text = value === null ? '' : String(value)
    if (/^[=+\-@]/.test(text)) {
        text = `'${text}`
    }
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export const exportCSV = (logs: NginxLog[]) => {
    const rows = [
        'timestamp,path,method,status,ipAddress,userAgent,responseSize,httpVersion,referrer',
        ...logs.map(log => [
            log.timestamp ? new Date(log.timestamp).toISOString() : null,
            log.path,
            log.method,
            log.status,
            log.ipAddress,
            log.userAgent,
            log.responseSize,
            log.httpVersion,
            log.referrer,
        ].map(escapeCSVValue).join(',')),
    ]
    const csv = rows.join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nginx-analytics-${new Date().toJSON().replace(/[: ._]/g, '-')}.csv`;
    a.click()
}
