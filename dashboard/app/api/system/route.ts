import { NextResponse } from 'next/server';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import si from 'systeminformation';

const execAsync = promisify(exec);

// Cache for process data to reduce system impact
let processCache = null;
let processCacheTimestamp = 0;
const PROCESS_CACHE_TTL = 3000; // 3 seconds cache lifetime

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
    // const loadAvg = os.loadavg();
    const uptime = os.uptime();

    // Calculate CPU usage using systeminformation
    const cpuUsage = await getCpuUsage();

    // Get disk usage using systeminformation
    const diskUsage = await getDiskUsage();

    return {
        timestamp: new Date().toISOString(),
        uptime: {
            seconds: uptime,
            // formatted: formatUptime(uptime)
        },
        cpu: {
            model: cpus[0].model,
            cores: cpus.length,
            speed: cpus[0].speed,
            usage: cpuUsage,
        },
        memory: {
            total: totalMem,
            free: freeMem,
            used: totalMem - freeMem,
            usedPercentage: ((totalMem - freeMem) / totalMem * 100).toFixed(2),
            freePercentage: (freeMem / totalMem * 100).toFixed(2)
        },
        disk: diskUsage,
    };
}

async function getCpuUsage() {
    try {
        // Get current CPU load percentage using systeminformation
        const currentLoad = await si.currentLoad();
        return parseFloat(currentLoad.currentLoad.toFixed(1));
    } catch (error) {
        console.error('Error calculating CPU usage:', error);
        // Fallback to the original method if systeminformation fails
        return calculateCpuUsageFallback();
    }
}

async function calculateCpuUsageFallback() {
    // This is a fallback method that works on Linux/macOS
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
        console.error('Error calculating CPU usage (fallback):', error);
        return null;
    }
}

async function getDiskUsage() {
    try {
        // Get disk information using systeminformation
        const fsSize = await si.fsSize();
        
        return fsSize.map(disk => ({
            filesystem: disk.fs,
            size: formatBytes(disk.size),
            used: formatBytes(disk.used),
            available: formatBytes(disk.size - disk.used),
            usedPercentage: disk.use.toFixed(1),
            mountedOn: disk.mount
        }));
    } catch (error) {
        console.error('Error getting disk usage:', error);
        // Fallback to the original method
        return getDiskUsageFallback();
    }
}

async function getDiskUsageFallback() {
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
        console.error('Error getting disk usage (fallback):', error);
        return [];
    }
}

async function getProcessInfo() {
    try {
        const now = Date.now();
        
        // Use cached data if it's still valid
        if (processCache && now - processCacheTimestamp < PROCESS_CACHE_TTL) {
            return processCache;
        }
        
        // Get process information using systeminformation
        const processData = await si.processes();
        
        // Sort by CPU usage and take top 7 processes (excluding monitoring processes)
        const topProcesses = processData.list
            .sort((a, b) => b.cpu - a.cpu)
            .slice(0, 7)
            .map(p => ({
                user: p.user,
                pid: p.pid,
                cpu: p.cpu.toFixed(1),
                mem: p.memRss ? ((p.memRss / os.totalmem()) * 100).toFixed(1) : p.mem.toFixed(1),
                command: p.command
            }));
            
        // Check for NGINX
        let nginxInfo = null;
        try {
            const nginxProcesses = processData.list.filter(p => 
                p.command.includes('nginx') || p.name.includes('nginx')
            );
            
            nginxInfo = {
                running: nginxProcesses.length > 0,
                processes: nginxProcesses.length,
                // Try to get nginx version if it's running and we're not on Windows
                version: nginxProcesses.length > 0 && os.platform() !== 'win32' ? 
                    await getNginxVersion() : 'Unknown'
            };
        } catch (e) {
            nginxInfo = { running: false, error: 'NGINX not found or not accessible' };
        }
        
        const result = {
            nginx: nginxInfo,
            topProcesses
        };
        
        // Cache the result
        processCache = result;
        processCacheTimestamp = now;
        
        return result;
    } catch (error) {
        console.error('Error getting process info:', error);
        // Fallback to original method if systeminformation fails
        return getProcessInfoFallback();
    }
}

async function getNginxVersion() {
    try {
        const { stdout } = await execAsync('nginx -v 2>&1');
        return stdout.trim();
    } catch (error) {
        return 'Unknown';
    }
}

async function getProcessInfoFallback() {
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
            const { stdout } = await execAsync('ps aux --sort=-%cpu | head -n 8');
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
            const lines = stdout.trim().split('\n').slice(1, 8); // Skip header, take top 7

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
        console.error('Error getting process info (fallback):', error);
        return { error: 'Failed to get process information' };
    }
}

async function getNetworkStats() {
    try {
        // Get network statistics using systeminformation
        const networkInterfaces = os.networkInterfaces();
        const networkStats = await si.networkStats();
        
        // Get current network connections
        let connectionStats = null;
        try {
            const networkConnections = await si.networkConnections();
            
            connectionStats = {
                totalConnections: networkConnections.length,
                httpConnections: networkConnections.filter(conn => 
                    conn.localport === 80 || conn.localport === 443
                ).length
            };
        } catch (e) {
            // Use fallback method for connections
            connectionStats = await getNetworkConnectionsFallback();
        }

        return {
            interfaces: networkInterfaces,
            connections: connectionStats,
            stats: networkStats.map(iface => ({
                interface: iface.iface,
                rx: formatBytes(iface.rx_bytes),
                tx: formatBytes(iface.tx_bytes),
                rx_sec: formatBytes(iface.rx_sec),
                tx_sec: formatBytes(iface.tx_sec)
            }))
        };
    } catch (error) {
        console.error('Error getting network stats:', error);
        // Fallback to original method
        return getNetworkStatsFallback();
    }
}

async function getNetworkConnectionsFallback() {
    try {
        if (os.platform() !== 'win32') {
            const { stdout: netstatOutput } = await execAsync('netstat -tn | wc -l');
            const { stdout: nginxConns } = await execAsync('netstat -an | grep :80 | grep ESTABLISHED | wc -l');

            return {
                totalConnections: parseInt(netstatOutput.trim(), 10) - 2, // Subtract header lines
                httpConnections: parseInt(nginxConns.trim(), 10)
            };
        }
        return { error: 'Connection statistics not available on this platform' };
    } catch (e) {
        return { error: 'Failed to get connection statistics' };
    }
}

async function getNetworkStatsFallback() {
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
        console.error('Error getting network stats (fallback):', error);
        return { error: 'Failed to get network information' };
    }
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / (24 * 60 * 60));
    seconds -= days * 24 * 60 * 60;

    const hours = Math.floor(seconds / (60 * 60));
    seconds -= hours * 60 * 60;

    const minutes = Math.floor(seconds / 60);
    seconds -= minutes * 60;

    return `${days}d ${hours}h ${minutes}m ${Math.floor(seconds)}s`;
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}