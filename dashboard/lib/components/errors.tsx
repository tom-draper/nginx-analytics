"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { parseNginxErrors } from "../parse";
import { NginxError } from "../types";
import React from "react";

export default function Errors({ errorLogs, setErrorLogs, noFetch }: { errorLogs: string[], setErrorLogs: Dispatch<SetStateAction<string[]>>, noFetch: boolean }) {
    const [errors, setErrors] = useState<NginxError[]>([]);
    const [expandedError, setExpandedError] = useState<number | null>(null);
    const [filtering, setFiltering] = useState<string>("");
    const [sortBy, setSortBy] = useState<keyof NginxError>("timestamp");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

    useEffect(() => {
        if (noFetch) {
            return;
        }

        let position = 0;
        const fetchErrors = async () => {
            try {
                const response = await fetch(`/api/logs?type=error&position=${position}`);
                if (!response.ok) {
                    console.log('Failed to fetch Nginx errors from server')
                    if (intervalId && response.status === 404) {
                        clearInterval(intervalId);
                    }
                    return;
                }
                const data = await response.json();

                if (data.logs) {
                    setErrorLogs((prevLogs) => [...prevLogs, ...data.logs]);
                    position = parseInt(data.position);
                }
            } catch (error) {
                console.error("Error fetching system resources:", error);
            }
        };

        fetchErrors();
        const intervalId = setInterval(fetchErrors, 30000); // Polling every 30s
        return () => clearInterval(intervalId);
    }, [setErrorLogs, noFetch]);

    useEffect(() => {
        const parsedErrors = parseNginxErrors(errorLogs);
        if (parsedErrors.length) {
            setErrors(parsedErrors);
        }
    }, [errorLogs]);

    const handleSort = (field: keyof NginxError) => {
        if (sortBy === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortBy(field);
            setSortDirection("desc");
        }
    };

    const filteredErrors = errors.filter(error => {
        if (!filtering) return true;
        return JSON.stringify(error).toLowerCase().includes(filtering.toLowerCase());
    });

    const sortedErrors = [...filteredErrors].sort((a, b) => {
        if (sortBy === "timestamp") {
            const dateA = new Date(a.timestamp).getTime();
            const dateB = new Date(b.timestamp).getTime();
            return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
        }

        if (a[sortBy] === undefined) {
            return sortDirection === "asc" ? -1 : 1;
        }
        if (b[sortBy] === undefined) {
            return sortDirection === "asc" ? 1 : -1;
        }

        if (a[sortBy] < b[sortBy]) {
            return sortDirection === "asc" ? -1 : 1;
        }
        if (a[sortBy] > b[sortBy]) {
            return sortDirection === "asc" ? 1 : -1;
        }
        return 0;
    });

    const getSeverityColor = (level: string) => {
        switch (level.toLowerCase()) {
            case "error": return "bg-red-100 text-red-800";
            case "warn": case "warning": return "bg-yellow-100 text-yellow-800";
            case "info": return "bg-blue-100 text-blue-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleString();
    };

    if (errors.length === 0) {
        return null;
    }

    return (
        <div className="card  px-4 py-3 m-3 mt-6 relative">
            <h2 className="font-semibold mb-4">
                Errors ({filteredErrors.length})
            </h2>
            <div className="absolute top-3 right-3 flex justify-between items-center mb-4">
                <div className="flex space-x-2">
                    <input
                        type="text"
                        placeholder="Filter errors..."
                        className="px-2 py-1 border border-[var(--border-color)] rounded text-sm"
                        value={filtering}
                        onChange={(e) => setFiltering(e.target.value)}
                    />
                </div>
            </div>

            {filteredErrors.length > 0 ? (
                <div className="overflow-auto max-h-96 text-sm">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="">
                                <th className="p-2 text-left border-b border-[var(--border-color)] cursor-pointer" onClick={() => handleSort("timestamp")}>
                                    Timestamp {sortBy === "timestamp" && (sortDirection === "asc" ? "↑" : "↓")}
                                </th>
                                <th className="p-2 text-left border-b border-[var(--border-color)] cursor-pointer" onClick={() => handleSort("level")}>
                                    Level {sortBy === "level" && (sortDirection === "asc" ? "↑" : "↓")}
                                </th>
                                <th className="p-2 text-left border-b border-[var(--border-color)]">Message</th>
                                {/* <th className="p-2 text-left border-b border-[var(--border-color)]">Actions</th> */}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedErrors.map((error, index) => (
                                <React.Fragment key={index}>
                                    <tr className="cursor-pointer" onClick={() => setExpandedError(expandedError === index ? null : index)}>
                                        <td className="p-2 border-b border-[var(--border-color)] whitespace-nowrap">{formatDate(error.timestamp)}</td>
                                        <td className="p-2 border-b border-[var(--border-color)]">
                                            <span className={`px-2 py-1 rounded text-xs ${getSeverityColor(error.level)}`}>
                                                {error.level}
                                            </span>
                                        </td>
                                        <td className="p-2 border-b border-[var(--border-color)]">
                                            <div className="truncate max-w-2xl">{error.message}</div>
                                        </td>
                                        {/* <td className="p-2 border-b border-[var(--border-color)] whitespace-nowrap">
                                            <button
                                                className="text-[var(--info)] hover:text-blue-800"
                                                onClick={() => setExpandedError(expandedError === index ? null : index)}
                                            >
                                                {expandedError === index ? "Hide Details" : "Show Details"}
                                            </button>
                                        </td> */}
                                    </tr>
                                    {expandedError === index && (
                                        <tr>
                                            <td colSpan={4} className="p-2 border-b border-[var(--border-color)]">
                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    <div>
                                                        <strong>PID:</strong> {error.pid}
                                                    </div>
                                                    <div>
                                                        <strong>TID:</strong> {error.tid}
                                                    </div>
                                                    <div>
                                                        <strong>CID:</strong> {error.cid}
                                                    </div>
                                                    {error.clientAddress && (
                                                        <div>
                                                            <strong>Client:</strong> {error.clientAddress}
                                                        </div>
                                                    )}
                                                    {error.serverAddress && (
                                                        <div>
                                                            <strong>Server:</strong> {error.serverAddress}
                                                        </div>
                                                    )}
                                                    {error.host && (
                                                        <div>
                                                            <strong>Host:</strong> {error.host}
                                                        </div>
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
                                                        <div className="mt-1 p-2 rounded whitespace-pre-wrap">
                                                            {error.message}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-4 text-gray-500">
                    No errors match your filter criteria
                </div>
            )}
        </div>
    );
}