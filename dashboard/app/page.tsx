'use client';

import Activity from "@/lib/components/activity";
import { Endpoints } from "@/lib/components/endpoints";
import { Logo } from "@/lib/components/logo";
import { Navigation } from "@/lib/components/navigation";
import { Requests } from "@/lib/components/requests";
import { SuccessRate } from "@/lib/components/success-rate";
import Users from "@/lib/components/users";
import { Version } from "@/lib/components/version";
import { Location } from "@/lib/components/location";
import { parseLogs } from "@/lib/parse";
import { useEffect, useState } from "react";
import { Data } from "@/lib/types";

export default function Home() {
	const [data, setData] = useState<Data>([]);
	const [accessLogs, setAccessLogs] = useState<string[]>([]);
	// const [errorLogs, setErrorLogs] = useState<string[]>([]);

	useEffect(() => {
        const fetchLogs = async () => {
			console.log('Fetching logs');
            try {
                const res = await fetch(`/api/logs?type=access&position=${position}`);
                if (!res.ok) {
					throw new Error("Failed to fetch logs");
				}
                const data = await res.json();

				console.log(data);
				if (data.logs) {
					setAccessLogs((prevLogs) => [...prevLogs, ...data.logs]);
					position = parseInt(data.position);
				} else {
					console.log(data);
				}
            } catch (error) {
                console.error("Error fetching logs:", error);
            }
        };

		let position: number = 0;
        fetchLogs();
        const interval = setInterval(fetchLogs, 30000); // Polling every 2s
        return () => clearInterval(interval);
	}, []);

	useEffect(() => {
		setData(parseLogs(accessLogs))
	}, [accessLogs])

	return (
		<div className="">
			<main className="p-12 pt-7">
				<Navigation />

				<div className="flex">
					{/* Left */}
					<div className="w-[40em]">
						<div className="flex">
							<Logo />
							<SuccessRate data={data} />
						</div>

						<div className="flex">
							<Requests data={data} />
							<Users data={data} />
						</div>

						<div className="flex">
							<Endpoints data={data} />
						</div>

						<div className="flex">
							<Version data={data} />
						</div>
					</div>

					{/* Right */}
					<div className="w-full">
						<Activity data={data} />

						<div className="w-full flex">
							<Location data={data} />


						</div>

						<div className="border rounded border-gray-300 flex-1 px-4 py-3 m-2">
							<h2 className="font-semibold">
								Usage Time
							</h2>

							<div className="pb-120">
								Content
							</div>
						</div>

					</div>
				</div>

			</main>
			<footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">

			</footer>
		</div>
	);
}
