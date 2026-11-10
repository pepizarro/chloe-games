import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // dev only: any LAN IP (four wildcard labels match any IPv4) and any .local mDNS name. localhost is allowed by default.
  allowedDevOrigins: ["*.*.*.*", "**.local"],
};

export default nextConfig;
