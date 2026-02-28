import { cookies } from "next/headers";
import { env } from "@/env";

/**
 * get cookie from nextjs header for RPC calls in server components ONLY.
 * @returns An object containing the cookie header for authentication.
 */
export const setCookies = async () => {
  const cookieStore = await cookies();
  const cookie = [env.AUTH_COOKIE]
    .map((name) => {
      const value = cookieStore.get(name)?.value;
      return value ? `${name}=${value}` : "";
    })
    .filter(Boolean)
    .join("; ");

  return { $headers: { cookie } };
};
