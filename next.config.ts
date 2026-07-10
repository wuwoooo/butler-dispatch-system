import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "beian.mps.gov.cn",
        pathname: "/web/assets/**"
      }
    ]
  },
  reactStrictMode: true
};

export default nextConfig;
