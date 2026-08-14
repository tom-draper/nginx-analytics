import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
	reactStrictMode: false,
	reactCompiler: true,
};

export default nextConfig;
