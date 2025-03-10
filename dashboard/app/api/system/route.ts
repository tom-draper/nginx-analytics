import { NextResponse } from 'next/server';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
    try {
        const systemInfo = await getSystemInfo();
        return NextResponse.json(systemInfo);
    } catch (error) {
        console.error('Error collecting system info:', error);
        return NextResponse.json(
            { error: 'Failed to collect system information' },
            { status: 500 }
        );
    }
}

async function getSystemInfo() {
    // Basic system information
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const loadAvg = os.loadavg();
    const uptime = os.uptime();

    // Calculate CPU usage
    const cpuUsage = await calculateCpuUsage();

    // Get disk usage
    const diskUsage = await getDiskUsage();

    // Get process info
    const processInfo = await getProcessInfo();

    // Get network statistics
    const networkStats = await getNetworkStats();

    return {
        timestamp: new Date().toISOString(),
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        uptime: {
            seconds: uptime,
            formatted: formatUptime(uptime)
        },
        cpu: {
            model: cpus[0].model,
            cores: cpus.length,
            speed: cpus[0].speed,
            loadAverage: {
                '1m': loadAvg[0],
                '5m': loadAvg[1],
                '15m': loadAvg[2]
            },
            usage: cpuUsage
        },
        memory: {
            total: totalMem,
            free: freeMem,
            used: totalMem - freeMem,
            usedPercentage: ((totalMem - freeMem) / totalMem * 100).toFixed(2),
            freePercentage: (freeMem / totalMem * 100).toFixed(2)
        },
        disk: diskUsage,
        process: processInfo,
        network: networkStats
    };
}

async function calculateCpuUsage() {
    // This is a simple method that works on Linux/macOS
    // For more accurate measurements, consider using a library
    try {
        if (os.platform() === 'win32') {
            const { stdout } = await execAsync('wmic cpu get LoadPercentage');
            const usage = stdout.trim().split('\n')[1];
            return parseFloat(usage);
        } else {
            // For Linux/macOS
            const { stdout } = await execAsync("top -bn1 | grep 'Cpu(s)' | sed 's/.*, *\\([0-9.]*\\)%* id.*/\\1/' | awk '{print 100 - $1}'");
            return parseFloat(stdout.trim());
        }
    } catch (error) {
        console.error('Error calculating CPU usage:', error);
        return null;
    }
}

async function getDiskUsage() {
    try {
        if (os.platform() === 'win32') {
            const { stdout } = await execAsync('wmic logicaldisk get size,freespace,caption');
            const lines = stdout.trim().split('\n').slice(1);
            const disks = [];

            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 3) {
                    const caption = parts[0];
                    const freeSpace = parseInt(parts[1], 10);
                    const size = parseInt(parts[2], 10);

                    disks.push({
                        drive: caption,
                        total: size,
                        free: freeSpace,
                        used: size - freeSpace,
                        usedPercentage: ((size - freeSpace) / size * 100).toFixed(2)
                    });
                }
            }
            return disks;
        } else {
            // For Linux/macOS
            const { stdout } = await execAsync('df -h');
            const lines = stdout.trim().split('\n').slice(1);
            const disks = [];

            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 6) {
                    disks.push({
                        filesystem: parts[0],
                        size: parts[1],
                        used: parts[2],
                        available: parts[3],
                        usedPercentage: parts[4],
                        mountedOn: parts[5]
                    });
                }
            }
            return disks;
        }
    } catch (error) {
        console.error('Error getting disk usage:', error);
        return [];
    }
}

async function getProcessInfo() {
    try {
        // Get NGINX info if available
        let nginxInfo = null;
        try {
            if (os.platform() === 'win32') {
                const { stdout } = await execAsync('tasklist /fi "imagename eq nginx.exe" /v');
                nginxInfo = {
                    running: stdout.includes('nginx.exe'),
                    info: stdout
                };
            } else {
                const { stdout: psOutput } = await execAsync('ps aux | grep nginx | grep -v grep');
                const { stdout: versionOutput } = await execAsync('nginx -v 2>&1');

                nginxInfo = {
                    running: psOutput.trim().length > 0,
                    processes: psOutput.trim().split('\n').length,
                    version: versionOutput.trim()
                };
            }
        } catch (e) {
            nginxInfo = { running: false, error: 'NGINX not found or not accessible' };
        }

        // Get overall process stats
        let topProcesses = [];
        if (os.platform() !== 'win32') {
            const { stdout } = await execAsync('ps aux --sort=-%cpu | head -n 6');
            const lines = stdout.trim().split('\n').slice(1); // Skip header

            topProcesses = lines.map(line => {
                const parts = line.trim().split(/\s+/);
                return {
                    user: parts[0],
                    pid: parts[1],
                    cpu: parts[2],
                    mem: parts[3],
                    command: parts.slice(10).join(' ')
                };
            });
        } else {
            const { stdout } = await execAsync('tasklist /v /fo csv | sort /r');
            const lines = stdout.trim().split('\n').slice(1, 6); // Skip header, take top 5

            topProcesses = lines.map(line => {
                const parts = line.replace(/"/g, '').split(',');
                return {
                    name: parts[0],
                    pid: parts[1],
                    memUsage: parts[4],
                    status: parts[5]
                };
            });
        }

        return {
            nginx: nginxInfo,
            topProcesses
        };
    } catch (error) {
        console.error('Error getting process info:', error);
        return { error: 'Failed to get process information' };
    }
}

async function getNetworkStats() {
    try {
        const networkInterfaces = os.networkInterfaces();

        // Get additional network statistics if on Linux
        let connectionStats = null;
        if (os.platform() !== 'win32') {
            try {
                const { stdout: netstatOutput } = await execAsync('netstat -tn | wc -l');
                const { stdout: nginxConns } = await execAsync('netstat -an | grep :80 | grep ESTABLISHED | wc -l');

                connectionStats = {
                    totalConnections: parseInt(netstatOutput.trim(), 10) - 2, // Subtract header lines
                    httpConnections: parseInt(nginxConns.trim(), 10)
                };
            } catch (e) {
                connectionStats = { error: 'Failed to get connection statistics' };
            }
        }

        return {
            interfaces: networkInterfaces,
            connections: connectionStats
        };
    } catch (error) {
        console.error('Error getting network stats:', error);
        return { error: 'Failed to get network information' };
    }
}

function formatUptime(seconds: number) {
    const days = Math.floor(seconds / (24 * 60 * 60));
    seconds -= days * 24 * 60 * 60;

    const hours = Math.floor(seconds / (60 * 60));
    seconds -= hours * 60 * 60;

    const minutes = Math.floor(seconds / 60);
    seconds -= minutes * 60;

    return `${days}d ${hours}h ${minutes}m ${Math.floor(seconds)}s`;
}