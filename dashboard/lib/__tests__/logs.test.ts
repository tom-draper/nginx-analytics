import fs from 'fs'
import os from 'os'
import path from 'path'
import zlib from 'zlib'
import { describe, it, expect } from 'vitest'
import {
    filterLogFiles,
    initializeFilePositions,
    combineLogResults,
    parsePositionsFromRequest,
    readLogFile,
    serveDirectoryLogs,
    type FilePosition,
    type LogResult,
} from '../logs'

function logData(result: Awaited<ReturnType<typeof serveDirectoryLogs>>): { logs: string[]; positions: FilePosition[] } {
    if (result.status !== 200 || !result.data || !('logs' in result.data) || !('positions' in result.data)) {
        throw new Error('Expected a successful directory log response')
    }
    return result.data as { logs: string[]; positions: FilePosition[] }
}

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

    it('returns access and rotated .log files when isErrorLog=false, includeGzip=false', () => {
        const result = filterLogFiles(files, false, false)
        expect(result).toEqual(['access.log', 'access.log.1'])
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

    it('uses an existing position for a rotated uncompressed log file', () => {
        const positions: FilePosition[] = [{ filename: 'access.log.1', position: 1024 }]
        const result = initializeFilePositions(['access.log.1'], positions)
        expect(result).toEqual([{ filename: 'access.log.1', position: 1024 }])
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

    it('tracks positions for rotated uncompressed log files', () => {
        const filePositions: FilePosition[] = [{ filename: 'access.log.1', position: 0 }]
        const logsResult: LogResult[] = [{ logs: ['a'], positions: [{ position: 200 }] }]
        const { newPositions } = combineLogResults(logsResult, filePositions)
        expect(newPositions).toEqual([{ filename: 'access.log.1', position: 200 }])
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

    it('returns an empty array when JSON is not an array', () => {
        const params = new URLSearchParams({ positions: JSON.stringify({ position: 10 }) })
        expect(parsePositionsFromRequest(params)).toEqual([])
    })

    it('filters invalid positions while preserving valid entries', () => {
        const valid: FilePosition = { filename: 'access.log', position: 10, fileId: '1:2' }
        const params = new URLSearchParams({
            positions: JSON.stringify([
                valid,
                { filename: 'access.log', position: -1 },
                { filename: 'access.log', position: 1.5 },
                { filename: 123, position: 10 },
                null,
            ])
        })
        expect(parsePositionsFromRequest(params)).toEqual([valid])
    })
})

describe('readLogFile', () => {
    it('restarts at the beginning when a log was truncated', async () => {
        const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'nginx-analytics-'))
        const filePath = path.join(dir, 'access.log')
        await fs.promises.writeFile(filePath, 'new entry\n')

        try {
            const result = await readLogFile(filePath, 'previous entry that was longer\n'.length)
            expect(result.logs).toEqual(['new entry'])
            expect(result.positions).toEqual([{ position: 'new entry\n'.length }])
        } finally {
            await fs.promises.rm(dir, { recursive: true, force: true })
        }
    })

    it('defers an incomplete trailing line until it is terminated', async () => {
        const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'nginx-analytics-'))
        const filePath = path.join(dir, 'access.log')
        await fs.promises.writeFile(filePath, 'complete\npartial')

        try {
            const result = await readLogFile(filePath, 0)
            expect(result.logs).toEqual(['complete'])
            expect(result.positions).toEqual([{ position: 'complete\n'.length }])
        } finally {
            await fs.promises.rm(dir, { recursive: true, force: true })
        }
    })

    it('keeps byte-accurate positions for incomplete UTF-8 lines', async () => {
        const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'nginx-analytics-'))
        const filePath = path.join(dir, 'access.log')
        const completeLine = 'complete\n'
        const partialLine = 'café'
        await fs.promises.writeFile(filePath, `${completeLine}${partialLine}`)

        try {
            const firstRead = await readLogFile(filePath, 0)
            const position = Buffer.byteLength(completeLine, 'utf8')
            expect(firstRead.logs).toEqual(['complete'])
            expect(firstRead.positions).toEqual([{ position }])

            await fs.promises.appendFile(filePath, '\n')
            const secondRead = await readLogFile(filePath, position)
            expect(secondRead.logs).toEqual([partialLine])
        } finally {
            await fs.promises.rm(dir, { recursive: true, force: true })
        }
    })
})

describe('directory log ingestion lifecycle', () => {
    it('does not reread entries after the active log is renamed during rotation', async () => {
        const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'nginx-analytics-'))
        const activeLog = path.join(dir, 'access.log')
        await fs.promises.writeFile(activeLog, 'already read\n')

        try {
            const initial = logData(await serveDirectoryLogs(dir, [], false, false))
            expect(initial.logs).toEqual(['already read'])
            expect(initial.positions[0].fileId).toBeTruthy()

            await fs.promises.rename(activeLog, path.join(dir, 'access.log.1'))
            await fs.promises.writeFile(activeLog, 'new entry\n')

            const afterRotation = logData(await serveDirectoryLogs(dir, initial.positions, false, false))
            expect(afterRotation.logs).toEqual(['new entry'])
            expect(afterRotation.positions.map(position => position.filename)).toEqual(['access.log', 'access.log.1'])
        } finally {
            await fs.promises.rm(dir, { recursive: true, force: true })
        }
    })

    it('reads archives, polls additions, recovers from truncation, and preserves UTF-8 positions', async () => {
        const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'nginx-analytics-'))
        const activeLog = path.join(dir, 'access.log')
        await fs.promises.writeFile(activeLog, 'active entry\n')
        await fs.promises.writeFile(path.join(dir, 'access.log.1'), 'rotated entry\n')
        await fs.promises.writeFile(
            path.join(dir, 'access.log.2.gz'),
            zlib.gzipSync('archived entry\n')
        )

        try {
            const initial = await serveDirectoryLogs(dir, [], false, true)
            expect(initial.status).toBe(200)
            const initialData = logData(initial)
            expect(initialData.logs).toEqual(['active entry', 'rotated entry', 'archived entry'])
            expect(initialData.positions).toMatchObject([
                { filename: 'access.log', position: Buffer.byteLength('active entry\n') },
                { filename: 'access.log.1', position: Buffer.byteLength('rotated entry\n') },
            ])

            await fs.promises.appendFile(activeLog, 'next entry\n')
            const incremental = await serveDirectoryLogs(dir, initialData.positions, false, false)
            expect(incremental.status).toBe(200)
            const incrementalData = logData(incremental)
            expect(incrementalData.logs).toEqual(['next entry'])

            await fs.promises.writeFile(activeLog, 'fresh entry\n')
            const afterTruncation = await serveDirectoryLogs(dir, incrementalData.positions, false, false)
            expect(afterTruncation.status).toBe(200)
            const afterTruncationData = logData(afterTruncation)
            expect(afterTruncationData.logs).toEqual(['fresh entry'])

            await fs.promises.appendFile(activeLog, 'café')
            const partial = await serveDirectoryLogs(dir, afterTruncationData.positions, false, false)
            expect(partial.status).toBe(200)
            const partialData = logData(partial)
            expect(partialData.logs).toEqual([])

            await fs.promises.appendFile(activeLog, '\n')
            const completed = await serveDirectoryLogs(dir, partialData.positions, false, false)
            expect(completed.status).toBe(200)
            expect(logData(completed).logs).toEqual(['café'])
        } finally {
            await fs.promises.rm(dir, { recursive: true, force: true })
        }
    })
})
