'use client';

import { useEffect, useState } from "react";
import { Data } from "../types";

type Referral = {
    referrer: string
    count: number
}

export function Referrals({ data, filterReferrer, setFilterReferrer }: { data: Data, filterReferrer: string | null, setFilterReferrer: (referrer: string | null) => void }) {
    const [referrals, setReferrals] = useState<Referral[]>([])

    useEffect(() => {
        const referrerCount: { [referer: string]: number } = {};
        for (const row of data) {
            if (!row.referer) {
                continue;
            }

            if (!referrerCount[row.referer]) {
                referrerCount[row.referer] = 0;
            }
            referrerCount[row.referer]++;
        }

        const referrals = Object.entries(referrerCount).sort((a, b) => b[1] - a[1]).slice(0, 50).map(([referrer, count]) => ({ referrer, count }));
        setReferrals(referrals);
    }, [data])

    const selectReferrer = (referrer: string) => {
        if (referrer === filterReferrer) {
            setFilterReferrer(null)
        } else {
            setFilterReferrer(referrer)
        }
    }

    return (
        <>
            {referrals.length > 0 && (
                <div className="border rounded-lg border-gray-300 flex-1 px-4 py-3 m-3 min-w-[24rem]">
                    <h2 className="font-semibold">
                        Referrals
                    </h2>
                    <div className="mt-2">
                        {referrals.map((endpoint, index) => (
                            <button key={index} className="bg-gray-100 my-2 rounded w-full relative cursor-pointer flex items-center" onClick={() => selectReferrer(endpoint.referrer)}>
                                <span className="text-sm flex items-center mx-2 z-50 py-[2px]">
                                    <span className="pr-1">
                                        {endpoint.count.toLocaleString()}
                                    </span>
                                    <span className="px-1 text-gray-600 text-left break-words">
                                        {endpoint.referrer ?? ''}
                                    </span>
                                </span>

                                <div className="bg-[var(--other-green)] h-full rounded absolute inset-0" style={{
                                    width: `${(endpoint.count / referrals[0].count) * 100}%`
                                }}></div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </>
    )
}