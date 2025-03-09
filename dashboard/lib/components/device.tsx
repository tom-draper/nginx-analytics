"use client";

import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartData } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { Data } from "../types";
import { useEffect, useState } from "react";
import {
    type Candidate,
    maintainCandidates,
} from '../candidates';

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

function getClient(userAgent: string | null): string {
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

export function Device({ data }: { data: Data }) {
    const [plotData, setPlotData] = useState<ChartData<"doughnut"> | null>(null);

    useEffect(() => {
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

        setPlotData({
            labels,
            datasets: [
                {
                    label: "Client",
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
                },
            ],
        });
    }, [data]);

    return (
        <div className="border rounded-lg border-gray-300 flex-1 px-4 py-3 m-3">
            <h2 className="font-semibold">Device</h2>

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
        </div>
    );
}
