import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	output: 'standalone',
	reactStrictMode: false,
	reactCompiler: true,
};

export default nextConfig;
