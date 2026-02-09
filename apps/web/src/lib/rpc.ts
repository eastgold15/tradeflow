import { treaty } from "@elysiajs/eden";
import type { App } from "@/app/api/[[...slugs]]/route";
import { env } from "@/env";
const isServer = typeof window === "undefined";

const getBaseURL = () => {
  if (!isServer) return window.location.origin;
  return `http://localhost:${env.PORT}`;
};

export const rpc = treaty<App>(getBaseURL(), {
  headers: isServer ? {
    host: env.DOMAIN,
  } : undefined,
}).api;