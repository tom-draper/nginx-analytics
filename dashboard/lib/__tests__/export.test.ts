import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { exportCSV } from '../export'
import type { NginxLog } from '../types'

// ---------------------------------------------------------------------------
// DOM stubs — exportCSV uses Blob, URL.createObjectURL, and document in Node
// ---------------------------------------------------------------------------

let capturedBlobContent: string
let mockAnchor: { href: string; download: string; click: ReturnType<typeof vi.fn> }

beforeEach(() => {
    capturedBlobContent = ''
    mockAnchor = { href: '', download: '', click: vi.fn() }

    vi.stubGlobal('Blob', class MockBlob {
        constructor(parts: string[]) {
            capturedBlobContent = parts.join('')
        }
    })
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock') })
    vi.stubGlobal('document', { createElement: vi.fn(() => mockAnchor) })
    vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLog(overrides: Partial<NginxLog> = {}): NginxLog {
    return {
        ipAddress: '1.2.3.4',
        timestamp: new Date('2024-06-15T09:30:00.000Z'),
        method: 'GET',
        path: '/api/users',
        httpVersion: 'HTTP/1.1',
        status: 200,
        responseSize: 512,
        referrer: 'https://example.com',
        userAgent: 'Mozilla/5.0',
        ...overrides,
    }
}

function csvRows(): string[] {
    return capturedBlobContent.split('\n')
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('exportCSV', () => {
    it('writes the correct header row', () => {
        exportCSV([])
        expect(csvRows()[0]).toBe(
            'timestamp,path,method,status,ipAddress,userAgent,responseSize,httpVersion,referrer'
        )
    })

    it('produces only a header row when logs are empty', () => {
        exportCSV([])
        expect(csvRows()).toHaveLength(1)
    })

    it('serialises a full log entry into the correct columns', () => {
        exportCSV([makeLog()])
        const fields = csvRows()[1].split(',')
        expect(fields[0]).toBe('2024-06-15T09:30:00.000Z') // timestamp
        expect(fields[1]).toBe('/api/users')                // path
        expect(fields[2]).toBe('GET')                       // method
        expect(fields[3]).toBe('200')                       // status
        expect(fields[4]).toBe('1.2.3.4')                   // ipAddress
        expect(fields[5]).toBe('Mozilla/5.0')               // userAgent
        expect(fields[6]).toBe('512')                       // responseSize
        expect(fields[7]).toBe('HTTP/1.1')                  // httpVersion
        expect(fields[8]).toBe('https://example.com')       // referrer
    })

    it('outputs an empty string for a null timestamp', () => {
        exportCSV([makeLog({ timestamp: null })])
        expect(csvRows()[1].split(',')[0]).toBe('')
    })

    it('outputs an empty string for a null status', () => {
        exportCSV([makeLog({ status: null })])
        expect(csvRows()[1].split(',')[3]).toBe('')
    })

    it('outputs an empty string for a null responseSize', () => {
        exportCSV([makeLog({ responseSize: null })])
        expect(csvRows()[1].split(',')[6]).toBe('')
    })

    it('creates one data row per log entry', () => {
        exportCSV([makeLog(), makeLog({ path: '/other' }), makeLog({ path: '/third' })])
        expect(csvRows()).toHaveLength(4) // header + 3 data rows
    })

    it('triggers a download by clicking the anchor element', () => {
        exportCSV([])
        expect(mockAnchor.click).toHaveBeenCalledOnce()
    })

    it('sets a filename matching the nginx-analytics-*.csv pattern', () => {
        exportCSV([])
        expect(mockAnchor.download).toMatch(/^nginx-analytics-.+\.csv$/)
    })
})
