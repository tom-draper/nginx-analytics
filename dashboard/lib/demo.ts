/**
 * Generates realistic Nginx log entries in either Common Log Format or Extended Log Format
 * with improved distribution patterns and more realistic data
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

    // Add more referrers for increased variety
    const expandedReferers = [
        ...referers,
        'https://duckduckgo.com/',
        'https://www.instagram.com/',
        'https://www.pinterest.com/',
        'https://news.ycombinator.com/',
        'https://www.producthunt.com/',
        'https://github.com/',
        'https://stackoverflow.com/',
        'https://www.youtube.com/',
        'https://medium.com/',
        'https://www.baidu.com/',
        'https://www.yandex.ru/',
        'https://t.co/', // Twitter shortened URLs
        'https://lnkd.in/', // LinkedIn shortened URLs
        'https://www.naver.com/',
        'https://mail.google.com/',
        'https://outlook.live.com/',
        'https://www.yahoo.com/',
        'https://www.aliexpress.com/',
        'https://www.alibaba.com/',
        'https://www.tiktok.com/'
    ];

    // Generate a pool of IPs to allow for repeating patterns
    // This creates more realistic logs where the same users return
    const ipPool: string[] = [];
    const ipPoolSize = Math.min(count / 3, 20); // Adjust based on log volume
    
    for (let i = 0; i < ipPoolSize; i++) {
        if (ipRange.length > 0 && Math.random() < 0.99) {
            // 70% chance to use provided IP range
            ipPool.push(ipRange[Math.floor(Math.random() * ipRange.length)]);
        } else {
            // Generate a random IP
            ipPool.push(`${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`);
        }
    }

    // Helper for weighted random selection
    const weightedRandom = <T>(items: T[], weights: number[]): T => {
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < weights.length; i++) {
            if (random < weights[i]) {
                return items[i];
            }
            random -= weights[i];
        }
        
        return items[0]; // Default fallback
    };

    // Create zipf-like distribution weights for paths and referers
    // This creates more realistic logs where some pages are much more popular than others
    const createZipfWeights = (size: number): number[] => {
        const weights: number[] = [];
        for (let i = 1; i <= size; i++) {
            // Use a modified zipf distribution: 1/i^0.8 (less steep than classic zipf)
            weights.push(1 / Math.pow(i, 0.8));
        }
        return weights;
    };

    const pathWeights = createZipfWeights(paths.length);
    const refererWeights = createZipfWeights(expandedReferers.length);
    
    // Adjust referer weights to make "-" (direct traffic) more common
    if (expandedReferers[0] === '-') {
        refererWeights[0] *= 2;
    }

    // Methods with realistic distribution
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
    const methodWeights = [70, 15, 5, 5, 3, 1, 1];

    // Status code distribution - make 200s more common
    const statusCodeWeights = statusCodes.map(code => {
        if (code >= 200 && code < 300) return 80;  // Success codes
        if (code >= 300 && code < 400) return 10;  // Redirect codes
        if (code >= 400 && code < 500) return 8;   // Client errors
        return 2;                                  // Server errors
    });

    // Helper functions
    const getRandomIP = (): string => {
        // 70% chance to reuse an IP from the pool, 30% to generate a new one
        if (ipPool.length > 0 && Math.random() < 0.99) {
            return ipPool[Math.floor(Math.random() * ipPool.length)];
        }
        return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
    };

    const getRandomTimestamp = (): { date: Date, formatted: string } => {
        // Simple random timestamp between start and end dates
        const timestampMs = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime());
        const date = new Date(timestampMs);

        // Format: [day/month/year:hour:minute:second +offset]
        const day = date.getDate().toString().padStart(2, '0');
        const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        const milliseconds = date.getMilliseconds(); // Store milliseconds for precision

        // Calculate timezone offset
        const offset = date.getTimezoneOffset();
        const offsetHours = Math.abs(Math.floor(offset / 60)).toString().padStart(2, '0');
        const offsetMinutes = Math.abs(offset % 60).toString().padStart(2, '0');
        const offsetSign = offset <= 0 ? '+' : '-';

        const formatted = `[${day}/${month}/${year}:${hours}:${minutes}:${seconds} ${offsetSign}${offsetHours}${offsetMinutes}]`;
        return { date, formatted };
    };

    const getRandomMethod = (): string => {
        return weightedRandom(methods, methodWeights);
    };

    const getRandomPath = (): string => {
        return weightedRandom(paths, pathWeights);
    };

    const getRandomBytes = (): string => {
        // More realistic byte distribution
        if (Math.random() < 0.08) {
            return '-'; // 8% of requests don't have a response size
        }
        
        // Create different size categories
        if (Math.random() < 0.3) {
            // Small responses (e.g., API responses, small HTML)
            return Math.floor(Math.random() * 10000 + 100).toString();
        } else if (Math.random() < 0.8) {
            // Medium responses (e.g., typical web pages)
            return Math.floor(Math.random() * 100000 + 10000).toString();
        } else {
            // Large responses (e.g., images, downloads)
            return Math.floor(Math.random() * 5000000 + 100000).toString();
        }
    };

    const getRandomStatusCode = (): number => {
        return weightedRandom(statusCodes, statusCodeWeights);
    };

    const getRandomUserAgent = (): string => {
        return userAgents[Math.floor(Math.random() * userAgents.length)];
    };

    const getRandomReferer = (): string => {
        return weightedRandom(expandedReferers, refererWeights);
    };

    // Generate logs
    const logs: string[] = [];

    for (let i = 0; i < count; i++) {
        const ip = getRandomIP();
        const { date, formatted: timestamp } = getRandomTimestamp();
        const method = getRandomMethod();
        const path = getRandomPath();
        const httpVersion = Math.random() < 0.15 ? 'HTTP/1.0' : 'HTTP/1.1'; // Reduced HTTP/1.0 to 15%
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

export default generateNginxLogs;