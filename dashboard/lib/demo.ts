import { Location } from "@/lib/location";
import { SystemInfo } from "./types";

/**
 * Generates a realistic system profile for demo purposes
 * @returns Initial system information profile
 */
export function generateSystemProfile(): SystemInfo {
    // CPU configuration
    const cpuModels = [
        'Intel(R) Core(TM) i7-10700K CPU @ 3.80GHz',
        'AMD Ryzen 9 5900X 12-Core Processor',
        'Intel(R) Xeon(R) CPU E5-2680 v4 @ 2.40GHz',
        'Intel(R) Core(TM) i5-9600K CPU @ 3.70GHz',
        'AMD EPYC 7402 24-Core Processor'
    ];
    const cpuCoreOptions = [4, 6, 8, 12, 16, 24, 32];

    // Create server profile
    const cpuModel = cpuModels[Math.floor(Math.random() * cpuModels.length)];
    const cores = cpuCoreOptions[Math.floor(Math.random() * cpuCoreOptions.length)];
    const speed = 2000 + Math.floor(Math.random() * 2500); // 2.0 GHz to 4.5 GHz
    const memoryTotal = Math.floor((8 + Math.random() * 120) * 1024 * 1024 * 1024); // 8GB to 128GB in bytes

    // Create disk setup
    const diskCount = 1 + Math.floor(Math.random() * 4); // 1 to 4 disks
    const disks = [];

    // Always have a root partition
    disks.push({
        filesystem: '/dev/sda1',
        size: Math.floor((100 + Math.random() * 400) * 1024 * 1024 * 1024), // 100GB to 500GB
        used: Math.floor((20 + Math.random() * 60) * 1024 * 1024 * 1024), // 20-80% usage
        mountedOn: '/'
    });

    // Add additional partitions if needed
    if (diskCount > 1) {
        const mountPoints = ['/data', '/var', '/home', '/opt', '/mnt/storage'];
        for (let i = 1; i < diskCount; i++) {
            const size = Math.floor((200 + Math.random() * 1800) * 1024 * 1024 * 1024); // 200GB to 2TB
            disks.push({
                filesystem: `/dev/sd${String.fromCharCode(97 + i)}1`,
                size: size,
                used: Math.floor(size * (0.2 + Math.random() * 0.6)), // 20-80% usage
                mountedOn: mountPoints[Math.floor(Math.random() * mountPoints.length)]
            });
        }
    }

    // Set initial uptime
    const uptimeBase = Math.floor(Math.random() * 86400 * 30); // Random start point up to 30 days

    // Initial CPU and memory usage
    const cpuUsage = 20 + Math.random() * 30; // 20-50% initial usage
    const memoryUsed = Math.floor(memoryTotal * (0.3 + Math.random() * 0.3)); // 30-60% used
    const memoryFree = Math.floor(memoryTotal * 0.1); // Some memory is always reserved by system
    const memoryAvailable = memoryTotal - memoryUsed;

    const systemInfo: SystemInfo = {
        timestamp: new Date().toISOString(),
        uptime: uptimeBase,
        cpu: {
            model: cpuModel,
            cores: cores,
            speed: speed,
            usage: parseFloat(cpuUsage.toFixed(1))
        },
        memory: {
            free: memoryFree,
            available: memoryAvailable,
            used: memoryUsed,
            total: memoryTotal
        },
        disk: disks,
    };

    return systemInfo;
}

/**
 * Updates system resource usage data while maintaining consistency with the initial system profile
 * @param currentInfo The current system information to update
 * @returns Updated system resource data
 */
