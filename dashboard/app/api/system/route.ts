import { NextResponse } from 'next/server';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import si from 'systeminformation';
import { SystemInfo } from '@/lib/types';
import { serverUrl, authToken, systemMonitoringEnabled } from '@/lib/environment';

const execAsync = promisify(exec);

export async function GET() {
    if (serverUrl) {
        const headers: HeadersInit = {};
        if (authToken) {
            headers.Authorization = `Bearer ${authToken}`;
        }

        const response = await fetch(serverUrl + '/system', {
            method: 'GET',
            headers
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `Error checking system info by server: ${response.statusText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data, { status: 200 });
    } else {
        if (!systemMonitoringEnabled) {
            return NextResponse.json(
                { error: 'System monitoring is disabled' },
                { status: 403 }
            );
        }

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
}

async function getSystemInfo() {
    const uptime = os.uptime();
    const cpus = os.cpus();
    const cpuUsage = await getCpuUsage();
    const memory = await getMemoryInfo();
    const diskUsage = await getDiskUsage();

    const systemInfo: SystemInfo = {
        uptime,
        timestamp: new Date().toISOString(),
        cpu: {
            model: cpus[0].model,
            cores: cpus.length,
            speed: cpus[0].speed,
            usage: cpuUsage,
        },
        memory,
        disk: diskUsage,
    };
    return systemInfo;
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

async function getMemoryInfo() {
    const memoryInfo = { free: 0, available: 0, used: 0, total: 0 }
    try {
        const mem = await si.mem();
        memoryInfo.free = mem.free;
        memoryInfo.available = mem.available;
        memoryInfo.used = mem.used;
        memoryInfo.total = mem.total;
    } catch (error) {
        console.error('Failed to read system memory information')
    }
    return memoryInfo;
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
            size: disk.size,
            used: disk.used,
            mountedOn: disk.mount
        }));
    } catch (error) {
        console.error('Error getting disk usage:', error);
        // Fallback to the original method
        // return getDiskUsageFallback();
        return [];
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
