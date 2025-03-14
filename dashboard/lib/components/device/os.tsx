"use client";

import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartData } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { NginxLog } from "../../types";
import { useEffect, useState } from "react";
import {
    type Candidate,
    maintainCandidates,
} from '../../candidates';

ChartJS.register(ArcElement, Tooltip, Legend);


const osCandidates: Candidate[] = [
    { name: 'Windows 3.11', regex: /Win16/, matches: 0 },
    {
        name: 'Windows 95',
        regex: /(Windows 95)|(Win95)|(Windows_95)/,
        matches: 0,
    },
    { name: 'Windows 98', regex: /(Windows 98)|(Win98)/, matches: 0 },
    {
        name: 'Windows 2000',
        regex: /(Windows NT 5.0)|(Windows 2000)/,
        matches: 0,
    },
    {
        name: 'Windows XP',
        regex: /(Windows NT 5.1)|(Windows XP)/,
        matches: 0,
    },
    { name: 'Windows Server 2003', regex: /(Windows NT 5.2)/, matches: 0 },
    { name: 'Windows Vista', regex: /(Windows NT 6.0)/, matches: 0 },
    { name: 'Windows 7', regex: /(Windows NT 6.1)/, matches: 0 },
    { name: 'Windows 8', regex: /(Windows NT 6.2)/, matches: 0 },
    { name: 'Windows 10/11', regex: /(Windows NT 10.0)/, matches: 0 },
    {
        name: 'Windows NT 4.0',
        regex: /(Windows NT 4.0)|(WinNT4.0)|(WinNT)|(Windows NT)/,
        matches: 0,
    },
    { name: 'Windows ME', regex: /Windows ME/, matches: 0 },
    { name: 'OpenBSD', regex: /OpenBSD/, matches: 0 },
    { name: 'SunOS', regex: /SunOS/, matches: 0 },
    { name: 'Android', regex: /Android/, matches: 0 },
    { name: 'Linux', regex: /(Linux)|(X11)/, matches: 0 },
    { name: 'MacOS', regex: /(Mac_PowerPC)|(Macintosh)/, matches: 0 },
    { name: 'QNX', regex: /QNX/, matches: 0 },
    { name: 'iOS', regex: /iPhone OS/, matches: 0 },
    { name: 'BeOS', regex: /BeOS/, matches: 0 },
    { name: 'OS/2', regex: /OS\/2/, matches: 0 },
    {
        name: 'Search Bot',
        regex: /(APIs-Google)|(AdsBot)|(nuhk)|(Googlebot)|(Storebot)|(Google-Site-Verification)|(Mediapartners)|(Yammybot)|(Openbot)|(Slurp)|(MSNBot)|(Ask Jeeves\/Teoma)|(ia_archiver)/,
        matches: 0,
    },
];


function getOS(userAgent: string | null): string {
    if (userAgent === null) {
        return 'Unknown';
    }

    for (let i = 0; i < osCandidates.length; i++) {
        const candidate = osCandidates[i];
        if (userAgent.match(candidate.regex)) {
            candidate.matches++;
            // Ensure osCandidates remains sorted by matches desc for future hits
            maintainCandidates(i, osCandidates);
            return candidate.name;
        }
    }

    return 'Other';
}

export function OS({ data }: { data: NginxLog[] }) {
    const [plotData, setPlotData] = useState<ChartData<"doughnut"> | null>(null);

    useEffect(() => {
        const osCounts: { [key: string]: number } = {};

        for (const row of data) {
            const os = getOS(row.userAgent)
            if (!osCounts[os]) {
                osCounts[os] = 0
            }
            osCounts[os]++;
        }

        const labels = Object.keys(osCounts);
        const values = Object.values(osCounts);

        setPlotData({
            labels,
            datasets: [
                {
                    label: "Count",
                    data: values,
                    backgroundColor: [
                        "#FF6384",
                        "#36A2EB",
                        "#FFCE56",
                        "#4BC0C0",
                        "#9966FF",
                        "#FF9F40",
                    ],
                    hoverOffset: 4,
                    borderWidth: 0,
                },
            ],
        });
    }, [data]);

    return (
        <div className="relative w-full flex items-center justify-center pb-4" >
            {plotData && <Doughnut data={plotData} options={{
                plugins: {
                    legend: {
                        position: 'right', // Moves legend to the right side
                        align: 'center',
                    },
                },
                responsive: true,
                maintainAspectRatio: false
            }} />}
        </div>
    );
}
