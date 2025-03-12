'use client';

import { useEffect, useState } from "react";

export function SystemResources() {
    const [resources, setResources] = useState<object | null>(null)

    useEffect(() => {
        const fetchData = async () => {
                const res = await fetch(`/api/system`);
                if (!res.ok) {
                    throw new Error("Failed to fetch system resources");
                }
                const data = await res.json();
                setResources(data);
                console.log('data', data);
            }

        fetchData();
    }, [])

    return (
        <div className="card flex-2 px-4 py-3 m-3">
            <h2 className="font-semibold">
                System Resources
            </h2>

            <div className="flex mt-2 pb-40">

            </div>
        </div>
    )
}

    
