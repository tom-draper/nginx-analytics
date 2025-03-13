'use client';

export function Storage({ resources, loading }: { resources: any, loading: boolean }) {
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

    const diskUsage = primaryDisk ? parseInt(primaryDisk.usedPercentage) : 0;

    // Get color based on usage percentage
    const getColorForUsage = (usage) => {
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
                <div className="h-2 w-full bg-[var(--hover-background)] rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full"
                        style={{
                            width: `${diskUsage}%`,
                            backgroundColor: getColorForUsage(diskUsage)
                        }}
                    ></div>
                </div>
                <div className="flex justify-between text-xs mt-1">
                    <span>Used: {primaryDisk?.used || "N/A"} ({diskUsage}%)</span>
                    <span>Free: {primaryDisk?.available || "N/A"}</span>
                    <span>Total: {primaryDisk?.size || "N/A"}</span>
                </div>
            </div>
        </div>
    );
}