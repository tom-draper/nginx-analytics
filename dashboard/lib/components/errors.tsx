"use client";

import { useEffect, useState } from "react";
import { parseNginxErrors } from "../parse";
import { NginxError } from "../types";


export default function Errors({ fileUpload }: { fileUpload: boolean }) {
    const [errorLogs, setErrorLogs] = useState<string[]>([]);
    const [errors, setErrors] = useState<NginxError[]>([]);

    useEffect(() => {
        const fetchErrors = async () => {
            try {
                const res = await fetch(`/api/logs?type=error&position=${position}`);
                if (!res.ok) {
                    console.log('Failed to fetch Nginx errors from server')
                    if (interval && res.status === 404) {
                        clearInterval(interval);
                    }
                    return;
                }
                const data = await res.json();

                console.log(data);
                if (data.logs) {
                    setErrorLogs((prevLogs) => [...prevLogs, ...data.logs]);
                    position = parseInt(data.position)
                }
            } catch (error) {
                console.error("Error fetching system resources:", error);
            }
        };

        let position = 0;
        let interval: NodeJS.Timeout;
        if (!fileUpload) {
            fetchErrors();
            interval = setInterval(fetchErrors, 30000); // Polling every 30s
            return () => clearInterval(interval);
        }
    }, []);

    useEffect(() => {
        const errors = parseNginxErrors(errorLogs)
        if (errors.length) {
            setErrors(errors);
        }
    }, [errorLogs])

    return (
        <>
            {(errors !== null && errors.length > 0) && (
                <div className="card flex-1 px-4 py-3 m-3">
                    <h2 className="font-semibold">
                        Errors
                    </h2>

                    <div>

                    </div>
                </div>
            )}
        </>
    )
}