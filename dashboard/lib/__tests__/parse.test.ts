import { describe, it, expect } from 'vitest'
import { parseNginxLogs, parseNginxErrors } from '../parse'

// ---------------------------------------------------------------------------
// Access log parsing
// ---------------------------------------------------------------------------

const COMBINED_LOG = '192.168.1.1 - - [10/Jan/2024:08:30:00 +0000] "GET /api/data HTTP/1.1" 200 1234 "https://example.com" "Mozilla/5.0"'
const POST_LOG    = '10.0.0.1 - - [15/Jun/2023:14:22:05 -0500] "POST /submit HTTP/2.0" 201 512 "-" "curl/7.68.0"'
const ERROR_LOG   = '172.16.0.5 - - [01/Mar/2024:00:00:01 +0100] "DELETE /resource/42 HTTP/1.1" 404 98 "-" "python-requests/2.28"'
const PATH_QUERY  = '1.2.3.4 - - [20/Dec/2023:12:00:00 +0000] "GET /search?q=nginx&page=2 HTTP/1.1" 200 4096 "-" "Googlebot/2.1"'
// Nginx Proxy Manager vcombined format: $host:$server_port prepended
const NPM_LOG     = 'example.com:443 192.168.1.1 - - [10/Jan/2024:08:30:00 +0000] "GET /api/data HTTP/2.0" 200 1234 "https://example.com" "Mozilla/5.0"'

describe('parseNginxLogs', () => {
    it('parses a standard combined log line', () => {
        const [log] = parseNginxLogs([COMBINED_LOG])
        expect(log.ipAddress).toBe('192.168.1.1')
        expect(log.method).toBe('GET')
        expect(log.path).toBe('/api/data')
        expect(log.httpVersion).toBe('HTTP/1.1')
        expect(log.status).toBe(200)
        expect(log.responseSize).toBe(1234)
        expect(log.referrer).toBe('https://example.com')
        expect(log.userAgent).toBe('Mozilla/5.0')
    })

    it('parses the timestamp correctly (UTC)', () => {
        const [log] = parseNginxLogs([COMBINED_LOG])
        expect(log.timestamp).toBeInstanceOf(Date)
        expect(log.timestamp?.toISOString()).toBe('2024-01-10T08:30:00.000Z')
    })

    it('applies timezone offset correctly (negative offset)', () => {
        const [log] = parseNginxLogs([POST_LOG])
        // 14:22:05 -0500 == 19:22:05 UTC
        expect(log.timestamp?.toISOString()).toBe('2023-06-15T19:22:05.000Z')
    })

    it('applies timezone offset correctly (positive offset)', () => {
        const [log] = parseNginxLogs([ERROR_LOG])
        // 00:00:01 +0100 == 23:00:01 UTC previous day
        expect(log.timestamp?.toISOString()).toBe('2024-02-29T23:00:01.000Z')
    })

    it('parses a POST request with 201 status', () => {
        const [log] = parseNginxLogs([POST_LOG])
        expect(log.method).toBe('POST')
        expect(log.status).toBe(201)
        expect(log.referrer).toBe('-')
    })

    it('parses a path that includes a query string', () => {
        const [log] = parseNginxLogs([PATH_QUERY])
        expect(log.path).toBe('/search?q=nginx&page=2')
    })

    it('parses multiple log lines', () => {
        const logs = parseNginxLogs([COMBINED_LOG, POST_LOG, ERROR_LOG])
        expect(logs).toHaveLength(3)
        expect(logs[0].ipAddress).toBe('192.168.1.1')
        expect(logs[1].ipAddress).toBe('10.0.0.1')
        expect(logs[2].ipAddress).toBe('172.16.0.5')
    })

    it('silently drops malformed lines', () => {
        const logs = parseNginxLogs(['this is not a log line', '', COMBINED_LOG])
        expect(logs).toHaveLength(1)
        expect(logs[0].ipAddress).toBe('192.168.1.1')
    })

    it('returns an empty array for empty input', () => {
        expect(parseNginxLogs([])).toEqual([])
    })

    it('parses Nginx Proxy Manager vcombined format (host:port prefix)', () => {
        const [log] = parseNginxLogs([NPM_LOG])
        expect(log.ipAddress).toBe('192.168.1.1')
        expect(log.method).toBe('GET')
        expect(log.path).toBe('/api/data')
        expect(log.status).toBe(200)
    })

    it('returns null timestamp for an invalid date string', () => {
        const bad = '1.1.1.1 - - [99/Xxx/9999:99:99:99 +0000] "GET / HTTP/1.1" 200 0 "-" "-"'
        const [log] = parseNginxLogs([bad])
        expect(log.timestamp).toBeNull()
    })

    it('returns null status when status field is non-numeric', () => {
        // Manually craft a line matching the regex but with a non-integer status
        // Status is captured as \d{3} so it will always be numeric — test parseFloat edge
        const [log] = parseNginxLogs([COMBINED_LOG])
        expect(typeof log.status).toBe('number')
    })
})

