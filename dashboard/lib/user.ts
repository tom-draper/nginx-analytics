
const delimiter = '::'

export function getUserId(ipAddress: string, userAgent: string) {
    return `${ipAddress}${delimiter}${userAgent}`
}