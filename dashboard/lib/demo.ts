/**
 * Generates realistic Nginx log entries in either Common Log Format or Extended Log Format
 */

// Type for configuration options
interface LogGeneratorOptions {
    format: 'common' | 'extended';
    count: number;
    startDate?: Date;
    endDate?: Date;
    ipRange?: string[];
    statusCodes?: number[];
    paths?: string[];
    userAgents?: string[];
    referers?: string[];
}

/**
 * Generates realistic Nginx log entries
 * @param options Configuration options for log generation
 * @returns Array of log entries as strings
 */
function generateNginxLogs(options: LogGeneratorOptions): string[] {
    const {
        format = 'common',
        count = 100,
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Default to past week
        endDate = new Date(),
        ipRange = [],
        statusCodes = [200, 201, 204, 301, 302, 304, 400, 401, 403, 404, 500, 502, 503],
        paths = [
            '/',
            '/index.html',
            '/about',
            '/contact',
            '/api/users',
            '/api/products',
            '/login',
            '/logout',
            '/assets/main.css',
            '/assets/main.js',
            '/blog',
            '/blog/post-1',
            '/products',
            '/products/category',
            '/favicon.ico'
        ],
        userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
            'Googlebot/2.1 (+http://www.google.com/bot.html)',
            'Bingbot/2.0 (+http://www.bing.com/bingbot.htm)',
            'Twitterbot/1.0',
            'python-requests/2.31.0'
        ],
        referers = [
            '-',
            'https://www.google.com/',
            'https://www.bing.com/',
            'https://www.facebook.com/',
            'https://www.twitter.com/',
            'https://www.linkedin.com/',
            'https://www.reddit.com/',
            'https://www.example.com/'
        ]
    } = options;

    // Helper functions
    const getRandomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    const getRandomIP = (): string => {
        if (ipRange.length > 0) {
            return getRandomElement(ipRange);
        }
        return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
    };

    const getRandomTimestamp = (): { date: Date, formatted: string } => {
        const timestampMs = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime());
        const date = new Date(timestampMs);

        // Format: [day/month/year:hour:minute:second +offset]
        const day = date.getDate().toString().padStart(2, '0');
        const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');

        // Calculate timezone offset
        const offset = date.getTimezoneOffset();
        const offsetHours = Math.abs(Math.floor(offset / 60)).toString().padStart(2, '0');
        const offsetMinutes = Math.abs(offset % 60).toString().padStart(2, '0');
        const offsetSign = offset <= 0 ? '+' : '-';

        const formatted = `[${day}/${month}/${year}:${hours}:${minutes}:${seconds} ${offsetSign}${offsetHours}${offsetMinutes}]`;
        return { date, formatted };
    };

    const getRandomMethod = (): string => {
        const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
        const weights = [70, 15, 5, 5, 3, 1, 1]; // Weights to make distribution more realistic

        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;

        for (let i = 0; i < weights.length; i++) {
            if (random < weights[i]) {
                return methods[i];
            }
            random -= weights[i];
        }

        return 'GET'; // Default fallback
    };

    const getRandomPath = (): string => {
        return getRandomElement(paths);
    };

    const getRandomBytes = (): string => {
        // Most responses are between 1KB and 1MB
        if (Math.random() < 0.1) {
            return '-'; // Some requests don't have a response size
        }
        return Math.floor(Math.random() * 1000000 + 200).toString();
    };

    const getRandomStatusCode = (): number => {
        return getRandomElement(statusCodes);
    };

    const getRandomUserAgent = (): string => {
        return getRandomElement(userAgents);
    };

    const getRandomReferer = (): string => {
        return getRandomElement(referers);
    };

    // Generate logs
    const logs: string[] = [];

    for (let i = 0; i < count; i++) {
        const ip = getRandomIP();
        const { formatted: timestamp } = getRandomTimestamp();
        const method = getRandomMethod();
        const path = getRandomPath();
        const httpVersion = Math.random() < 0.2 ? 'HTTP/1.0' : 'HTTP/1.1';
        const statusCode = getRandomStatusCode();
        const bytes = getRandomBytes();
        const referer = getRandomReferer();
        const userAgent = getRandomUserAgent();

        // Common Log Format: %h %l %u %t \"%r\" %>s %b
        // where %h=remote_addr, %l=remote_log_name, %u=remote_user, %t=time, %r=request, %>s=status, %b=bytes_sent
        const commonFormatLog = `${ip} - - ${timestamp} "${method} ${path} ${httpVersion}" ${statusCode} ${bytes}`;

        if (format === 'common') {
            logs.push(commonFormatLog);
        } else {
            // Extended Log Format: Common Log Format + \"%{Referer}i\" \"%{User-agent}i\"
            const extendedFormatLog = `${commonFormatLog} "${referer}" "${userAgent}"`;
            logs.push(extendedFormatLog);
        }
    }

    return logs;
}

// Example usage
const exampleOptions: LogGeneratorOptions = {
    format: 'extended',
    count: 5,
    startDate: new Date('2025-03-10T00:00:00Z'),
    endDate: new Date('2025-03-14T23:59:59Z')
};

// Generate and print example logs
const exampleLogs = generateNginxLogs(exampleOptions);
console.log(exampleLogs.join('\n'));

// Export the function
export default generateNginxLogs;