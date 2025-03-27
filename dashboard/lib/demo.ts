import { Location } from "@/lib/location";

// Type for error log generator options
interface ErrorLogGeneratorOptions {
    count: number;
    startDate?: Date;
    endDate?: Date;
    ipRange?: string[];
    errorLevels?: string[];
    errorTypes?: string[];
}

/**
 * Generates realistic Nginx error log entries
 * @param options Configuration options for error log generation
 * @returns Array of error log entries as strings
 */
export function generateNginxErrorLogs(options: ErrorLogGeneratorOptions): string[] {
    const {
        count = 100,
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Default to past week
        endDate = new Date(),
        ipRange = [],
        errorLevels = ['error', 'warn', 'crit', 'alert', 'emerg'],
        errorTypes = [
            // Server configuration errors
            'server configuration error',
            'invalid configuration directive',
            'failed to load module',
            'permission denied',
            'address already in use',

            // Request processing errors
            'client request parsing error',
            'upstream server connection failed',
            'invalid request method',
            'request timeout',
            'client closed connection',

            // File and resource errors
            'file not found',
            'permission denied for file',
            'insufficient system resources',
            'failed to open file',
            'read/write error',

            // SSL/TLS errors
            'SSL certificate verification failed',
            'SSL handshake failed',
            'invalid SSL certificate',
            'SSL protocol error',

            // Security-related errors
            'blocked request',
            'suspicious request pattern detected',
            'potential security violation',

            // Performance and resource errors
            'worker process exited with code',
            'too many open files',
            'connection limit exceeded',
            'worker process reload failed'
        ]
    } = options;

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

    // Create IP pool similar to the standard log generator
    const ipPool: string[] = [];
    const ipPoolSize = Math.min(count / 3, 15);
    
    for (let i = 0; i < ipPoolSize; i++) {
        if (ipRange.length > 0 && Math.random() < 0.9) {
            ipPool.push(ipRange[Math.floor(Math.random() * ipRange.length)]);
        } else {
            ipPool.push(`${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`);
        }
    }

    // Weighted distribution for error levels
    const errorLevelWeights = [40, 30, 15, 10, 5]; // More common to have lower severity errors

    // Weighted distribution for error types
    const errorTypeWeights = new Array(errorTypes.length).fill(1).map((_, index) => {
        // Some error types are more likely to occur
        if (['client request parsing error', 'upstream server connection failed', 'blocked request', 'file not found'].includes(errorTypes[index])) {
            return 5; // More common
        }
        return 1; // Less common
    });

    // Helper functions
    const getRandomIP = (): string => {
        if (ipPool.length > 0 && Math.random() < 0.9) {
            return ipPool[Math.floor(Math.random() * ipPool.length)];
        }
        return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
    };

    // const getRandomTimestamp = (): string => {
    //     const timestampMs = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime());
    //     const date = new Date(timestampMs);

    //     const day = date.getDate().toString().padStart(2, '0');
    //     const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];
    //     const year = date.getFullYear();
    //     const hours = date.getHours().toString().padStart(2, '0');
    //     const minutes = date.getMinutes().toString().padStart(2, '0');
    //     const seconds = date.getSeconds().toString().padStart(2, '0');

    //     const formatted = `[${day}/${month}/${year}:${hours}:${minutes}:${seconds} ${offsetSign}${offsetHours}${offsetMinutes}]`;
    //     return `${day}/${month}/${year}:${hours}:${minutes}:${seconds}`;
    // };
    const getRandomTimestamp = ():string  => {
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

        return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
    };

    const getRandomPid = (): number => {
        // Generate a realistic process ID
        return Math.floor(Math.random() * 32768) + 1;
    };

    const getRandomContext = (): string => {
        const contexts = [
            'nginx/1.22.1',
            'php-fpm/7.4',
            'node/14.17.0',
            'proxy_module',
            'fastcgi_module',
            'ssl_module',
            'http_core_module'
        ];
        return contexts[Math.floor(Math.random() * contexts.length)];
    };

    // Generate error logs
    const errorLogs: string[] = [];

    for (let i = 0; i < count; i++) {
        const ip = getRandomIP();
        const timestamp = getRandomTimestamp();
        const errorLevel = weightedRandom(errorLevels, errorLevelWeights);
        const errorType = weightedRandom(errorTypes, errorTypeWeights);
        const pid = getRandomPid();
        const context = getRandomContext();

        // Add some randomized additional details for more realism
        const additionalDetails = [
            `client: ${ip}`,
            `server: example.com`,
            `request: ${Math.random() < 0.5 ? 'GET /some/path HTTP/1.1' : '-'}`,
            `upstream: ${Math.random() < 0.3 ? 'backend_server' : '-'}`
        ];

        const errorMessage = `${timestamp} [${errorLevel}] ${pid}#0: *${i} ${errorType}, ${additionalDetails.join(', ')}, ${context}`;
        errorLogs.push(errorMessage);
    }

    return errorLogs;
}


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

