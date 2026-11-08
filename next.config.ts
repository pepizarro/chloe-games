import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  allowedDevOrigins: ["127.0.0.1"], // second local player: localhost + 127.0.0.1 = two localStorage identities
};

export default nextConfig;
