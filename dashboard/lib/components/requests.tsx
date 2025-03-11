'use client';

import { useEffect, useState } from "react";
import { Data } from "../types";

export function Requests({ data }: { data: Data }) {
    const [count, setCount] = useState(data.length);

    useEffect(() => {
        setCount(data.length);
    }, [data]);

    return (
        <div className="card flex-1 px-4 py-3 m-3">
            <h2 className="font-semibold">
                Requests
            </h2>

            <div className="text-3xl font-semibold grid place-items-center">
                <div className="py-4 text-[var(--text-tinted)]">
                    {count.toLocaleString()}
                </div>
            </div>
        </div>
    )
}