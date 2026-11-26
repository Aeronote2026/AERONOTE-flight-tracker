import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  isSupabaseConfigured,
  supabasePublishableKey,
  supabaseUrl,
} from "@/lib/supabase/config";

/** Pages that require a signed-in pilot. */
const PROTECTED_PREFIXES = ["/logbook", "/lab"];
/** Pages a signed-in pilot does not need (sent to the logbook instead). */
const SIGNED_OUT_ONLY = ["/login", "/register"];

/**
 * Runs before every page request:
 *  1. refreshes the Supabase session and writes updated cookies back;
 *  2. sends signed-out visitors away from protected pages.
 * The database's Row Level Security remains the real protection; this
 * only decides which page to show.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured) return response;

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        // Stops shared caches from ever storing one pilot's session.
        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });

  // getClaims() verifies the session token; do not trust unverified data.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;

  const redirectTo = (target: string) => {
    const redirect = NextResponse.redirect(new URL(target, request.url));
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "location") redirect.headers.set(key, value);
    });
    return redirect;
  };

  if (!signedIn && PROTECTED_PREFIXES.some((p) => path.startsWith(p))) {
    return redirectTo("/login");
  }
  if (signedIn && SIGNED_OUT_ONLY.includes(path)) {
    return redirectTo("/logbook");
  }
  return response;
}

export const config = {
  matcher: [
    // Every page except static files, images and app icons.
    "/((?!_next/static|_next/image|icon.svg|apple-icon.png|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
