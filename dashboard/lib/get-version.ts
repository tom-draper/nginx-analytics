export function getVersion(endpoint: string): string | null {
    if (!endpoint) {
        return null;
    }
    const match = endpoint.match(/\/(v\d+)\//);
    if (!match) {
        return null;
    }
    return match[1];
}
