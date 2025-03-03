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

export default function Home() {
	const logs = [
		`192.168.1.101 - - [03/Mar/2025:12:34:56 +0000] "GET /index.html HTTP/1.1" 200 1024 "https://example.com/" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36"`,
		`203.0.113.42 - - [03/Mar/2025:12:35:02 +0000] "POST /login HTTP/1.1" 302 256 "https://example.com/login" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36"`,
		`198.51.100.24 - - [03/Mar/2025:12:35:20 +0000] "GET /about-us HTTP/1.1" 200 1342 "https://example.com/" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"`,
		`192.168.1.102 - - [03/Mar/2025:12:36:01 +0000] "GET /api/data HTTP/1.1" 404 523 "https://example.com/dashboard" "Mozilla/5.0 (Linux; Android 10; Pixel 4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Mobile Safari/537.36"`,
		`203.0.113.99 - - [03/Mar/2025:12:36:45 +0000] "GET /images/logo.png HTTP/1.1" 304 0 "https://example.com/" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"`,
		`192.168.1.103 - - [03/Mar/2025:12:37:15 +0000] "GET /assets/styles.css HTTP/1.1" 200 2048 "https://example.com/contact" "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:45.0) Gecko/20100101 Firefox/45.0"`,
		`198.51.100.99 - - [03/Mar/2025:12:38:32 +0000] "GET /docs/overview.pdf HTTP/1.1" 200 3072 "https://example.com/resources" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36"`,
		`203.0.113.67 - - [03/Mar/2025:12:38:58 +0000] "POST /checkout HTTP/1.1" 503 128 "https://example.com/cart" "Mozilla/5.0 (Linux; Android 11; Galaxy S20) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Mobile Safari/537.36"`,
		`192.168.1.104 - - [03/Mar/2025:12:39:13 +0000] "GET / HTTP/1.1" 200 5148 "https://example.com/" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36"`,
		`203.0.113.45 - - [03/Mar/2025:12:40:25 +0000] "GET /404 HTTP/1.1" 404 256 "https://example.com/" "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"`
	]

	const data = parseLogs(logs);

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
