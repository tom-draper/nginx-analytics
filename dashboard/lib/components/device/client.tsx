"use client";

import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartData, ChartEvent, LegendItem } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { NginxLog } from "../../types";
import { useMemo, memo } from "react";
import {
    type Candidate,
    maintainCandidates,
} from '../../candidates';
import { DONUT_COLORS, dimColor } from '../../colors';

ChartJS.register(ArcElement, Tooltip, Legend);

const clientCandidates: Candidate[] = [
    { name: 'Curl', regex: /curl\//, matches: 0 },
    { name: 'Postman', regex: /PostmanRuntime\//, matches: 0 },
    { name: 'Insomnia', regex: /insomnia\//, matches: 0 },
    { name: 'Python requests', regex: /python-requests\//, matches: 0 },
    { name: 'Nodejs fetch', regex: /node-fetch\//, matches: 0 },
    { name: 'Seamonkey', regex: /Seamonkey\//, matches: 0 },
    { name: 'Firefox', regex: /Firefox\//, matches: 0 },
    { name: 'Chrome', regex: /Chrome\//, matches: 0 },
    { name: 'Chromium', regex: /Chromium\//, matches: 0 },
    { name: 'aiohttp', regex: /aiohttp\//, matches: 0 },
    { name: 'Python', regex: /Python\//, matches: 0 },
    { name: 'Go http', regex: /[Gg]o-http-client\//, matches: 0 },
    { name: 'Java', regex: /Java\//, matches: 0 },
    { name: 'axios', regex: /axios\//, matches: 0 },
    { name: 'Dart', regex: /Dart\//, matches: 0 },
    { name: 'OkHttp', regex: /OkHttp\//, matches: 0 },
    { name: 'Uptime Kuma', regex: /Uptime-Kuma\//, matches: 0 },
    { name: 'undici', regex: /undici\//, matches: 0 },
    { name: 'Lush', regex: /Lush\//, matches: 0 },
    { name: 'Zabbix', regex: /Zabbix/, matches: 0 },
    { name: 'Guzzle', regex: /GuzzleHttp\//, matches: 0 },
    { name: 'Uptime', regex: /Better Uptime/, matches: 0 },
    { name: 'GitHub Camo', regex: /github-camo/, matches: 0 },
    { name: 'Ruby', regex: /Ruby/, matches: 0 },
    { name: 'Node.js', regex: /node/, matches: 0 },
    { name: 'Next.js', regex: /Next\.js/, matches: 0 },
    {
        name: 'Vercel Edge Functions',
        regex: /Vercel Edge Functions/,
        matches: 0,
    },
    {
        name: 'OpenAI Image Downloader',
        regex: /OpenAI Image Downloader/,
        matches: 0,
    },
    { name: 'OpenAI', regex: /OpenAI/, matches: 0 },
    {
        name: 'Tsunami Security Scanner',
        regex: /TsunamiSecurityScanner/,
        matches: 0,
    },
    { name: 'iOS', regex: /iOS\//, matches: 0 },
    { name: 'Safari', regex: /Safari\//, matches: 0 },
    { name: 'Edge', regex: /Edg\//, matches: 0 },
    { name: 'Opera', regex: /(OPR|Opera)\//, matches: 0 },
    { name: 'Internet Explorer', regex: /(; MSIE |Trident\/)/, matches: 0 },
];

export function getClient(userAgent: string | null): string {
    if (userAgent == null) {
        return 'Unknown';
    }

    for (let i = 0; i < clientCandidates.length; i++) {
        const candidate = clientCandidates[i];
        if (userAgent.match(candidate.regex)) {
            candidate.matches++;
            // Ensure clientCandidates remains sorted by matches desc for future hits
            maintainCandidates(i, clientCandidates);
            return candidate.name;
        }
    }

    return 'Other';
}

export const Client = memo(function Client({
    data,
    filterClient,
    setFilterClient,
}: {
    data: NginxLog[];
    filterClient: string | null;
    setFilterClient: (client: string | null) => void;
}) {
    const plotData = useMemo<ChartData<"doughnut"> | null>(() => {
        const clientCounts: { [key: string]: number } = {};

        for (const row of data) {
            const client = getClient(row.userAgent)
            if (!clientCounts[client]) {
                clientCounts[client] = 0
            }
            clientCounts[client]++;
        }

        const labels = Object.keys(clientCounts);
        const values = Object.values(clientCounts);

        const backgroundColor = labels.map((label, i) => {
            const color = DONUT_COLORS[i % DONUT_COLORS.length];
            return filterClient && filterClient !== label ? dimColor(color) : color;
        });

        return {
            labels,
            datasets: [
                {
                    label: "Count",
                    data: values,
                    backgroundColor,
                    hoverOffset: 4,
                    borderWidth: 0,
                },
            ],
        };
    }, [data, filterClient]);

    const options = useMemo(() => ({
        plugins: {
            legend: {
                position: 'right' as const,
                align: 'center' as const,
                onClick: (_event: ChartEvent, item: LegendItem) => {
                    const client = item.text as string;
                    setFilterClient(filterClient === client ? null : client);
                },
            },
        },
        responsive: true,
        maintainAspectRatio: false
    }), [filterClient, setFilterClient]);

    return (
        <div className="relative w-full flex items-center justify-center pb-4" >
            {plotData && <Doughnut data={plotData} options={options} />}
        </div>
    );
})
