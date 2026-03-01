import { type NextRequest, NextResponse } from "next/server";

/**
 * Nextjs bypass to set the server URL in the request headers so it can be read while in server components.
 */
export default function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  return NextResponse.next({ headers });
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
