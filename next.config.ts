import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // dev only. Wildcards match hostnames, not IPs, so the LAN IP is listed: `ipconfig getifaddr en0`
  allowedDevOrigins: ["**", "127.0.0.1", "192.168.4.71"],
};

export default nextConfig;
