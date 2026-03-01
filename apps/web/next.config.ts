import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { hostname: "images.unsplash.com" },
      { hostname: "img.poripori.top" },
      { hostname: "img2.dongqifootwear.com" },
      { hostname: "img.dongqifootwear.com" },
    ],
  },

  transpilePackages: ["@repo/contract"],
  turbopack: {
    root: path.resolve(__dirname, "../../"),
  },
};

export default nextConfig;
