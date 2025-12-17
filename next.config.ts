import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Google OAuth アバター画像を許可
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
