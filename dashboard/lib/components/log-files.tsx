'use client';

import { formatBytes } from "../format";
import { LogSizes } from "../types";

export function LogFiles({ logSizes, loading }: { logSizes: LogSizes, loading: boolean }) {
    if (!logSizes) {
        return (
            <div className="card flex-2 flex flex-col px-4 py-3 m-3 relative">
                <h2 className="font-semibold text-lg">
                    Log Files
                </h2>
                <div className="flex-1 grid place-items-center">
                    {loading ? (
                        <div className="flex-1 rounded mx-1 my-1 pb-4 grid place-items-center">
                            <div className="spinner"></div>
                        </div>
                    ) : (
                        <div className="flex-1 rounded mx-1 my-1 grid place-items-center" title={`No locations found`}>
                            <div className="text-[var(--text-muted3)] pb-2">Failed to fetch resources</div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const colors = [
        'var(--highlight)',
        'var(--warn)',
        '#FF6485',
        'yellow'
    ]

    return (
        <div className="card flex-2 px-4 py-3 m-3 relative">
            <h2 className="font-semibold text-lg">
                Log Files
            </h2>

            {/* Disk Usage - Moved to the bottom as less important */}
            <div className="p-2 pt-4">
                <div className="h-2 w-full bg-[var(--hover-background)] rounded-full overflow-hidden flex">
                    {logSizes.files.map((file, index) => (
                        <div
                            key={index}
                            className="h-full"
                            title={file.name}
                            style={{
                                width: `${(file.size / logSizes.summary.totalSize) * 100}%`,
                                backgroundColor: colors[index]
                            }}
                        ></div>
                    ))}
                </div>
                <div className="flex justify-between text-xs mt-1">
                    <span>Files: {logSizes.summary.totalFiles} </span>
                    {/* <span>Since: {logSizes.summary.totalFiles}</span> */}
                    <span>Total: {formatBytes(logSizes.summary.totalSize, 1)}</span>
                </div>
            </div>
        </div>
    );
}