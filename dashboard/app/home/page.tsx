"use client";

import { useRef, useEffect, useState } from 'react';
import Globe from '@/lib/components/globe';

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
			<nav className="fixed top-0 left-0 right-0 z-50 py-6 px-6 flex text-center font-semibold text-[#3f3f3f] bg-[var(--background)] bg-opacity-80 backdrop-blur-sm" style={{ fontFamily: 'Helvetica, Geist, Helveica, Arial, sans-serif' }}>
				<div>
					<img src="/logo.svg" alt="Logo" className="h-8" />
				</div>
				<div className="mx-4 mr-8 my-auto text-[16px]">API Analytics | NGINX</div>
				<div className="my-auto ml-auto">
					<a href="" className="mx-2 text-[14px] hover:text-[var(--text)] transition-colors duration-100 ease-in-out">Home</a>
					<a href="" className="mx-2 text-[14px] hover:text-[var(--text)] transition-colors duration-100 ease-in-out">About</a>
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
				<div
					className="absolute bottom-4 w-full grid place-items-center"
					style={{ opacity: 1 - scrollProgress * 2 }}
				>
					<div className="w-fit rounded p-3 border border-[var(--border-color)] flex gap-3 bg-opacity-80 backdrop-blur-sm">
						<a className="cursor-pointer bg-[var(--highlight)] rounded p-4 py-2 w-30 text-black text-center place-content-center bg-opacity-80 backdrop-blur-sm" href="https://github.com/tom-draper/nginx-analytics">Get Started</a>
						<a className="cursor-pointer rounded p-4 text-[#ffffffdd] border border-[var(--border-color)] w-30 py-2 text-center place-content-center bg-opacity-80 backdrop-blur-sm" href="https://nginx.apianalytics.dev/dashboard/demo">Demo</a>
					</div>
				</div>
			</section>

			{/* Content section start marker */}
			<div ref={contentStartRef} className="h-0 overflow-x-hidden"></div>

			{/* Content section */}
			<section className="w-full min-h-screen z-20 relative">
				<div className="pb-32 w-full flex flex-col items-center justify-start">
					{/* <img src="/dashboard.png" alt="Dashboard" className="mt-4 w-4/5 max-w-6xl rounded border-[#343434] border" /> */}
					<img
						src="/dashboard.png"
						alt="Dashboard"
						className="w-4/5 max-w-6xl rounded border-[var(--border-color)] border"
						style={{
							transform: 'perspective(1000px) rotateX(1deg) scale(0.98)',
							transformOrigin: 'bottom center',
							boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
							marginTop: '-1%' // Adjust this value as needed to eliminate the 
						}}
					/>
					{/* <img 
  src="/dashboard.png" 
  alt="Dashboard" 
  className="w-4/5 max-w-6xl rounded border-[#343434] border" 
  style={{ 
    transform: 'perspective(1000px) rotateX(5deg) scale(0.98)',
    transformOrigin: 'bottom center',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
  }} 
/> */}
					{/* <img 
  src="/dashboard.png" 
  alt="Dashboard" 
  className="w-4/5 max-w-6xl rounded border-[#343434] border" 
  style={{ 
    perspective: '1000px',
    transform: 'rotateX(5deg)',
    transformOrigin: 'bottom center',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
  }} 
/> */}

					<div className="w-4/5 max-w-4xl mt-12 text-center text-white">
						<h2 className="font-semibold text-3xl">See what others can&apos;t.</h2>
					</div>

					{/* Add more content here */}
					<div className="w-4/5 max-w-4xl mt-24 text-white">
						<h2 className="text-2xl font-bold mb-6">Track and Analyze Your API Traffic</h2>
						<p className="text-lg mb-12 text-gray-300">
							Comprehensive analytics for your NGINX server, providing real-time insights into API performance, usage patterns, and geographic distribution.
						</p>
						{/* More content sections can be added here */}
					</div>
				</div>
			</section>
		</div>
	);
}