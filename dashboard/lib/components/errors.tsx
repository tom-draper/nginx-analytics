"use client";

import { Dispatch, SetStateAction, useEffect, useRef, useState, useMemo } from "react";
import { NginxError } from "../types";
import { Period, periodStart } from "../period";
import { generateNginxErrorLogs } from "../demo";

// Separate the sorting logic into a custom hook for better reusability
const useSortedData = <T extends Record<string, any>>(
    data: T[],
    defaultSortKey: keyof T,
    defaultDirection: "asc" | "desc" = "desc"
) => {
    const [sortConfig, setSortConfig] = useState<{
        key: keyof T;
        direction: "asc" | "desc";
    }>({
        key: defaultSortKey,
        direction: defaultDirection,
    });

    const sortedData = useMemo(() => {
        return [...data].sort((a, b) => {
            const { key, direction } = sortConfig;

            // Handle dates specially
            if (key === "timestamp") {
                const dateA = a[key];
                const dateB = b[key];
                return direction === "asc" ? dateA - dateB : dateB - dateA;
            }

            // Handle undefined values
            if (a[key] === undefined) return direction === "asc" ? -1 : 1;
            if (b[key] === undefined) return direction === "asc" ? 1 : -1;

            // Standard comparison
            if (a[key] < b[key]) return direction === "asc" ? -1 : 1;
            if (a[key] > b[key]) return direction === "asc" ? 1 : -1;
            return 0;
        });
    }, [data, sortConfig]);

    const requestSort = (key: keyof T) => {
        setSortConfig((prevConfig) => ({
            key,
            direction: prevConfig.key === key && prevConfig.direction === "desc" ? "asc" : "desc",
        }));
    };

    return { sortedData, sortConfig, requestSort };
};

const dateFormatter = new Intl.DateTimeFormat('default', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
});

const SortIndicator = ({
    active,
    direction,
}: {
    active: boolean;
    direction: "asc" | "desc";
}) => {
    if (!active) return null;
    return <span className="text-[10px] text-[var(--text-muted3)]">{direction === "asc" ? "Asc" : "Desc"}</span>;
};

const DetailItem = ({
    label,
    value,
    wide = false,
}: {
    label: string;
    value: string | number | undefined;
    wide?: boolean;
}) => {
    if (value === undefined || value === '') return null;

    return (
        <div className={wide ? "sm:col-span-2" : ""}>
            <div className="mb-1 text-[11px] uppercase tracking-normal text-[var(--text-muted3)]">{label}</div>
            <div className="min-w-0 break-words rounded border border-[var(--border-color)] bg-[var(--background)] px-2 py-1.5 text-[var(--text-muted4)]">
                {value}
            </div>
        </div>
    );
};

// Error row component
const ErrorRow = ({
    error,
    index,
    expandedError,
    setExpandedError,
    formatDate,
    getSeverityColor
}: {
    error: NginxError;
    index: number;
    expandedError: number | null;
    setExpandedError: (index: number | null) => void;
    formatDate: (date: number) => string;
    getSeverityColor: (level: string) => string;
}) => {
    const isExpanded = expandedError === index;
    const severityColor = getSeverityColor(error.level);

    return (
        <div className={`border-b border-[var(--border-color)] last:border-none ${isExpanded ? 'bg-[var(--background)]' : ''}`}>
            <button
                className="grid w-full cursor-pointer grid-cols-1 gap-2 px-2 py-2.5 text-left text-sm text-[var(--text-muted4)] transition-colors duration-50 ease-in-out hover:bg-[var(--hover-background)] hover:text-[var(--text)] sm:grid-cols-[10rem_5rem_minmax(0,1fr)] sm:items-center"
                onClick={() => setExpandedError(isExpanded ? null : index)}
            >
                <div className="whitespace-nowrap text-xs text-[var(--text-muted3)]">
                    {formatDate(error.timestamp)}
                </div>
                <div>
                    <span
                        className="inline-flex min-w-14 justify-center rounded border px-2 py-0.5 text-[11px] font-medium uppercase"
                        style={{
                            color: severityColor,
                            borderColor: severityColor,
                            backgroundColor: `color-mix(in srgb, ${severityColor} 12%, transparent)`,
                        }}
                    >
                        {error.level}
                    </span>
                </div>
                <div className="min-w-0 truncate">
                    {error.message}
                </div>
            </button>
            {isExpanded && (
                <div className="px-2 pb-3 text-sm">
                    <div className="grid gap-2 sm:grid-cols-2">
                        <DetailItem label="PID" value={error.pid} />
                        <DetailItem label="TID" value={error.tid} />
                        <DetailItem label="CID" value={error.cid} />
                        <DetailItem label="Client" value={error.clientAddress} />
                        <DetailItem label="Server" value={error.serverAddress} />
                        <DetailItem label="Host" value={error.host} />
                        <DetailItem label="Request" value={error.request} wide />
                        <DetailItem label="Referrer" value={error.referrer} wide />
                        <DetailItem label="Message" value={error.message} wide />
                    </div>
                </div>
            )}
        </div>
    );
};

