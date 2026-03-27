"use client";

import { useRef, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Shield, Zap, Globe as GlobeIcon, SlidersHorizontal, Server, FileText } from 'lucide-react';

const Globe = dynamic(() => import('@/lib/components/globe'), { ssr: false });

export default function TiltedGlobeSingleTarget() {
	const [isGlobeVisible, setIsGlobeVisible] = useState(true);
	const [scrollProgress, setScrollProgress] = useState(0);
	const globeRef = useRef<HTMLDivElement>(null);
	const contentStartRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleScroll = () => {
			// Calculate visibility based on viewport position
			if (globeRef.current && contentStartRef.current) {
				const globeRect = globeRef.current.getBoundingClientRect();
				const contentStartPosition = contentStartRef.current.getBoundingClientRect().top;
				const viewportHeight = window.innerHeight;

				// Check if globe section is still visible
				setIsGlobeVisible(globeRect.bottom > 0);

				// Calculate scroll progress for parallax effect (0 to 1)
				const progress = Math.max(0, Math.min(1, 1 - (contentStartPosition / viewportHeight)));
				setScrollProgress(progress);
			}
		};

		window.addEventListener('scroll', handleScroll);
		handleScroll(); // Initial check

		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	}, []);

	return (
		<div className="relative w-full bg-[var(--background)]">
			{/* Fixed navbar */}
			<nav className="fixed top-0 left-0 right-0 z-50 py-6 px-6 flex text-center font-semibold text-[#3f3f3f] bg-[var(--background)] bg-opacity-80 backdrop-blur-sm">
				<div>
					<img src="/logo.svg" alt="Logo" className="h-8" />
				</div>
				<div className="mx-4 mr-8 my-auto text-[16px]">NGINX Analytics</div>
				<div className="my-auto ml-auto">
					<a href="" className="mx-2 text-[14px] hover:text-[var(--text)] transition-colors duration-100 ease-in-out">Home</a>
					<a href="" className="mx-2 text-[14px] hover:text-[var(--text)] transition-colors duration-100 ease-in-out">Docs</a>
					<a href="https://github.com/tom-draper/nginx-analytics" className="mx-2 text-sm hover:text-[var(--text)] transition-colors duration-100 ease-in-out">Source</a>
				</div>
			</nav>

			{/* Hero section with globe */}
			<section ref={globeRef} className="relative w-full h-screen ">
				{/* Heading */}
				<h1
					className="absolute w-full text-center text-white font-bold text-3xl z-0"
					style={{
						fontFamily: 'Arial, Helvetica, sans-serif',
						top: '55.2vh',
						transform: 'translateY(-50%)',
						opacity: 1 - scrollProgress
					}}
				>
					It&apos;s you versus the world.
				</h1>

				{/* Globe component */}
				<div className="absolute w-full h-full top-[50vh]">
					<div className="relative">
						<Globe />
						{/* <div className="absolute inset-0" style={{ background: 'linear-gradient(transparent 50%, #08090a 54%)' }}></div> */}
					</div>
				</div>

				{/* Call to action buttons */}
				{/* <div
					className="absolute bottom-4 w-full grid place-items-center"
					// style={{ opacity: 1 - scrollProgress * 2, willChange: 'opacity' }}
					style={{
						opacity: 1 - scrollProgress * 2,
					}}
				>
					<div className="w-fit rounded p-3 border border-[var(--border-color)] flex gap-3 bg-opacity-80 backdrop-blur-sm">
						<a className="cursor-pointer bg-[var(--highlight)] rounded p-4 py-2 w-30 text-black text-center place-content-center bg-opacity-80 backdrop-blur-sm" href="https://github.com/tom-draper/nginx-analytics">Get Started</a>
						<a className="cursor-pointer rounded p-4 text-[#ffffffdd] border border-[var(--border-color)] w-30 py-2 text-center place-content-center bg-opacity-80 backdrop-blur-sm" href="https://nginx.apianalytics.dev/dashboard/demo">Demo</a>
					</div>
				</div> */}

				<div
  className="absolute bottom-4 w-full grid place-items-center"
  style={{
    opacity: 1 - scrollProgress * 2,
  }}
>
  <div className="w-fit rounded p-3 border border-[var(--border-color)] flex gap-3 bg-opacity-80 backdrop-blur-sm" style={{ willChange: 'transform' }}>
    <a className="cursor-pointer bg-[var(--highlight)] rounded p-4 py-2 w-30 text-black text-center place-content-center bg-opacity-80 backdrop-blur-sm" href="https://github.com/tom-draper/nginx-analytics">Get Started</a>
    <a className="cursor-pointer rounded p-4 text-[#ffffffdd] border border-[var(--border-color)] w-30 py-2 text-center place-content-center bg-opacity-80 backdrop-blur-sm" href="https://nginx.apianalytics.dev/dashboard/demo">Demo</a>
  </div>
</div>
			</section>

			{/* Content section start marker */}
			<div ref={contentStartRef} className="h-0 overflow-x-hidden"></div>

			{/* Content section */}
			<section className="w-full z-20 relative">
				<div className="w-full flex flex-col items-center justify-start">

					{/* Dashboard screenshot */}
					<img
						src="/dashboard.png"
						alt="NGINX Analytics dashboard showing request traffic, geographic distribution, and endpoint performance"
						className="w-4/5 max-w-6xl rounded border-[var(--border-color)] border"
						style={{
							transform: 'perspective(1000px) rotateX(1deg) scale(0.98)',
							transformOrigin: 'bottom center',
							boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
							marginTop: '-1%',
						}}
					/>

					{/* Heading */}
					<div className="w-4/5 max-w-3xl mt-24 text-center">
						<h2 className="font-semibold text-3xl text-white">See what others can&apos;t.</h2>
						<p className="mt-4 text-[var(--text-muted4)] text-lg leading-relaxed">
							Most analytics tools require you to ship data to someone else&apos;s servers. NGINX Analytics runs on yours — built entirely from the logs NGINX already produces.
						</p>
					</div>

					{/* Feature grid */}
					<div className="w-4/5 max-w-5xl mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-32">

						<div className="rounded-lg bg-[var(--card-background)] border border-[var(--border-color)] p-6">
							<FileText className="mb-4 text-[var(--highlight)]" size={22} strokeWidth={1.5} />
							<h3 className="text-white font-semibold mb-2">Zero configuration</h3>
							<p className="text-[var(--text-muted4)] text-sm leading-relaxed">
								Points directly at your existing NGINX access logs. No agents to install, no SDKs to integrate, no changes to your server.
							</p>
						</div>

						<div className="rounded-lg bg-[var(--card-background)] border border-[var(--border-color)] p-6">
							<Shield className="mb-4 text-[var(--highlight)]" size={22} strokeWidth={1.5} />
							<h3 className="text-white font-semibold mb-2">Completely private</h3>
							<p className="text-[var(--text-muted4)] text-sm leading-relaxed">
								Self-hosted on your own infrastructure. Your log data never leaves your server — no third-party services, no accounts, no tracking.
							</p>
						</div>

						<div className="rounded-lg bg-[var(--card-background)] border border-[var(--border-color)] p-6">
							<Zap className="mb-4 text-[var(--highlight)]" size={22} strokeWidth={1.5} />
							<h3 className="text-white font-semibold mb-2">Live traffic</h3>
							<p className="text-[var(--text-muted4)] text-sm leading-relaxed">
								Polls your logs every 30 seconds so the dashboard stays current without a page refresh. Watch requests come in as they happen.
							</p>
						</div>

						<div className="rounded-lg bg-[var(--card-background)] border border-[var(--border-color)] p-6">
							<SlidersHorizontal className="mb-4 text-[var(--highlight)]" size={22} strokeWidth={1.5} />
							<h3 className="text-white font-semibold mb-2">Interactive filtering</h3>
							<p className="text-[var(--text-muted4)] text-sm leading-relaxed">
								Click any chart to filter the entire dashboard. Drill into traffic by endpoint, location, device, browser, OS, time of day, or referrer.
							</p>
						</div>

						<div className="rounded-lg bg-[var(--card-background)] border border-[var(--border-color)] p-6">
							<GlobeIcon className="mb-4 text-[var(--highlight)]" size={22} strokeWidth={1.5} />
							<h3 className="text-white font-semibold mb-2">Geographic intelligence</h3>
							<p className="text-[var(--text-muted4)] text-sm leading-relaxed">
								IP geolocation maps every request to a country. Filter the dashboard to a specific region to see exactly how that audience behaves.
							</p>
						</div>

						<div className="rounded-lg bg-[var(--card-background)] border border-[var(--border-color)] p-6">
							<Server className="mb-4 text-[var(--highlight)]" size={22} strokeWidth={1.5} />
							<h3 className="text-white font-semibold mb-2">System monitoring</h3>
							<p className="text-[var(--text-muted4)] text-sm leading-relaxed">
								CPU, memory, and disk usage tracked alongside your traffic data — so you can correlate load spikes with the requests that caused them.
							</p>
						</div>

					</div>

					{/* CTA */}
					<div className="w-4/5 max-w-3xl mb-32 flex flex-col items-center text-center gap-6">
						<h2 className="text-white font-semibold text-2xl">Ready to get started?</h2>
						<p className="text-[var(--text-muted4)]">Self-host in minutes. Free and open source.</p>
						<div className="flex gap-3">
							<a
								href="https://github.com/tom-draper/nginx-analytics"
								className="w-36 text-center py-2.5 rounded bg-[var(--highlight)] text-black font-medium text-sm hover:opacity-90 transition-opacity"
							>
								Get Started
							</a>
							<a
								href="/dashboard/demo"
								className="w-36 text-center py-2.5 rounded border border-[var(--border-color)] text-[var(--text-muted4)] text-sm hover:text-white transition-colors"
							>
								Try the demo
							</a>
						</div>
					</div>

				</div>
			</section>
		</div>
	);
}