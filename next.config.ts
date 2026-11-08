import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  allowedDevOrigins: ["**"], // dev only; any host on the LAN (phones, 127.0.0.1 as a second player) can load the dev server
};

export default nextConfig;
