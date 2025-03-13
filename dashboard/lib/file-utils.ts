import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);

export async function getLogFileSizes(directoryPath: string = '/var/log/nginx/'): Promise<Array<{ name: string; size: number; extension: string; }>> {
    try {
        // Read all files in the directory
        const files = await readdir(directoryPath);

        // Filter for .log and .gz files
        const logFiles = files.filter(file => file.endsWith('.log') || file.endsWith('.gz'));

        // Get file stats for each file
        const fileStats = await Promise.all(
            logFiles.map(async (filename) => {
                const filePath = path.join(directoryPath, filename);
                const stats = await stat(filePath);

                // Get file extension
                const extension = path.extname(filename);

                return {
                    name: filename,
                    size: stats.size, // Raw size in bytes
                    extension,
                    lastModified: stats.mtime
                };
            })
        );

        return fileStats;
    } catch (error) {
        console.error('Error reading log directory:', error);
        return [];
    }
}

// function formatFileSize(bytes: number) {
//     if (bytes === 0) return '0 Bytes';

//     const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
//     const i = Math.floor(Math.log(bytes) / Math.log(1024));

//     return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
// }

export function getLogSizeSummary(files: any[]) {
    const summary = {
        totalSize: 0,
        logFilesSize: 0,
        compressedFilesSize: 0,
        totalFiles: files.length,
        logFilesCount: 0,
        compressedFilesCount: 0
    };

    files.forEach(file => {
        summary.totalSize += file.size;

        if (file.extension === '.log') {
            summary.logFilesSize += file.size;
            summary.logFilesCount++;
        } else if (file.extension === '.gz') {
            summary.compressedFilesSize += file.size;
            summary.compressedFilesCount++;
        }
    });

    return summary;
}