export default function Errors({
    errorLogs,
    setErrorLogs,
    period,
    noFetch,
    demo
}: {
    errorLogs: string[];
    setErrorLogs: Dispatch<SetStateAction<string[]>>;
    period: Period;
    noFetch: boolean;
    demo: boolean;
}) {
    const [parsedErrors, setParsedErrors] = useState<NginxError[]>([]);
    const parsedErrorCount = useRef(0);
    const errorBatchIdRef = useRef(0);
    const errorWorkerRef = useRef<Worker | null>(null);
    const [expandedError, setExpandedError] = useState<number | null>(null);
    const [filtering, setFiltering] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);

    useEffect(() => {
        const worker = new Worker(new URL('../workers/error-parse.worker.ts', import.meta.url));
        errorWorkerRef.current = worker;
        worker.onmessage = (e: MessageEvent<{ parsed: NginxError[]; batchId: number }>) => {
            const { parsed, batchId } = e.data;
            if (batchId !== errorBatchIdRef.current || parsed.length === 0) return;
            setParsedErrors(prev => [...prev, ...parsed]);
        };
        return () => worker.terminate();
    }, []);

    useEffect(() => {
        if (errorLogs.length <= parsedErrorCount.current || !errorWorkerRef.current) return;
        const newRawLogs = errorLogs.slice(parsedErrorCount.current);
        parsedErrorCount.current = errorLogs.length;
        errorBatchIdRef.current++;
        errorWorkerRef.current.postMessage({ logs: newRawLogs, batchId: errorBatchIdRef.current });
    }, [errorLogs]);

    const errors = useMemo(() => {
        const start = periodStart(period);
        return start === null ? parsedErrors : parsedErrors.filter(e => e.timestamp >= start);
    }, [parsedErrors, period]);

    useEffect(() => {
        if (noFetch) {
            return;
        }

        if (demo) {
            const demoErrorLogs = generateNginxErrorLogs({ count: 7, startDate: new Date('2023-01-01') });
            setErrorLogs(demoErrorLogs)
            return;
        }

        let positions: Array<{ filename: string, position: number }> | null = null;
        let includeCompressed = true;

        const fetchErrors = async () => {
            setIsLoading(true);
            setFetchError(null);

            try {
                const url = getUrl(positions, includeCompressed);
                const response = await fetch(url);

                if (!response.ok) {
                    if (interval && (response.status === 403 || response.status === 404)) {
                        clearInterval(interval);
                        return;
                    }
                    setFetchError(`Error ${response.status}: ${response.statusText}`);
                    throw new Error("Failed to error logs");
                }

                const data = await response.json();

                if (data.logs && data.logs.length > 0) {
                    setErrorLogs(prevLogs => [...prevLogs, ...data.logs]);

                    if (data.positions) {
                        positions = data.positions;
                    }
                    includeCompressed = false;
                }

                if (data.complete) {
                    clearInterval(interval);
                }
            } catch (error) {
                console.error("Error fetching error logs:", error);
                setFetchError("Network error occurred while fetching logs");
            }

            setIsLoading(false);
        };

        fetchErrors();
        const interval = setInterval(fetchErrors, 30000);
        return () => { clearInterval(interval) };
    }, [setErrorLogs, noFetch, demo]);

    const getUrl = (positions: {
        filename: string;
        position: number;
    }[] | null, includeCompressed: boolean) => {
        let url = `/api/logs/error?includeCompressed=${includeCompressed}`;
        if (positions) {
            url += `&positions=${encodeURIComponent(JSON.stringify(positions))}`;
        }
        return url;
    }

    // Get unique severity levels for filter buttons
    const severityLevels = useMemo(() => {
        const levels = new Set<string>();
        errors.forEach(error => levels.add(error.level.toLowerCase()));
        return Array.from(levels);
    }, [errors]);

    // Toggle severity filter
    const toggleSeverityFilter = (severity: string) => {
        setSelectedSeverities(prev => {
            if (prev.includes(severity)) {
                return prev.filter(s => s !== severity);
            } else {
                return [...prev, severity];
            }
        });
    };

    // Clear severity filters
    const clearSeverityFilters = () => {
        setSelectedSeverities([]);
    };

    // Pre-compute a searchable string per error so filtering doesn't need to
    // JSON.stringify on every keystroke.
    const errorSearchStrings = useMemo(() =>
        errors.map(e => [
            e.level, e.message,
            e.clientAddress ?? '', e.serverAddress ?? '',
            e.request ?? '', e.referrer ?? '', e.host ?? '',
        ].join(' ').toLowerCase()),
    [errors]);

    // Filter errors based on search input and selected severities
    const filteredErrors = useMemo(() => {
        let filtered = errors;

        // Filter by text search
        if (filtering) {
            const lowercaseFilter = filtering.toLowerCase();
            filtered = errors.filter((_, i) => errorSearchStrings[i].includes(lowercaseFilter));
        }

        // Filter by severity
        if (selectedSeverities.length > 0) {
            filtered = filtered.filter(error =>
                selectedSeverities.includes(error.level.toLowerCase())
            );
        }

        return filtered;
    }, [errors, errorSearchStrings, filtering, selectedSeverities]);

    // Use custom sort hook
    const { sortedData: sortedErrors, sortConfig, requestSort } = useSortedData<NginxError>(
        filteredErrors,
        "timestamp"
    );

    // Helper functions
    const getSeverityColor = (level: string) => {
        switch (level.toLowerCase()) {
            case "error": return "var(--error)";
            case "crit": case "critical": return "var(--error)";
            case "alert": return "var(--warn)";
            case "warn": case "warning": return "var(--warn)";
            case "notice": return "var(--info)";
            case "info": return "var(--info)";
            case "debug": return "var(--info)";
            default: return "var(--text-muted)";
        }
    };

    const getSeverityFilterColor = (level: string) => {
        switch (level.toLowerCase()) {
            case "error": case "crit": case "critical": return "var(--error)";
            case "alert": case "warn": case "warning": return "var(--warn)";
            case "notice": case "info": case "debug": return "var(--info)";
            default: return "var(--text-muted)";
        }
    };

    const formatDate = (date: number) => dateFormatter.format(date);

    if (errors.length === 0 && !isLoading && !fetchError) {
        return null;
    }

    return (
        <>
            {errors.length > 0 && (
                <div className="card px-4 py-3 m-3 mt-6 relative">
                    <div className="mb-3 flex flex-col gap-3 min-[850px]:flex-row min-[850px]:items-center min-[850px]:justify-between">
                        <div className="flex items-baseline gap-3">
                            <h2 className="font-semibold text-sm">Errors</h2>
                            <span className="text-xs text-[var(--text-muted3)]">
                                {filteredErrors.length.toLocaleString()} of {errors.length.toLocaleString()}
                            </span>
                        </div>

                        {errors.length > 1 && (
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                {severityLevels.length > 1 && (
                                    <div className="flex flex-wrap gap-1 text-xs text-[var(--text-muted3)]">
                                        {selectedSeverities.length > 0 && (
                                            <button
                                                className="rounded px-2 py-1 text-[var(--text)] hover:bg-[var(--hover-background)] cursor-pointer"
                                                onClick={clearSeverityFilters}
                                            >
                                                Clear
                                            </button>
                                        )}
                                        {severityLevels.map(level => (
                                            <button
                                                key={level}
                                                className="rounded border border-[var(--border-color)] px-2 py-1 hover:text-[var(--text)] cursor-pointer"
                                                onClick={() => toggleSeverityFilter(level)}
                                                style={{
                                                    color: selectedSeverities.includes(level)
                                                        ? getSeverityFilterColor(level)
                                                        : '',
                                                    borderColor: selectedSeverities.includes(level)
                                                        ? getSeverityFilterColor(level)
                                                        : '',
                                                }}
                                            >
                                                {level.charAt(0).toUpperCase() + level.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <input
                                    type="text"
                                    placeholder="Filter errors"
                                    className="w-full rounded border border-[var(--border-color)] bg-transparent px-3 py-1 text-sm outline-none placeholder-[var(--text-muted3)] sm:w-44"
                                    value={filtering}
                                    onChange={(e) => setFiltering(e.target.value)}
                                    aria-label="Filter errors"
                                />
                            </div>
                        )}
                    </div>

                    <div className="mb-1 grid grid-cols-1 gap-2 border-b border-[var(--border-color)] px-2 pb-2 text-xs text-[var(--text-muted3)] sm:grid-cols-[10rem_5rem_minmax(0,1fr)]">
                        <button
                            className="flex cursor-pointer items-center gap-2 text-left hover:text-[var(--text)]"
                            onClick={() => requestSort("timestamp")}
                        >
                            Time
                            <SortIndicator active={sortConfig.key === "timestamp"} direction={sortConfig.direction} />
                        </button>
                        <button
                            className="flex cursor-pointer items-center gap-2 text-left hover:text-[var(--text)]"
                            onClick={() => requestSort("level")}
                        >
                            Level
                            <SortIndicator active={sortConfig.key === "level"} direction={sortConfig.direction} />
                        </button>
                        <div>Message</div>
                    </div>

                    <div className="overflow-hidden rounded">
                        {sortedErrors.length > 0 ? (
                            sortedErrors.slice(0, 50).map((error, index) => (
                                <ErrorRow
                                    key={`${error.timestamp}-${index}`}
                                    error={error}
                                    index={index}
                                    expandedError={expandedError}
                                    setExpandedError={setExpandedError}
                                    formatDate={formatDate}
                                    getSeverityColor={getSeverityColor}
                                />
                            ))
                        ) : (
                            <div className="py-5 text-center text-sm text-[var(--text-muted3)]">
                                No errors match the current filters
                            </div>
                        )}
                    </div>

                    {sortedErrors.length > 50 && (
                        <div className="pt-2 text-center text-xs text-[var(--text-muted3)]">
                            Showing 50 of {sortedErrors.length.toLocaleString()} matching errors
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
