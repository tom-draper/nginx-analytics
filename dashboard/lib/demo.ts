import { Location } from "@/lib/location";
import { LogFilesSizes, LogFilesSummary, LogSizes, SystemInfo } from "./types";

// Precomputed zero-padded strings "00".."99" for fast timestamp formatting
const PAD2: string[] = Array.from({ length: 100 }, (_, i) => i < 10 ? '0' + i : String(i));
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/**
 * Generates random LogSizes data mimicking Nginx log file structure
 * @returns A random LogSizes object
 */
export function generateRandomLogSizes(): LogSizes {
    // Random number of files between 1 and 30
    const totalFiles = Math.floor(Math.random() * 30) + 1;

    const files: LogFilesSizes = [];
    let totalSize = 0;
    let logFilesSize = 0;
    let compressedFilesSize = 0;
    let logFilesCount = 0;
    let compressedFilesCount = 0;

    // Determine how many access logs and error logs to create
    const maxAccessLogs = Math.floor(totalFiles * 0.7); // 70% of files are access logs
    const accessLogsCount = Math.floor(Math.random() * maxAccessLogs) + 1;
    const errorLogsCount = totalFiles - accessLogsCount;

    // Generate access logs
    // First the main access.log (uncompressed)
    const accessLogSize = Math.random() * 5 * 1024 * 1024; // 0-5MB in bytes
    files.push({
        name: 'access.log',
        size: accessLogSize,
        extension: 'log'
    });
    totalSize += accessLogSize;
    logFilesSize += accessLogSize;
    logFilesCount++;

    // Then the compressed access logs (access.log.1.gz, access.log.2.gz, etc.)
    for (let i = 1; i < accessLogsCount; i++) {
        const compressedSize = Math.random() * 2 * 1024 * 1024; // Compressed files are smaller (0-2MB)
        files.push({
            name: `access.log.${i}.gz`,
            size: compressedSize,
            extension: 'gz'
        });
        totalSize += compressedSize;
        compressedFilesSize += compressedSize;
        compressedFilesCount++;
    }

    // Generate error logs if any
    if (errorLogsCount > 0) {
        // Main error.log (uncompressed)
        const errorLogSize = Math.random() * 3 * 1024 * 1024; // 0-3MB (error logs tend to be smaller)
        files.push({
            name: 'error.log',
            size: errorLogSize,
            extension: 'log'
        });
        totalSize += errorLogSize;
        logFilesSize += errorLogSize;
        logFilesCount++;

        // Compressed error logs
        for (let i = 1; i < errorLogsCount; i++) {
            const compressedSize = Math.random() * 1 * 1024 * 1024; // Smaller compressed error logs (0-1MB)
            files.push({
                name: `error.log.${i}.gz`,
                size: compressedSize,
                extension: 'gz'
            });
            totalSize += compressedSize;
            compressedFilesSize += compressedSize;
            compressedFilesCount++;
        }
    }

    // Sort files to mimic typical log file ordering
    files.sort((a, b) => {
        // First sort by base name (access vs error)
        if (a.name.startsWith('access') && b.name.startsWith('error')) return -1;
        if (a.name.startsWith('error') && b.name.startsWith('access')) return 1;

        // Then sort by number for same type of log
        if (a.name.includes('.') && b.name.includes('.')) {
            const aNum = a.name.includes('.gz') ?
                parseInt(a.name.split('.')[1]) : 0;
            const bNum = b.name.includes('.gz') ?
                parseInt(b.name.split('.')[1]) : 0;
            return aNum - bNum;
        }

        // Put non-compressed logs first
        if (!a.name.includes('.gz') && b.name.includes('.gz')) return -1;
        if (a.name.includes('.gz') && !b.name.includes('.gz')) return 1;

        return a.name.localeCompare(b.name);
    });

    const summary: LogFilesSummary = {
        totalSize,
        logFilesSize,
        compressedFilesSize,
        totalFiles,
        logFilesCount,
        compressedFilesCount
    };

    return {
        files,
        summary
    };
}

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
    const cpuCoreOptions = [4, 6, 8, 10, 12, 16, 20, 24];

    // Standard memory sizes in GB
    const standardMemorySizes = [8, 16, 32, 64, 128, 256];

    // Create server profile
    const cpuModel = cpuModels[Math.floor(Math.random() * cpuModels.length)];
    const cores = cpuCoreOptions[Math.floor(Math.random() * cpuCoreOptions.length)];
    const speed = 2000 + Math.floor(Math.random() * 2500); // 2.0 GHz to 4.5 GHz
    
    // Select a standard memory size and convert to bytes
    const memorySizeGB = standardMemorySizes[Math.floor(Math.random() * standardMemorySizes.length)];
    const memoryTotal = memorySizeGB * 1024 * 1024 * 1024; // Convert GB to bytes

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
    const coreUsage = generateCoreUsage(cpuUsage, cores)
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
            usage: parseFloat(cpuUsage.toFixed(1)),
            coreUsage,
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
 * Generates realistic per-core CPU usage based on overall usage
 * @param overallUsage Overall CPU usage percentage
 * @param coreCount Number of CPU cores
 * @returns Array of per-core usage percentages
 */
