import { describe, it, expect } from 'vitest'
import {
    filterLogFiles,
    initializeFilePositions,
    combineLogResults,
    parsePositionsFromRequest,
    type FilePosition,
    type LogResult,
} from '../logs'

// ---------------------------------------------------------------------------
// filterLogFiles
// ---------------------------------------------------------------------------

describe('filterLogFiles', () => {
    const files = [
        'access.log',
        'error.log',
        'access.log.1',
        'error.log.gz',
        'access.log.gz',
        'other.txt',
    ]

    it('returns access .log files when isErrorLog=false, includeGzip=false', () => {
        const result = filterLogFiles(files, false, false)
        expect(result).toEqual(['access.log'])
    })

    it('returns error .log files when isErrorLog=true, includeGzip=false', () => {
        const result = filterLogFiles(files, true, false)
        expect(result).toEqual(['error.log'])
    })

    it('includes .gz access files when isErrorLog=false, includeGzip=true', () => {
        const result = filterLogFiles(files, false, true)
        expect(result).toContain('access.log')
        expect(result).toContain('access.log.gz')
        expect(result).not.toContain('error.log.gz')
    })

    it('includes .gz error files when isErrorLog=true, includeGzip=true', () => {
        const result = filterLogFiles(files, true, true)
        expect(result).toContain('error.log')
        expect(result).toContain('error.log.gz')
        expect(result).not.toContain('access.log.gz')
    })

    it('excludes non-.log/.gz files', () => {
        const result = filterLogFiles(files, false, true)
        expect(result).not.toContain('other.txt')
    })

    it('returns sorted results', () => {
        const unsorted = ['b.log', 'a.log', 'c.log']
        const result = filterLogFiles(unsorted, false, false)
        expect(result).toEqual(['a.log', 'b.log', 'c.log'])
    })

    it('returns empty array when no files match', () => {
        expect(filterLogFiles(['other.txt'], false, false)).toEqual([])
    })
})

// ---------------------------------------------------------------------------
// initializeFilePositions
// ---------------------------------------------------------------------------

describe('initializeFilePositions', () => {
    it('uses existing position for a .log file', () => {
        const positions: FilePosition[] = [{ filename: 'access.log', position: 1024 }]
        const result = initializeFilePositions(['access.log'], positions)
        expect(result).toEqual([{ filename: 'access.log', position: 1024 }])
    })

    it('defaults to position 0 for a .log file with no existing position', () => {
        const result = initializeFilePositions(['access.log'], [])
        expect(result).toEqual([{ filename: 'access.log', position: 0 }])
    })

    it('always uses position 0 for .gz files regardless of existing positions', () => {
        const positions: FilePosition[] = [{ filename: 'access.log.gz', position: 999 }]
        const result = initializeFilePositions(['access.log.gz'], positions)
        expect(result).toEqual([{ filename: 'access.log.gz', position: 0 }])
    })

    it('handles a mix of .log and .gz files', () => {
        const positions: FilePosition[] = [{ filename: 'access.log', position: 512 }]
        const result = initializeFilePositions(['access.log', 'archive.log.gz'], positions)
        expect(result[0]).toEqual({ filename: 'access.log', position: 512 })
        expect(result[1]).toEqual({ filename: 'archive.log.gz', position: 0 })
    })

    it('returns an empty array for an empty file list', () => {
        expect(initializeFilePositions([], [])).toEqual([])
    })
})

// ---------------------------------------------------------------------------
// combineLogResults
// ---------------------------------------------------------------------------

describe('combineLogResults', () => {
    it('merges logs from multiple results', () => {
        const filePositions: FilePosition[] = [
            { filename: 'access.log', position: 0 },
            { filename: 'access2.log', position: 0 },
        ]
        const logsResult: LogResult[] = [
            { logs: ['line1', 'line2'], positions: [{ position: 100 }] },
            { logs: ['line3'], positions: [{ position: 50 }] },
        ]
        const { allLogs } = combineLogResults(logsResult, filePositions)
        expect(allLogs).toEqual(['line1', 'line2', 'line3'])
    })

    it('only tracks positions for .log files', () => {
        const filePositions: FilePosition[] = [
            { filename: 'access.log', position: 0 },
            { filename: 'archive.log.gz', position: 0 },
        ]
        const logsResult: LogResult[] = [
            { logs: ['a'], positions: [{ position: 200 }] },
            { logs: ['b'], positions: [{ position: 0 }] },
        ]
        const { newPositions } = combineLogResults(logsResult, filePositions)
        expect(newPositions).toHaveLength(1)
        expect(newPositions[0].filename).toBe('access.log')
        expect(newPositions[0].position).toBe(200)
    })

    it('falls back to filePositions position when result has no position', () => {
        const filePositions: FilePosition[] = [
            { filename: 'access.log', position: 42 },
        ]
        const logsResult: LogResult[] = [
            { logs: [], positions: [] },
        ]
        const { newPositions } = combineLogResults(logsResult, filePositions)
        expect(newPositions[0].position).toBe(42)
    })

    it('skips entries without a filename', () => {
        const filePositions: FilePosition[] = [
            { position: 0 }, // no filename
        ]
        const logsResult: LogResult[] = [
            { logs: ['x'], positions: [{ position: 10 }] },
        ]
        const { allLogs, newPositions } = combineLogResults(logsResult, filePositions)
        expect(allLogs).toHaveLength(0)
        expect(newPositions).toHaveLength(0)
    })

    it('handles empty input', () => {
        const { allLogs, newPositions } = combineLogResults([], [])
        expect(allLogs).toEqual([])
        expect(newPositions).toEqual([])
    })
})

// ---------------------------------------------------------------------------
// parsePositionsFromRequest
// ---------------------------------------------------------------------------

describe('parsePositionsFromRequest', () => {
    it('returns empty array when positions param is absent', () => {
        const params = new URLSearchParams()
        expect(parsePositionsFromRequest(params)).toEqual([])
    })

    it('parses a valid positions JSON', () => {
        const positions: FilePosition[] = [
            { filename: 'access.log', position: 1024 },
            { filename: 'error.log', position: 512 },
        ]
        const params = new URLSearchParams({
            positions: encodeURIComponent(JSON.stringify(positions))
        })
        expect(parsePositionsFromRequest(params)).toEqual(positions)
    })

    it('returns empty array for malformed JSON', () => {
        const params = new URLSearchParams({ positions: '%7Bnot-valid-json%7D' })
        expect(parsePositionsFromRequest(params)).toEqual([])
    })

    it('handles an empty positions array', () => {
        const params = new URLSearchParams({
            positions: encodeURIComponent(JSON.stringify([]))
        })
        expect(parsePositionsFromRequest(params)).toEqual([])
    })
})
