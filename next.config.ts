import type { NextConfig } from "next";

// Static export, served from himanshubhusari.com/jevplayground/ (GitHub Pages).
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/jevplayground",
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: { root: __dirname },
};

export default nextConfig;