function generateCoreUsage(overallUsage: number, coreCount: number): number[] {
    const coreUsages: number[] = [];
    
    // Generate some variation around the overall usage
    // Most cores should be close to the average, but some can be higher/lower
    const baseUsage = overallUsage;
    const variation = Math.min(15, overallUsage * 0.4); // Max 15% variation or 40% of base usage
    
    for (let i = 0; i < coreCount; i++) {
        // Generate random variation for this core
        const randomFactor = (Math.random() - 0.5) * 2; // -1 to 1
        let coreUsage = baseUsage + (randomFactor * variation);
        
        // Ensure usage stays within realistic bounds (0-100%)
        coreUsage = Math.max(0, Math.min(100, coreUsage));
        
        // Round to 1 decimal place
        coreUsages.push(parseFloat(coreUsage.toFixed(1)));
    }
    
    // Adjust the core usages so they average closer to the overall usage
    const currentAverage = coreUsages.reduce((sum, usage) => sum + usage, 0) / coreCount;
    const adjustment = baseUsage - currentAverage;
    
    // Apply adjustment to each core, but keep within bounds
    for (let i = 0; i < coreUsages.length; i++) {
        coreUsages[i] = Math.max(0, Math.min(100, coreUsages[i] + adjustment));
        coreUsages[i] = parseFloat(coreUsages[i].toFixed(1));
    }
    
    return coreUsages;
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
            disks,
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

    const coreUsage = generateCoreUsage(cpuUsage, profile.cores)

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
            usage: parseFloat(cpuUsage.toFixed(1)),
            coreUsage,
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

// [country, city, lat, lon]
const locations: [string, string, number, number][] = [
    ['US', 'San Francisco', 37.7749, -122.4194],
    ['US', 'New York', 40.7128, -74.0060],
    ['US', 'Los Angeles', 34.0522, -118.2437],
    ['US', 'Chicago', 41.8781, -87.6298],
    ['US', 'Houston', 29.7604, -95.3698],
    ['US', 'Miami', 25.7617, -80.1918],
    ['US', 'Seattle', 47.6062, -122.3321],
    ['US', 'Washington', 38.9072, -77.0369],
    ['US', 'Boston', 42.3601, -71.0589],
    ['US', 'San Diego', 32.7157, -117.1611],
    ['GB', 'London', 51.5074, -0.1278],
    ['FR', 'Paris', 48.8566, 2.3522],
    ['DE', 'Berlin', 52.5200, 13.4050],
    ['IT', 'Rome', 41.9028, 12.4964],
    ['ES', 'Madrid', 40.4168, -3.7038],
    ['NL', 'Amsterdam', 52.3676, 4.9041],
    ['CA', 'Toronto', 43.6532, -79.3832],
    ['AU', 'Sydney', -33.8688, 151.2093],
    ['JP', 'Tokyo', 35.6762, 139.6503],
    ['CN', 'Beijing', 39.9042, 116.4074],
    ['IN', 'Mumbai', 19.0760, 72.8777],
    ['BR', 'Sao Paulo', -23.5505, -46.6333],
    ['ZA', 'Johannesburg', -26.2041, 28.0473],
    ['MX', 'Mexico City', 19.4326, -99.1332],
    ['AR', 'Buenos Aires', -34.6037, -58.3816],
    ['CO', 'Bogota', 4.7110, -74.0721],
    ['VE', 'Caracas', 10.4806, -66.9036],
    ['PE', 'Lima', -12.0464, -77.0428],
    ['CL', 'Santiago', -33.4489, -70.6693],
    ['BO', 'La Paz', -16.5000, -68.1500],
    ['UY', 'Montevideo', -34.9011, -56.1645],
    ['PY', 'Asuncion', -25.2867, -57.6473],
    ['EC', 'Quito', -0.1807, -78.4678],
    ['NG', 'Lagos', 6.5244, 3.3792],
    ['KE', 'Nairobi', -1.2921, 36.8219],
    ['RU', 'Moscow', 55.7558, 37.6173],
    ['SG', 'Singapore', 1.3521, 103.8198],
    ['KR', 'Seoul', 37.5665, 126.9780],
    ['PH', 'Manila', 14.5995, 120.9842],
];

function randomLocation(ipAddress: string): Location {
    const index = Math.floor(Math.random() * locations.length);
    const [country, city, lat, lon] = locations[index];

    return {
        country,
        city,
        ipAddress,
        lat,
        lon,
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
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate = new Date(),
        ipRange = [],
    } = options;

    // ── Paths with categories for correlated behaviour ─────────────────────
    type PathCat = 'page' | 'api' | 'static' | 'auth' | 'monitor' | 'scanner';
    const pathData: Array<[string, PathCat, number]> = [
        // [path, category, relative weight]
        // Core pages (high traffic)
        ['/', 'page', 30],
        ['/about', 'page', 8],
        ['/pricing', 'page', 10],
        ['/contact', 'page', 5],
        ['/docs', 'page', 12],
        ['/docs/getting-started', 'page', 8],
        ['/docs/api-reference', 'page', 7],
        ['/blog', 'page', 9],
        ['/blog/introducing-v2', 'page', 6],
        ['/blog/performance-tips', 'page', 5],
        ['/changelog', 'page', 4],
        ['/features', 'page', 7],
        ['/dashboard', 'page', 14],
        ['/settings', 'page', 5],
        ['/profile', 'page', 5],
        ['/billing', 'page', 3],
        ['/404', 'page', 4],
        // Auth
        ['/login', 'auth', 12],
        ['/logout', 'auth', 6],
        ['/register', 'auth', 8],
        ['/forgot-password', 'auth', 3],
        ['/reset-password', 'auth', 2],
        ['/oauth/callback', 'auth', 4],
        // API v1
        ['/api/v1/users', 'api', 15],
        ['/api/v1/users/me', 'api', 12],
        ['/api/v1/users/preferences', 'api', 6],
        ['/api/v1/auth/token', 'api', 14],
        ['/api/v1/auth/refresh', 'api', 10],
        ['/api/v1/products', 'api', 13],
        ['/api/v1/products/search', 'api', 9],
        ['/api/v1/orders', 'api', 11],
        ['/api/v1/orders/recent', 'api', 7],
        ['/api/v1/payments', 'api', 6],
        ['/api/v1/notifications', 'api', 8],
        ['/api/v1/search', 'api', 10],
        ['/api/v1/analytics/events', 'api', 7],
        // API v2
        ['/api/v2/users', 'api', 12],
        ['/api/v2/users/activity', 'api', 7],
        ['/api/v2/products', 'api', 11],
        ['/api/v2/products/inventory', 'api', 6],
        ['/api/v2/orders', 'api', 9],
        ['/api/v2/orders/analytics', 'api', 5],
        ['/api/v2/auth/refresh', 'api', 9],
        ['/api/v2/webhooks', 'api', 4],
        ['/api/v2/metrics', 'api', 5],
        ['/api/v2/recommendations', 'api', 6],
        // Static assets (present but not overwhelming the endpoint list)
        ['/favicon.ico', 'static', 8],
        ['/robots.txt', 'static', 5],
        ['/sitemap.xml', 'static', 3],
        ['/static/css/app.css', 'static', 7],
        ['/static/css/vendor.css', 'static', 4],
        ['/static/js/app.js', 'static', 7],
        ['/static/js/vendor.js', 'static', 5],
        ['/static/js/chunk-react.js', 'static', 3],
        ['/static/img/hero.webp', 'static', 4],
        ['/static/img/logo.svg', 'static', 5],
        ['/static/img/og-image.png', 'static', 2],
        ['/static/fonts/inter.woff2', 'static', 3],
        ['/static/fonts/mono.woff2', 'static', 2],
        ['/apple-touch-icon.png', 'static', 3],
        ['/manifest.json', 'static', 2],
        // Monitoring
        ['/health', 'monitor', 8],
        ['/ping', 'monitor', 6],
        ['/metrics', 'monitor', 4],
        ['/status', 'monitor', 5],
        ['/api/v1/health', 'monitor', 7],
        // Scanner/probe targets (rare but realistic)
        ['/.env', 'scanner', 1],
        ['/.env.local', 'scanner', 1],
        ['/.git/config', 'scanner', 1],
        ['/wp-admin', 'scanner', 1],
        ['/wp-login.php', 'scanner', 1],
        ['/xmlrpc.php', 'scanner', 1],
        ['/phpmyadmin', 'scanner', 1],
        ['/admin', 'scanner', 1],
        ['/admin/config.php', 'scanner', 1],
        ['/backup.zip', 'scanner', 1],
        ['/shell.php', 'scanner', 1],
        ['/config.yml', 'scanner', 1],
    ];
    const paths    = pathData.map(p => p[0]);
    const pathCats = pathData.map(p => p[1]) as PathCat[];
    const pathWeights = pathData.map(p => p[2]);

    // ── User agents by category ─────────────────────────────────────────────
    const browserAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Opera/9.80 (Windows NT 6.1; WOW64) Presto/2.12.388 Version/12.18',
    ];
    const mobileAgents = [
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.101 Mobile Safari/537.36',
        'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.230 Mobile Safari/537.36',
        'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (Linux; Android 13; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36',
    ];
    const crawlerAgents = [
        'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
        'DuckDuckBot/1.1; (+http://duckduckgo.com/duckduckbot.html)',
        'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
        'Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)',
        'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)',
        'Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)',
        'Twitterbot/1.0',
        'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)',
        'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    ];
    const apiClientAgents = [
        'python-requests/2.31.0',
        'python-requests/2.28.2',
        'python-httpx/0.25.2',
        'axios/1.6.2',
        'axios/1.4.0',
        'PostmanRuntime/7.36.1',
        'PostmanRuntime/7.35.0',
        'curl/7.88.1',
        'curl/8.4.0',
        'Go-http-client/2.0',
        'Go-http-client/1.1',
        'Wget/1.21.4',
        'insomnia/2023.5.8',
    ];
    const scannerAgents = [
        'Mozilla/5.0 (compatible; Nikto/2.1.6)',
        'sqlmap/1.7.8#stable (https://sqlmap.org)',
        'python-urllib3/2.0.7',
        'masscan/1.3 (https://github.com/robertdavidgraham/masscan)',
        'zgrab/0.x',
    ];

    // ── Referrers ───────────────────────────────────────────────────────────
    const referers = [
        '-', '-', '-', '-',  // direct traffic is most common
        'https://www.google.com/',
        'https://www.google.com/',
        'https://www.google.com/',
        'https://www.bing.com/',
        'https://duckduckgo.com/',
        'https://www.facebook.com/',
        'https://twitter.com/',
        'https://www.linkedin.com/',
        'https://www.reddit.com/',
        'https://news.ycombinator.com/',
        'https://github.com/',
        'https://stackoverflow.com/',
        'https://www.producthunt.com/',
        'https://medium.com/',
        'https://dev.to/',
        'https://t.co/',
        'https://www.youtube.com/',
        'https://www.instagram.com/',
        'https://mail.google.com/',
        'https://outlook.live.com/',
        'https://www.baidu.com/',
        'https://www.yandex.ru/',
    ];

    // ── IP pool: regular users + scanner cluster ────────────────────────────
    const regularIpCount = 50;
    const scannerIps: string[] = [
        `185.${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}`,
        `45.${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}`,
        `194.${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}`,
    ];
    const regularIps: string[] = [];
    for (let i = 0; i < regularIpCount; i++) {
        if (ipRange.length > 0 && Math.random() < 0.6) {
            regularIps.push(ipRange[Math.floor(Math.random() * ipRange.length)]);
        } else {
            regularIps.push(`${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}`);
        }
    }

    // ── Weight helpers ──────────────────────────────────────────────────────
    const sumW = (w: number[]) => { let s = 0; for (let i = 0; i < w.length; i++) s += w[i]; return s; };
    const pickIndex = (weights: number[], total: number): number => {
        let r = Math.random() * total;
        for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r < 0) return i; }
        return weights.length - 1;
    };
    const pickItem = <T>(items: T[], weights: number[], total: number): T =>
        items[pickIndex(weights, total)];

    const pathTotal = sumW(pathWeights);

    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
    const methodWeights = [65, 18, 5, 5, 4, 2, 1];
    const methodTotal = sumW(methodWeights);

    // ── Hour-of-day distribution: peaks 9-11am and 2-4pm ───────────────────
    // Index = hour (0-23)
    const hourWeights = [1,1,1,1,1,2,4,7,10,14,16,14,11,12,15,14,11,8,6,5,4,3,2,1];
    const hourTotal = sumW(hourWeights);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    // ── Timezone suffix (computed once) ─────────────────────────────────────
    const tzOff  = new Date().getTimezoneOffset();
    const tzSign = tzOff <= 0 ? '+' : '-';
    const tzAbs  = Math.abs(tzOff);
    const tzStr  = `${tzSign}${PAD2[Math.floor(tzAbs / 60)]}${PAD2[tzAbs % 60]}`;

    const startMs   = startDate.getTime();
    const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startMs) / 86400000));

    // ── Day profiles ─────────────────────────────────────────────────────────
    type DayMode = 'normal' | 'spike' | 'attack' | 'offline' | 'server_issues' | 'degraded';
    interface DayProfile { weight: number; mode: DayMode; attackIps?: string[]; }

    // Consistent week-level noise so you see plateau-like weekly variation
    const weeklyNoise = Array.from(
        { length: Math.ceil(totalDays / 7) + 1 },
        () => 0.65 + Math.random() * 0.7
    );

    // Independent IP clusters for each attack event
    const rndIp = (prefix: number) =>
        `${prefix}.${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}`;
    const attackPool1 = Array.from({ length: 4 }, () => rndIp(45));
    const attackPool2 = Array.from({ length: 3 }, () => rndIp(185));

    const dayProfiles: DayProfile[] = Array.from({ length: totalDays }, (_, d) => {
        const dow       = new Date(startMs + d * 86400000).getDay();
        const isWeekend = dow === 0 || dow === 6;
        const growth    = 0.5 + (d / Math.max(1, totalDays - 1)) * 1.2; // 0.5 → 1.7 over range
        const weekly    = weeklyNoise[Math.floor(d / 7)];
        const dayFact   = isWeekend ? 0.5 : 1.0;
        return { weight: growth * weekly * dayFact, mode: 'normal' };
    });

    const applyEvent = (s: number, e: number, mode: DayMode, mult: number, ips?: string[]) => {
        for (let d = s; d <= e && d < totalDays; d++) {
            dayProfiles[d].weight *= mult;
            dayProfiles[d].mode = mode;
            if (ips) dayProfiles[d].attackIps = ips;
        }
    };

    if (totalDays >= 300) {
        applyEvent(0,   4,   'normal',        0.25);              // Quiet launch week
        applyEvent(46,  48,  'spike',         5.0);               // Feb: viral HN post
        applyEvent(78,  80,  'attack',        3.5,  attackPool1); // Mar: scanning attack
        applyEvent(96,  97,  'offline',       0.06);              // Apr: unplanned outage
        applyEvent(130, 132, 'spike',         3.8);               // May: v2 launch
        applyEvent(154, 158, 'server_issues', 0.85);              // Jun: DB connection leak
        applyEvent(196, 230, 'degraded',      0.72);              // Jul-Aug: summer slowdown
        applyEvent(248, 250, 'spike',         4.2);               // Sep: product launch
        applyEvent(288, 290, 'attack',        4.0,  attackPool2); // Oct: HTTP flood
        applyEvent(320, 323, 'server_issues', 0.60);              // Nov: memory leak
        applyEvent(357, Math.min(364, totalDays - 1), 'normal', 0.35); // Dec: holiday dip
    }

    // Distribute log count across days proportionally to weight
    const totalW    = dayProfiles.reduce((s, p) => s + p.weight, 0);
    const logsPerDay = dayProfiles.map(p => Math.round((p.weight / totalW) * count));
    const drift      = count - logsPerDay.reduce((s, n) => s + n, 0);
    logsPerDay[Math.floor(totalDays / 2)] += drift; // absorb rounding error mid-year

    // Pre-compute scanner path indices once
    const scannerPathIndices = pathCats.reduce<number[]>(
        (acc, c, i) => { if (c === 'scanner') acc.push(i); return acc; }, []
    );

    // ── Helpers reused per log ────────────────────────────────────────────────
    const normalStatus = (pathCat: PathCat): number => {
        const sr = Math.random();
        if (pathCat === 'scanner') return sr < 0.72 ? 404 : sr < 0.92 ? 403 : sr < 0.97 ? 400 : 200;
        if (pathCat === 'static')  return sr < 0.65 ? 200 : sr < 0.80 ? 304 : sr < 0.94 ? 404 : 403;
        if (pathCat === 'monitor') return sr < 0.80 ? 200 : 503;
        // auth: ~70% non-success
        if (pathCat === 'auth')    return sr < 0.30 ? 200 : sr < 0.55 ? 401 : sr < 0.68 ? 400 : sr < 0.76 ? 302 : sr < 0.90 ? 429 : 500;
        // api: ~70% non-success
        if (pathCat === 'api')     return sr < 0.25 ? 200 : sr < 0.32 ? 201 : sr < 0.35 ? 204 : sr < 0.55 ? 400 : sr < 0.68 ? 401 : sr < 0.78 ? 403 : sr < 0.90 ? 404 : 500;
        // page: ~50% non-success
        return sr < 0.50 ? 200 : sr < 0.62 ? 301 : sr < 0.82 ? 404 : sr < 0.94 ? 500 : 502;
    };

    const sizeForPath = (pathCat: PathCat, path: string, statusCode: number): string => {
        if (statusCode >= 400)                    return String(Math.floor(Math.random() * 800  + 80));
        if (statusCode === 204 || statusCode === 304) return '0';
        if (statusCode === 301 || statusCode === 302) return String(Math.floor(Math.random() * 200 + 20));
        if (pathCat === 'static') {
            const ext = path.split('.').pop() ?? '';
            if (ext === 'woff2' || ext === 'woff') return String(Math.floor(Math.random() * 80000  + 20000));
            if (ext === 'js')                      return String(Math.floor(Math.random() * 400000 + 20000));
            if (ext === 'css')                     return String(Math.floor(Math.random() * 120000 + 8000));
            if (ext === 'png' || ext === 'jpg' || ext === 'webp') return String(Math.floor(Math.random() * 2000000 + 50000));
            if (ext === 'svg')                     return String(Math.floor(Math.random() * 20000  + 500));
            return String(Math.floor(Math.random() * 5000 + 100));
        }
        if (pathCat === 'api' || pathCat === 'monitor') return String(Math.floor(Math.random() * 15000 + 100));
        return String(Math.floor(Math.random() * 80000 + 5000)); // page / auth
    };

    const agentFor = (pathCat: PathCat, isAttacker: boolean): string => {
        if (isAttacker) return scannerAgents[Math.floor(Math.random() * scannerAgents.length)];
        const ur = Math.random();
        if (pathCat === 'api' && ur < 0.35) return apiClientAgents[Math.floor(Math.random() * apiClientAgents.length)];
        if (ur < 0.08) return crawlerAgents[Math.floor(Math.random() * crawlerAgents.length)];
        if (ur < 0.22) return mobileAgents[Math.floor(Math.random() * mobileAgents.length)];
        return browserAgents[Math.floor(Math.random() * browserAgents.length)];
    };

    // ── Per-day log generation ────────────────────────────────────────────────
    const logs: string[] = [];

    for (let d = 0; d < totalDays; d++) {
        const n = logsPerDay[d];
        if (n <= 0) continue;

        const { mode, attackIps } = dayProfiles[d];
        const dayStartMs = startMs + d * 86400000;

        for (let i = 0; i < n; i++) {
            // Timestamp — attacks run 24/7; normal traffic peaks in business hours
            const hour   = (mode === 'attack') ? Math.floor(Math.random() * 24) : pickItem(hours, hourWeights, hourTotal);
            const minute = Math.floor(Math.random() * 60);
            const second = Math.floor(Math.random() * 60);
            const dt     = new Date(dayStartMs + hour * 3600000 + minute * 60000 + second * 1000);
            const timestamp = `[${PAD2[dt.getDate()]}/${MONTH_NAMES[dt.getMonth()]}/${dt.getFullYear()}:${PAD2[dt.getHours()]}:${PAD2[dt.getMinutes()]}:${PAD2[dt.getSeconds()]} ${tzStr}]`;

            const httpVersion = Math.random() < 0.65 ? 'HTTP/2.0' : (Math.random() < 0.9 ? 'HTTP/1.1' : 'HTTP/1.0');

            let ip: string, path: string, pathCat: PathCat, method: string, statusCode: number, bytes: string, userAgent: string, referer: string;

            if (mode === 'offline') {
                // Server down — everything returns 503/502
                ip         = regularIps[Math.floor(Math.random() * regularIps.length)];
                const idx  = pickIndex(pathWeights, pathTotal);
                path       = paths[idx];
                pathCat    = pathCats[idx];
                method     = 'GET';
                statusCode = Math.random() < 0.88 ? 503 : 502;
                bytes      = String(Math.floor(Math.random() * 300 + 50));
                userAgent  = browserAgents[Math.floor(Math.random() * browserAgents.length)];
                referer    = referers[Math.floor(Math.random() * referers.length)];

            } else if (mode === 'attack') {
                // Coordinated flood: few fixed IPs, scanner-heavy paths, all 4xx/5xx
                const pool = attackIps ?? scannerIps;
                ip         = pool[Math.floor(Math.random() * pool.length)];
                if (Math.random() < 0.55) {
                    const idx = scannerPathIndices[Math.floor(Math.random() * scannerPathIndices.length)];
                    path    = paths[idx]; pathCat = 'scanner';
                } else {
                    const idx = pickIndex(pathWeights, pathTotal);
                    path    = paths[idx]; pathCat = pathCats[idx];
                }
                method     = Math.random() < 0.8 ? 'GET' : 'POST';
                const sr   = Math.random();
                statusCode = sr < 0.55 ? 404 : sr < 0.72 ? 403 : sr < 0.84 ? 400 : sr < 0.94 ? 429 : sr < 0.98 ? 503 : 200;
                bytes      = statusCode >= 400 ? String(Math.floor(Math.random() * 600 + 80)) : String(Math.floor(Math.random() * 5000 + 200));
                userAgent  = scannerAgents[Math.floor(Math.random() * scannerAgents.length)];
                referer    = '-';

            } else {
                // normal / spike / server_issues / degraded
                const isPassiveScanner = Math.random() < 0.04;
                ip = isPassiveScanner
                    ? scannerIps[Math.floor(Math.random() * scannerIps.length)]
                    : regularIps[Math.floor(Math.random() * regularIps.length)];

                const pathIdx = (isPassiveScanner && Math.random() < 0.7)
                    ? scannerPathIndices[Math.floor(Math.random() * scannerPathIndices.length)]
                    : pickIndex(pathWeights, pathTotal);
                path    = paths[pathIdx];
                pathCat = pathCats[pathIdx];

                if (pathCat === 'static' || pathCat === 'monitor' || pathCat === 'scanner') {
                    method = Math.random() < 0.97 ? 'GET' : 'HEAD';
                } else if (pathCat === 'api') {
                    method = pickItem(methods, methodWeights, methodTotal);
                } else {
                    method = Math.random() < 0.85 ? 'GET' : (Math.random() < 0.8 ? 'POST' : pickItem(methods, methodWeights, methodTotal));
                }

                // Mode overrides success rate before falling back to normal path logic
                const modeRoll = Math.random();
                if (mode === 'server_issues' && modeRoll < 0.35) {
                    statusCode = Math.random() < 0.6 ? 500 : (Math.random() < 0.6 ? 502 : 503);
                } else if (mode === 'degraded' && modeRoll < 0.10) {
                    statusCode = Math.random() < 0.7 ? 500 : 502;
                } else {
                    statusCode = normalStatus(pathCat);
                }

                bytes     = sizeForPath(pathCat, path, statusCode);
                userAgent = agentFor(pathCat, isPassiveScanner);
                referer   = (pathCat === 'api' || pathCat === 'monitor' || pathCat === 'scanner')
                    ? '-'
                    : referers[Math.floor(Math.random() * referers.length)];
            }

            const commonLog = `${ip} - - ${timestamp} "${method} ${path} ${httpVersion}" ${statusCode} ${bytes}`;
            logs.push(format === 'common' ? commonLog : `${commonLog} "${referer}" "${userAgent}"`);
        }
    }

    return logs;
}