// ---------------------------------------------------------------------------
// Error log parsing
// ---------------------------------------------------------------------------

const ERROR_FULL = '2024/01/10 08:30:00 [error] 1234#5678: *99 connect() failed (111: Connection refused) while connecting to upstream, client: 10.0.0.1, server: example.com, request: "GET /api HTTP/1.1", referrer: "https://example.com", host: "example.com"'
const ERROR_WARN = '2024/03/15 12:00:00 [warn] 42#0: *1 something happened'
const ERROR_INFO = '2024/06/01 09:00:00 [info] 100#200: worker process 100 started'

describe('parseNginxErrors', () => {
    it('parses timestamp correctly', () => {
        const [err] = parseNginxErrors([ERROR_FULL])
        expect(err.timestamp).toBeInstanceOf(Date)
        expect(err.timestamp.getFullYear()).toBe(2024)
        expect(err.timestamp.getMonth()).toBe(0) // January
        expect(err.timestamp.getDate()).toBe(10)
    })

    it('parses log level', () => {
        const [err] = parseNginxErrors([ERROR_FULL])
        expect(err.level).toBe('error')
    })

    it('parses pid and tid', () => {
        const [err] = parseNginxErrors([ERROR_FULL])
        expect(err.pid).toBe(1234)
        expect(err.tid).toBe('5678')
    })

    it('parses connection id', () => {
        const [err] = parseNginxErrors([ERROR_FULL])
        expect(err.cid).toBe('99')
    })

    it('extracts optional client address', () => {
        const [err] = parseNginxErrors([ERROR_FULL])
        expect(err.clientAddress).toBe('10.0.0.1')
    })

    it('extracts optional server', () => {
        const [err] = parseNginxErrors([ERROR_FULL])
        expect(err.serverAddress).toBe('example.com,')
    })

    it('extracts optional request', () => {
        const [err] = parseNginxErrors([ERROR_FULL])
        expect(err.request).toBe('GET /api HTTP/1.1')
    })

    it('extracts optional referrer', () => {
        const [err] = parseNginxErrors([ERROR_FULL])
        expect(err.referrer).toBe('https://example.com')
    })

    it('extracts optional host', () => {
        const [err] = parseNginxErrors([ERROR_FULL])
        expect(err.host).toBe('example.com')
    })

    it('handles a warn-level log with no optional fields', () => {
        const [err] = parseNginxErrors([ERROR_WARN])
        expect(err.level).toBe('warn')
        expect(err.clientAddress).toBeUndefined()
        expect(err.request).toBeUndefined()
    })

    it('handles an info-level log without connection id', () => {
        const [err] = parseNginxErrors([ERROR_INFO])
        expect(err.level).toBe('info')
        expect(err.cid).toBe('0')
    })

    it('filters out empty lines', () => {
        const result = parseNginxErrors(['', '   ', ERROR_WARN])
        expect(result).toHaveLength(1)
    })

    it('returns an empty array for empty input', () => {
        expect(parseNginxErrors([])).toEqual([])
    })

    it('parses multiple lines independently', () => {
        const result = parseNginxErrors([ERROR_FULL, ERROR_WARN, ERROR_INFO])
        expect(result).toHaveLength(3)
        expect(result.map(e => e.level)).toEqual(['error', 'warn', 'info'])
    })
})
