import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);

/**
 * Gets sizes of all .log and .gz files in a directory
 * @param {string} directoryPath - Path to the log directory
 * @returns {Promise<Array<{name: string, size: number, sizeFormatted: string, extension: string}>>}
 */
export async function getLogFileSizes(directoryPath = '/var/log/nginx/') {
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

                // Format size in readable format
                const sizeFormatted = formatFileSize(stats.size);

                // Get file extension
                const extension = path.extname(filename);

                return {
                    name: filename,
                    size: stats.size, // Raw size in bytes
                    sizeFormatted,    // Human-readable size
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

/**
 * Formats file size to human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get summary of log file sizes grouped by type
 * @param {Array} files - Array of file objects with size information
 * @returns {Object} Summary object with total sizes
 */
export function getLogSizeSummary(files) {
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

    // Format the summary sizes
    summary.totalSizeFormatted = formatFileSize(summary.totalSize);
    summary.logFilesSizeFormatted = formatFileSize(summary.logFilesSize);
    summary.compressedFilesSizeFormatted = formatFileSize(summary.compressedFilesSize);

    return summary;
}