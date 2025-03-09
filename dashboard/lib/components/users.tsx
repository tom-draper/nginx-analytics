'use client';

import { useEffect, useState } from "react";
import { Data } from "../types";

function getUsers(data: Data) {
    const users = new Set<string>()
    for (const row of data) {
        const userId = row.ipAddress + row.userAgent;
        if (userId) {
            users.add(userId)
        }
    }
    return users;
}

export default function Users({ data }: {data: Data}) {
    const [users, setUsers] = useState<Set<string> | null>(null);

    useEffect(() => {
        setUsers(getUsers(data))
    }, [data])

    return (
        <div className="border rounded-lg border-gray-300 flex-1 px-4 py-3 m-3">
            <h2 className="font-semibold">
                Users
            </h2>

            <div className="text-3xl font-semibold grid place-items-center">
                <div className="py-4">
                    {users ? users.size.toLocaleString() : ''}
                </div>
            </div>
        </div>
    )
}