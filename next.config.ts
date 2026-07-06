import type { NextConfig } from 'next';

// Validate environment variables at build/dev startup
// Comment this out if you need to build without all env vars present
import './lib/env';

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
