import { describe, it, expect } from 'vitest'
import { maintainCandidates, type Candidate } from '../candidates'

const makeCandidate = (name: string, matches: number): Candidate => ({
    name,
    regex: /./,
    matches,
})

describe('maintainCandidates', () => {
    it('does not move element when it equals the predecessor', () => {
        const candidates = [makeCandidate('a', 5), makeCandidate('b', 5)]
        maintainCandidates(1, candidates)
        expect(candidates[0].name).toBe('a')
        expect(candidates[1].name).toBe('b')
    })

    it('swaps element with predecessor when greater', () => {
        const candidates = [makeCandidate('a', 3), makeCandidate('b', 5)]
        maintainCandidates(1, candidates)
        expect(candidates[0].name).toBe('b')
        expect(candidates[1].name).toBe('a')
    })

    it('moves element to the front when it becomes the highest', () => {
        const candidates = [
            makeCandidate('a', 5),
            makeCandidate('b', 5),
            makeCandidate('c', 6),
        ]
        maintainCandidates(2, candidates)
        expect(candidates[0].name).toBe('c')
    })

    it('moves element to correct middle position, not past ties', () => {
        // [6, 5, 3, 5] — index 3 (value 5) should move before index 2 (value 3)
        // but not past index 1 (value 5, not strictly less)
        const candidates = [
            makeCandidate('a', 6),
            makeCandidate('b', 5),
            makeCandidate('c', 3),
            makeCandidate('d', 5),
        ]
        maintainCandidates(3, candidates)
        expect(candidates[0].name).toBe('a')
        expect(candidates[1].name).toBe('b')
        expect(candidates[2].name).toBe('d')
        expect(candidates[3].name).toBe('c')
    })

    it('does nothing when element is already at index 0', () => {
        const candidates = [makeCandidate('a', 10), makeCandidate('b', 3)]
        maintainCandidates(0, candidates)
        expect(candidates[0].name).toBe('a')
        expect(candidates[1].name).toBe('b')
    })

    it('handles a single-element array without error', () => {
        const candidates = [makeCandidate('a', 1)]
        expect(() => maintainCandidates(0, candidates)).not.toThrow()
        expect(candidates[0].name).toBe('a')
    })

    it('preserves the matches value on the moved element', () => {
        const candidates = [makeCandidate('a', 2), makeCandidate('b', 7)]
        maintainCandidates(1, candidates)
        expect(candidates[0].matches).toBe(7)
        expect(candidates[1].matches).toBe(2)
    })
})