export function updateSystemUsage(currentInfo: SystemInfo): SystemInfo {
    // Create a deep copy to avoid mutating the original
    const updatedInfo: SystemInfo = JSON.parse(JSON.stringify(currentInfo));
    
    // Update timestamp
    updatedInfo.timestamp = new Date().toISOString();
    
    // Update uptime (add 2 seconds since the function is called every 2s)
    updatedInfo.uptime += 2;
    
    // Get current hour to simulate day/night patterns
    const hour = new Date().getHours();
    const isBusinessHour = hour >= 8 && hour <= 18;
    
    // CPU usage pattern - adjust based on time of day
    const baselineCpuUsage = isBusinessHour ? 40 : 20;
    const cpuVariation = 15;
    
    // Create smooth transitions by limiting change amount
    const maxCpuChange = 5;
    const currentCpuUsage = updatedInfo.cpu.usage ?? 0;
    let targetCpuUsage = baselineCpuUsage + (Math.random() * 2 - 1) * cpuVariation;
    
    // Add occasional spikes
    if (Math.random() < 0.03) {
        targetCpuUsage = Math.min(95, targetCpuUsage + 25);
    }
    
    // Move current usage toward target with smoothing
    let newCpuUsage = currentCpuUsage;
    if (Math.abs(targetCpuUsage - currentCpuUsage) <= maxCpuChange) {
        newCpuUsage = targetCpuUsage;
    } else if (targetCpuUsage > currentCpuUsage) {
        newCpuUsage = currentCpuUsage + maxCpuChange * Math.random();
    } else {
        newCpuUsage = currentCpuUsage - maxCpuChange * Math.random();
    }
    
    // Ensure CPU usage is within bounds
    newCpuUsage = Math.max(0.1, Math.min(99.9, newCpuUsage));
    updatedInfo.cpu.usage = parseFloat(newCpuUsage.toFixed(1));
    
    // Memory usage - correlate somewhat with CPU but with slower changes
    const memoryTotal = updatedInfo.memory.total;
    const currentMemoryUsedPercentage = (updatedInfo.memory.used / memoryTotal) * 100;
    const memoryVariation = 2;  // Smaller variation for memory
    
    // Target memory usage changes more slowly and correlates with CPU
    let targetMemoryUsedPercentage = currentMemoryUsedPercentage + 
        (newCpuUsage > currentCpuUsage ? 1 : -1) * Math.random() * memoryVariation;
    
    // Keep memory usage in reasonable bounds
    targetMemoryUsedPercentage = Math.max(20, Math.min(90, targetMemoryUsedPercentage));
    
    // Calculate new memory values
    const newMemoryUsed = Math.floor(memoryTotal * (targetMemoryUsedPercentage / 100));
    updatedInfo.memory.used = newMemoryUsed;
    updatedInfo.memory.available = memoryTotal - newMemoryUsed;
    updatedInfo.memory.free = Math.floor(memoryTotal * 0.05 + Math.random() * 0.05 * memoryTotal);
    
    // Disk usage increases very slowly over time
    updatedInfo.disk = updatedInfo.disk.map(disk => {
        // Only increase usage about 0.01% each update (very slow growth)
        if (Math.random() < 0.2) {  // Only update sometimes to make it more realistic
            const currentUsagePercent = (disk.used / disk.size) * 100;
            // Don't let usage exceed 99%
            if (currentUsagePercent < 99) {
                const increase = disk.size * 0.0001 * Math.random();
                disk.used = Math.min(disk.size * 0.99, disk.used + increase);
            }
        }
        return disk;
    });
    
    return updatedInfo;
}

/**
 * Generates realistic system resource data for demo purposes
 * @param options Configuration options for system resource generation
 * @returns Array of system resource data points over time
 */
interface SystemResourceGeneratorOptions {
    count: number;
    startDate?: Date;
    endDate?: Date;
    cpuModels?: string[];
    cpuCoreOptions?: number[];
    serverNames?: string[];
}

