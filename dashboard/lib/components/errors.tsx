"use client";

import { Dispatch, SetStateAction, useEffect, useState, useMemo } from "react";
import { parseNginxErrors } from "../parse";
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
                const dateA = new Date(a[key]).getTime();
                const dateB = new Date(b[key]).getTime();
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
    formatDate: (date: Date) => string;
    getSeverityColor: (level: string) => string;
}) => {
    const isExpanded = expandedError === index;

    return (
        <>
            <tr
                className={`cursor-pointer overflow-hidden hover:text-[var(--text)] transition-colors duration-50 ease-in-out border-b text-[var(--text-muted)] border-[var(--border-color)] last:border-none ${isExpanded ? 'bg-opacity-10 !text-[var(--text)]' : ''}`}
                onClick={() => setExpandedError(isExpanded ? null : index)}
            >
                <td className="py-2 px-2 whitespace-nowrap">
                    {formatDate(error.timestamp)}
                </td>
                <td className="py-2 px-2">
                    <span className={`px-2 py-1 rounded text-xs ${getSeverityColor(error.level)}`}>
                        {error.level}
                    </span>
                </td>
                <td className="py-2 px-2 max-w-0 w-full">
                    <div className="truncate">
                        {error.message}
                    </div>
                </td>
            </tr>
            {isExpanded && (
                <tr>
                    <td colSpan={3} className="p-2 bg-opacity-5">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div><strong>PID:</strong> {error.pid}</div>
                            <div><strong>TID:</strong> {error.tid}</div>
                            <div><strong>CID:</strong> {error.cid}</div>
                            {error.clientAddress && (
                                <div><strong>Client:</strong> {error.clientAddress}</div>
                            )}
                            {error.serverAddress && (
                                <div><strong>Server:</strong> {error.serverAddress}</div>
                            )}
                            {error.host && (
                                <div><strong>Host:</strong> {error.host}</div>
                            )}
                            {error.request && (
                                <div className="col-span-2">
                                    <strong>Request:</strong> {error.request}
                                </div>
                            )}
                            {error.referrer && (
                                <div className="col-span-2">
                                    <strong>Referrer:</strong> {error.referrer}
                                </div>
                            )}
                            <div className="col-span-2">
                                <strong>Full Message:</strong>
                                <div className="mt-1 p-2 bg-opacity-10 rounded whitespace-pre-wrap">
                                    {error.message}
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
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
    const [errors, setErrors] = useState<NginxError[]>([]);
    const [expandedError, setExpandedError] = useState<number | null>(null);
    const [filtering, setFiltering] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);

    useEffect(() => {
        const start = periodStart(period);
        const parsedErrors = parseNginxErrors(errorLogs).filter(error =>
            start === null || error.timestamp >= start
        );
        setErrors(parsedErrors);
    }, [errorLogs, period]);

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
                    console.log('Errors', data)
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

    // Filter errors based on search input and selected severities
    const filteredErrors = useMemo(() => {
        let filtered = errors;

        // Filter by text search
        if (filtering) {
            const lowercaseFilter = filtering.toLowerCase();
            filtered = filtered.filter(error =>
                JSON.stringify(error).toLowerCase().includes(lowercaseFilter)
            );
        }

        // Filter by severity
        if (selectedSeverities.length > 0) {
            filtered = filtered.filter(error =>
                selectedSeverities.includes(error.level.toLowerCase())
            );
        }

        return filtered;
    }, [errors, filtering, selectedSeverities]);

    // Use custom sort hook
    const { sortedData: sortedErrors, sortConfig, requestSort } = useSortedData<NginxError>(
        filteredErrors,
        "timestamp"
    );

    // Helper functions
    const getSeverityColor = (level: string) => {
        switch (level.toLowerCase()) {
            case "error": return "bg-[var(--error)] text-[var(--card-background)]";
            case "crit": case "critical": return "bg-[var(--error)] text-[var(--card-background)]";
            case "alert": return "bg-[var(--warn)] text-[var(--card-background)]";
            case "warn": case "warning": return "bg-[var(--warn)] text-[var(--card-background)]";
            case "notice": return "bg-[var(--info)] text-[var(--card-background)]";
            case "info": return "bg-[var(--info)] text-[var(--card-background)]";
            case "debug": return "bg-[var(--info)] text-[var(--card-background)]";
            default: return "bg-gray-100 text-gray-800";
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

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('default', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).format(new Date(date));
    };

    if (errors.length === 0 && !isLoading && !fetchError) {
        return null;
    }

    return (
        <>
            {errors.length > 0 && (
                <div className="card px-4 py-3 m-3 mt-6 relative">
                    <h2 className="font-semibold mb-2">
                        Errors
                    </h2>

                    {/* Filter controls - Made responsive */}
                    {errors.length > 1 && (
                        <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:absolute sm:top-3 sm:right-3">
                            {/* Severity filter buttons */}
                            {severityLevels.length > 1 && (
                                <div className="flex text-xs text-[var(--text-muted3)] mb-2 sm:mb-0 sm:mr-2">
                                    {selectedSeverities.length > 0 && (
                                        <button
                                            className="px-[0.5em] text-[var(--text)] cursor-pointer"
                                            onClick={clearSeverityFilters}
                                        >
                                            Clear
                                        </button>
                                    )}
                                    {severityLevels.map(level => (
                                        <button
                                            key={level}
                                            className="px-[0.5em] hover:text-[var(--text)] cursor-pointer"
                                            onClick={() => toggleSeverityFilter(level)}
                                            style={{
                                                color: selectedSeverities.includes(level)
                                                    ? getSeverityFilterColor(level)
                                                    : ''
                                            }}
                                        >
                                            {level.charAt(0).toUpperCase() + level.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Text filter */}
                            <input
                                type="text"
                                placeholder={`Filter ${errors.length > 50 ? '50+' : errors.length} errors...`}
                                className="px-3 py-1 border border-[var(--border-color)] rounded text-sm placeholder-[var(--text-muted3)] bg-transparent outline-none w-full sm:w-auto"
                                value={filtering}
                                onChange={(e) => setFiltering(e.target.value)}
                                aria-label="Filter errors"
                            />
                        </div>
                    )}

                    {/* Error table - Added overflow handling wrapper */}
                    <div className="overflow-x-auto">
                        <div className="text-sm">
                            <table className="w-full border-collapse table-fixed">
                                <thead>
                                    <tr>
                                        <th
                                            className="py-2 px-2 text-left border-b border-[var(--border-color)] cursor-pointer w-36 sm:w-44"
                                            onClick={() => requestSort("timestamp")}
                                        >
                                            <div className="flex items-center">
                                                <span className="mr-2">Timestamp</span>
                                                {sortConfig.key === "timestamp" && (sortConfig.direction === "asc" ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-3">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                                                </svg>
                                                    : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-3">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                                    </svg>
                                                )}
                                            </div>
                                        </th>
                                        <th
                                            className="py-2 px-2 text-left border-b border-[var(--border-color)] cursor-pointer w-24"
                                            onClick={() => requestSort("level")}
                                        >
                                            <div className="flex items-center">
                                                <span className="mr-2">Level</span>
                                                {sortConfig.key === "level" && (sortConfig.direction === "asc" ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-3">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                                                </svg>
                                                    : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-3">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                                    </svg>
                                                )}
                                            </div>
                                        </th>
                                        <th className="py-2 px-2 text-left border-b border-[var(--border-color)]">Message</th>
                                    </tr>
                                </thead>
                                <tbody>
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
                                        <tr>
                                            <td colSpan={3} className="py-4 text-center text-[var(--text-muted3)]">
                                                No errors match the current filters
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}