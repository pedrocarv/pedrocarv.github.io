import type { NextConfig } from 'next';
// Vinext's current prerenderer requests paths without a trailing slash.
// The postbuild step produces directory indexes for static hosting.
const nextConfig: NextConfig = { output: 'export', trailingSlash: false, images: { unoptimized: true } };
export default nextConfig;