export function generateDemoLocations(ipAddresses: string[]): Location[] {
    const locations: Location[] = ipAddresses.map((ip) => randomLocation(ip));

    return locations;
}

const locations = [['US', 'San Francisco'], ['US', 'New York'], ['US', 'Los Angeles'], ['US', 'Chicago'], ['US', 'Houston'], ['US', 'Miami'], ['US', 'Seattle'], ['US', 'Washington'], ['US', 'Boston'], ['US', 'San Diego'], ['GB', 'London'], ['FR', 'Paris'], ['DE', 'Berlin'], ['IT', 'Rome'], ['ES', 'Madrid'], ['NL', 'Amsterdam'], ['CA', 'Toronto'], ['AU', 'Sydney'], ['JP', 'Tokyo'], ['CN', 'Beijing'], ['IN', 'Mumbai'], ['BR', 'Sao Paulo'], ['ZA', 'Johannesburg'], ['MX', 'Mexico City'], ['AR', 'Buenos Aires'], ['CO', 'Bogota'], ['VE', 'Caracas'], ['PE', 'Lima'], ['CL', 'Santiago'], ['BO', 'La Paz'], ['UY', 'Montevideo'], ['PY', 'Asuncion'], ['EC', 'Quito'], ['VE', 'Maracaibo'], ['VE', 'Valencia'], ['VE', 'Maracaibo'], ['VE', 'Valencia'], ['VE', 'Maracaibo'], ['VE', 'Valencia']];

function randomLocation(ipAddress: string): Location {
    const index = Math.floor(Math.random() * locations.length);
    const country = locations[index][0];
    const city = locations[index][1];

    return {
        country,
        city,
        ipAddress
    };
}


/**
 * Generates realistic Nginx log entries
 * @param options Configuration options for log generation
 * @returns Array of log entries as strings
 */
export function generateNginxLogs(options: LogGeneratorOptions): string[] {
    const {
        format = 'common',
        count = 100,
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Default to past week
        endDate = new Date(),
        ipRange = [],
        statusCodes = [200, 201, 204, 301, 302, 304, 400, 401, 403, 404, 500, 502, 503],
        paths = [
            // Standard paths
            '/',
            '/index.html',
            '/about',
            '/contact',
            '/blog',
            '/blog/post-1',
            '/products',
            '/products/category',
            '/login',
            '/logout',
            '/assets/main.css',
            '/assets/main.js',
            '/favicon.ico',

            // API v1 endpoints
            '/api/v1/users',
            '/api/v1/users/profile',
            '/api/v1/products',
            '/api/v1/products/categories',
            '/api/v1/orders',
            '/api/v1/orders/history',
            '/api/v1/authentication',
            '/api/v1/search',

            // API v2 endpoints
            '/api/v2/users',
            '/api/v2/users/extended-profile',
            '/api/v2/products',
            '/api/v2/products/inventory',
            '/api/v2/orders',
            '/api/v2/orders/analytics',
            '/api/v2/authentication/refresh',
            '/api/v2/metrics',

            // Additional versioned endpoints
            '/api/v3/users/preferences',
            '/api/v1/health',
            '/api/v2/status',
            '/api/v1/system/config'
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
    const ipPoolSize = Math.min(count / 3, 15); // Adjust based on log volume
    
    for (let i = 0; i < ipPoolSize; i++) {
        if (ipRange.length > 0 && Math.random() < 0.9) {
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
        if (ipPool.length > 0 && Math.random() < 0.9) {
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