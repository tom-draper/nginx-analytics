'use client';

import { formatBytes } from "../format";
import { SystemInfo } from "../types";

export function Storage({ resources, loading }: { resources: SystemInfo | null, loading: boolean }) {
    if (!resources) {
        return (
            <div className="card flex-2 flex flex-col px-4 py-3 m-3 relative">
                <h2 className="font-semibold text-lg">
                    Storage
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

    // Find the primary disk (largest one that's not a snap mount)
    const primaryDisk = resources.disk.find(d =>
        d.mountedOn === "/" || d.mountedOn === "/mnt/c"
    );

    const diskUsage = primaryDisk ? (primaryDisk.used / primaryDisk.size) * 100 : 0;

    // Get color based on usage percentage
    const getColorForUsage = (usage: number) => {
        if (usage < 50) return "var(--highlight)"; // green
        if (usage < 80) return "var(--warn)"; // amber
        return "var(--error)"; // red
    };

    return (
        <div className="card flex-2 px-4 py-3 m-3 relative">
            <h2 className="font-semibold text-lg">
                Storage
            </h2>

            {/* Disk Usage - Moved to the bottom as less important */}
            <div className="p-2 pt-4">
                <div className="h-2 w-full bg-[var(--hover-background)] rounded-full overflow-hidden" title={`Free: ${formatBytes((primaryDisk?.size || 0) - (primaryDisk?.used || 0), 1) || "N/A"} (${primaryDisk ? (((primaryDisk.size - primaryDisk.used) / primaryDisk.size) * 100).toFixed(1) : 0}%)`}>
                    <div
                        className="h-full rounded-full"
                        title={`Used: ${formatBytes(primaryDisk?.used || 0, 1) || "N/A"} (${diskUsage.toFixed(1)}%)`}
                        style={{
                            width: `${diskUsage}%`,
                            backgroundColor: getColorForUsage(diskUsage)
                        }}
                    ></div>
                </div>
                <div className="flex text-xs mt-1">
                    <span className="flex-1">Used: {formatBytes(primaryDisk?.used || 0, 1) || "N/A"} ({diskUsage.toFixed(1)}%)</span>
                    <span className="flex-1 text-center">Free: {formatBytes((primaryDisk?.size || 0) - (primaryDisk?.used || 0), 1) || "N/A"}</span>
                    <span className="flex-1 text-right">Total: {formatBytes((primaryDisk?.size || 0), 1) || "N/A"}</span>
                </div>
            </div>
        </div>
    );
}