import { describe, it, expect } from 'vitest'
import {
    successStatus,
    redirectStatus,
    clientErrorStatus,
    serverErrorStatus,
    errorStatus,
} from '../status'

describe('successStatus', () => {
    it('returns true for 200', () => expect(successStatus(200)).toBe(true))
    it('returns true for 201', () => expect(successStatus(201)).toBe(true))
    it('returns true for 299', () => expect(successStatus(299)).toBe(true))
    it('returns false for 199', () => expect(successStatus(199)).toBe(false))
    it('returns false for 300', () => expect(successStatus(300)).toBe(false))
})

describe('redirectStatus', () => {
    it('returns true for 301', () => expect(redirectStatus(301)).toBe(true))
    it('returns true for 302', () => expect(redirectStatus(302)).toBe(true))
    it('returns true for 399', () => expect(redirectStatus(399)).toBe(true))
    it('returns false for 299', () => expect(redirectStatus(299)).toBe(false))
    it('returns false for 400', () => expect(redirectStatus(400)).toBe(false))
})

describe('clientErrorStatus', () => {
    it('returns true for 400', () => expect(clientErrorStatus(400)).toBe(true))
    it('returns true for 404', () => expect(clientErrorStatus(404)).toBe(true))
    it('returns true for 499', () => expect(clientErrorStatus(499)).toBe(true))
    it('returns false for 399', () => expect(clientErrorStatus(399)).toBe(false))
    it('returns false for 500', () => expect(clientErrorStatus(500)).toBe(false))
})

describe('serverErrorStatus', () => {
    it('returns true for 500', () => expect(serverErrorStatus(500)).toBe(true))
    it('returns true for 503', () => expect(serverErrorStatus(503)).toBe(true))
    it('returns true for 599', () => expect(serverErrorStatus(599)).toBe(true))
    it('returns false for 499', () => expect(serverErrorStatus(499)).toBe(false))
    it('returns false for 600', () => expect(serverErrorStatus(600)).toBe(false))
})

describe('errorStatus', () => {
    it('returns true for a client error (404)', () => expect(errorStatus(404)).toBe(true))
    it('returns true for a server error (500)', () => expect(errorStatus(500)).toBe(true))
    it('returns false for a success status (200)', () => expect(errorStatus(200)).toBe(false))
    it('returns false for a redirect (301)', () => expect(errorStatus(301)).toBe(false))
    it('covers boundary: 400 is an error', () => expect(errorStatus(400)).toBe(true))
    it('covers boundary: 599 is an error', () => expect(errorStatus(599)).toBe(true))
    it('covers boundary: 399 is not an error', () => expect(errorStatus(399)).toBe(false))
    it('covers boundary: 600 is not an error', () => expect(errorStatus(600)).toBe(false))
})
