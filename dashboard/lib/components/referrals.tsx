'use client';

import { useMemo, memo } from "react";
import { NginxLog } from "../types";

type Referral = {
    referrer: string
    count: number
}

export const Referrals = memo(function Referrals({ data, filterReferrer, setFilterReferrer }: { data: NginxLog[], filterReferrer: string | null, setFilterReferrer: (referrer: string | null) => void }) {
    const referrals = useMemo(() => {
        const referrerCount: { [referer: string]: number } = {};
        for (const row of data) {
            if (!row.referrer || row.referrer === '-') {
                continue;
            }

            if (!referrerCount[row.referrer]) {
                referrerCount[row.referrer] = 0;
            }
            referrerCount[row.referrer]++;
        }

        return Object.entries(referrerCount).sort((a, b) => b[1] - a[1]).slice(0, 50).map(([referrer, count]) => ({ referrer, count }));
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
                <div className="w-[27em] max-xl:w-full" style={{ height: 'calc(100% - 1.5rem)' }}>
                    <div className="card flex-1 px-4 py-3 m-3 h-full">
                        <h2 className="font-semibold">
                            Referrals
                        </h2>
                        <div className="mt-3">
                            {referrals.map((endpoint, index) => (
                                <button key={index} className="hover:bg-[var(--hover-background)] my-2 rounded w-full relative cursor-pointer flex items-center text-[var(--text-muted3)]" onClick={() => selectReferrer(endpoint.referrer)}>
                                    <span className="text-sm flex items-center mx-2 z-10 py-[2px]">
                                        <span className="pr-1 font-semibold">
                                            {endpoint.count.toLocaleString()}
                                        </span>
                                        <span className="px-1 text-left break-words break-all">
                                            {endpoint.referrer ?? ''}
                                        </span>
                                    </span>

                                    <div className="bg-[var(--highlight)] h-full rounded absolute inset-0" style={{
                                        width: `${(endpoint.count / referrals[0].count) * 100}%`
                                    }}></div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

            )}
        </>
    )
})