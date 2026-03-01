import type { NextConfig } from "next";
import "./src/env.ts";
import path from "node:path";
import { env } from "./src/env.ts";

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
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  // 转译 + 打包到next中去
  transpilePackages: ["@repo/contract"],
  turbopack: {
    root: path.resolve(__dirname, "../../"),
  },
  // API 代理配置 - 解决跨域 Cookie 问题（Safari ITP）
  // 前端通过 /api/* 请求，Next.js 代理到后端，使浏览器认为是同域请求
  // rewrites: async () => [
  //   {
  //     source: "/api/:path*",
  //     destination: `${env.NEXT_PUBLIC_API_URL}/api/:path*`,
  //   },
  // ],
  rewrites: async () => [
    {
      /**
       * 修正说明：
       * 使用 :path* 来捕获 /api/ 之后的所有路径片段。
       * 这样当你访问前端 /api/auth/login 时，
       * 它会准确转发到 后端/api/auth/login。
       */
      source: "/api/:path*",
      destination: "https://b2b-api-production-1.up.railway.app/api/:path*",
    },
  ],

};

export default nextConfig;
