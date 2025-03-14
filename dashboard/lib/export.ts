import { NginxLog } from "./types"

export const exportCSV = (logs: NginxLog[]) => {
    const csv = [[
        'timestamp',
        'path',
        'method',
        'status',
        'ipAddress',
        'userAgent',
        'responseSize',
        'httpVersion',
        'referrer',
    ]]
    for (const log of logs) {
        csv.push([
            log.timestamp ? log.timestamp.toISOString() : '',
            log.path ?? '',
            log.method ?? '',
            log.status ? log.status.toString() : '',
            log.ipAddress ?? '',
            log.userAgent ?? '',
            log.responseSize ? log.responseSize.toString() : '',
            log.httpVersion ?? '',
            log.referrer ?? '',
        ])
    }

    const csvContent = csv.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const filename = `nginx-analytics-${new Date().toJSON().replace(/[: ._]/g, '-')}.csv`;
    console.log(filename);
    a.download = filename;
    a.click()
}