export function generateSystemResources(options: SystemResourceGeneratorOptions): SystemInfo {
    const {
        count = 100,
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Default to past week
        endDate = new Date(),
        cpuModels = [
            'Intel(R) Core(TM) i7-10700K CPU @ 3.80GHz',
            'AMD Ryzen 9 5900X 12-Core Processor',
            'Intel(R) Xeon(R) CPU E5-2680 v4 @ 2.40GHz',
            'Intel(R) Core(TM) i5-9600K CPU @ 3.70GHz',
            'AMD EPYC 7402 24-Core Processor'
        ],
        cpuCoreOptions = [4, 6, 8, 12, 16, 24, 32],
        serverNames = ['web-server-01', 'app-server-02', 'db-server-01', 'worker-01', 'cache-01']
    } = options;

    // Create server profiles to maintain consistency for each server
    const serverProfiles: Map<string, {
        cpuModel: string,
        cores: number,
        speed: number,
        memoryTotal: number,
        disks: Array<{ name: string, size: number, mount: string }>
    }> = new Map();

    // Set up server profiles
    serverNames.forEach(serverName => {
        const cpuModel = cpuModels[Math.floor(Math.random() * cpuModels.length)];
        const cores = cpuCoreOptions[Math.floor(Math.random() * cpuCoreOptions.length)];
        const speed = 2000 + Math.floor(Math.random() * 2500); // 2.0 GHz to 4.5 GHz
        const memoryTotal = Math.floor((8 + Math.random() * 120) * 1024 * 1024 * 1024); // 8GB to 128GB in bytes

        // Create disk setup
        const diskCount = 1 + Math.floor(Math.random() * 4); // 1 to 4 disks
        const disks = [];

        // Always have a root partition
        disks.push({
            name: '/dev/sda1',
            size: Math.floor((100 + Math.random() * 400) * 1024 * 1024 * 1024), // 100GB to 500GB
            mount: '/'
        });

        // Add additional partitions if needed
        if (diskCount > 1) {
            const mountPoints = ['/data', '/var', '/home', '/opt', '/mnt/storage'];
            for (let i = 1; i < diskCount; i++) {
                disks.push({
                    name: `/dev/sd${String.fromCharCode(97 + i)}1`,
                    size: Math.floor((200 + Math.random() * 1800) * 1024 * 1024 * 1024), // 200GB to 2TB
                    mount: mountPoints[Math.floor(Math.random() * mountPoints.length)]
                });
            }
        }

        serverProfiles.set(serverName, {
            cpuModel,
            cores,
            speed,
            memoryTotal,
            disks
        });
    });

    // Generate time-based data points
    const timeInterval = (endDate.getTime() - startDate.getTime());

    const serverName = serverNames[Math.floor(Math.random() * serverNames.length)];
    const profile = serverProfiles.get(serverName)!;

    const timestamp = new Date(startDate.getTime() + timeInterval);

    // Generate increasing uptime based on timestamp
    // This simulates a continuous uptime counter over the course of the dataset
    const uptimeBase = Math.floor(Math.random() * 86400 * 30); // Random start point up to 30 days
    const uptimeOffset = Math.floor((timestamp.getTime() - startDate.getTime()) / 1000);
    const uptime = uptimeBase + uptimeOffset;

    // Generate usage patterns with some realistic variation
    // Create daily patterns for CPU usage (higher during business hours)
    const hour = timestamp.getHours();
    const isBusinessHour = hour >= 8 && hour <= 18;

    // CPU usage pattern - higher during business hours with randomness
    const baselineCpuUsage = isBusinessHour ? 40 : 20;
    const cpuVariation = 25;
    let cpuUsage = baselineCpuUsage + (Math.random() * 2 - 1) * cpuVariation;

    // Add occasional spikes
    if (Math.random() < 0.05) {
        cpuUsage = Math.min(95, cpuUsage + 30);
    }

    // Generate realistic memory usage
    const memoryTotal = profile.memoryTotal;
    const memoryUsedPercentage = baselineCpuUsage * 0.8 + Math.random() * 30; // Correlate with CPU somewhat
    const memoryUsed = Math.floor(memoryTotal * (memoryUsedPercentage / 100));
    const memoryFree = Math.floor(memoryTotal * 0.2);
    const memoryAvailable = memoryTotal - memoryUsed;

    // Generate disk usage that increases slightly over time
    const disks = profile.disks.map((disk, i) => {
        // Create a usage percentage that slowly increases over the dataset
        const baseUsagePercent = 30 + Math.random() * 40;
        const timeProgressFactor = i / count;
        const usageGrowth = 10 * timeProgressFactor;
        const usagePercent = Math.min(98, baseUsagePercent + usageGrowth);

        return {
            filesystem: disk.name,
            size: disk.size,
            used: Math.floor(disk.size * (usagePercent / 100)),
            mountedOn: disk.mount
        };
    });

    const systemResources: SystemInfo = {
        timestamp: timestamp.toISOString(),
        uptime,
        cpu: {
            model: profile.cpuModel,
            cores: profile.cores,
            speed: profile.speed,
            usage: parseFloat(cpuUsage.toFixed(1))
        },
        memory: {
            free: memoryFree,
            available: memoryAvailable,
            used: memoryUsed,
            total: memoryTotal
        },
        disk: disks,
    };

    return systemResources;
}

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
    const getRandomTimestamp = (): string => {
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